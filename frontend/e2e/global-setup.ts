import { Pool } from "pg";
import { dbUrl } from "./helpers";

export default async function globalSetup() {
  const pool = new Pool({ connectionString: dbUrl });
  await pool.query(
    `TRUNCATE TABLE audit_logs, deliveries, payments, order_status_history, order_items, orders,
     cart_items, carts, addresses, products, categories, shops, users RESTART IDENTITY CASCADE`,
  );
  await pool.end();
}