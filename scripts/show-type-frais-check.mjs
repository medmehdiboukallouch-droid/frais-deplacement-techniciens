import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  const r = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'frais_deplacement'::regclass
      AND contype = 'c'
  `)
  console.log(JSON.stringify(r.rows, null, 2))
} catch (e) {
  console.error('ERR:', e.message)
} finally {
  await pool.end()
}
