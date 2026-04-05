import "server-only"

import { Pool } from "pg"
import { env } from "@/lib/env"

let pool: Pool | null = null

export function getDbPool() {
  if (!env.SUPABASE_DB_URL) {
    throw new Error("SUPABASE_DB_URL não configurado")
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.SUPABASE_DB_URL,
      max: 5,
      ssl: {
        rejectUnauthorized: false
      }
    })
  }

  return pool
}
