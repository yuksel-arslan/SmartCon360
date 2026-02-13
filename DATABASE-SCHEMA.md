# DATABASE-SCHEMA.md — TaktFlow AI

## Overview

TaktFlow AI uses PostgreSQL as the primary data store with schema-based isolation per service domain. Each microservice owns its schema and manages its own migrations via Prisma (Node.js) or Alembic (Python).

## Schema Map

| Schema | Owner Service | Tables |
|--------|--------------|--------|
| `auth` | auth-service | users, sessions, roles, permissions, user_roles |
| `project` | project-service | projects, project_members, locations, location_types |
| `takt` | takt-engine | takt_plans, takt_zones, takt_wagons, takt_periods, takt_assignments |
| `constraint` | constraint-service | constraints, constraint_categories, constraint_logs |
| `progress` | progress-service | progress_updates, ppc_records, variance_records, daily_logs |
| `resource` | resource-service | crews, crew_members, equipment, materials, resource_assignments |
| `notification` | notification-service | notifications, notification_preferences |
| `report` | reporting-service | reports, report_templates |

---

## auth Schema

### users
```sql
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),              -- NULL for OAuth users
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    company VARCHAR(255),
    job_title VARCHAR(100),
    locale VARCHAR(10) DEFAULT 'en',         -- en, tr, de, ar
    timezone VARCHAR(50) DEFAULT 'UTC',
    auth_provider VARCHAR(20) DEFAULT 'local', -- local, google, microsoft
    auth_provider_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth.users(email);
```

### sessions
```sql
CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    device_info JSONB,                       -- {browser, os, ip}
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX idx_sessions_token ON auth.sessions(refresh_token);
```

### roles
```sql
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,        -- admin, project_manager, superintendent, foreman, viewer
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',  -- ["project:read", "takt:write", ...]
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default roles
INSERT INTO auth.roles (name, description, permissions, is_system) VALUES
('admin', 'Full system access', '["*"]', true),
('project_manager', 'Project management', '["project:*", "takt:*", "constraint:*", "progress:*", "report:*", "resource:*"]', true),
('superintendent', 'Field management', '["project:read", "takt:read", "constraint:*", "progress:*", "resource:read"]', true),
('foreman', 'Trade crew leader', '["project:read", "takt:read", "constraint:read", "progress:write"]', true),
('viewer', 'Read-only access', '["project:read", "takt:read", "constraint:read", "progress:read", "report:read"]', true);
```

### user_roles
```sql
CREATE TABLE auth.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    project_id UUID,                         -- NULL = global role, UUID = project-specific role
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id, project_id)
);
```

---

## project Schema

### projects
```sql
CREATE TABLE project.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,        -- PRJ-001
    description TEXT,
    project_type VARCHAR(50) NOT NULL,       -- hotel, hospital, residential, commercial, industrial, infrastructure
    status VARCHAR(30) DEFAULT 'planning',   -- planning, active, on_hold, completed, archived
    
    -- Location
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Dates
    planned_start DATE,
    planned_finish DATE,
    actual_start DATE,
    actual_finish DATE,
    
    -- Takt defaults
    default_takt_time INTEGER DEFAULT 5,     -- days
    working_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',
    work_hours JSONB DEFAULT '{"start":"07:00","end":"17:00"}',
    
    -- Financials
    budget DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Metadata
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID,
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON project.projects(owner_id);
CREATE INDEX idx_projects_status ON project.projects(status);
```

### project_members
```sql
CREATE TABLE project.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,               -- project_manager, superintendent, foreman, viewer
    trade VARCHAR(100),                      -- assigned trade (for foremen)
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'active',     -- active, invited, removed
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_members_project ON project.project_members(project_id);
```

### locations (LBS - Location Breakdown Structure)
```sql
CREATE TABLE project.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES project.locations(id) ON DELETE CASCADE,
    
    code VARCHAR(50) NOT NULL,               -- B1-F02-Z01
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(30) NOT NULL,      -- site, building, floor, zone, room, area
    
    -- Physical attributes
    area_sqm DECIMAL(10, 2),
    volume_cbm DECIMAL(10, 2),
    
    -- Sequence & hierarchy
    sort_order INTEGER DEFAULT 0,
    path VARCHAR(500),                       -- Materialized path: /B1/F02/Z01
    depth INTEGER DEFAULT 0,                 -- Hierarchy level
    
    -- BIM reference
    bim_guid VARCHAR(100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(project_id, code)
);

CREATE INDEX idx_locations_project ON project.locations(project_id);
CREATE INDEX idx_locations_parent ON project.locations(parent_id);
CREATE INDEX idx_locations_path ON project.locations(path);
CREATE INDEX idx_locations_type ON project.locations(location_type);
```

