import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  type OriginPolicyDecision,
  type OriginPolicyEnvironment,
  type OriginPolicyRequest,
  parseAllowedOrigins,
  validateApiMutationOrigin,
} from '../src/lib/security/origin-policy';
import {
  ManualWalletMutationDisabledError,
  assertManualWalletMutationAllowed,
} from '../src/lib/security/manual-wallet-mutation-policy';

const read = (path: string) => readFileSync(path, 'utf8');

function withNodeEnvironment(nodeEnvironment: string, callback: () => void): void {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const previous = mutableEnvironment.NODE_ENV;
  mutableEnvironment.NODE_ENV = nodeEnvironment;
  try {
    callback();
  } finally {
    if (previous === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previous;
  }
}

const productionOrigin: OriginPolicyEnvironment = {
  NODE_ENV: 'production',
  API_ALLOWED_ORIGINS: 'https://trusted.example',
};

function apiRequest(
  method: string,
  pathname: string,
  headers: Record<string, string> = {},
  url = 'https://trusted.example' + pathname,
): OriginPolicyRequest {
  return {
    method,
    pathname,
    url,
    headers: new Headers({ host: new URL(url).host, ...headers }),
  };
}

type DeniedDecision = Extract<OriginPolicyDecision, { allowed: false }>;

function expectDenied(decision: OriginPolicyDecision): DeniedDecision {
  if (decision.allowed) assert.fail('Expected origin policy to reject the request');
  return decision;
}

test('origin allowlist parses and normalizes exact HTTP(S) origins', () => {
  const parsed = parseAllowedOrigins({
    NODE_ENV: 'production',
    API_ALLOWED_ORIGINS: 'https://TRUSTED.example:443, https://admin.example:8443',
    NEXT_PUBLIC_APP_URL: 'https://ignored.example',
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(
    [...parsed.origins],
    ['https://trusted.example', 'https://admin.example:8443'],
  );
});

test('all state-changing API methods accept an exact configured same origin', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const decision = validateApiMutationOrigin(
      apiRequest(method, '/api/orders', { origin: 'https://TRUSTED.example:443' }),
      productionOrigin,
    );
    assert.deepEqual(decision, { allowed: true, reason: 'validated' });
  }
});

test('cross-origin and trusted-domain lookalike mutations are rejected', () => {
  const crossOrigin = expectDenied(validateApiMutationOrigin(
    apiRequest('POST', '/api/orders', { origin: 'https://attacker.example' }),
    productionOrigin,
  ));
  assert.equal(crossOrigin.status, 403);
  assert.equal(crossOrigin.code, 'ORIGIN_NOT_ALLOWED');

  const lookalike = expectDenied(validateApiMutationOrigin(
    apiRequest('PATCH', '/api/user/profile', { origin: 'https://trusted.example.attacker.example' }),
    productionOrigin,
  ));
  assert.equal(lookalike.status, 403);
  assert.equal(lookalike.code, 'ORIGIN_NOT_ALLOWED');
});

test('browser mutation without Origin is rejected', () => {
  const decision = expectDenied(validateApiMutationOrigin(
    apiRequest('DELETE', '/api/user/addresses/address-1'),
    productionOrigin,
  ));

  assert.equal(decision.status, 403);
  assert.equal(decision.code, 'ORIGIN_REQUIRED');
});

test('production fails closed when origin config is missing or malformed', () => {
  const missing = expectDenied(validateApiMutationOrigin(
    apiRequest('POST', '/api/orders', { origin: 'https://trusted.example' }),
    { NODE_ENV: 'production' },
  ));
  assert.equal(missing.status, 503);
  assert.equal(missing.code, 'ORIGIN_POLICY_MISCONFIGURED');

  for (const API_ALLOWED_ORIGINS of [
    'not-an-origin',
    'https://trusted.example/path',
    'https://trusted.example,,https://other.example',
  ]) {
    const malformed = expectDenied(validateApiMutationOrigin(
      apiRequest('POST', '/api/orders', { origin: 'https://trusted.example' }),
      { NODE_ENV: 'production', API_ALLOWED_ORIGINS },
    ));
    assert.equal(malformed.status, 503);
    assert.equal(malformed.code, 'ORIGIN_POLICY_MISCONFIGURED');
  }
});

test('request target must also be configured and forwarded host is trusted only when enabled', () => {
  const proxied = apiRequest(
    'POST',
    '/api/orders',
    {
      host: 'internal:3000',
      origin: 'https://trusted.example',
      'x-forwarded-host': 'trusted.example',
      'x-forwarded-proto': 'https',
    },
    'http://internal:3000/api/orders',
  );

  assert.deepEqual(
    validateApiMutationOrigin(proxied, { ...productionOrigin, TRUST_PROXY: 'true' }),
    { allowed: true, reason: 'validated' },
  );

  const untrustedForwarding = expectDenied(validateApiMutationOrigin(
    proxied,
    { ...productionOrigin, TRUST_PROXY: 'false' },
  ));
  assert.equal(untrustedForwarding.code, 'REQUEST_TARGET_NOT_ALLOWED');
});

test('signed webhook path is the only mutation exemption and health GET remains available', () => {
  const webhook = validateApiMutationOrigin(
    apiRequest('POST', '/api/webhook'),
    { NODE_ENV: 'production' },
  );
  assert.equal(webhook.allowed, true);
  if (webhook.allowed) {
    assert.equal(webhook.reason, 'exempt');
    assert.match(webhook.exemption ?? '', /HMAC signature/);
  }

  const webhookLookalike = expectDenied(validateApiMutationOrigin(
    apiRequest('POST', '/api/webhook.attacker'),
    productionOrigin,
  ));
  assert.equal(webhookLookalike.code, 'ORIGIN_REQUIRED');

  assert.deepEqual(
    validateApiMutationOrigin(
      apiRequest('GET', '/api/health/live'),
      { NODE_ENV: 'production' },
    ),
    { allowed: true, reason: 'safe-method' },
  );

  const webhookSource = read('src/app/api/webhook/route.ts');
  assert.match(webhookSource, /timingSafeEqual/);
  assert.match(webhookSource, /x-webhook-signature/);
  assert.match(webhookSource, /x-webhook-timestamp/);
});

test('middleware matcher covers every API route', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /matcher:\s*\[\s*'\/api\/:path\*'/);
  assert.match(middleware, /validateApiMutationOrigin/);
});

