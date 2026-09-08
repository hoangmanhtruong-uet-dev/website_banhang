import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCorsPreflight, getCorsHeaders } from '@/lib/network/cors';
import { validateApiMutationOrigin } from '@/lib/security/origin-policy';

const productionEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_URL: 'https://mtruong-store.com',
  API_ALLOWED_ORIGINS: 'https://mtruong-store.com, https://admin.mtruong-store.com',
  TRUST_PROXY: 'false',
};

function createRequest(method: string, url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method, headers });
}

// 1. Allowed Production Origin
test('1. Allowed production origin returns valid CORS headers', () => {
  const headers = getCorsHeaders('https://mtruong-store.com', productionEnv);
  assert.ok(headers);
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://mtruong-store.com');
  assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
  assert.equal(headers['Vary'], 'Origin');
});

// 2. Forbidden Production Origin & Subdomain Attacks
test('2. Subdomain / lookalike attack origins are rejected by CORS and Mutation Origin Policy', () => {
  const attackOrigins = [
    'https://attacker.com',
    'https://mtruong-store.com.attacker.com',
    'https://attacker-mtruong-store.com',
    'https://mtruong-store.com.evil.example',
    'http://mtruong-store.com', // Insecure HTTP protocol attempt
  ];

  for (const origin of attackOrigins) {
    const cors = getCorsHeaders(origin, productionEnv);
    assert.equal(cors, null, `CORS must reject ${origin}`);

    const decision = validateApiMutationOrigin(
      { method: 'POST', pathname: '/api/orders', url: 'https://mtruong-store.com/api/orders', headers: new Headers({ origin, host: 'mtruong-store.com' }) },
      productionEnv,
    );
    assert.equal(decision.allowed, false);
  }
});

// 3. No Reflected Origin for Untrusted Request
test('3. Untrusted origin is NEVER dynamically reflected', () => {
  const headers = getCorsHeaders('https://malicious-site.example', productionEnv);
  assert.equal(headers, null);
});

// 4. Wildcard + Credentials Protection
test('4. Wildcard Access-Control-Allow-Origin is NEVER returned with credentials', () => {
  const headers = getCorsHeaders('https://mtruong-store.com', productionEnv);
  assert.ok(headers);
  assert.notEqual(headers['Access-Control-Allow-Origin'], '*');
  assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
});

// 5. OPTIONS Preflight Handling
test('5. OPTIONS Preflight request returns HTTP 204 with CORS headers for allowed origins', () => {
  const req = createRequest('OPTIONS', 'https://mtruong-store.com/api/products', {
    origin: 'https://admin.mtruong-store.com',
    'access-control-request-method': 'POST',
  });

  const res = handleCorsPreflight(req, productionEnv);
  assert.ok(res);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://admin.mtruong-store.com');
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
});

// 6. OPTIONS Preflight Rejection for Untrusted Origin
test('6. OPTIONS Preflight request for untrusted origin returns HTTP 403', () => {
  const req = createRequest('OPTIONS', 'https://mtruong-store.com/api/products', {
    origin: 'https://untrusted-origin.example',
  });

  const res = handleCorsPreflight(req, productionEnv);
  assert.ok(res);
  assert.equal(res.status, 403);
});

// 7. Malformed / Null Origin Handling
test('7. Null or malformed origins are rejected cleanly', () => {
  for (const origin of ['null', 'INVALID_ORIGIN', 'javascript:alert(1)', 'https://user:pass@mtruong-store.com']) {
    const cors = getCorsHeaders(origin, productionEnv);
    assert.equal(cors, null);
  }
});

// 8. Forged Forwarded Headers
test('8. Forged X-Forwarded-Host headers are ignored when TRUST_PROXY is false', () => {
  const req = {
    method: 'POST',
    pathname: '/api/orders',
    url: 'http://internal-server:3000/api/orders',
    headers: new Headers({
      origin: 'https://mtruong-store.com',
      host: 'internal-server:3000',
      'x-forwarded-host': 'attacker-host.com',
      'x-forwarded-proto': 'https',
    }),
  };

  const decision = validateApiMutationOrigin(req, productionEnv);
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.code, 'REQUEST_TARGET_NOT_ALLOWED');
  }
});