### trades
```sql
CREATE TABLE project.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,              -- Structure, MEP Rough-in, Drywall, etc.
    code VARCHAR(20) NOT NULL,               -- STR, MEP-R, DRY, etc.
    color VARCHAR(7) NOT NULL,               -- #3B82F6
    
    -- Default crew info
    default_crew_size INTEGER DEFAULT 4,
    productivity_rate DECIMAL(8, 4),         -- units per day per worker
    unit_of_measure VARCHAR(20),             -- sqm, lm, pcs, etc.
    
    -- Sequence
    sort_order INTEGER DEFAULT 0,
    
    -- Dependencies (which trades must finish before this can start)
    predecessor_trade_ids UUID[] DEFAULT '{}',
    
    -- Contractor/subcontractor
    company_name VARCHAR(255),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(project_id, code)
);

CREATE INDEX idx_trades_project ON project.trades(project_id);
```

---

## takt Schema

### takt_plans
```sql
CREATE TABLE takt.takt_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,              -- "Main Building Takt Plan v3"
    version INTEGER DEFAULT 1,
    status VARCHAR(30) DEFAULT 'draft',      -- draft, active, superseded, archived
    
    -- Takt configuration
    takt_time INTEGER NOT NULL,              -- days per takt period
    num_zones INTEGER NOT NULL,
    num_trades INTEGER NOT NULL,
    total_periods INTEGER NOT NULL,          -- calculated: num_zones + num_trades - 1
    
    -- Date range
    start_date DATE NOT NULL,
    end_date DATE,                           -- calculated from total_periods * takt_time
    
    -- Buffer strategy
    buffer_type VARCHAR(20) DEFAULT 'time',  -- time, space, both
    buffer_size INTEGER DEFAULT 0,           -- buffer periods between trades
    
    -- AI metadata
    generated_by VARCHAR(20),                -- manual, ai
    ai_confidence DECIMAL(5, 2),
    ai_parameters JSONB,                     -- AI generation params
    optimization_score DECIMAL(5, 2),
    
    -- Versioning
    parent_plan_id UUID REFERENCES takt.takt_plans(id),
    change_reason TEXT,
    
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_takt_plans_project ON takt.takt_plans(project_id);
CREATE INDEX idx_takt_plans_status ON takt.takt_plans(status);
```

### takt_zones
```sql
CREATE TABLE takt.takt_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES takt.takt_plans(id) ON DELETE CASCADE,
    location_id UUID REFERENCES project.locations(id),
    
    name VARCHAR(255) NOT NULL,              -- "Zone A - Floor 1 East"
    code VARCHAR(20) NOT NULL,               -- ZA, ZB, ZC
    sequence INTEGER NOT NULL,               -- 1, 2, 3... (order in takt train)
    
    -- Work content balancing
    work_content_score DECIMAL(8, 2),        -- Relative work volume (for balancing)
    area_sqm DECIMAL(10, 2),
    
    -- Override takt time for this zone
    custom_takt_time INTEGER,                -- NULL = use plan default
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(plan_id, sequence)
);

CREATE INDEX idx_takt_zones_plan ON takt.takt_zones(plan_id);
```

### takt_wagons (trade sequences in takt train)
```sql
CREATE TABLE takt.takt_wagons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES takt.takt_plans(id) ON DELETE CASCADE,
    trade_id UUID NOT NULL REFERENCES project.trades(id),
    
    sequence INTEGER NOT NULL,               -- Position in takt train (1=first trade)
    duration_days INTEGER NOT NULL,          -- How many days this trade needs per zone
    
    -- Crew assignment
    crew_size INTEGER,
    
    -- Buffer after this wagon
    buffer_after INTEGER DEFAULT 0,          -- Buffer periods before next wagon enters
    
    -- Dependencies
    predecessor_wagon_ids UUID[] DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(plan_id, sequence)
);

CREATE INDEX idx_takt_wagons_plan ON takt.takt_wagons(plan_id);
```

### takt_assignments (the actual takt grid cells: zone × wagon × period)
```sql
CREATE TABLE takt.takt_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES takt.takt_plans(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES takt.takt_zones(id) ON DELETE CASCADE,
    wagon_id UUID NOT NULL REFERENCES takt.takt_wagons(id) ON DELETE CASCADE,
    
    period_number INTEGER NOT NULL,          -- Which takt period (1-based)
    
    -- Dates
    planned_start DATE NOT NULL,
    planned_end DATE NOT NULL,
    actual_start DATE,
    actual_end DATE,
    
    -- Status
    status VARCHAR(30) DEFAULT 'planned',    -- planned, in_progress, completed, delayed, blocked
    
    -- Progress
    progress_pct DECIMAL(5, 2) DEFAULT 0,
    
    -- Issues
    has_constraints BOOLEAN DEFAULT FALSE,
    is_trade_stacking BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(plan_id, zone_id, wagon_id)
);

CREATE INDEX idx_assignments_plan ON takt.takt_assignments(plan_id);
CREATE INDEX idx_assignments_zone ON takt.takt_assignments(zone_id);
CREATE INDEX idx_assignments_status ON takt.takt_assignments(status);
CREATE INDEX idx_assignments_period ON takt.takt_assignments(period_number);
```

