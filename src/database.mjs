import { readFile } from "node:fs/promises";
import pg from "pg";
import { hashPassword, normalizeEmail, validEmail, validPassword } from "./password.mjs";
import { upgradeRepostSchedules } from "./social-media.mjs";

const seed = {
  ...JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8")),
  "material-experiments": [],
  "material-worklogs": [],
  "commercial-worklogs": [],
  "commercial-settlements": [],
};
const migration = await readFile(new URL("../sql/001-initial.sql", import.meta.url), "utf8");

const annikeSchedule = await readFile(new URL("../sql/002-annike-cabratech.sql", import.meta.url), "utf8");

const annikeDeliveries = await readFile(new URL("../sql/003-annike-cabratech-deliveries.sql", import.meta.url), "utf8");

export function databasePool(env = process.env) {
  if (!env.DATABASE_URL && !env.PGPASSWORD) throw new Error("Configure as credenciais do PostgreSQL.");
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });
  pool.on("error", error => console.error("Conexão PostgreSQL:", error.code || "indisponível"));
  return pool;
}

function recordKey(collection, data) {
  if (collection === "memberships") return JSON.stringify([data.user_id, data.startup_id]);
  if (collection === "credentials") return data.user_id;
  if (collection === "financeConsolidated") return data.month;
  if (typeof data.id !== "string" || !data.id) throw new Error("Registro sem identificador em " + collection);
  return data.id;
}

async function transaction(pool, action, mode = "") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN " + mode);
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function rowsFor(db) {
  return Object.entries(db).flatMap(([collection, records]) =>
    records.map((data, position) => ({
      collection, record_key: recordKey(collection, data), position, data,
    })),
  );
}

async function writeRows(client, rows) {
  if (!rows.length) return;
  await client.query(`
    INSERT INTO workspace_records (collection, record_key, position, data)
    SELECT collection, record_key, position, data
      FROM jsonb_to_recordset($1::jsonb) AS x(collection text, record_key text, position integer, data jsonb)
    ON CONFLICT (collection, record_key) DO UPDATE
    SET position = EXCLUDED.position, data = EXCLUDED.data
  `, [JSON.stringify(rows)]);
}

export async function initialize(pool, env = process.env) {
  await transaction(pool, async client => {
    await client.query("SELECT pg_advisory_xact_lock(64720261113)");
    await client.query(migration);
    const status = await client.query("SELECT sequence FROM workspace_state WHERE singleton FOR UPDATE");
    if (status.rowCount) {
      await client.query(annikeSchedule);
      await client.query(annikeDeliveries);
      const data = await snapshot(client, true);
      for (const row of data.records) row.serialized = JSON.stringify(row.data);
      upgradeRepostSchedules(data);
      await persist(client, data);
      return;
    }

    const email = normalizeEmail(env.ADMIN_EMAIL);
    if (!validEmail(email) || !validPassword(env.ADMIN_PASSWORD)) {
      throw new Error("Na primeira implantação, informe ADMIN_EMAIL e ADMIN_PASSWORD (12 a 256 bytes).");
    }
    const data = structuredClone(seed);
    Object.assign(data.users.find(user => user.id === "1"), { email, active: true });
    data.credentials.push({ user_id: "1", ...await hashPassword(env.ADMIN_PASSWORD) });
    await writeRows(client, rowsFor(data));
    await client.query("INSERT INTO workspace_state (sequence) VALUES (1000)");
    await client.query(annikeSchedule);
    await client.query(annikeDeliveries);
  });
}

async function snapshot(client, write) {
  // A writer locks the workspace before reading, so approval, payment and its
  // related history always commit together, including across app processes.
  const state = await client.query("SELECT sequence FROM workspace_state WHERE singleton" + (write ? " FOR UPDATE" : ""));
  const db = Object.fromEntries(Object.keys(seed).map(key => [key, []]));
  const records = await client.query("SELECT collection, record_key, position, data FROM workspace_records ORDER BY collection, position");
  for (const row of records.rows) {
    if (Object.hasOwn(db, row.collection)) db[row.collection].push(row.data);
  }
  return { db, sequence: Number(state.rows[0].sequence), records: records.rows };
}

async function persist(client, data) {
  const key = row => JSON.stringify([row.collection, row.record_key]);
  const old = new Map(data.records.map(row => [key(row), row]));
  const changes = [];
  for (const row of rowsFor(data.db)) {
    const previous = old.get(key(row));
    if (!previous || row.position !== previous.position || JSON.stringify(row.data) !== previous.serialized) changes.push(row);
    old.delete(key(row));
  }
  const deleted = [...old.values()].map(({ collection, record_key }) => ({ collection, record_key }));
  if (deleted.length) {
    await client.query(`
      DELETE FROM workspace_records AS r USING
        jsonb_to_recordset($1::jsonb) AS d(collection text, record_key text)
      WHERE r.collection=d.collection AND r.record_key=d.record_key
    `, [JSON.stringify(deleted)]);
  }
  await writeRows(client, changes);
  await client.query("UPDATE workspace_state SET sequence=$1 WHERE singleton", [data.sequence]);
}

export async function useWorkspace(pool, write, operation) {
  return transaction(pool, async client => {
    const data = await snapshot(client, write);
    if (write) {
      // Domain operations update these objects in place.
      for (const row of data.records) row.serialized = JSON.stringify(row.data);
    }
    const result = await operation(data, client);
    if (write && result.ok) {
      await persist(client, data);
      await client.query(`
        DELETE FROM workspace_sessions s
        WHERE NOT EXISTS (
          SELECT 1 FROM workspace_records c JOIN workspace_records u
          ON u.collection='users' AND u.record_key=c.record_key
          WHERE c.collection='credentials' AND c.record_key=s.user_id
          AND c.data->>'digest'=s.credential_digest AND u.data->'active'='true'::jsonb
        )
      `);
    }
    return result;
  }, write ? "" : "ISOLATION LEVEL REPEATABLE READ READ ONLY");
}
