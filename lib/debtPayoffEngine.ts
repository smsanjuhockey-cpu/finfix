// Debt Payoff Engine — pure math, no DB calls.
// Ported from FinPlan. Supports Avalanche, Snowball, Custom strategies.
// Handles reducing_balance and interest_only loan types.
// Debt stacking: freed EMIs redirect to next priority loan.

export type LoanType = 'reducing_balance' | 'interest_only'

export interface LoanInput {
  id: string
  name: string
  outstanding: bigint      // paise
  interestRate: number     // annual %
  emiAmount: bigint        // monthly EMI in paise (0 for interest-only)
  loanType: LoanType
  priority?: number
}

export interface DebtPayoffResult {
  strategy: 'avalanche' | 'snowball' | 'custom'
  debtFreeMonths: number
  debtFreeDate: Date
  totalInterestPaid: bigint
  interestSavedVsMinimum: bigint
  milestones: LoanMilestone[]
  monthlySchedule: MonthlySnapshot[]
}

export interface LoanMilestone {
  loanId: string
  loanName: string
  closesAtMonth: number
  closesAtDate: Date
  freedEMI: bigint
  interestPaid: bigint
}

export interface MonthlySnapshot {
  month: number
  date: Date
  balances: Record<string, bigint>
  totalDebt: bigint
  totalInterestThisMonth: bigint
  totalPrincipalThisMonth: bigint
  extraPaymentThisMonth: bigint
}

function minimumInterestTotal(loans: LoanInput[]): bigint {
  let total = 0n
  for (const loan of loans) {
    if (loan.loanType === 'interest_only') {
      const monthlyInterest = BigInt(Math.round(Number(loan.outstanding) * loan.interestRate / 12 / 100))
      total += monthlyInterest * 60n
    } else {
      const r = loan.interestRate / 12 / 100
      const p = Number(loan.outstanding)
      const emi = Number(loan.emiAmount)
      if (r === 0 || emi === 0) continue
      const n = -Math.log(1 - (p * r) / emi) / Math.log(1 + r)
      total += BigInt(Math.round(emi * Math.ceil(n) - p))
    }
  }
  return total
}

function sortByStrategy(
  loans: LoanInput[],
  strategy: 'avalanche' | 'snowball' | 'custom'
): LoanInput[] {
  const sorted = [...loans]
  if (strategy === 'avalanche') {
    sorted.sort((a, b) => b.interestRate - a.interestRate)
  } else if (strategy === 'snowball') {
    sorted.sort((a, b) => Number(a.outstanding - b.outstanding))
  } else {
    sorted.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  }
  // Interest-only loans always first (most dangerous)
  sorted.sort((a, b) => {
    if (a.loanType === 'interest_only' && b.loanType !== 'interest_only') return -1
    if (b.loanType === 'interest_only' && a.loanType !== 'interest_only') return 1
    return 0
  })
  return sorted
}

export function computeDebtPayoff(
  loans: LoanInput[],
  monthlyExtra: bigint,
  strategy: 'avalanche' | 'snowball' | 'custom',
  startDate: Date = new Date()
): DebtPayoffResult {
  const minimumInterest = minimumInterestTotal(loans)
  const balances: Record<string, bigint> = {}
  for (const loan of loans) balances[loan.id] = loan.outstanding

  const sorted = sortByStrategy(loans, strategy)
  const milestones: LoanMilestone[] = []
  const monthlySchedule: MonthlySnapshot[] = []

  let totalInterestPaid = 0n
  let availableExtra = monthlyExtra
  let month = 0
  const MAX_MONTHS = 600

  while (month < MAX_MONTHS) {
    const totalRemaining = Object.values(balances).reduce((s, b) => s + b, 0n)
    if (totalRemaining <= 0n) break

    month++
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + month)

    let monthInterest = 0n
    let monthPrincipal = 0n
    let extraUsed = 0n

    for (const loan of sorted) {
      const balance = balances[loan.id]
      if (balance <= 0n) continue

      const r = loan.interestRate / 12 / 100
      const interest = BigInt(Math.round(Number(balance) * r))
      monthInterest += interest

      if (loan.loanType === 'interest_only') {
        totalInterestPaid += interest
      } else {
        const emi = loan.emiAmount < interest ? interest + 1n : loan.emiAmount
        const principal = emi - interest <= balance ? emi - interest : balance
        balances[loan.id] = balance - principal
        monthPrincipal += principal
        totalInterestPaid += interest
      }
    }

    let extraRemaining = availableExtra
    for (const loan of sorted) {
      if (extraRemaining <= 0n) break
      const balance = balances[loan.id]
      if (balance <= 0n) continue
      const payment = balance < extraRemaining ? balance : extraRemaining
      balances[loan.id] = balance - payment
      monthPrincipal += payment
      extraRemaining -= payment
      extraUsed += payment
    }

    for (const loan of sorted) {
      if (balances[loan.id] <= 0n && !milestones.find((m) => m.loanId === loan.id)) {
        const freedEMI = loan.loanType === 'interest_only'
          ? BigInt(Math.round(Number(loan.outstanding) * loan.interestRate / 12 / 100))
          : loan.emiAmount

        milestones.push({
          loanId: loan.id,
          loanName: loan.name,
          closesAtMonth: month,
          closesAtDate: date,
          freedEMI,
          interestPaid: 0n,
        })
        availableExtra += freedEMI
      }
    }

    monthlySchedule.push({
      month,
      date,
      balances: { ...balances },
      totalDebt: Object.values(balances).reduce((s, b) => s + b, 0n),
      totalInterestThisMonth: monthInterest,
      totalPrincipalThisMonth: monthPrincipal,
      extraPaymentThisMonth: extraUsed,
    })
  }

  const debtFreeDate = new Date(startDate)
  debtFreeDate.setMonth(debtFreeDate.getMonth() + month)

  return {
    strategy,
    debtFreeMonths: month,
    debtFreeDate,
    totalInterestPaid,
    interestSavedVsMinimum: minimumInterest > totalInterestPaid
      ? minimumInterest - totalInterestPaid
      : 0n,
    milestones,
    monthlySchedule,
  }
}

export function simulateLumpSum(
  loans: LoanInput[],
  monthlyExtra: bigint,
  strategy: 'avalanche' | 'snowball' | 'custom',
  lumpSum: bigint,
  targetLoanId: string
): { newDebtFreeDate: Date; monthsSaved: number; interestSaved: bigint } {
  const modifiedLoans = loans.map((l) =>
    l.id === targetLoanId
      ? { ...l, outstanding: l.outstanding > lumpSum ? l.outstanding - lumpSum : 0n }
      : l
  )
  const baseline = computeDebtPayoff(loans, monthlyExtra, strategy)
  const withLump = computeDebtPayoff(modifiedLoans, monthlyExtra, strategy)

  return {
    newDebtFreeDate: withLump.debtFreeDate,
    monthsSaved: baseline.debtFreeMonths - withLump.debtFreeMonths,
    interestSaved: baseline.totalInterestPaid - withLump.totalInterestPaid,
  }
}
