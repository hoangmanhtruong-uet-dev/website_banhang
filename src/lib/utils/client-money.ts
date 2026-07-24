export type ClientMoney = string;
const SCALE_FACTOR = BigInt(10_000);
const CANONICAL = /^-?(0|[1-9]\d*)(?:\.(\d{1,4}))?$/;

function scaled(value: string | bigint | number): bigint {
  if (typeof value === 'bigint') return value * SCALE_FACTOR;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Client money number must be a safe legacy integer');
    return BigInt(value) * SCALE_FACTOR;
  }
  if (!CANONICAL.test(value)) throw new Error('Invalid canonical money string');
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const result = BigInt(whole) * SCALE_FACTOR + BigInt(fraction.padEnd(4, '0'));
  return negative ? -result : result;
}

function canonical(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const result = `${absolute / SCALE_FACTOR}.${(absolute % SCALE_FACTOR).toString().padStart(4, '0')}`;
  return value === BigInt(0) ? '0.0000' : negative ? `-${result}` : result;
}

export function addMoneyStrings(values: readonly (string | bigint | number)[]): string {
  let total = BigInt(0);
  for (const value of values) total += scaled(value);
  return canonical(total);
}

export function subtractMoneyStrings(a: string | bigint | number, b: string | bigint | number): string {
  return canonical(scaled(a) - scaled(b));
}

export function compareMoneyStrings(a: string | bigint | number, b: string | bigint | number): number {
  const left = scaled(a);
  const right = scaled(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function multiplyMoneyByQuantity(value: string | bigint | number, quantity: number): string {
  if (!Number.isSafeInteger(quantity)) throw new Error('Quantity must be a safe integer');
  return canonical(scaled(value) * BigInt(quantity));
}

export function formatClientMoney(value: string | bigint | number, currency = 'VND', locale = 'vi-VN'): string {
  const amount = scaled(value);
  const whole = amount / SCALE_FACTOR;
  if (currency === 'VND') return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(whole);
  if (!Number.isSafeInteger(Number(whole))) throw new Error('Money outside safe presentation range');
  // Presentation-only conversion; never use this result for business calculations.
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount) / Number(SCALE_FACTOR));
}

export function percentageOff(price: string, originalPrice: string): number {
  const priceScaled = scaled(price);
  const originalScaled = scaled(originalPrice);
  if (originalScaled <= BigInt(0)) return 0;
  return Number(((originalScaled - priceScaled) * BigInt(100) + originalScaled / BigInt(2)) / originalScaled);
}
