-- TaktFlow AI — Database Initialization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Seed default roles
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  (gen_random_uuid(), 'admin', 'Full system access', '["*"]', true),
  (gen_random_uuid(), 'project_manager', 'Project management', '["project:*","takt:*","constraint:*","progress:*","report:*","resource:*"]', true),
  (gen_random_uuid(), 'superintendent', 'Field management', '["project:read","takt:read","constraint:*","progress:*","resource:read"]', true),
  (gen_random_uuid(), 'foreman', 'Trade crew leader', '["project:read","takt:read","constraint:read","progress:write"]', true),
  (gen_random_uuid(), 'viewer', 'Read-only access', '["project:read","takt:read","constraint:read","progress:read","report:read"]', true)
ON CONFLICT (name) DO NOTHING;
