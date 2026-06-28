import type { CreditCard, CardStatement, Installment } from '@/types/database'

export type CardRecommendation = 'excellent' | 'good' | 'caution' | 'avoid'

export interface CardTiming {
  card: CreditCard
  nextCutDate: Date
  daysUntilCut: number
  nextPaymentDate: Date
  graceIfBuyToday: number
  recommendation: CardRecommendation
  utilizationPct: number
  monthlyDiferidos: number
}

function todayMidnight(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function getNextCutDate(cutDay: number): Date {
  const today = todayMidnight()
  const thisMonthCut = new Date(today.getFullYear(), today.getMonth(), cutDay)
  return today.getTime() < thisMonthCut.getTime() ? thisMonthCut : new Date(today.getFullYear(), today.getMonth() + 1, cutDay)
}

export function getNextPaymentDate(cutDate: Date, paymentDueDay: number): Date {
  if (paymentDueDay > cutDate.getDate()) {
    return new Date(cutDate.getFullYear(), cutDate.getMonth(), paymentDueDay)
  }
  return new Date(cutDate.getFullYear(), cutDate.getMonth() + 1, paymentDueDay)
}

export function analyzeCard(
  card: CreditCard,
  statement: CardStatement | undefined,
  installments: Installment[]
): CardTiming {
  const today = todayMidnight()
  const nextCut = getNextCutDate(card.cut_day)
  const daysUntilCut = Math.round((nextCut.getTime() - today.getTime()) / 86_400_000)
  const nextPayment = getNextPaymentDate(nextCut, card.payment_due_day)
  const graceIfBuyToday = Math.round((nextPayment.getTime() - today.getTime()) / 86_400_000)

  const recommendation: CardRecommendation =
    daysUntilCut >= 20 ? 'excellent'
    : daysUntilCut >= 10 ? 'good'
    : daysUntilCut >= 5  ? 'caution'
    : 'avoid'

  const balance = statement?.closing_balance ?? 0
  const utilizationPct = card.credit_limit > 0 ? (balance / card.credit_limit) * 100 : 0
  const monthlyDiferidos = installments
    .filter(i => i.card_id === card.id && i.status === 'active')
    .reduce((s, i) => s + i.monthly_amount, 0)

  return { card, nextCutDate: nextCut, daysUntilCut, nextPaymentDate: nextPayment, graceIfBuyToday, recommendation, utilizationPct, monthlyDiferidos }
}

export function computeHealthScore(timings: CardTiming[], statements: CardStatement[]): number {
  let score = 100
  for (const t of timings) {
    if (t.utilizationPct > 70) score -= 15
    else if (t.utilizationPct > 50) score -= 8
    else if (t.utilizationPct > 30) score -= 4
  }
  for (const s of statements) {
    if (s.status === 'overdue') score -= 25
    else if (s.status === 'partial') score -= 8
    else if (s.status === 'paid') score += 3
  }
  return Math.max(0, Math.min(100, score))
}

export function getMonthlyCommitment(
  statements: CardStatement[],
  installments: Installment[]
): { diferidos: number; corriente: number; total: number } {
  const diferidos = installments.filter(i => i.status === 'active').reduce((s, i) => s + i.monthly_amount, 0)
  const corriente = statements.filter(s => s.status !== 'paid').reduce((s, st) => s + st.closing_balance, 0)
  return { diferidos, corriente, total: diferidos + corriente }
}
