import { Prisma } from '@prisma/client';

export type MoneyValue = Prisma.Decimal | string | bigint | number;
export type CurrencyCode = 'VND';

export const MONEY_SCALE = 4;
export const MONEY_PRECISION = 19;
export const DEFAULT_CURRENCY: CurrencyCode = 'VND';
const MAX_INTEGER_DIGITS = MONEY_PRECISION - MONEY_SCALE;
const CANONICAL_INPUT = /^(0|[1-9]\d*)(?:\.(\d{1,4}))?$/;

export type ParseMoneyOptions = {
  allowNegative?: boolean;
  allowZero?: boolean;
  field?: string;
};

function fail(field: string, message: string): never {
  throw new Error(`${field}: ${message}`);
}

export function normalizeCurrency(value: unknown): CurrencyCode {
  if (typeof value !== 'string' || value.trim() !== value || value.toUpperCase() !== value || value !== DEFAULT_CURRENCY) {
    throw new Error('currency must be the supported ISO 4217 code VND');
  }
  return DEFAULT_CURRENCY;
}

export function assertSameCurrency(a: string, b: string): void {
  if (normalizeCurrency(a) !== normalizeCurrency(b)) throw new Error('currency mismatch');
}

export function parseMoneyInput(input: unknown, options: ParseMoneyOptions = {}): Prisma.Decimal {
  const field = options.field ?? 'amount';
  let text: string;
  if (typeof input === 'string') {
    text = input;
  } else if (typeof input === 'bigint') {
    text = input.toString();
  } else if (typeof input === 'number' && Number.isSafeInteger(input)) {
    text = input.toString();
  } else {
    return fail(field, 'must be a canonical decimal string (legacy numbers must be safe integers)');
  }

  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const match = CANONICAL_INPUT.exec(unsigned);
  if (!match) fail(field, 'must use canonical decimal notation with at most 4 decimal places');
  if (negative && !options.allowNegative) fail(field, 'must not be negative');
  const integerDigits = unsigned.split('.')[0].length;
  if (integerDigits > MAX_INTEGER_DIGITS) fail(field, `exceeds DECIMAL(${MONEY_PRECISION},${MONEY_SCALE}) range`);

  const decimal = new Prisma.Decimal(text);
  if (!decimal.isFinite()) fail(field, 'must be finite');
  if (decimal.isZero() && options.allowZero === false) fail(field, 'must be greater than zero');
  return decimal;
}

export class Money {
  static readonly SCALE = MONEY_SCALE;
  static readonly ROUNDING_MODE = Prisma.Decimal.ROUND_HALF_UP;

  static toDecimal(value: MoneyValue): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      if (!value.isFinite()) throw new Error('money value must be finite');
      return value;
    }
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('legacy money numbers must be safe integers');
    const text = value.toString();
    if (!/^-?(0|[1-9]\d*)(?:\.\d+)?$/.test(text)) throw new Error('money value must use decimal notation');
    const decimal = new Prisma.Decimal(text);
    if (!decimal.isFinite()) throw new Error('money value must be finite');
    return decimal;
  }

  static normalize(value: MoneyValue): Prisma.Decimal {
    const rounded = this.toDecimal(value).toDecimalPlaces(this.SCALE, this.ROUNDING_MODE);
    if (rounded.abs().greaterThan('999999999999999.9999')) throw new Error(`money value exceeds DECIMAL(${MONEY_PRECISION},${MONEY_SCALE}) range`);
    return rounded.isZero() ? new Prisma.Decimal(0) : rounded;
  }

  static add(a: MoneyValue, b: MoneyValue): Prisma.Decimal { return this.toDecimal(a).plus(this.toDecimal(b)); }
  static subtract(a: MoneyValue, b: MoneyValue): Prisma.Decimal { return this.toDecimal(a).minus(this.toDecimal(b)); }
  static multiply(a: MoneyValue, b: MoneyValue): Prisma.Decimal { return this.toDecimal(a).times(this.toDecimal(b)); }
  static divide(a: MoneyValue, b: MoneyValue): Prisma.Decimal {
    const divisor = this.toDecimal(b);
    if (divisor.isZero()) throw new Error('division by zero');
    return this.toDecimal(a).dividedBy(divisor);
  }
  static compare(a: MoneyValue, b: MoneyValue): number { return this.toDecimal(a).comparedTo(this.toDecimal(b)); }
  static isZero(value: MoneyValue): boolean { return this.toDecimal(value).isZero(); }
  static isPositive(value: MoneyValue): boolean { return this.compare(value, '0') > 0; }
  static min(a: MoneyValue, b: MoneyValue): Prisma.Decimal { return this.compare(a, b) <= 0 ? this.toDecimal(a) : this.toDecimal(b); }
  static max(a: MoneyValue, b: MoneyValue): Prisma.Decimal { return this.compare(a, b) >= 0 ? this.toDecimal(a) : this.toDecimal(b); }
  static sum(values: readonly MoneyValue[]): Prisma.Decimal {
    let total = new Prisma.Decimal(0);
    for (const value of values) total = total.plus(this.toDecimal(value));
    return total;
  }

  static round(value: MoneyValue, _currency: CurrencyCode = DEFAULT_CURRENCY): Prisma.Decimal {
    return this.normalize(value);
  }

  static serialize(value: MoneyValue): string {
    return this.normalize(value).toFixed(this.SCALE);
  }

  static format(value: MoneyValue, currency: CurrencyCode = DEFAULT_CURRENCY, locale = 'vi-VN'): string {
    const canonical = this.serialize(value);
    const decimal = new Prisma.Decimal(canonical);
    if (decimal.abs().greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error('money value is outside safe presentation range');
    // Presentation-only conversion. This number never re-enters domain calculations.
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(decimal.toNumber());
  }
}

const MONETARY_KEYS = new Set([
  'balance', 'discountValue', 'minOrderValue', 'maxDiscount', 'price', 'originalPrice',
  'subtotal', 'discountAmount', 'shippingFee', 'taxAmount', 'total', 'lineTotal',
  'amount', 'refundedAmount', 'balanceBefore', 'balanceAfter', 'revenue',
]);

export function serializeMoneyFields(value: unknown, key?: string): unknown {
  if (value instanceof Prisma.Decimal) return Money.serialize(value);
  if (Array.isArray(value)) return value.map((item) => serializeMoneyFields(item));
  if (value instanceof Date || value === null || typeof value !== 'object') {
    if (key && MONETARY_KEYS.has(key) && (typeof value === 'string' || typeof value === 'bigint' || typeof value === 'number')) {
      return Money.serialize(value);
    }
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, serializeMoneyFields(entryValue, entryKey)]));
}
