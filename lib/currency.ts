// All monetary values in paise (BigInt). 1 INR = 100 paise.

export function toINR(paise: bigint): number {
  return Number(paise) / 100
}

export function toPaise(inr: number): bigint {
  return BigInt(Math.round(inr * 100))
}

export function paiseToNumber(paise: bigint | number | string): number {
  return Number(paise) / 100
}

interface FormatOptions {
  compact?: boolean
  decimals?: number
}

export function formatINR(paise: bigint | number, options?: FormatOptions): string {
  const inr = Number(paise) / 100
  const abs = Math.abs(inr)
  const sign = inr < 0 ? '-' : ''

  if (options?.compact) {
    return sign + '₹' + formatCompact(abs)
  }

  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
  })

  return sign + '₹' + formatted
}

export function formatCompact(inr: number): string {
  if (inr >= 10_000_000) {
    const cr = inr / 10_000_000
    return cr % 1 === 0 ? `${cr}Cr` : `${cr.toFixed(2)}Cr`
  }
  if (inr >= 100_000) {
    const l = inr / 100_000
    return l % 1 === 0 ? `${l}L` : `${l.toFixed(2)}L`
  }
  if (inr >= 1_000) {
    const k = inr / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return inr.toString()
}

export function formatINRCompact(paise: bigint | number): string {
  return formatINR(paise, { compact: true })
}

export function parseINR(input: string): bigint {
  const cleaned = input.replace(/[₹,\s]/g, '')
  if (/L$/i.test(cleaned)) {
    const val = parseFloat(cleaned.replace(/L$/i, '')) * 100_000
    return toPaise(val)
  }
  if (/Cr$/i.test(cleaned)) {
    const val = parseFloat(cleaned.replace(/Cr$/i, '')) * 10_000_000
    return toPaise(val)
  }
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0n
  return toPaise(num)
}

export function addPaise(...amounts: bigint[]): bigint {
  return amounts.reduce((sum, a) => sum + a, 0n)
}

export function percentOf(paise: bigint, percent: number): bigint {
  return BigInt(Math.round(Number(paise) * percent))
}

export function percentageOf(part: bigint, total: bigint): number {
  if (total === 0n) return 0
  return (Number(part) / Number(total)) * 100
}