---

## constraint Schema

### constraints
```sql
CREATE TABLE constraint.constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    code VARCHAR(20) NOT NULL,               -- C-001
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    category VARCHAR(30) NOT NULL,           -- design, material, equipment, labor, space, predecessor, permit, information
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
    status VARCHAR(20) NOT NULL DEFAULT 'open',     -- open, in_progress, resolved, cancelled
    
    -- Linkage
    assignment_id UUID REFERENCES takt.takt_assignments(id),
    zone_id UUID REFERENCES takt.takt_zones(id),
    trade_id UUID REFERENCES project.trades(id),
    
    -- Dates
    identified_date DATE DEFAULT CURRENT_DATE,
    target_resolution_date DATE,
    actual_resolution_date DATE,
    
    -- Responsibility
    assigned_to UUID REFERENCES auth.users(id),
    identified_by UUID NOT NULL REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Resolution
    resolution_notes TEXT,
    
    -- AI detection
    detected_by VARCHAR(20) DEFAULT 'manual', -- manual, ai
    ai_confidence DECIMAL(5, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_constraints_project ON constraint.constraints(project_id);
CREATE INDEX idx_constraints_status ON constraint.constraints(status);
CREATE INDEX idx_constraints_category ON constraint.constraints(category);
CREATE INDEX idx_constraints_assignment ON constraint.constraints(assignment_id);
```

### constraint_logs
```sql
CREATE TABLE constraint.constraint_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    constraint_id UUID NOT NULL REFERENCES constraint.constraints(id) ON DELETE CASCADE,
    
    action VARCHAR(30) NOT NULL,             -- created, status_changed, assigned, commented, resolved
    old_value JSONB,
    new_value JSONB,
    comment TEXT,
    
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_constraint_logs ON constraint.constraint_logs(constraint_id);
```

---

## progress Schema

### progress_updates
```sql
CREATE TABLE progress.progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES takt.takt_assignments(id),
    
    -- Progress
    progress_pct DECIMAL(5, 2) NOT NULL,     -- 0-100
    status VARCHAR(30) NOT NULL,             -- in_progress, completed, delayed, blocked
    
    -- Quality
    quality_check BOOLEAN DEFAULT FALSE,
    quality_issues TEXT,
    
    -- Photo evidence
    photo_urls TEXT[] DEFAULT '{}',
    
    -- Reporter
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    reported_at TIMESTAMP DEFAULT NOW(),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_progress_project ON progress.progress_updates(project_id);
CREATE INDEX idx_progress_assignment ON progress.progress_updates(assignment_id);
CREATE INDEX idx_progress_date ON progress.progress_updates(reported_at);
```

### ppc_records
```sql
CREATE TABLE progress.ppc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES takt.takt_plans(id),
    
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    
    -- PPC calculation
    tasks_planned INTEGER NOT NULL,
    tasks_completed INTEGER NOT NULL,
    ppc_percentage DECIMAL(5, 2) NOT NULL,   -- (completed / planned) * 100
    
    -- Breakdown by trade
    trade_breakdown JSONB,                   -- [{trade_id, planned, completed, ppc}]
    
    -- Variance reasons
    variance_reasons JSONB,                  -- [{reason, count, category}]
    
    calculated_at TIMESTAMP DEFAULT NOW(),
    calculated_by VARCHAR(20) DEFAULT 'system', -- system, manual
    
    UNIQUE(project_id, plan_id, week_start)
);

CREATE INDEX idx_ppc_project ON progress.ppc_records(project_id);
CREATE INDEX idx_ppc_week ON progress.ppc_records(week_start);
```

