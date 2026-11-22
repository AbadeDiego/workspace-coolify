import { validPassword } from "./password.mjs";

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const collections = {
  startups: "",
  "follower-readings": "startup_id assigned_to account followers evidence_url",
  users: "name email role active job_title responsibilities avatar_url password",
  tasks: "startup_id product_id assigned_to title description expected_result priority status planned_date due_date checklist evidence work_started_at work_ended_at pay_base pay_bonus pay_quality pay_result",
  "commercial-worklogs": "task_id work_started_at work_ended_at note result metric quantity evidence_url lead_id void_reason",
  "commercial-settlements": "user_id month decision feedback",
  leads: "startup_id owner_id name company phone email city segment origin campaign_name public_body stakeholders documents_due documents_notes estimated_value next_contact_at meeting_at notes stage proposal",
  deals: "lead_id title value installments first_due_date",
  finance: "startup_id entry_type description amount expense_class status category cost_center entry_date due_date competence_date",
  goals: "user_id title metric target cadence start_date end_date active",
  activities: "startup_id user_id goal_id metric quantity note",
  marketing: "startup_id creator_id title campaign format delivery_due planned_date notes production_started",
  technology: "startup_id kind title responsible priority status due_date progress version notes",
  templates: "title sector startup_id steps",
  plans: "template_id startup_id owner_id title due_date",
  "material-experiments": "product_id user_id title objective hypothesis materials procedure success_criteria",
  "material-worklogs": "product_id user_id task_id experiment_id work_started_at work_ended_at note",
  "material-products": "name stage description trl trl_reason trl_evidence_url",
  "material-goals": "product_id user_id title target unit start_date end_date",
  "material-results": "product_id user_id goal_id task_id occurred_on experiment_id title quantity method outcome next_steps evidence",
};

const readOnly = new Set(["commercial-reports", "me", "bootstrap", "task-payments", "campaign-results",
  "campaign-options", "finance-context", "reports", "history", "customers", "invoices"]);
const canPatch = new Set(["users", "tasks", "leads", "finance", "goals", "marketing",
  "technology", "templates", "material-products", "material-goals", "material-experiments", "commercial-worklogs"]);
const canDelete = new Set(["tasks", "leads", "finance", "marketing", "technology"]);

export function validateRoute(parts, method) {
  const [name, id, action, subId] = parts;
  if (parts.length > 4 || parts.some(part => !/^[a-zA-Z0-9_-]{1,100}$/.test(part))) return false;
  if (action) {
    if (name === "tasks" && action === "attachments") return subId ? ["GET", "DELETE"].includes(method) : method === "POST";
    if (name === "plans" && action === "steps") return subId ? method === "PATCH" : method === "GET";
    if (subId) return false;
    if (name === "leads" && action === "events") return ["GET", "POST"].includes(method);
    return method === "POST" && (
      (name === "tasks" && ["comments", "review"].includes(action)) ||
      (name === "marketing" && action === "workflow") ||
      (name === "invoices" && action === "payments")
    );
  }
  if (name === "memberships") return !id && ["GET", "PUT"].includes(method);
  if (readOnly.has(name)) return !id && method === "GET";
  if (!Object.hasOwn(collections, name)) return false;
  if (method === "GET") return !id || ["tasks", "material-products", "material-goals", "material-results", "material-experiments"].includes(name);
  if (method === "POST") return !id && name !== "startups";
  if (method === "PATCH") return Boolean(id) && canPatch.has(name);
  if (method === "DELETE") return Boolean(id) && canDelete.has(name);
  return false;
}

const extraFields = {
  attachments: "name mime_type data",
  comments: "content",
  review: "decision feedback award_bonus metric measurement result result_url",
  events: "type note next_contact_at",
  steps: "status",
  payments: "amount paid_on",
  workflow: "action note url file network account caption scheduled_at published_at post_url reach engagement leads_generated",
};

const statuses = {
  tasks: ["pendente", "em_andamento", "bloqueada", "concluida", "cancelada"],
  finance: ["previsto", "realizado"],
  technology: ["planejado", "em_andamento", "validacao", "concluido"],
  steps: ["pendente", "concluida"],
};

function select(value, allowed, label) {
  if (!allowed.includes(value)) throw new InputError("Valor inválido para " + label + ".");
}

function number(value, min, max, label, integer = false) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") throw new InputError("Informe " + label + ".");
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new InputError("Valor inválido para " + label + ".");
  }
}

function date(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InputError("Informe " + label + ".");
  const parsed = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) throw new InputError("Data inválida para " + label + ".");
}

export function attachmentBytes(file, limit) {
  if (typeof file?.name !== "string" || !file.name.trim() || file.name.length > 255 ||
      typeof file.data !== "string" || !file.data || file.data.length > Math.ceil(limit / 3) * 4 ||
      file.data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.data)) {
    throw new InputError("Arquivo inválido ou acima do limite.");
  }
  const bytes = Buffer.from(file.data, "base64");
  if (!bytes.length || bytes.length > limit) throw new InputError("Arquivo acima do limite.");
  return bytes;
}

