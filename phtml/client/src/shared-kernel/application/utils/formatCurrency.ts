// English description: Shared locale-aware currency formatting and parsing helpers for frontend contexts.

export interface CurrencyFormatRule {
  decimals?: number | string
  decimal_sep?: string
  decimalSep?: string
  thousand_sep?: string
  thousandSep?: string
}

export interface FormatCurrencyOptions {
  currency?: string
  locale?: string
  currencySymbol?: string
  currencyRule?: CurrencyFormatRule | null
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/

const DEFAULT_DECIMAL_SEPARATOR = "."
const DEFAULT_THOUSAND_SEPARATOR = ","

export function formatCurrency(
  amount: number | string | null | undefined,
  options: FormatCurrencyOptions = {},
) {
  const normalizedAmount = normalizeAmount(amount)
  const currency = normalizeCurrencyCode(options.currency)
  const locale = normalizeLocale(options.locale)
  const ruleDecimals = getRuleDecimals(options.currencyRule)

  if (currency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...fractionDigitOptions(currency, ruleDecimals, options),
      }).format(normalizedAmount)
    }
    catch {
      // Fall through to backend-rule formatting when a browser rejects an uncommon code.
    }
  }

  const formattedAmount = formatAmountWithRule(normalizedAmount, options.currencyRule)
  const symbol = normalizeCurrencySymbol(options.currencySymbol) || currency || ""

  return symbol ? `${formattedAmount} ${symbol}` : formattedAmount
}

export function parseCurrencyInput(
  value: string | number | null | undefined,
  currencyRule: CurrencyFormatRule | null = null,
) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const raw = String(value ?? "").trim()

  if (!raw) {
    return 0
  }

  const thousandSeparator = currencyRule?.thousand_sep
    ?? currencyRule?.thousandSep
    ?? DEFAULT_THOUSAND_SEPARATOR
  const decimalSeparator = currencyRule?.decimal_sep
    ?? currencyRule?.decimalSep
    ?? DEFAULT_DECIMAL_SEPARATOR
  const withoutThousands = thousandSeparator
    ? raw.replace(new RegExp(escapeRegExp(thousandSeparator), "g"), "")
    : raw
  const normalized = withoutThousands
    .replace(decimalSeparator, ".")
    .replace(/[^\d.-]/g, "")

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeAmount(amount: number | string | null | undefined) {
  if (typeof amount === "number") {
    return Number.isFinite(amount) ? amount : 0
  }

  const parsed = Number(String(amount ?? "").replace(/,/g, ""))

  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeCurrencyCode(currency?: string) {
  const code = String(currency ?? "").trim().toUpperCase()

  return ISO_CURRENCY_CODE.test(code) ? code : ""
}

function normalizeCurrencySymbol(symbol?: string) {
  return String(symbol ?? "").trim()
}

function normalizeLocale(locale?: string) {
  const normalized = String(locale ?? "").trim()

  if (!normalized) {
    return "vi-VN"
  }

  if (normalized === "vi") {
    return "vi-VN"
  }

  if (normalized === "en") {
    return "en-US"
  }

  return normalized
}

function getRuleDecimals(rule?: CurrencyFormatRule | null) {
  if (!rule || rule.decimals === undefined || rule.decimals === null) {
    return null
  }

  const decimals = Number(rule.decimals)

  return Number.isFinite(decimals) && decimals >= 0 ? decimals : null
}

function fractionDigitOptions(
  currency: string,
  ruleDecimals: number | null,
  options: FormatCurrencyOptions,
) {
  if (
    options.minimumFractionDigits !== undefined
    || options.maximumFractionDigits !== undefined
  ) {
    return {
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    }
  }

  if (ruleDecimals !== null) {
    return {
      minimumFractionDigits: ruleDecimals,
      maximumFractionDigits: ruleDecimals,
    }
  }

  if (currency === "VND") {
    return {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  }

  return {}
}

function formatAmountWithRule(amount: number, rule?: CurrencyFormatRule | null) {
  const decimals = getRuleDecimals(rule) ?? 0
  const decimalSeparator = rule?.decimal_sep
    ?? rule?.decimalSep
    ?? DEFAULT_DECIMAL_SEPARATOR
  const thousandSeparator = rule?.thousand_sep
    ?? rule?.thousandSep
    ?? DEFAULT_THOUSAND_SEPARATOR

  const [integerPart = "0", fractionPart = ""] = amount.toFixed(decimals).split(".")
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator)

  return fractionPart ? `${groupedInteger}${decimalSeparator}${fractionPart}` : groupedInteger
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
