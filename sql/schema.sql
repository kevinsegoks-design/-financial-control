-- ============================================================
-- FINANCIAL CONTROL APP — SUPABASE SCHEMA COMPLETO
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPER FUNCTION PARA RLS
-- ============================================================
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  );
END;
$$;

-- ============================================================
-- INFRAESTRUCTURA
-- ============================================================

-- app_users: espejo de auth.users
CREATE TABLE IF NOT EXISTS app_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('personal','business')),
  owner_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workspace_members
CREATE TABLE IF NOT EXISTS workspace_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','member')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================================
-- DATOS — ÁREA PERSONAL
-- ============================================================

-- banks
CREATE TABLE IF NOT EXISTS banks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  logo          TEXT,
  color         TEXT NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- personal_members (Kevin, Alejandra)
CREATE TABLE IF NOT EXISTS personal_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6366f1',
  avatar        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- credit_cards
CREATE TABLE IF NOT EXISTS credit_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  bank_id         UUID NOT NULL REFERENCES banks(id),
  personal_member_id UUID REFERENCES personal_members(id),
  holder          TEXT NOT NULL,
  nickname        TEXT,
  last_four       TEXT,
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  cut_day         INTEGER NOT NULL CHECK (cut_day BETWEEN 1 AND 31),
  payment_due_day INTEGER NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
  interest_rate   NUMERIC(5,2),
  rewards_type    TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  accent_color    TEXT NOT NULL DEFAULT '#FFD60A',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- card_statements (histórico mensual)
CREATE TABLE IF NOT EXISTS card_statements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  card_id          UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  period           TEXT NOT NULL,             -- 'YYYY-MM'
  closing_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  minimum_payment  NUMERIC(12,2),
  due_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','partial','overdue')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, period)
);

-- installments (diferidos)
CREATE TABLE IF NOT EXISTS installments (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  card_id                UUID NOT NULL REFERENCES credit_cards(id),
  description            TEXT NOT NULL,
  total_amount           NUMERIC(12,2) NOT NULL,
  monthly_amount         NUMERIC(12,2) NOT NULL,
  total_installments     INTEGER NOT NULL,
  remaining_installments INTEGER NOT NULL,
  remaining_balance      NUMERIC(12,2) NOT NULL,
  start_date             DATE NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','completed','cancelled')),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- obligations (gastos fijos/variables recurrentes)
CREATE TABLE IF NOT EXISTS obligations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  personal_member_id  UUID REFERENCES personal_members(id),  -- NULL = compartida
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  is_variable         BOOLEAN NOT NULL DEFAULT FALSE,
  due_day             INTEGER CHECK (due_day BETWEEN 1 AND 31),
  frequency           TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (frequency IN ('weekly','monthly','bimonthly','quarterly','annual')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- obligation_periods (histórico mensual por obligación)
CREATE TABLE IF NOT EXISTS obligation_periods (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  obligation_id  UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  period         TEXT NOT NULL,          -- 'YYYY-MM'
  due_date       DATE NOT NULL,
  amount_due     NUMERIC(12,2) NOT NULL,
  amount_paid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','partial','overdue','waived')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obligation_id, period)
);

-- personal_payments (apunta a obligation_period O card_statement, nunca ambos)
CREATE TABLE IF NOT EXISTS personal_payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  obligation_period_id UUID REFERENCES obligation_periods(id),
  card_statement_id    UUID REFERENCES card_statements(id),
  amount               NUMERIC(12,2) NOT NULL,
  payment_date         DATE NOT NULL,
  payment_method       TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_target CHECK (
    (obligation_period_id IS NOT NULL AND card_statement_id IS NULL) OR
    (obligation_period_id IS NULL AND card_statement_id IS NOT NULL)
  )
);

-- ============================================================
-- DATOS — ÁREA DE NEGOCIO
-- ============================================================

-- suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  rfc           TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- supplier_invoices (con pending_balance)
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  invoice_number  TEXT,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  total_amount    NUMERIC(12,2) NOT NULL,
  pending_balance NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
  description     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- invoice_payments (pagos parciales a facturas)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_method  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user  ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws    ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_banks_ws                ON banks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_personal_members_ws     ON personal_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_ws         ON credit_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_bank       ON credit_cards(bank_id);
CREATE INDEX IF NOT EXISTS idx_card_statements_ws      ON card_statements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_card_statements_card    ON card_statements(card_id);
CREATE INDEX IF NOT EXISTS idx_card_statements_period  ON card_statements(period);
CREATE INDEX IF NOT EXISTS idx_installments_ws         ON installments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_obligations_ws          ON obligations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_obligation_periods_ws   ON obligation_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_obligation_periods_obl  ON obligation_periods(obligation_id);
CREATE INDEX IF NOT EXISTS idx_personal_payments_ws    ON personal_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_ws            ON suppliers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_ws    ON supplier_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_ws     ON invoice_payments(workspace_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_users','workspaces','banks','personal_members','credit_cards',
    'card_statements','installments','obligations','obligation_periods',
    'suppliers','supplier_invoices'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- TRIGGER: sync auth.users → app_users al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ws_personal UUID;
  ws_business UUID;
BEGIN
  -- Insertar en app_users
  INSERT INTO app_users(id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  -- Crear workspace personal
  INSERT INTO workspaces(name, type, owner_id)
  VALUES ('Finanzas Personales', 'personal', NEW.id)
  RETURNING id INTO ws_personal;

  INSERT INTO workspace_members(workspace_id, user_id, role)
  VALUES (ws_personal, NEW.id, 'owner');

  -- Crear personal_members por defecto
  INSERT INTO personal_members(workspace_id, name, color)
  VALUES
    (ws_personal, 'Kevin',     '#9D7BFF'),
    (ws_personal, 'Alejandra', '#FF6B9D');

  -- Crear workspace de negocio
  INSERT INTO workspaces(name, type, owner_id)
  VALUES ('Ale New Color', 'business', NEW.id)
  RETURNING id INTO ws_business;

  INSERT INTO workspace_members(workspace_id, user_id, role)
  VALUES (ws_business, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- app_users: cada quien ve solo su propio registro
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_row" ON app_users
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- workspaces: miembros activos pueden ver
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_member_select" ON workspaces FOR SELECT
  USING (is_workspace_member(id));
CREATE POLICY "ws_owner_insert" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws_owner_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wm_member_select" ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY "wm_owner_insert" ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

-- Macro: habilitar RLS en todas las tablas de datos
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'banks','personal_members','credit_cards','card_statements',
    'installments','obligations','obligation_periods','personal_payments',
    'suppliers','supplier_invoices','invoice_payments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "rls_select_%I" ON %I FOR SELECT
       USING (is_workspace_member(workspace_id))', t, t);
    EXECUTE format(
      'CREATE POLICY "rls_insert_%I" ON %I FOR INSERT
       WITH CHECK (is_workspace_member(workspace_id))', t, t);
    EXECUTE format(
      'CREATE POLICY "rls_update_%I" ON %I FOR UPDATE
       USING (is_workspace_member(workspace_id))', t, t);
    EXECUTE format(
      'CREATE POLICY "rls_delete_%I" ON %I FOR DELETE
       USING (is_workspace_member(workspace_id))', t, t);
  END LOOP;
END $$;
