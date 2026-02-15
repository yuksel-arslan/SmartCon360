-- CostPilot Initial Schema Migration
-- Creates cost schema with 12 tables

CREATE SCHEMA IF NOT EXISTS cost;

-- ============================================================================
-- 1. WORK ITEMS (Pozlar)
-- ============================================================================

CREATE TABLE cost.work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    unit VARCHAR(20) NOT NULL,

    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    trade_id UUID REFERENCES project.trades(id),

    source VARCHAR(30) DEFAULT 'custom',
    source_year INTEGER,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, code)
);

CREATE INDEX idx_work_items_project ON cost.work_items(project_id);
CREATE INDEX idx_work_items_category ON cost.work_items(category);
CREATE INDEX idx_work_items_trade ON cost.work_items(trade_id);

-- ============================================================================
-- 2. UNIT PRICE ANALYSES (Birim Fiyat Analizi)
-- ============================================================================

CREATE TABLE cost.unit_price_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id) ON DELETE CASCADE,

    version INTEGER DEFAULT 1,
    analysis_date DATE DEFAULT CURRENT_DATE,

    labor_cost DECIMAL(15, 4) DEFAULT 0,
    material_cost DECIMAL(15, 4) DEFAULT 0,
    equipment_cost DECIMAL(15, 4) DEFAULT 0,
    subtotal DECIMAL(15, 4) DEFAULT 0,

    overhead_pct DECIMAL(5, 2) DEFAULT 0,
    profit_pct DECIMAL(5, 2) DEFAULT 0,
    overhead_amount DECIMAL(15, 4) DEFAULT 0,
    profit_amount DECIMAL(15, 4) DEFAULT 0,

    unit_price DECIMAL(15, 4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',

    source VARCHAR(30) DEFAULT 'manual',
    notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_unit_price_work_item ON cost.unit_price_analyses(work_item_id);

-- ============================================================================
-- 3. UNIT PRICE RESOURCES (Analiz Kaynaklari)
-- ============================================================================

CREATE TABLE cost.unit_price_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES cost.unit_price_analyses(id) ON DELETE CASCADE,

    resource_type VARCHAR(20) NOT NULL,

    code VARCHAR(30),
    name VARCHAR(500) NOT NULL,
    unit VARCHAR(20) NOT NULL,

    quantity DECIMAL(15, 6) NOT NULL,
    unit_rate DECIMAL(15, 4) NOT NULL,
    total DECIMAL(15, 4) NOT NULL,

    rate_source VARCHAR(30) DEFAULT 'manual',
    rate_date DATE,

    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_unit_price_resources_analysis ON cost.unit_price_resources(analysis_id);
CREATE INDEX idx_unit_price_resources_type ON cost.unit_price_resources(resource_type);

-- ============================================================================
-- 4. QUANTITY TAKEOFFS (Metraj Cetveli)
-- ============================================================================

CREATE TABLE cost.quantity_takeoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),

    quantity DECIMAL(15, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,

    calculation_formula TEXT,
    dimensions JSONB,

    source VARCHAR(30) DEFAULT 'manual',
    drawing_ref VARCHAR(100),
    bim_element_id VARCHAR(100),

    revision INTEGER DEFAULT 1,
    revision_reason TEXT,

    notes TEXT,
    measured_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_qty_project ON cost.quantity_takeoffs(project_id);
CREATE INDEX idx_qty_work_item ON cost.quantity_takeoffs(work_item_id);
CREATE INDEX idx_qty_location ON cost.quantity_takeoffs(location_id);

-- ============================================================================
-- 5. ESTIMATES (Kesif / Yaklasik Maliyet)
-- ============================================================================

CREATE TABLE cost.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL,

    total_amount DECIMAL(18, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'TRY',

    vat_pct DECIMAL(5, 2) DEFAULT 20,
    vat_amount DECIMAL(18, 2) DEFAULT 0,
    grand_total DECIMAL(18, 2) DEFAULT 0,

    status VARCHAR(20) DEFAULT 'draft',

    approved_by UUID REFERENCES auth.users(id),
    approved_date DATE,
    version INTEGER DEFAULT 1,
    parent_estimate_id UUID REFERENCES cost.estimates(id),

    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_estimates_project ON cost.estimates(project_id);
CREATE INDEX idx_estimates_status ON cost.estimates(status);

-- ============================================================================
-- 6. ESTIMATE ITEMS (Kesif Kalemleri)
-- ============================================================================

CREATE TABLE cost.estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES cost.estimates(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),

    quantity DECIMAL(15, 4) NOT NULL,
    unit_price DECIMAL(15, 4) NOT NULL,
    total_price DECIMAL(18, 2) NOT NULL,

    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_estimate_items_estimate ON cost.estimate_items(estimate_id);

-- ============================================================================
-- 7. BUDGETS (Butce)
-- ============================================================================

CREATE TABLE cost.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES cost.estimates(id),

    name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',

    status VARCHAR(20) DEFAULT 'draft',
    approved_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budgets_project ON cost.budgets(project_id);

-- ============================================================================
-- 8. BUDGET ITEMS (Butce Kalemleri)
-- ============================================================================

CREATE TABLE cost.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES cost.budgets(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES cost.work_items(id),

    wbs_code VARCHAR(30),
    description VARCHAR(500) NOT NULL,
    trade_id UUID REFERENCES project.trades(id),

    planned_amount DECIMAL(18, 2) NOT NULL,
    committed_amount DECIMAL(18, 2) DEFAULT 0,
    actual_amount DECIMAL(18, 2) DEFAULT 0,

    category VARCHAR(30) NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budget_items_budget ON cost.budget_items(budget_id);

-- ============================================================================
-- 9. PAYMENT CERTIFICATES (Hakedis)
-- ============================================================================

CREATE TABLE cost.payment_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES cost.budgets(id),

    period_number INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    gross_amount DECIMAL(18, 2) DEFAULT 0,

    retention_pct DECIMAL(5, 2) DEFAULT 0,
    retention_amount DECIMAL(18, 2) DEFAULT 0,
    advance_deduction DECIMAL(18, 2) DEFAULT 0,
    other_deductions DECIMAL(18, 2) DEFAULT 0,
    deduction_notes TEXT,

    price_escalation DECIMAL(18, 2) DEFAULT 0,
    escalation_index VARCHAR(50),
    escalation_formula TEXT,

    vat_pct DECIMAL(5, 2) DEFAULT 20,
    vat_amount DECIMAL(18, 2) DEFAULT 0,

    net_amount DECIMAL(18, 2) DEFAULT 0,
    cumulative_amount DECIMAL(18, 2) DEFAULT 0,

    status VARCHAR(20) DEFAULT 'draft',

    submitted_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    approved_date DATE,
    payment_date DATE,

    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, period_number)
);

CREATE INDEX idx_payment_certs_project ON cost.payment_certificates(project_id);
CREATE INDEX idx_payment_certs_status ON cost.payment_certificates(status);

-- ============================================================================
-- 10. PAYMENT ITEMS (Hakedis Kalemleri / Imalat Metraji)
-- ============================================================================

CREATE TABLE cost.payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES cost.payment_certificates(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),

    contract_qty DECIMAL(15, 4) NOT NULL,
    previous_qty DECIMAL(15, 4) DEFAULT 0,
    current_qty DECIMAL(15, 4) DEFAULT 0,
    cumulative_qty DECIMAL(15, 4) DEFAULT 0,

    unit_price DECIMAL(15, 4) NOT NULL,

    current_amount DECIMAL(18, 2) DEFAULT 0,
    cumulative_amount DECIMAL(18, 2) DEFAULT 0,

    completion_pct DECIMAL(5, 2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_items_cert ON cost.payment_items(certificate_id);
CREATE INDEX idx_payment_items_work_item ON cost.payment_items(work_item_id);

-- ============================================================================
-- 11. EVM SNAPSHOTS (EVM Kayitlari)
-- ============================================================================

CREATE TABLE cost.evm_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    snapshot_date DATE NOT NULL,

    pv DECIMAL(18, 2) NOT NULL,
    ev DECIMAL(18, 2) NOT NULL,
    ac DECIMAL(18, 2) NOT NULL,

    cv DECIMAL(18, 2),
    sv DECIMAL(18, 2),

    cpi DECIMAL(8, 4),
    spi DECIMAL(8, 4),

    eac DECIMAL(18, 2),
    etc DECIMAL(18, 2),
    vac DECIMAL(18, 2),
    tcpi DECIMAL(8, 4),

    data_source VARCHAR(20) DEFAULT 'calculated',

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evm_project ON cost.evm_snapshots(project_id);
CREATE INDEX idx_evm_date ON cost.evm_snapshots(snapshot_date);

-- ============================================================================
-- 12. COST RECORDS (Maliyet Kayitlari)
-- ============================================================================

CREATE TABLE cost.cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES cost.budget_items(id),

    amount DECIMAL(18, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    invoice_ref VARCHAR(100),
    vendor VARCHAR(255),

    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cost_records_project ON cost.cost_records(project_id);
CREATE INDEX idx_cost_records_type ON cost.cost_records(type);
CREATE INDEX idx_cost_records_date ON cost.cost_records(date);