test('manual wallet mutations remain enabled outside production', () => {
  for (const nodeEnvironment of ['development', 'test']) {
    withNodeEnvironment(nodeEnvironment, () => {
      assert.doesNotThrow(() => {
        assertManualWalletMutationAllowed('demo-top-up', '/api/user/balance');
        assertManualWalletMutationAllowed('admin-balance-adjustment', '/api/admin/users/:id/balance');
      });
    });
  }
});

test('production blocks demo top-up and manual admin balance adjustment with a stable 404 domain error', () => {
  withNodeEnvironment('production', () => {
    for (const operation of ['demo-top-up', 'admin-balance-adjustment'] as const) {
      assert.throws(
        () => assertManualWalletMutationAllowed(operation, '/api/test'),
        (error: unknown) => {
          assert.ok(error instanceof ManualWalletMutationDisabledError);
          assert.equal(error.statusCode, 404);
          assert.equal(error.code, 'MANUAL_WALLET_MUTATION_DISABLED');
          return true;
        },
      );
    }
  });
});

test('both manual balance routes enforce policy before auth and beside the balance write', () => {
  const cases = [
    {
      source: read('src/app/api/user/balance/route.ts'),
      routeMarker: 'export const POST',
      authMarker: 'const session = await getSession()',
    },
    {
      source: read('src/app/api/admin/users/[id]/balance/route.ts'),
      routeMarker: 'export async function PATCH',
      authMarker: 'const actor = await requireAdmin()',
    },
  ];

  for (const item of cases) {
    const guard = 'enforceManualWalletMutationPolicy(';
    const routeStart = item.source.indexOf(item.routeMarker);
    const firstGuard = item.source.indexOf(guard, routeStart);
    const secondGuard = item.source.indexOf(guard, firstGuard + guard.length);
    const balanceWrite = item.source.indexOf('tx.user.update(');

    assert.ok(firstGuard >= routeStart && firstGuard < item.source.indexOf(item.authMarker, routeStart));
    assert.ok(secondGuard > firstGuard && secondGuard < balanceWrite);
  }

  const auditGuard = read('src/lib/security/manual-wallet-mutation-guard.ts');
  assert.match(auditGuard, /security\.manual_wallet_mutation_blocked/);
  assert.match(auditGuard, /logger\.warn/);
});

