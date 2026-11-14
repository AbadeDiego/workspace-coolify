import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { databasePool, initialize, useWorkspace } from "./database.mjs";
import { workspaceDomain } from "./domain.mjs";
import { normalizeEmail, verifyPassword } from "./password.mjs";
import { InputError } from "./validation.mjs";

const maxBodyBytes = 8 * 1024 * 1024;
const lifetime = 12 * 60 * 60;
const json = (body, status = 200, headers) => Response.json(body, { status, headers });
const digest = value => createHash("sha256").update(value).digest("hex");
const assets = new Map(await Promise.all([
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/vendor.js", "vendor.js", "text/javascript; charset=utf-8"],
].map(async ([path, file, type]) => [path, { type, data: await readFile(new URL("../public/" + file, import.meta.url)) }])));

function settings(env) {
  let url;
  try { url = new URL(env.APP_ORIGIN); }
  catch { throw new Error("Configure APP_ORIGIN com o endereço do workspace."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_ORIGIN deve conter somente o protocolo e o domínio, sem caminho.");
  }
  const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && url.protocol !== "https:") throw new Error("Use HTTPS para o domínio do workspace.");
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT inválida.");
  return { origin: url.origin, port, secure: !local, cookie: local ? "workspace_session" : "__Host-workspace_session" };
}

function cookie(config, token, age) {
  return config.cookie + "=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + age + (config.secure ? "; Secure" : "");
}

function sessionHash(req, config) {
  const prefix = config.cookie + "=";
  const value = req.headers.cookie?.split(/;\s*/).find(part => part.startsWith(prefix))?.slice(prefix.length);
  return value && /^[a-f0-9]{64}$/.test(value) ? digest(value) : null;
}

async function body(req) {
  if (req.method === "DELETE") return {};
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
    throw new InputError("Envie dados em JSON.", 415);
  }
  if (Number(req.headers["content-length"]) > maxBodyBytes) throw new InputError("Envio acima do limite de 8 MB.", 413);
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new InputError("Envio acima do limite de 8 MB.", 413);
    chunks.push(chunk);
  }
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new InputError("JSON inválido."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InputError("Envie um objeto JSON.");
  return parsed;
}

async function login(pool, req, payload, config) {
  const email = normalizeEmail(payload.email).slice(0, 254);
  const password = payload.password;
  if (typeof password !== "string" || !password || Buffer.byteLength(password) > 256) {
    return json({ error: "E-mail ou senha inválidos." }, 401);
  }
  await pool.query("DELETE FROM login_attempts WHERE expires_at <= now()");
  await pool.query("DELETE FROM workspace_sessions WHERE expires_at <= now()");
  const key = digest(email);
  const limit = await pool.query(`
    INSERT INTO login_attempts (attempt_key, attempts, expires_at)
    VALUES ($1, 1, now() + interval '15 minutes')
    ON CONFLICT (attempt_key) DO UPDATE
    SET attempts=login_attempts.attempts+1
    RETURNING attempts
  `, [key]);
  if (limit.rows[0].attempts > 8) {
    return json({ error: "Muitas tentativas. Aguarde 15 minutos." }, 429, { "Retry-After": "900" });
  }
  const result = await pool.query(`
    SELECT u.record_key AS id, c.data AS credential
    FROM workspace_records u JOIN workspace_records c
      ON c.collection='credentials' AND c.record_key=u.record_key
    WHERE u.collection='users' AND u.data->>'email'=$1 AND u.data->'active'='true'::jsonb
  `, [email]);
  const user = result.rows[0];
  if (!await verifyPassword(password, user?.credential)) return json({ error: "E-mail ou senha inválidos." }, 401);

  const token = randomBytes(32).toString("hex");
  await pool.query(`
    INSERT INTO workspace_sessions (token_hash, user_id, credential_digest, expires_at)
    VALUES ($1,$2,$3,now()+$4*interval '1 second')
  `, [digest(token), user.id, user.credential.digest, lifetime]);
  await pool.query("DELETE FROM workspace_sessions WHERE token_hash=$1", [sessionHash(req, config)]);
  await pool.query("DELETE FROM login_attempts WHERE attempt_key=$1", [key]);
  return json({ ok: true }, 200, { "Set-Cookie": cookie(config, token, lifetime) });
}

async function route(pool, req, config) {
  const url = new URL(req.url, config.origin);
  const path = url.pathname;
  const method = req.method;
  if (path === "/healthz" && method === "GET") {
    await pool.query("SELECT sequence FROM workspace_state WHERE singleton");
    return json({ ok: true });
  }
  const asset = assets.get(path);
  if (asset && ["GET", "HEAD"].includes(method)) {
    return new Response(method === "HEAD" ? null : asset.data, { headers: { "Content-Type": asset.type } });
  }
  if (!path.startsWith("/api/")) return json({ error: "Página não encontrada." }, 404);
  if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return json({ error: "Método indisponível." }, 405);
  const write = method !== "GET";
  if (write && req.headers.origin !== config.origin) return json({ error: "Origem não autorizada." }, 403);
  if (path === "/api/auth/logout" && method === "POST") {
    await pool.query("DELETE FROM workspace_sessions WHERE token_hash=$1", [sessionHash(req, config)]);
    return json({ ok: true }, 200, { "Set-Cookie": cookie(config, "", 0) });
  }
  if (path === "/api/auth/login" && method === "POST") return login(pool, req, await body(req), config);
  const tokenHash = sessionHash(req, config);
  if (!tokenHash) return json({ error: "Entre com seu e-mail e senha." }, 401);
  const payload = write ? await body(req) : {};
  return useWorkspace(pool, write, async (snapshot, client) => {
    const query = await client.query(`
      SELECT user_id, credential_digest FROM workspace_sessions
      WHERE token_hash=$1 AND expires_at>now()
    `, [tokenHash]);
    const session = query.rows[0];
    const valid = session && snapshot.db.credentials.some(
      entry => entry.user_id === session.user_id && entry.digest === session.credential_digest,
    );
    if (!valid) return json({ error: "Sessão expirada. Entre novamente." }, 401);
    return workspaceDomain(snapshot, session.user_id)(url.pathname + url.search, method, payload);
  });
}

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export async function start(env = process.env) {
  const config = settings(env);
  const pool = databasePool(env);
  try { await initialize(pool, env); }
  catch (error) { await pool.end(); throw error; }

  const server = createServer({ requestTimeout: 30000, headersTimeout: 10000 }, async (req, res) => {
    let response;
    try { response = await route(pool, req, config); }
    catch (error) {
      if (error instanceof InputError) response = json({ error: error.message }, error.status);
      else {
        console.error("Falha ao atender requisição:", error.code || error.name);
        response = json({ error: "Serviço temporariamente indisponível. Tente novamente." }, 503);
      }
    }
    const headers = { ...securityHeaders, ...Object.fromEntries(response.headers) };
    if (config.secure) headers["Strict-Transport-Security"] = "max-age=31536000";
    const bytes = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, headers);
    res.end(bytes);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, env.HOST || "0.0.0.0", resolve);
    });
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    server, pool,
    async close() {
      await new Promise(resolve => server.close(resolve));
      await pool.end();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const app = await start();
    console.log("Workspace disponível na porta " + app.server.address().port);
    for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => void app.close());
  } catch (error) {
    console.error("Não foi possível iniciar:", error.message);
    process.exitCode = 1;
  }
}
