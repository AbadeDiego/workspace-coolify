import { InputError } from "./validation.mjs";

export const materialCollections = ["material-experiments", "material-worklogs"];

function text(value, label, required = true, max = 3000) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new InputError("Preencha " + label + " (até " + max + " caracteres).");
  }
  return value.trim();
}

export function trlValue(value) {
  if (!/^[1-9]$/.test(String(value))) throw new InputError("Selecione um TRL de 1 a 9.");
  return Number(value);
}

export function updateReadiness(product, body, actor, timestamp) {
  if (body.trl === undefined || body.trl === "") return {};
  const level = trlValue(body.trl);
  if (product?.trl === level) return {};
  const rationale = text(body.trl_reason, "a justificativa do TRL");
  const evidenceUrl = text(body.trl_evidence_url, "o link do TRL", false);
  if (evidenceUrl) {
    let url;
    try { url = new URL(evidenceUrl); } catch {}
    if (!url || !["https:", "http:"].includes(url.protocol)) throw new InputError("Use um link HTTP ou HTTPS.");
  }
  return {
    trl: level,
    trl_history: [...(product?.trl_history || []), {
      from: product?.trl ?? null, to: level, reason: rationale, evidence_url: evidenceUrl,
      author: actor.name, user_id: actor.id, recorded_at: timestamp,
    }],
  };
}

export function workInterval(startValue, endValue) {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof startValue !== "string" || typeof endValue !== "string" ||
      !iso.test(startValue) || !iso.test(endValue)) throw new InputError("Informe início e fim do trabalho com data e hora.");
  for (const value of [startValue, endValue]) {
    const calendarDay = new Date(value.slice(0,10) + "T12:00:00Z");
    if (!Number.isFinite(+calendarDay) || calendarDay.toISOString().slice(0,10) !== value.slice(0,10)) {
      throw new InputError("Informe uma data válida para o trabalho.");
    }
  }
  const start = new Date(startValue), end = new Date(endValue);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || end > new Date()) {
    throw new InputError("O fim do trabalho deve ser posterior ao início e até o momento atual.");
  }
  return { work_started_at: start.toISOString(), work_ended_at: end.toISOString(),
    work_minutes: Math.round((end - start) / 60000) };
}

export function assertNoOverlap(db, userId, interval) {
  const all = [
    ...db.tasks.filter(row => row.work_started_at).map(row => ({...row, user_id:row.assigned_to})),
    ...(db["material-worklogs"] || []),
  ];
  if (all.some(row => row.user_id === userId &&
    row.work_started_at < interval.work_ended_at && row.work_ended_at > interval.work_started_at)) {
    throw new InputError("Esse horário já foi registrado para a pessoa. Informe os períodos efetivamente trabalhados.");
  }
}

export function developmentRoute({ name, id, method, body, db, me, add, now }) {
  const products = db["material-products"];
  const experiments = db["material-experiments"];
  const logs = db["material-worklogs"];
  const admin = me.role === "admin";
  const present = row => ({
    ...row,
    product_name: products.find(product => product.id === row.product_id)?.name,
    person_name: db.users.find(user => user.id === row.user_id)?.name,
    task_title: db.tasks.find(task => task.id === row.task_id)?.title,
    experiment_title: experiments.find(experiment => experiment.id === row.experiment_id)?.title,
  });
  const rows = db[name].filter(row => name === "material-experiments" || admin || row.user_id === me.id);
  if (method === "GET") {
    const row = rows.find(row => row.id === id);
    return { status: id && !row ? 404 : 200, data: id ? (row ? present(row) : {error:"Registro indisponível."}) : rows.map(present) };
  }
  const old = id && experiments.find(row => row.id === id);
  if (method === "PATCH" && (!old || (!admin && old.user_id !== me.id))) {
    throw new InputError("Roteiro indisponível para edição.", 403);
  }
  const product = products.find(product => product.id === String(body.product_id || old?.product_id));
  if (!product) throw new InputError("Selecione o material.");
  const userId = old?.user_id || (admin ? String(body.user_id || me.id) : me.id);
  const person = db.users.find(user => user.id === userId && user.active);
  if (!person || (!admin && userId !== me.id) ||
    (person.role !== "admin" && (person.role !== "desenvolvimento" ||
     !db.memberships.some(m => m.user_id === userId && m.startup_id === "materials-palma")))) {
    throw new InputError("Selecione uma pessoa de Desenvolvimento vinculada ao projeto.");
  }
  if (name === "material-experiments") {
    if (old && product.id !== old.product_id) throw new InputError("Preserve o material do roteiro.");
    const value = key => body[key] ?? old?.[key];
    const protocol = {
      title: text(value("title"), "o nome do experimento", true, 200),
      objective: text(value("objective"), "o objetivo"),
      hypothesis: text(value("hypothesis"), "a hipótese", false),
      materials: text(value("materials"), "os materiais e quantidades"),
      procedure: text(value("procedure"), "o roteiro de execução"),
      success_criteria: text(value("success_criteria"), "os critérios de avaliação"),
    };
    const version = (old?.version || 0) + 1;
    const revision = { ...protocol, version, author:me.name, recorded_at:now() };
    const data = { ...protocol, version, product_id:product.id, user_id:userId,
      startup_id:"materials-palma", revisions:[...(old?.revisions || []), revision] };
    const row = old ? Object.assign(old, data) : add(name, data);
    return { status:old ? 200 : 201, data:present(row) };
  }
  const task = db.tasks.find(task => task.id === String(body.task_id) &&
    task.startup_id === "materials-palma" && task.product_id === product.id && task.assigned_to === userId);
  if (!task) throw new InputError("Selecione uma atividade da pessoa e do material.");
  const experiment = body.experiment_id && experiments.find(row => row.id === String(body.experiment_id) && row.product_id === product.id);
  if (body.experiment_id && !experiment) throw new InputError("O roteiro deve ser do mesmo material.");
  const interval = workInterval(body.work_started_at, body.work_ended_at);
  assertNoOverlap(db, userId, interval);
  const row = add(name, {
    product_id:product.id, task_id:task.id, experiment_id:experiment?.id || "",
    user_id:userId, startup_id:"materials-palma", ...interval,
    note:text(body.note, "o trabalho realizado"), author:me.name,
  });
  return { status:201, data:present(row) };
}
