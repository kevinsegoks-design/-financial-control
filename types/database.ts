export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type WorkspaceType = 'personal' | 'business'
export type CardStatus = 'active' | 'inactive' | 'blocked'
export type StatementStatus = 'pending' | 'paid' | 'partial' | 'overdue'
export type ObligationStatus = 'active' | 'inactive' | 'cancelled'
export type PeriodStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'waived'
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type Frequency = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annual'

export interface AppUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'inactive'
  created_at: string
}

export interface Bank {
  id: string
  workspace_id: string
  name: string
  logo: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface PersonalMember {
  id: string
  workspace_id: string
  name: string
  color: string
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface CreditCard {
  id: string
  workspace_id: string
  bank_id: string
  personal_member_id: string | null
  holder: string
  nickname: string | null
  last_four: string | null
  credit_limit: number
  cut_day: number
  payment_due_day: number
  interest_rate: number | null
  rewards_type: string | null
  status: CardStatus
  accent_color: string
  notes: string | null
  created_at: string
  updated_at: string
  // Joins
  bank?: Bank
  personal_member?: PersonalMember
}

export interface CardStatement {
  id: string
  workspace_id: string
  card_id: string
  period: string // 'YYYY-MM'
  closing_balance: number
  minimum_payment: number | null
  due_date: string
  status: StatementStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joins
  credit_card?: CreditCard
  payments?: PersonalPayment[]
}

export interface Installment {
  id: string
  workspace_id: string
  card_id: string
  description: string
  total_amount: number
  monthly_amount: number
  total_installments: number
  remaining_installments: number
  remaining_balance: number
  start_date: string
  status: 'active' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  // Joins
  credit_card?: CreditCard
}

export interface Obligation {
  id: string
  workspace_id: string
  personal_member_id: string | null
  name: string
  category: string
  amount: number
  is_variable: boolean
  due_day: number | null
  frequency: Frequency
  status: ObligationStatus
  created_at: string
  updated_at: string
  // Joins
  personal_member?: PersonalMember
  current_period?: ObligationPeriod
}

export interface ObligationPeriod {
  id: string
  workspace_id: string
  obligation_id: string
  period: string
  due_date: string
  amount_due: number
  amount_paid: number
  status: PeriodStatus
  created_at: string
  updated_at: string
}

export interface PersonalPayment {
  id: string
  workspace_id: string
  obligation_period_id: string | null
  card_statement_id: string | null
  amount: number
  payment_date: string
  payment_method: string | null
  notes: string | null
  created_at: string
}

export interface Supplier {
  id: string
  workspace_id: string
  name: string
  rfc: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SupplierInvoice {
  id: string
  workspace_id: string
  supplier_id: string
  invoice_number: string | null
  issue_date: string
  due_date: string
  total_amount: number
  pending_balance: number
  status: InvoiceStatus
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joins
  supplier?: Supplier
  payments?: InvoicePayment[]
}

export interface InvoicePayment {
  id: string
  workspace_id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  notes: string | null
  created_at: string
}

// ===== Dashboard types =====

export interface DashboardStats {
  totalLimit: number
  totalUsed: number
  totalAvailable: number
  overdueCount: number
  dueTodayCount: number
  due7DaysCount: number
  due30DaysCount: number
  activeInstallmentsTotal: number
}

export interface DueItem {
  id: string
  type: 'card_statement' | 'obligation_period'
  name: string
  amount: number
  due_date: string
  status: StatementStatus | PeriodStatus
  accent_color?: string
  card_last_four?: string
  bank_name?: string
}
