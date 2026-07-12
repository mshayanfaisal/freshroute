import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full FreshRoute schema. Written by hand so it runs cleanly from an empty
 * database with a single `migration:run`. Uses Postgres native enums and
 * gen_random_uuid() (built into Postgres 13+).
 */
export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(q: QueryRunner): Promise<void> {
    // ---- Enum types ----
    await q.query(`CREATE TYPE "user_role_enum" AS ENUM ('farmer','buyer','driver','admin')`);
    await q.query(`CREATE TYPE "produce_category_enum" AS ENUM ('vegetable','fruit','dairy','eggs','herbs')`);
    await q.query(`CREATE TYPE "spoilage_risk_enum" AS ENUM ('low','medium','high')`);
    await q.query(`CREATE TYPE "order_status_enum" AS ENUM ('pending','confirmed','packed','in_transit','delivered','disputed','cancelled')`);
    await q.query(`CREATE TYPE "delivery_run_status_enum" AS ENUM ('planned','in_progress','completed')`);
    await q.query(`CREATE TYPE "stop_status_enum" AS ENUM ('pending','delivered','failed')`);
    await q.query(`CREATE TYPE "complaint_status_enum" AS ENUM ('submitted','under_review','resolved')`);
    await q.query(`CREATE TYPE "defect_category_enum" AS ENUM ('packaging','contamination','freshness','wrong_item','quantity')`);
    await q.query(`CREATE TYPE "defect_severity_enum" AS ENUM ('minor','major','critical')`);
    await q.query(`CREATE TYPE "complaint_resolution_enum" AS ENUM ('credit','replace','reject')`);
    await q.query(`CREATE TYPE "ai_feature_enum" AS ENUM ('demand_forecast','dynamic_pricing','complaint_classifier','route_optimiser')`);

    // ---- users ----
    await q.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL,
        "password_hash" varchar NOT NULL,
        "name" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "org_name" varchar,
        "address" varchar,
        "latitude" double precision,
        "longitude" double precision,
        "phone" varchar,
        "refresh_token_hash" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    // ---- produce ----
    await q.query(`
      CREATE TABLE "produce" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "variety" varchar,
        "category" "produce_category_enum" NOT NULL,
        "unit" varchar NOT NULL,
        "price_per_unit" numeric(10,2) NOT NULL,
        "quantity_available" numeric(10,2) NOT NULL,
        "harvest_date" date NOT NULL,
        "shelf_life_days" integer NOT NULL,
        "spoilage_risk" "spoilage_risk_enum" NOT NULL DEFAULT 'low',
        "is_sold_out" boolean NOT NULL DEFAULT false,
        "farmer_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_produce_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_produce_farmer" ON "produce" ("farmer_id")`);

    // ---- orders ----
    await q.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "reference" varchar NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending',
        "buyer_id" uuid NOT NULL,
        "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "delivery_address" varchar,
        "special_instructions" text,
        "requested_delivery_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_orders_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE UNIQUE INDEX "IDX_orders_reference" ON "orders" ("reference")`);
    await q.query(`CREATE INDEX "IDX_orders_buyer" ON "orders" ("buyer_id")`);

    // ---- order_lines ----
    await q.query(`
      CREATE TABLE "order_lines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "produce_id" uuid,
        "farmer_id" uuid NOT NULL,
        "product_name" varchar NOT NULL,
        "unit" varchar NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "quantity_ordered" numeric(10,2) NOT NULL,
        "quantity_delivered" numeric(10,2) NOT NULL DEFAULT 0,
        "harvest_date" date,
        CONSTRAINT "FK_lines_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lines_produce" FOREIGN KEY ("produce_id") REFERENCES "produce"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_lines_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_lines_order" ON "order_lines" ("order_id")`);
    await q.query(`CREATE INDEX "IDX_lines_farmer" ON "order_lines" ("farmer_id")`);

    // ---- delivery_runs ----
    await q.query(`
      CREATE TABLE "delivery_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "driver_id" uuid,
        "scheduled_date" date NOT NULL,
        "status" "delivery_run_status_enum" NOT NULL DEFAULT 'planned',
        "notes" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_runs_driver" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE SET NULL
      )`);
    await q.query(`CREATE INDEX "IDX_runs_driver" ON "delivery_runs" ("driver_id")`);

    // ---- delivery_stops ----
    await q.query(`
      CREATE TABLE "delivery_stops" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "run_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "address" varchar NOT NULL,
        "latitude" double precision,
        "longitude" double precision,
        "special_instructions" text,
        "status" "stop_status_enum" NOT NULL DEFAULT 'pending',
        "failure_reason" text,
        "completed_at" TIMESTAMPTZ,
        CONSTRAINT "FK_stops_run" FOREIGN KEY ("run_id") REFERENCES "delivery_runs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stops_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_stops_run" ON "delivery_stops" ("run_id")`);

    // ---- complaints ----
    await q.query(`
      CREATE TABLE "complaints" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "buyer_id" uuid NOT NULL,
        "order_line_id" uuid NOT NULL,
        "farmer_id" uuid NOT NULL,
        "description" text NOT NULL,
        "photo_url" varchar,
        "status" "complaint_status_enum" NOT NULL DEFAULT 'submitted',
        "defect_category" "defect_category_enum",
        "severity" "defect_severity_enum",
        "supplier_alert_draft" text,
        "ai_classified" boolean NOT NULL DEFAULT false,
        "resolution" "complaint_resolution_enum",
        "resolution_notes" text,
        "resolved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_complaints_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_complaints_line" FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_complaints_buyer" ON "complaints" ("buyer_id")`);
    await q.query(`CREATE INDEX "IDX_complaints_farmer" ON "complaints" ("farmer_id")`);

    // ---- ai_suggestions ----
    await q.query(`
      CREATE TABLE "ai_suggestions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "feature" "ai_feature_enum" NOT NULL,
        "user_id" uuid,
        "subject_id" uuid,
        "input_context" jsonb NOT NULL,
        "output" jsonb NOT NULL,
        "used_fallback" boolean NOT NULL DEFAULT false,
        "model" varchar,
        "accepted" boolean,
        "actual_value" numeric(12,2),
        "predicted_value" numeric(12,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "IDX_ai_feature" ON "ai_suggestions" ("feature")`);
    await q.query(`CREATE INDEX "IDX_ai_user" ON "ai_suggestions" ("user_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "ai_suggestions"`);
    await q.query(`DROP TABLE IF EXISTS "complaints"`);
    await q.query(`DROP TABLE IF EXISTS "delivery_stops"`);
    await q.query(`DROP TABLE IF EXISTS "delivery_runs"`);
    await q.query(`DROP TABLE IF EXISTS "order_lines"`);
    await q.query(`DROP TABLE IF EXISTS "orders"`);
    await q.query(`DROP TABLE IF EXISTS "produce"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
    await q.query(`DROP TYPE IF EXISTS "ai_feature_enum"`);
    await q.query(`DROP TYPE IF EXISTS "complaint_resolution_enum"`);
    await q.query(`DROP TYPE IF EXISTS "defect_severity_enum"`);
    await q.query(`DROP TYPE IF EXISTS "defect_category_enum"`);
    await q.query(`DROP TYPE IF EXISTS "complaint_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "stop_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "delivery_run_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "order_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "spoilage_risk_enum"`);
    await q.query(`DROP TYPE IF EXISTS "produce_category_enum"`);
    await q.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
