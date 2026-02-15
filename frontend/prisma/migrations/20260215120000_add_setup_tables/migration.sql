-- AlterTable: add google_refresh_token to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_refresh_token" VARCHAR(500);

-- AlterTable: add discipline to trades
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "discipline" VARCHAR(30);

-- CreateTable: drawings
CREATE TABLE IF NOT EXISTS "drawings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_data" BYTEA,
    "discipline" VARCHAR(30) NOT NULL,
    "drawing_no" VARCHAR(50),
    "title" VARCHAR(255),
    "revision" VARCHAR(10),
    "sheet_size" VARCHAR(10),
    "status" VARCHAR(20) NOT NULL DEFAULT 'uploaded',
    "uploaded_by" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: wbs_nodes
CREATE TABLE IF NOT EXISTS "wbs_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "standard" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "path" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "location_id" UUID,
    "trade_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wbs_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cbs_nodes
CREATE TABLE IF NOT EXISTS "cbs_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "wbs_node_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "standard" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "path" VARCHAR(500),
    "budget_code" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cbs_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_setups
CREATE TABLE IF NOT EXISTS "project_setups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "current_step" VARCHAR(30) NOT NULL DEFAULT 'classification',
    "completed_steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "classification_standard" VARCHAR(30) NOT NULL DEFAULT 'uniclass',
    "boq_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "boq_file_name" VARCHAR(500),
    "boq_item_count" INTEGER NOT NULL DEFAULT 0,
    "drawing_count" INTEGER NOT NULL DEFAULT 0,
    "wbs_generated" BOOLEAN NOT NULL DEFAULT false,
    "wbs_node_count" INTEGER NOT NULL DEFAULT 0,
    "cbs_generated" BOOLEAN NOT NULL DEFAULT false,
    "cbs_node_count" INTEGER NOT NULL DEFAULT 0,
    "takt_plan_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_setups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drawings_project_id_idx" ON "drawings"("project_id");
CREATE INDEX IF NOT EXISTS "drawings_discipline_idx" ON "drawings"("discipline");

CREATE UNIQUE INDEX IF NOT EXISTS "wbs_nodes_project_id_code_key" ON "wbs_nodes"("project_id", "code");
CREATE INDEX IF NOT EXISTS "wbs_nodes_project_id_idx" ON "wbs_nodes"("project_id");
CREATE INDEX IF NOT EXISTS "wbs_nodes_parent_id_idx" ON "wbs_nodes"("parent_id");
CREATE INDEX IF NOT EXISTS "wbs_nodes_path_idx" ON "wbs_nodes"("path");

CREATE UNIQUE INDEX IF NOT EXISTS "cbs_nodes_project_id_code_key" ON "cbs_nodes"("project_id", "code");
CREATE INDEX IF NOT EXISTS "cbs_nodes_project_id_idx" ON "cbs_nodes"("project_id");
CREATE INDEX IF NOT EXISTS "cbs_nodes_parent_id_idx" ON "cbs_nodes"("parent_id");
CREATE INDEX IF NOT EXISTS "cbs_nodes_wbs_node_id_idx" ON "cbs_nodes"("wbs_node_id");

CREATE UNIQUE INDEX IF NOT EXISTS "project_setups_project_id_key" ON "project_setups"("project_id");

-- AddForeignKey
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wbs_nodes" ADD CONSTRAINT "wbs_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wbs_nodes" ADD CONSTRAINT "wbs_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wbs_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cbs_nodes" ADD CONSTRAINT "cbs_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cbs_nodes" ADD CONSTRAINT "cbs_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cbs_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cbs_nodes" ADD CONSTRAINT "cbs_nodes_wbs_node_id_fkey" FOREIGN KEY ("wbs_node_id") REFERENCES "wbs_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_setups" ADD CONSTRAINT "project_setups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
