import { InputError } from "./validation.mjs";

const followerBlock = 1000;
const rewardCents = 50000;
const saoPauloDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export const reelRateCents = 10000;
export const storyCadence = [
  [1, "Apresentação", "Apresente o tema e convide a assistir ao Reel completo."],
  [3, "Pergunta", "Compartilhe com uma pergunta ou enquete relacionada ao tema."],
  [7, "Dica prática", "Destaque uma dica útil do vídeo e convide a salvar o conteúdo."],
  [14, "Bastidores", "Acrescente um bastidor ou contexto novo antes de compartilhar o Reel."],
  [21, "Conversa", "Retome uma dúvida do público e convide a responder ao Story."],
  [28, "Recapitulação", "Relembre o principal benefício e use uma chamada para ação relevante."],
];
const addDays = (day, days) => {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Production payment follows content approval, never the number of reposts.
export function commissionReel(piece, actor, users, add) {
  const owner = users.find(user => user.id === piece.creator_id);
  if (piece.paid_production !== 'yes' || actor.id !== "1" || piece.format !== "reel" ||
    !["marketing", "marketing_externo"].includes(owner?.role)) return;
  const task = add("tasks", {
    startup_id: piece.startup_id, assigned_to: owner.id, creator_id: actor.id,
    source: "content_reel", source_piece_id: piece.id,
    title: "Produzir Reel · " + piece.title.slice(0, 175),
    description: "Envie a versão e acompanhe a avaliação na ficha do conteúdo em Marketing.",
    status: "pendente", priority: "media", checklist: [],
    planned_date: piece.delivery_due || piece.planned_date,
    due_date: piece.delivery_due || piece.planned_date,
    pay_terms: { base_cents: reelRateCents, bonus_cents: 0,
      quality: "Reel completo, coerente com o briefing, com áudio e imagem legíveis e versão aprovada pela Gestão.", result: "" },
  });
  piece.production_task_id = task.id;
}

export function reviewReel(piece, action, actor, db, add, now, note) {
  const task = db.tasks.find(task => task.id === piece.production_task_id);
  if (!task) return;
  const version = piece.versions.at(-1);
  const at = now();
  if (action === "submit") {
    task.status = "concluida";
    task.completed_at = at;
    task.evidence_log = [...(task.evidence_log || []), {
      version_id: version.id, url: version.url, note: version.note || "Versão enviada para revisão no Marketing.",
      author: actor.name, created_at: at,
    }];
    task.pay_review = { status: "pending" };
    return;
  }
  if (!["approve", "changes"].includes(action)) return;
  const review = { status: action === "approve" ? "approved" : "changes",
    feedback: note?.trim() || "Versão aprovada de acordo com o briefing e o critério de qualidade.",
    author: actor.name, reviewed_at: at };
  task.pay_review = review;
  task.pay_review_log = [...(task.pay_review_log || []), { ...review, decision: action }];
  if (action === "changes") {
    task.status = "em_andamento";
    task.completed_at = null;
  } else if (!db.taskPayments.some(entry => entry.task_id === task.id && entry.kind === "base")) {
    add("taskPayments", { task_id: task.id, title: task.title, startup_id: task.startup_id,
      assigned_to: task.assigned_to, kind: "base", cents: task.pay_terms.base_cents,
      month: saoPauloDate.format(new Date(at)).slice(0, 7), approved_at: at });
  }
}

export function scheduleReposts(piece, actor, users, belongsTo, add, tasks = [], pieces = []) {
  const post = piece.publication;
  if (piece.repost_schedule_version === 2 || piece.format !== "reel" || post?.network !== "Instagram") return;
  const legacy = piece.repost_task_ids || [];
  // Previous releases created exactly two weekly tasks; preserve their dates,
  // completion evidence and IDs while adding only the four missing approaches.
  if (legacy.length && legacy.length !== 2) return;
  const existingOffsets = new Map(legacy.map((id, index) => [index === 0 ? 7 : 14, id]));
  const eligible = user => user?.active && user.role === "marketing" && belongsTo(user.id, piece.startup_id);
  const owner = [actor, users.find(user => user.id === piece.creator_id), ...users].find(eligible);
  if (!owner) throw new InputError("Vincule um perfil ativo de Social Media à startup para planejar as repostagens.");
  const firstDate = saoPauloDate.format(new Date(post.published_at));
  const account = followerAccount(post.account);
  const occupied = new Set(tasks.filter(task => {
    if (task.source !== "story_repost" || task.status === "cancelada") return false;
    const source = task.source_account || pieces.find(p => p.id === task.source_piece_id)?.publication?.account;
    return source && String(source).trim().replace(/^@/, "").toLowerCase() === account;
  }).map(task => task.planned_date));
  // Older publications entered today must not create a backlog of overdue tasks.
  const today = saoPauloDate.format(new Date());
  let previousDay = "";
  piece.repost_task_ids = storyCadence.map(([offset, hook, guidance]) => {
    if (existingOffsets.has(offset)) return existingOffsets.get(offset);
    const target = addDays(firstDate, offset);
    let day = target < today ? today : target;
    while (occupied.has(day) || day <= previousDay) day = addDays(day, 1);
    occupied.add(day);
    previousDay = day;
    return add("tasks", {
      startup_id: piece.startup_id,
      assigned_to: owner.id,
      creator_id: actor.id,
      source: "story_repost",
      source_piece_id: piece.id,
      source_url: post.post_url,
      source_account: account,
      repost_offset: offset,
      title: "Stories · " + hook + " · " + piece.title.slice(0, 155),
      description: "Conta @" + account + ". " + guidance + " Compartilhe o Reel original e registre a evidência em Concluir. Atividade sem remuneração. Confira ofertas e informações antes de republicar. Ajuste o horário conforme os Insights da conta.",
      status: "pendente",
      priority: "media",
      planned_date: day,
      due_date: day,
      checklist: [],
    }).id;
  });
  piece.repost_schedule_version = 2;
}

// Called during startup inside the same workspace transaction as migrations.
export function upgradeRepostSchedules(snapshot) {
  const {db} = snapshot;
  const belongsTo = (user, startup) => db.memberships.some(m => m.user_id === user && m.startup_id === startup);
  const add = (table, body) => {
    const row = {...body, id: String(++snapshot.sequence), created_at: new Date().toISOString()};
    db[table].unshift(row);
    return row;
  };
  for (const piece of db.marketing) {
    if (piece.status !== "publicado" || piece.repost_schedule_version === 2 ||
      piece.format !== "reel" || piece.publication?.network !== "Instagram" ||
      !Number.isFinite(Date.parse(piece.publication.published_at))) continue;
    const owner = db.users.find(u => u.active && u.role === "marketing" && belongsTo(u.id, piece.startup_id));
    if (!owner) continue;
    // Legacy account labels sometimes contain display names rather than handles.
    // Leave those records for correction through the regular publication form.
    try { followerAccount(piece.publication.account); } catch { continue; }
    scheduleReposts(piece, owner, db.users, belongsTo, add, db.tasks, db.marketing);
  }
}

export function followerAccount(value) {
  const account = String(value ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(account) || !/[a-z0-9]/.test(account)) {
    throw new InputError("Informe o @usuário da conta do Instagram.");
  }
  return account;
}

export function recordFollowers({ db, body, me, users, starts, belongsTo, add, now, webLink }) {
  const user = users.find(person => person.id === String(body.assigned_to) && person.active && person.role === "marketing");
  const startup = starts.find(item => item.id === String(body.startup_id));
  if (!user || !startup || !belongsTo(user.id, startup.id)) {
    throw new InputError("Selecione um perfil ativo de Social Media vinculado à startup.");
  }
  const account = followerAccount(body.account);
  const count = Number(body.followers);
  if (!["number", "string"].includes(typeof body.followers) || !String(body.followers).trim() ||
    !Number.isSafeInteger(count) || count < 0 || count > 1000000000) {
    throw new InputError("Informe o total de seguidores como um número inteiro entre 0 e 1 bilhão.");
  }
  const evidenceUrl = String(body.evidence_url ?? "").trim();
  if (evidenceUrl && !webLink(evidenceUrl)) throw new InputError("Informe um link HTTP ou HTTPS para a evidência.");
  const readings = db.followerReadings.filter(row => row.account === account);
  if (readings.some(row => row.assigned_to !== user.id || row.startup_id !== startup.id)) {
    throw new InputError("Esta conta já está vinculada a outra pessoa ou startup.");
  }

  const peak = readings.length ? Math.max(...readings.map(row => row.followers)) : count;
  const growth = Math.max(0, count - peak);
  const previousGrowth = db.followerReadings
    .filter(row => row.assigned_to === user.id)
    .reduce((total, row) => total + row.growth, 0);
  const cumulative = previousGrowth + growth;
  const blocks = Math.floor(cumulative / followerBlock) - Math.floor(previousGrowth / followerBlock);
  const approvedAt = now();
  const reading = add("followerReadings", {
    startup_id: startup.id,
    assigned_to: user.id,
    account,
    followers: count,
    growth,
    baseline: !readings.length,
    evidence_url: evidenceUrl,
    approved_by: me.name,
    approved_at: approvedAt,
    blocks,
  });
  if (blocks) add("taskPayments", {
    kind: "followers",
    startup_id: startup.id,
    assigned_to: user.id,
    title: "Bônus por crescimento de seguidores",
    reading_id: reading.id,
    month: saoPauloDate.format(new Date(approvedAt)).slice(0, 7),
    approved_at: approvedAt,
    cents: blocks * rewardCents,
    follower_count: blocks * followerBlock,
  });
  return reading;
}