export function validateWrite(name, action, method, body, previous) {
  if (["GET", "DELETE"].includes(method)) return;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Envie um objeto JSON.");
  const fields = action ? extraFields[action] : name === "memberships" ? "userId startupIds" : collections[name];
  const allowed = new Set((fields || "").split(" "));
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) throw new InputError("Campo desconhecido: " + key + ".");
    if (value === null && !key.endsWith("_date") && !key.endsWith("_at")) throw new InputError("Campo inválido: " + key + ".");
    if (typeof value === "string" && value.includes("\0")) throw new InputError("Texto inválido.");
    if (typeof value === "string" && value.length > 5000 && !["data", "avatar_url"].includes(key)) {
      throw new InputError("Campo longo demais: " + key + ".");
    }
    if (value !== null && typeof value === "object" && !["file", "evidence", "proposal", "checklist", "steps", "startupIds"].includes(key)) {
      throw new InputError("Campo inválido: " + key + ".");
    }
    if (key.endsWith("_date") || ["due_date", "paid_on", "documents_due", "delivery_due", "occurred_on"].includes(key)) {
      if (value) date(value, key);
    }
    if (key.endsWith("_at") && value && (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) {
      throw new InputError("Data e hora inválidas.");
    }
  }
  const effective = key => body[key] ?? previous?.[key];
  const requiredText = (key, max = 200) => {
    const value = effective(key);
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new InputError("Preencha " + key + ".");
  };
  const status = statuses[action || name];
  if (body.expected_result !== undefined && (typeof body.expected_result !== "string" || body.expected_result.length > 3000))
    throw new InputError("Descreva o resultado esperado em até 3.000 caracteres.");
  if (status && body.status !== undefined) select(body.status, status, "status");
  if (body.priority !== undefined) select(body.priority, ["urgente", "alta", "media", "baixa"], "prioridade");
  if (action === "attachments") attachmentBytes(body, 5 * 1024 * 1024);
  if (action === "comments") requiredText("content", 3000);
  if (action === "events") select(body.type, ["contato", "proposta", "reuniao_realizada", "reagendamento"], "interação");
  if (action === "payments") {
    number(body.amount, 0.01, 1e9, "valor recebido");
    date(body.paid_on, "data do recebimento");
  }
  if (action === "workflow" && body.file) attachmentBytes(body.file, 1024 * 1024);
  if (action) return;

  if (body.evidence?.file) attachmentBytes(body.evidence.file, 1024 * 1024);
  if (body.active !== undefined && typeof body.active !== "boolean") throw new InputError("Status de acesso inválido.");
  if (["tasks", "marketing", "technology", "templates", "plans", "goals", "deals"].includes(name)) requiredText("title");
  if (["leads", "users"].includes(name)) requiredText("name");
  if (name === "users") {
    if (body.role !== undefined || !previous) select(effective("role"), ["admin", "comercial", "marketing", "marketing_externo", "desenvolvimento", "colaborador"], "perfil");
    if ((body.password !== undefined || !previous) && !validPassword(body.password)) throw new InputError("Use uma senha de 12 caracteres a 256 bytes.");
    if (body.avatar_url && (typeof body.avatar_url !== "string" || body.avatar_url.length > 390000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.avatar_url))) {
      throw new InputError("Use PNG, JPEG ou WebP de até 280 KB.");
    }
  }
  if (name === "leads") {
    if (body.stage !== undefined) select(body.stage, ["Lead", "Contactados", "Neutros", "Com interesse", "Reunião marcada", "Fechamentos", "Clientes"], "etapa");
    if (body.estimated_value !== undefined) number(body.estimated_value, 0, 1e9, "valor potencial");
    if (body.proposal) {
      const {status, url, value, valid_until, loss_reason} = body.proposal;
      if (Object.keys(body.proposal).some(key => !["status","url","value","valid_until","loss_reason","note"].includes(key))) throw new InputError("Campo desconhecido na proposta.");
      select(status, ["rascunho_proposta","aguardando_validacao","liberada","enviada","negociacao","perdida"], "status da proposta");
      if (value) number(value, 0.01, 1e9, "valor da proposta");
      if (valid_until) date(valid_until, "validade");
      if (url && (typeof url !== "string" || url.length > 3000)) throw new InputError("Link inválido.");
      if (loss_reason && typeof loss_reason !== "string") throw new InputError("Motivo inválido.");
    }
  }
  if (name === "deals") {
    number(body.value, 0.01, 1e9, "valor do contrato");
    number(body.installments, 1, 36, "quantidade de parcelas", true);
    if (Math.round(Number(body.value) * 100) < Number(body.installments)) throw new InputError("O valor deve cobrir todas as parcelas.");
    date(body.first_due_date, "vencimento");
  }
  if (name === "finance") {
    requiredText("description");
    select(effective("entry_type"), ["receita", "despesa"], "tipo");
    if (body.amount !== undefined || !previous) number(body.amount, 0.01, 1e9, "valor");
    date(effective("entry_date"), "data do lançamento");
  }
  if (name === "goals") {
    number(effective("target"), 0.01, 1e9, "meta");
    select(effective("cadence"), ["weekly", "monthly", "fixed"], "ciclo");
    date(effective("start_date"), "início da meta");
    date(effective("end_date"), "fim da meta");
    if (effective("end_date") < effective("start_date")) throw new InputError("O fim da meta deve suceder o início.");
  }
  if (name === "activities") number(body.quantity, 0.01, 1e9, "quantidade");
  if (name === "technology" && body.progress !== undefined) number(body.progress, 0, 100, "progresso", true);
  if (body.checklist !== undefined && (!Array.isArray(body.checklist) || body.checklist.length > 200 ||
    body.checklist.some(item => typeof item?.id !== "string" || item.id.length > 100 || typeof item.title !== "string" || item.title.length > 500 || typeof item.done !== "boolean"))) {
    throw new InputError("Checklist inválido.");
  }
  if (name === "templates" && (!Array.isArray(effective("steps")) || !effective("steps").length ||
    effective("steps").length > 200 || effective("steps").some(item => typeof item !== "string" || !item.trim() || item.length > 500))) {
    throw new InputError("Informe as etapas do modelo.");
  }
}
