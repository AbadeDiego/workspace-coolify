import { InputError } from "./validation.mjs";

const followerBlock = 1000;
const rewardCents = 50000;
const saoPauloDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export function scheduleReposts(piece, actor, users, belongsTo, add) {
  const post = piece.publication;
  if (piece.repost_task_ids || piece.format !== "reel" || post.network !== "Instagram") return;
  const eligible = user => user?.active && user.role === "marketing" && belongsTo(user.id, piece.startup_id);
  const owner = [actor, users.find(user => user.id === piece.creator_id), ...users].find(eligible);
  if (!owner) throw new InputError("Vincule um perfil ativo de Social Media à startup para planejar as repostagens.");
  const firstDate = saoPauloDate.format(new Date(post.published_at));
  const weeks = 2;
  piece.repost_task_ids = Array.from({ length: weeks }, (_, index) => {
    const date = new Date(firstDate + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + (index + 1) * 7);
    const day = date.toISOString().slice(0, 10);
    return add("tasks", {
      startup_id: piece.startup_id,
      assigned_to: owner.id,
      creator_id: actor.id,
      source: "story_repost",
      source_piece_id: piece.id,
      source_url: post.post_url,
      title: "Repostar nos Stories · " + piece.title.slice(0, 175),
      description: "Compartilhe o Reel nos Stories da conta " + post.account + " e registre a evidência da repostagem em Concluir.",
      status: "pendente",
      priority: "media",
      planned_date: day,
      due_date: day,
      checklist: [],
    }).id;
  });
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
