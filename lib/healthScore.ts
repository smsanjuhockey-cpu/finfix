// Financial Health Score engine — 0 to 100.
// Weighted composite of 4 indicators relevant to debt-heavy salaried Indians.

export interface HealthScoreInput {
  monthlySalary: number        // INR
  totalMonthlyEMI: number      // INR (all loans combined)
  fixedExpenses: number        // INR (non-EMI: rent, insurance, parents, etc.)
  variableExpenses: number     // INR (food, fuel, lifestyle)
  totalOutstandingDebt: number // INR
}

export interface HealthScoreResult {
  score: number                // 0–100
  grade: 'green' | 'amber' | 'red'
  label: string
  verdict: string              // plain-language 1-liner
  components: {
    dti: ComponentScore
    monthlySurplus: ComponentScore
    debtBurden: ComponentScore
    savingsRate: ComponentScore
  }
  monthlySurplus: number       // INR (can be negative)
  dtiRatio: number             // 0–100%
}

export interface ComponentScore {
  label: string
  score: number                // 0–100
  weight: number
  detail: string
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    monthlySalary,
    totalMonthlyEMI,
    fixedExpenses,
    variableExpenses,
    totalOutstandingDebt,
  } = input

  const totalFixed = totalMonthlyEMI + fixedExpenses
  const totalSpend = totalFixed + variableExpenses
  const surplus = monthlySalary - totalSpend

  // 1. Debt-to-Income ratio (EMI / salary) — weight 35%
  const dtiRatio = monthlySalary > 0 ? (totalMonthlyEMI / monthlySalary) * 100 : 100
  let dtiScore: number
  if (dtiRatio <= 20) dtiScore = 100
  else if (dtiRatio <= 30) dtiScore = 80
  else if (dtiRatio <= 40) dtiScore = 60
  else if (dtiRatio <= 50) dtiScore = 40
  else if (dtiRatio <= 60) dtiScore = 20
  else dtiScore = 0

  const dtiDetail =
    dtiRatio <= 30 ? `${dtiRatio.toFixed(0)}% of salary goes to EMIs — healthy range` :
    dtiRatio <= 50 ? `${dtiRatio.toFixed(0)}% of salary goes to EMIs — high pressure` :
    `${dtiRatio.toFixed(0)}% of salary goes to EMIs — critical overload`

  // 2. Monthly surplus — weight 30%
  const surplusRatio = monthlySalary > 0 ? (surplus / monthlySalary) * 100 : -100
  let surplusScore: number
  if (surplusRatio >= 20) surplusScore = 100
  else if (surplusRatio >= 10) surplusScore = 80
  else if (surplusRatio >= 0) surplusScore = 50
  else if (surplusRatio >= -10) surplusScore = 20
  else surplusScore = 0

  const surplusDetail =
    surplus >= 0
      ? `₹${surplus.toLocaleString('en-IN')} left after all expenses`
      : `₹${Math.abs(surplus).toLocaleString('en-IN')} monthly deficit — you are borrowing to survive`

  // 3. Debt burden (total debt vs annual salary) — weight 20%
  const debtToAnnualSalary = monthlySalary > 0 ? totalOutstandingDebt / (monthlySalary * 12) : 10
  let debtBurdenScore: number
  if (debtToAnnualSalary <= 1) debtBurdenScore = 100
  else if (debtToAnnualSalary <= 2) debtBurdenScore = 70
  else if (debtToAnnualSalary <= 3) debtBurdenScore = 40
  else if (debtToAnnualSalary <= 5) debtBurdenScore = 15
  else debtBurdenScore = 0

  const debtBurdenDetail =
    debtToAnnualSalary <= 2
      ? `Total debt is ${debtToAnnualSalary.toFixed(1)}× your annual salary — manageable`
      : `Total debt is ${debtToAnnualSalary.toFixed(1)}× your annual salary — multi-year burden`

  // 4. Savings rate (surplus as % of salary) — weight 15%
  const savingsRate = surplusRatio > 0 ? surplusRatio : 0
  let savingsScore: number
  if (savingsRate >= 20) savingsScore = 100
  else if (savingsRate >= 10) savingsScore = 70
  else if (savingsRate >= 5) savingsScore = 40
  else savingsScore = 0

  const savingsDetail =
    savingsRate >= 10
      ? `${savingsRate.toFixed(0)}% savings rate — building future`
      : `${savingsRate.toFixed(0)}% savings rate — no cushion for emergencies`

  // Weighted composite
  const score = Math.round(
    dtiScore * 0.35 +
    surplusScore * 0.30 +
    debtBurdenScore * 0.20 +
    savingsScore * 0.15
  )

  const grade: 'green' | 'amber' | 'red' =
    score >= 65 ? 'green' :
    score >= 35 ? 'amber' :
    'red'

  const label =
    grade === 'green' ? 'Financially Stable' :
    grade === 'amber' ? 'Under Pressure' :
    'Critical — Immediate Action Needed'

  const verdict =
    score >= 65
      ? 'Your finances are in reasonable shape. Focus on building emergency fund and accelerating debt closure.'
      : score >= 35
      ? 'You are managing but have no buffer. One unexpected expense puts you in a debt spiral. Act now.'
      : surplus < 0
      ? `You are spending ₹${Math.abs(surplus).toLocaleString('en-IN')} more than you earn every month. This is unsustainable.`
      : `You are paying ₹${dtiRatio.toFixed(0)} in every ₹100 earned towards EMIs. Debt freedom must be your only priority.`

  return {
    score,
    grade,
    label,
    verdict,
    components: {
      dti: { label: 'Debt-to-Income Ratio', score: dtiScore, weight: 35, detail: dtiDetail },
      monthlySurplus: { label: 'Monthly Cash Position', score: surplusScore, weight: 30, detail: surplusDetail },
      debtBurden: { label: 'Total Debt Burden', score: debtBurdenScore, weight: 20, detail: debtBurdenDetail },
      savingsRate: { label: 'Savings Rate', score: savingsScore, weight: 15, detail: savingsDetail },
    },
    monthlySurplus: surplus,
    dtiRatio,
  }
}