### variance_records
```sql
CREATE TABLE progress.variance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    ppc_record_id UUID REFERENCES progress.ppc_records(id),
    assignment_id UUID REFERENCES takt.takt_assignments(id),
    
    reason_category VARCHAR(50) NOT NULL,    -- constraint, weather, rework, labor_shortage, material_delay, design_change, coordination, other
    description TEXT NOT NULL,
    
    -- Impact
    days_lost INTEGER DEFAULT 0,
    
    -- Corrective action
    corrective_action TEXT,
    action_owner UUID REFERENCES auth.users(id),
    action_due_date DATE,
    action_status VARCHAR(20) DEFAULT 'open', -- open, in_progress, completed
    
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## resource Schema

### crews
```sql
CREATE TABLE resource.crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    trade_id UUID NOT NULL REFERENCES project.trades(id),
    
    name VARCHAR(100) NOT NULL,              -- "MEP Crew Alpha"
    foreman_id UUID REFERENCES auth.users(id),
    
    size INTEGER NOT NULL,
    max_size INTEGER,
    
    -- Cost
    hourly_rate DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    status VARCHAR(20) DEFAULT 'active',     -- active, on_break, mobilizing, demobilized
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crews_project ON resource.crews(project_id);
CREATE INDEX idx_crews_trade ON resource.crews(trade_id);
```

### equipment
```sql
CREATE TABLE resource.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,               -- crane, scaffold, lift, concrete_pump, etc.
    model VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'available',  -- available, in_use, maintenance, off_site
    
    -- Availability
    available_from DATE,
    available_until DATE,
    
    -- Cost
    daily_rate DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    current_zone_id UUID REFERENCES takt.takt_zones(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### materials
```sql
CREATE TABLE resource.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,           -- structural, mechanical, electrical, plumbing, finishing
    unit VARCHAR(20) NOT NULL,               -- m3, ton, pcs, m2, lm, kg
    
    -- Quantities
    required_qty DECIMAL(12, 2) NOT NULL,
    ordered_qty DECIMAL(12, 2) DEFAULT 0,
    received_qty DECIMAL(12, 2) DEFAULT 0,
    installed_qty DECIMAL(12, 2) DEFAULT 0,
    
    -- Procurement
    supplier VARCHAR(255),
    po_number VARCHAR(50),
    expected_delivery DATE,
    actual_delivery DATE,
    
    -- Linkage
    trade_id UUID REFERENCES project.trades(id),
    
    status VARCHAR(20) DEFAULT 'pending',    -- pending, ordered, in_transit, received, installed
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### resource_assignments
```sql
CREATE TABLE resource.resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES takt.takt_assignments(id),
    
    crew_id UUID REFERENCES resource.crews(id),
    equipment_ids UUID[] DEFAULT '{}',
    
    -- Planned vs actual
    planned_crew_size INTEGER,
    actual_crew_size INTEGER,
    planned_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## notification Schema

### notifications
```sql
CREATE TABLE notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES project.projects(id),
    
    type VARCHAR(50) NOT NULL,               -- constraint_alert, trade_stacking, progress_update, ai_suggestion, ppc_report, plan_changed
    severity VARCHAR(10) DEFAULT 'info',     -- info, warning, critical
    
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    
    -- Linkage
    entity_type VARCHAR(30),                 -- constraint, assignment, plan, report
    entity_id UUID,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Delivery
    channels JSONB DEFAULT '["in_app"]',     -- ["in_app", "email", "push"]
    delivered_via JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notification.notifications(user_id);
CREATE INDEX idx_notifications_read ON notification.notifications(user_id, read);
CREATE INDEX idx_notifications_project ON notification.notifications(project_id);
```

---

## report Schema

### reports
```sql
CREATE TABLE report.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL,               -- weekly_progress, executive_summary, variance_analysis, custom
    title VARCHAR(255) NOT NULL,
    
    -- Period
    period_start DATE,
    period_end DATE,
    
    -- Generated content
    content_json JSONB,                      -- Structured report data
    file_url TEXT,                            -- PDF/PPTX download URL
    file_format VARCHAR(10),                 -- pdf, pptx, docx
    
    -- AI
    generated_by VARCHAR(20) DEFAULT 'ai',   -- ai, manual
    ai_model VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'generating', -- generating, ready, failed
    
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_project ON report.reports(project_id);
CREATE INDEX idx_reports_type ON report.reports(type);
```

---

## Prisma Schema (Node.js services)

Each Node.js service has its own `prisma/schema.prisma` pointing to the same PostgreSQL database but scoped to its own tables. Example for project-service:

```prisma
// services/project-service/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(255)
  code        String   @unique @db.VarChar(50)
  description String?
  projectType String   @map("project_type") @db.VarChar(50)
  status      String   @default("planning") @db.VarChar(30)
  // ... all fields
  
  @@map("projects")
  @@schema("project")
}
```

## Migration Strategy

1. Initial schema creation via raw SQL for all schemas
2. Each service manages its own migrations
3. Cross-schema references use UUID foreign keys
4. Shared enums defined in `packages/shared/src/constants/`
