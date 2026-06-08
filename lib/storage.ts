'use client'

// localStorage keys
const KEY = 'finfix_data'
const EXPENSES_KEY = 'finfix_expenses'

export interface Loan {
  id: string
  name: string
  outstanding: number       // INR
  emiAmount: number         // monthly INR
  interestRate: number      // annual %
  loanType: 'reducing_balance' | 'interest_only'
  type: 'personal' | 'gold' | 'home' | 'car' | 'credit_card' | 'other'
}

export interface FinancialProfile {
  salary: number            // monthly take-home INR
  loans: Loan[]
  fixedExpenses: number     // monthly non-EMI fixed INR
  variableExpenses: number  // monthly variable estimate INR
  updatedAt: string
}

export interface ExpenseEntry {
  id: string
  date: string              // YYYY-MM-DD
  category: string
  amount: number            // INR
  note: string
}

export function saveProfile(profile: Omit<FinancialProfile, 'updatedAt'>): void {
  const data: FinancialProfile = { ...profile, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadProfile(): FinancialProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as FinancialProfile
  } catch {
    return null
  }
}

export function clearProfile(): void {
  localStorage.removeItem(KEY)
}

export function saveExpenses(expenses: ExpenseEntry[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
}

export function loadExpenses(): ExpenseEntry[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(EXPENSES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ExpenseEntry[]
  } catch {
    return []
  }
}
