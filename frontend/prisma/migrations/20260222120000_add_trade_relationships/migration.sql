-- CreateTable
CREATE TABLE "trade_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "predecessor_trade_id" UUID NOT NULL,
    "successor_trade_id" UUID NOT NULL,
    "type" VARCHAR(2) NOT NULL,
    "lag_days" INTEGER NOT NULL DEFAULT 0,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "source" VARCHAR(20) NOT NULL DEFAULT 'template',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_relationships_project_id_idx" ON "trade_relationships"("project_id");

-- CreateIndex
CREATE INDEX "trade_relationships_predecessor_trade_id_idx" ON "trade_relationships"("predecessor_trade_id");

-- CreateIndex
CREATE INDEX "trade_relationships_successor_trade_id_idx" ON "trade_relationships"("successor_trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_relationships_project_id_predecessor_trade_id_successo_key" ON "trade_relationships"("project_id", "predecessor_trade_id", "successor_trade_id", "type");

-- AddForeignKey
ALTER TABLE "trade_relationships" ADD CONSTRAINT "trade_relationships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
