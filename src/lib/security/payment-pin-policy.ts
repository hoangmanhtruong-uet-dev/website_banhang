import { AuthenticationError, RateLimitError, ValidationError } from '@/lib/errors';
import prisma from '@/lib/db';
import { createFailureCounter, databaseRateLimitBackend, type RateLimitConfig } from '@/lib/rate-limit/rate-limit';
import { PasswordService } from '@/lib/services/auth/password.service';

export const PAYMENT_PIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const PAYMENT_PIN_MAX_WRONG_ATTEMPTS = 5;
const paymentPinFailureCounter = createFailureCounter(databaseRateLimitBackend, Date.now);

const paymentPinFailureConfig: RateLimitConfig = {
  windowMs: PAYMENT_PIN_FAILURE_WINDOW_MS,
  max: PAYMENT_PIN_MAX_WRONG_ATTEMPTS,
  failureMode: 'closed',
};

export async function verifyPaymentPinOrThrow(userId: string, paymentPin: string | undefined): Promise<void> {
  if (!paymentPin) throw new ValidationError('Vui lòng nhập mã PIN giao dịch');
  if (!/^\d{6}$/.test(paymentPin)) throw new ValidationError('Mã PIN phải gồm đúng 6 chữ số');

  const failureKey = `payment-pin-failure:${userId}`;
  const lockState = await paymentPinFailureCounter.check(failureKey, paymentPinFailureConfig);
  if (!lockState.success) throw new RateLimitError('Bạn nhập sai PIN quá nhiều lần. Vui lòng thử lại sau.');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { paymentPinHash: true } });
  if (!user?.paymentPinHash) {
    throw new ValidationError('Bạn chưa thiết lập mã PIN giao dịch. Vui lòng vào trang Ngân hàng để tạo PIN.');
  }

  if (!await PasswordService.verify(paymentPin, user.paymentPinHash)) {
    const failure = await paymentPinFailureCounter.recordFailure(failureKey, paymentPinFailureConfig);
    if (!failure.success) throw new RateLimitError('Bạn nhập sai PIN quá nhiều lần. Vui lòng thử lại sau.');
    throw new AuthenticationError('Mã PIN giao dịch không đúng');
  }

  await paymentPinFailureCounter.reset(failureKey, paymentPinFailureConfig);
}
