-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UN', 'KG', 'L', 'ML', 'M', 'CX', 'PC', 'JG');

-- CreateEnum
CREATE TYPE "PartSupplyCategory" AS ENUM ('PART', 'SUPPLY');

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "estimated_time_min" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_supplies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "sku" VARCHAR(60) NOT NULL,
    "part_number" VARCHAR(60),
    "category" "PartSupplyCategory" NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'UN',
    "cost_price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "reserved_stock" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "part_supply_id" UUID NOT NULL,
    "work_order_id" UUID,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL,
    "part_supply_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parts_supplies_sku_key" ON "parts_supplies"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_part_supply_id_created_at_idx" ON "stock_movements"("part_supply_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_work_order_id_idx" ON "stock_movements"("work_order_id");

-- CreateIndex
CREATE INDEX "stock_reservations_part_supply_id_idx" ON "stock_reservations"("part_supply_id");

-- CreateIndex
CREATE INDEX "stock_reservations_work_order_id_idx" ON "stock_reservations"("work_order_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_part_supply_id_fkey" FOREIGN KEY ("part_supply_id") REFERENCES "parts_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_part_supply_id_fkey" FOREIGN KEY ("part_supply_id") REFERENCES "parts_supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot declare CHECK constraints: the reserved stock never exceeds the stock.
ALTER TABLE "parts_supplies" ADD CONSTRAINT "parts_supplies_stock_check" CHECK (stock >= reserved_stock AND reserved_stock >= 0);
