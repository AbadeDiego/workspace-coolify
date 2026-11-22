const MATERIAL_SPACE = "materials-palma";
const taskPayRoles = ["comercial","marketing","marketing_externo"];
(() => {
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const e = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (n) => `<i data-lucide="${n}"></i>`;
const icons = () =>
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });
const fmt = (n) => new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
const brl = (n) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format((Number(n) || 0) / 100);
const dateOnly = (x) => (x ? String(x).slice(0, 10) : "");
const human = (x) =>
  dateOnly(x)
    ? new Date(dateOnly(x) + "T12:00:00Z").toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      })
    : "Sem prazo";
const dateTime = (x) =>
  x
    ? new Date(x).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não agendado";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const monthStart = (d) => d.slice(0, 7) + "-01";
const monthEnd = (d) =>
  new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
const state = {
  me: null,
  startups: [],
  users: [],
  memberships: [],
  templates: [],
  section: "dashboard",
  startup: "",
  period: "month",
  from: monthStart(today()),
  to: monthEnd(today()),
  view: {},
  filter: {},
  sort: {},
  pagination: {},
  data: {},
  exports: [],
  calendar: 0,
  workDate: "",
  workPerson: "",
  payMonth: "",
  payPerson: "",
  dashboardDetails: new Map(),
};
const NAV = [
  ["dashboard", "layout-dashboard", "Visão geral", "Gestão"],
  ["myday", "calendar-days", "Meu dia", "Gestão"],
  ["tasks", "list-todo", "Atividades", "Gestão"],
  ["goals", "target", "Metas", "Gestão"],
  ["crm", "filter", "Prospecção ativa", "Negócios"],
  ["commercial", "chart-no-axes-combined", "Comercial", "Negócios"],
  ["finance", "wallet", "Financeiro", "Negócios"],
  ["personal-finance", "coins", "Finanças pessoais", "Negócios"],
  ["marketing", "megaphone", "Marketing", "Operações"],
  ["materials", "flask-conical", "Desenvolvimento de materiais", "Operações"],
  ["tech", "code-xml", "Tecnologia", "Operações"],
  ["processes", "workflow", "Processos", "Operações"],
  ["people", "users", "Pessoas", "Operações"],
];
const STAGES = [
  "Lead",
  "Contactados",
  "Neutros",
  "Com interesse",
  "Reunião marcada",
  "Fechamentos",
  "Clientes",
];
const LABEL = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  bloqueada: "Bloqueada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
  baixa: "Baixa",
  admin: "Gestão",
  comercial: "Comercial",
  marketing: "Social Media",
  marketing_externo: "Marketing externo",
  desenvolvimento: "Desenvolvimento de materiais",
  colaborador: "Colaborador",
  previsto: "Previsto",
  realizado: "Realizado",
  receita: "Receita",
  despesa: "Despesa",
  fixa: "Fixa",
  variavel: "Variável",
  weekly: "Semanal",
  monthly: "Mensal",
  fixed: "Período fixo",
  planejado: "Backlog",
  validacao: "Em validação",
  concluido: "Entregue",
  tarefa: "Tarefa",
  implementacao: "Implementação",
  correcao: "Correção",
  video: "Vídeo",
  reel: "Reels",
  story: "Stories",
  post: "Post",
  outro: "Outro",
  planejamento: "Planejamento",
  producao: "Produção",
  revisao: "Revisão",
  aprovacao: "Aprovado",
  publicacao: "Publicado",
  rascunho: "Planejamento",
  ajustes_solicitados: "Ajustes solicitados",
  rascunho_proposta: "Rascunho",
  aguardando_validacao: "Aguardando validação",
  liberada: "Liberada para envio",
  enviada: "Enviada",
  negociacao: "Em negociação",
  perdida: "Perdida",
  fechada: "Fechada",
  ajustes: "Produção",
  em_revisao: "Revisão",
  aprovado: "Aprovado",
  publicado: "Publicado",
};
const label = (x) => LABEL[x] || x || "—",
  admin = () => state.me?.role === "admin",
  crmAccess = () => ["admin", "comercial"].includes(state.me?.role),
  marketingAccess = () => ["admin", "marketing"].includes(state.me?.role),
  external = () => state.me?.role === "marketing_externo",
  marketingViewer = () => marketingAccess() || external();
const managesTaskPay = () => admin() && String(state.me.id) === "1";
const materialAccess = () => admin() || state.me?.role === "desenvolvimento";
const canOpen = key => {
  if(key === "materials")return materialAccess();
  if (key === "personal-finance") return managesTaskPay() || taskPayRoles.includes(state.me?.role);
  if (["finance", "people"].includes(key)) return admin();
  if (["crm", "commercial"].includes(key)) return crmAccess();
  if (key === "marketing") return marketingViewer();
  if (["tech", "processes"].includes(key)) return admin();
  return true;
};
// Shared visualization palette. CSS owns color values; JS assigns their meaning.
const VIZ = Object.freeze(Object.fromEntries(['blue','green','amber','red','purple','gray'].map(k=>[k,`var(--viz-${k})`])));
const COLORS = [VIZ.blue,VIZ.purple,VIZ.green,VIZ.amber,VIZ.gray];
const vizColor = name => {
  const text=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/bloque|atras|erro|alerta|cancelad|reprovad/.test(text))return VIZ.red;
  if(/concluid|publicad|receita|clientes|convertid|atingid|aprovad|bonifica/.test(text))return VIZ.green;
  if(/pendent|aguard|revis|despesa|previst|ajuste|negoci|proposta/.test(text))return VIZ.amber;
  if(/inativ|sem responsavel/.test(text))return VIZ.gray;
  if(/reuniao|reunioes|agendament/.test(text))return VIZ.purple;
  return VIZ.blue;
};
const chartLegend = series => `<div class="chart-series-labels">${series.map(s=>`<span><i aria-hidden="true" style="--series-color:${s.color||vizColor(s.label)}"></i>${e(s.label)}</span>`).join('')}</div>`;
const startupName = (id) =>
  state.startups.find((x) => String(x.id) === String(id))?.name || "—";
const startupIdent = (id, sub = "") => {
  const i = state.startups.findIndex((x) => String(x.id) === String(id)),
    name = startupName(id);
  return `<div class="startup-ident"><span class="startup-icon" style="--company:${COLORS[Math.max(0, i) % COLORS.length]}">${e(name.slice(0, 2).toUpperCase())}</span><div><b>${e(name)}</b>${sub ? `<div class="table-sub">${e(sub)}</div>` : ""}</div></div>`;
};
const priority = (p) => `<span class="priority ${e(p)}">${e(label(p))}</span>`;
const badge = (s, type = "") =>
  `<span class="tag ${type || (["concluida", "realizado", "Clientes", "publicado", "concluido"].includes(s) ? "ok" : ["bloqueada", "urgente"].includes(s) ? "bad" : ["previsto", "em_revisao", "Reunião marcada"].includes(s) ? "warn" : "")}">${e(label(s))}</span>`;
const progress = (done, total = 100) => {
  const percent=total?(Number(done)/Number(total))*100:0,fill=Math.max(0,Math.min(100,percent));
  const description=`${fmt(done)} de ${fmt(total)} · ${fmt(percent)}%`;
  return `<div class="progress" role="meter" tabindex="0" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}" aria-valuetext="${e(description)}" data-viz-tooltip="${e(description)}" style="--viz-accent:${percent>=100?VIZ.green:VIZ.blue}"><div style="width:${fill}%"></div></div>`;
};
const empty = (title, description = "", name = "inbox") =>
  `<div class="empty">${icon(name)}<b>${e(title)}</b>${description ? `<p>${e(description)}</p>` : ""}</div>`;
const card = (title, body, subtitle = "", right = "") =>
  `<section class="card"><div class="card-head"><div><h2>${e(title)}</h2>${subtitle ? `<p>${e(subtitle)}</p>` : ""}</div>${right}</div><div class="card-body">${body}</div></section>`;
const button = (text, action, extra = "", cls = "") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const dashboardLink = (body, key, cls) => button(body + `<span class="dashboard-arrow">${icon("arrow-up-right")}</span>`,
  "dashboard-detail", `data-key="${e(key)}" aria-haspopup="dialog"`, cls + " dashboard-link");
const kpi = (title, value, note, ic = "activity", tone = "", detail = "") => {
  const body = `<span class="kpi-head" style="--viz-accent:${vizColor(title)}"><span class="label">${e(title)}</span><span class="kpi-icon">${icon(ic)}</span></span><strong class="${String(value).includes("R$") ? "money-value" : ""}">${e(value)}</strong><small class="${tone}">${tone ? icon(tone === "positive" ? "trending-up" : "circle-alert") : ""}${e(note)}</small>`;
  return detail ? dashboardLink(body, detail, "kpi") : `<div class="kpi">${body}</div>`;
};
const intro = (title, sub, action = "") =>
  `<div class="page-intro"><div><span class="eyebrow">${e(state.startup ? startupName(state.startup) : "SEU WORKSPACE, EM PERSPECTIVA")}</span><h1>${e(title)}</h1><p>${e(sub)}</p><p class="scope-context">${e(screenContext())}</p></div><div class="actions">${button(icon("download") + "Exportar", "export", "", "export-btn")}${action}</div></div>`;
function screenContext(){const company=selectedScope();if(state.section==='myday')return company+' · '+human(state.workDate || today());if(state.section==='personal-finance')return company+' · '+longMonth(state.payMonth || today().slice(0,7));if(state.section==='crm')return company+' · Carteira atual';if(state.section==='goals')return company+' · Ciclo informado em cada meta';if(['people','processes'].includes(state.section))return company+' · Posição atual';return company+' · '+(state.from&&state.to?human(state.from)+' a '+human(state.to):'Todo o período registrado')}
const isMoneyColumn=c=>/(cents$)|^(income|expense|receita|value)$/.test(c.key||'')||/\(R\$\)|Receita realizada|Resultado|Saldo/.test(c.title||'');
const options = (arr, value) =>
  arr
    .map(
      ([v, l]) =>
        `<option value="${e(v)}" ${String(v) === String(value) ? "selected" : ""}>${e(l)}</option>`,
    )
    .join("");
const sf = (title, name, value = "", type = "text", attrs = "") =>
  `<label>${e(title)}<input type="${type}" name="${name}" value="${e(value)}" ${attrs}></label>`;
const sel = (title, name, arr, value = "", attrs = "") =>
  `<label>${e(title)}<select name="${name}" ${attrs}>${options(arr, value)}</select></label>`;
const text = (title, name, value = "", attrs = "") =>
  `<label class="full">${e(title)}<textarea name="${name}" ${attrs}>${e(value)}</textarea></label>`;
const date = (title, name, value = "", required = "") =>
  sf(title, name, dateOnly(value), "date", required);
const startupsField = (v = state.startup || state.startups[0]?.id) =>
  sel(
    "Startup",
    "startup_id",
    state.startups.map((s) => [s.id, s.name]),
    v,
    "required",
  );
const assignedPeople = (sid) =>
  state.users.filter(
    (x) =>
      x.active &&
      (x.role === "admin" ||
        !admin() ||
        state.memberships.some(
          (m) =>
            String(m.user_id) === String(x.id) &&
            String(m.startup_id) === String(sid),
        )),
  );
const ownerField = (
  v,
  sid = state.startup || state.startups[0]?.id,
  name = "assigned_to",
) =>
  sel(
    "Responsável",
    name,
    assignedPeople(sid).map((x) => [x.id, x.name]),
    v,
    "required data-owner-field",
  );
function toast(message, error = false) {
  const x = $("#toast");
  x.textContent = message;
  x.style.background = error ? "#9e4e57" : "";
  x.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => x.classList.remove("show"), 4200);
}
async function api(path, method = "GET", b) {
  const r = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: b ? { "Content-Type": "application/json" } : {},
    body: b ? JSON.stringify(b) : undefined,
  });
  const data = await r
    .json()
    .catch(() => ({ error: "Resposta inválida do servidor" }));
  if (!r.ok) {
    if (r.status === 401 && state.me && !path.startsWith("/api/auth/")) void showLogin();
    throw Error(data.error || "Não foi possível concluir a operação");
  }
  return data;
}
const load = async (name) => {
  const x = await api(
    "/api/" +
      name +
      (state.startup ? "?startupId=" + encodeURIComponent(state.startup) : ""),
  );
  state.data[name] = x;
  return x;
};
const inPeriod = (x, field) => {
  const d = dateOnly(x[field]);
  return (
    !!d && (!state.from || d >= state.from) && (!state.to || d <= state.to)
  );
};
const periodRows = (rows, field) =>
  state.period === "all" ? rows : rows.filter((x) => inPeriod(x, field));
const sum = (rows, field) =>
  rows.reduce((n, x) => n + Number(x[field] || 0), 0);
const taskDate = (t) => dateOnly(t.due_date || t.planned_date || t.created_at);
const periodTasks = (rows) =>
  state.period === "all"
    ? rows
    : rows.filter(
        (t) =>
          (!state.from || taskDate(t) >= state.from) &&
          (!state.to || taskDate(t) <= state.to),
      );
const openTask = (t) => !["concluida", "cancelada"].includes(t.status);
const dueTone = (t) =>
  openTask(t) &&
  t.due_date &&
  (dateOnly(t.due_date) < today()
    ? "due-alert"
    : dateOnly(t.due_date) <=
        new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
      ? "due-soon"
      : "");
function periodBar() {
  return `<div class="period-bar"><div class="segmented">${[
    ["week", "Esta semana"],
    ["month", "Este mês"],
    ["year", "Este ano"],
    ["all", "Todo período"],
  ]
    .map(([k, t]) =>
      button(
        e(t),
        "period",
        `data-value="${k}"`,
        state.period === k ? "active" : "",
      ),
    )
    .join(
      "",
    )}</div><div class="date-range">${icon("calendar-days")}<label><span>Início do período</span><input aria-label="Início do período" type="date" id="period-from" value="${e(state.from)}"></label><span>—</span><label><span>Fim do período</span><input aria-label="Fim do período" type="date" id="period-to" value="${e(state.to)}"></label></div></div>`;
}
const mobileNav = window.matchMedia("(max-width: 960px)");
function syncSidebarAccessibility() {
  const sidebar = $("#sidebar");
  if (!mobileNav.matches) sidebar.classList.remove("open");
  const open = mobileNav.matches && sidebar.classList.contains("open");
  sidebar.inert = mobileNav.matches && !open;
  $(".page-wrap").inert = open;
  $("#menu-shade").classList.toggle("hidden", !open);
  $("#mobile-menu").setAttribute("aria-expanded", String(open));
}
function setMobileMenu(open, restoreFocus = false) {
  $("#sidebar").classList.toggle("open", open);
  syncSidebarAccessibility();
  if (open) $("#close-mobile-menu").focus();
  else if (restoreFocus) $("#mobile-menu").focus();
}
mobileNav.addEventListener("change", syncSidebarAccessibility);
function nav() {
  syncSidebarAccessibility();
  let group = "";
  $("#nav").innerHTML = NAV.filter(([key]) => canOpen(key))
    .map(([id, ic, title, g]) => {
      let head = "";
      if (group !== g) {
        group = g;
        head = `<div class="nav-group">${g.toUpperCase()}</div>`;
      }
      return (
        head +
        `<button class="nav-btn ${id === state.section ? "active" : ""}" data-nav="${id}" title="${e(title)}" ${id === state.section ? 'aria-current="page"' : ""}>${icon(ic)}<span>${e(id === "marketing" && external() ? "Minhas entregas" : title)}</span></button>`
      );
    })
    .join("");
  $("#module-selector").innerHTML = options(NAV.filter(([id])=>canOpen(id)).map(([id,,title])=>[id,id === "marketing" && external() ? "Minhas entregas" : title]),state.section);
  icons();
}
function resetWorkspace() {
  renderVersion++;
  Object.assign(state, {
    me: null, startups: [], users: [], memberships: [], templates: [],
    section: "myday", startup: "", period: "month",
    from: monthStart(today()), to: monthEnd(today()),
    materialProduct: "", materialTab: "overview", materialStatus: "", workDate: "", workPerson: "", payMonth: "", payPerson: "", dashboardDetails: new Map(), data: {}, filter: {}, sort: {}, pagination: {}, calendar: 0, exports: [],
    view: { crm: window.matchMedia("(max-width: 700px)").matches ? "list" : "board" },
  });
  window.searchIndex = null;
  $("#editor").close();
  $("#sidebar").classList.remove("open");
  $("#menu-shade").classList.add("hidden");
  $("#notification-dot").classList.add("hidden");
  syncSidebarAccessibility();
  $("#main").replaceChildren();
  $("#shell").classList.add("hidden");
}
function clearLoginError() {
  $("#login-error").textContent = "";
  for (const id of ["login-email", "login-password"]) $("#" + id).removeAttribute("aria-invalid");
}
function showLogin() {
  resetWorkspace();
  const form = $("#login-form");
  form.reset();
  $('button[type="submit"]', form).disabled = false;
  clearLoginError();
  $("#login").classList.remove("hidden");
  $("#workspace-skip-link").setAttribute("href", "#login-title");
  $("#login-title").focus();
  window.scrollTo(0, 0);
  icons();
}
async function bootstrap() {
  const me = await api("/api/me");
  const b = await api("/api/bootstrap");
  state.me = me;
  state.section = me.role === "desenvolvimento" ? "materials" : "myday";
  state.startups = b.startups;
  state.users = b.users;
  state.templates = b.templates;
  state.memberships = admin() ? await api("/api/memberships") : [];
  $("#startup-filter").innerHTML = options(
    [["", "Todas as startups"], ...state.startups.map((x) => [x.id, x.name])],
    state.startup,
  );
  $("#side-person").innerHTML =
    `<b>${e(me.name)}</b><small>${e(label(me.role))} · ${state.startups.length} startups</small>`;
  $("#avatar").textContent = me.name[0];
  $("#side-avatar").textContent = me.name[0];
  $("#shell").classList.remove("hidden");
  $("#login").classList.add("hidden");
  $("#workspace-skip-link").setAttribute("href", "#main");
  await render();
  $("#main").focus();
  window.scrollTo(0, 0);
}
let renderVersion = 0;
async function render() {
  if (!state.me) return;
  const version = ++renderVersion;
  nav();
  $("#page-title").textContent =
    (state.section === "marketing" && external() ? "Minhas entregas" : NAV.find((x) => x[0] === state.section)?.[2]) || "Workspace";
  $("#main").setAttribute("aria-busy", "true");
  $("#main").innerHTML =
    '<div class="loading"><div class="skeleton short"></div><div class="skeleton"></div><div class="skeleton big"></div></div>';
  try {
    const html = await PAGES[state.section](version);
    if (version !== renderVersion) return;
    $("#main").innerHTML = html;
    $("#main").setAttribute("aria-busy", "false");
    icons();
    mountCharts();
    notificationItems().then(items => {
      if (version === renderVersion) $("#notification-dot").classList.toggle("hidden", !items.length);
    }).catch(() => {});
  } catch (err) {
    if (version !== renderVersion) return;
    $("#main").setAttribute("aria-busy", "false");
    $("#main").innerHTML = card(
      "Não foi possível carregar",
      empty(
        err.message,
        "Tente novamente para atualizar as informações.",
        "cloud-off",
      ) + button("Tentar novamente", "reload"),
    );
    toast(err.message, true);
  }
}
function filtersHTML(key, extras = [], showViews = true) {
  const f = state.filter[key] || {};
  return `<div class="toolbar"><div class="filter-group"><div class="toolbar-search">${icon("search")}<input id="filter-search" data-filter="${key}" placeholder="Buscar nesta página…" value="${e(f.search || "")}" aria-label="Buscar nesta página"></div>${extras.map(([name, title, values]) => `<select data-filter="${key}" data-field="${name}" aria-label="${title}">${options([["", title], ...values], f[name] || "")}</select>`).join("")}</div>${
    showViews
      ? `<div class="segmented">${[
          ["list", "Lista", "list"],
          ["board", "Quadro", "columns-3"],
        ]
          .map(([v, t, ic]) =>
            button(
              icon(ic) + t,
              "view",
              `data-key="${key}" data-value="${v}"`,
              (state.view[key] || "list") === v ? "active" : "",
            ),
          )
          .join("")}</div>`
      : ""
  }</div>`;
}
function filtered(rows, key) {
  const f = state.filter[key] || {};
  return rows.filter(
    (x) =>
      (!f.search ||
        Object.values(x)
          .filter((v) => typeof v !== "object")
          .join(" ")
          .toLowerCase()
          .includes(f.search.toLowerCase())) &&
      (!f.owner ||
        String(x.assigned_to || x.owner_id || x.creator_id) === f.owner) &&
      (!f.priority || x.priority === f.priority) &&
      (!f.status || x.status === f.status),
  );
}
function table(rows, cols, key = "main", paginate = true, interactive = true) {
  const sorting = interactive ? state.sort[key] : null;
  let data = [...rows];
  if (sorting) {
    data.sort((a, b) => {
      const x = a[sorting.key] ?? "",
        y = b[sorting.key] ?? "";
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "pt-BR", { numeric: true })) *
        sorting.dir
      );
    });
  }
  if (interactive) state.exports = data.map((x) =>
    Object.fromEntries(
      cols.filter((c) => c.key).map((c) => [c.title, /(cents$)|^(income|expense|receita|value)$/.test(c.key) ? (x[c.key]==null?"Sem dados":(Number(x[c.key])/100).toFixed(2).replace(".", ",")) : x[c.key] ?? ""]),
    ),
  );
  const per = 10,
    pages = Math.max(1, Math.ceil(data.length / per));
  const pg = interactive ? Math.min(state.pagination[key] || 1, pages) : 1;
  if (interactive) state.pagination[key] = pg;
  const list = paginate ? data.slice((pg - 1) * per, pg * per) : data;
  const sortColumns = interactive ? cols.filter(column => column.key && column.title) : [];
  const sortChoices = sortColumns.flatMap(column => [
    ["1:" + column.key, column.title + " (crescente)"],
    ["-1:" + column.key, column.title + " (decrescente)"],
  ]);
  const mobileSort = sortChoices.length ? `<label class="mobile-table-sort">Ordenar por
    <select data-table-sort="${e(key)}">${options([["", "Ordem padrão"], ...sortChoices], sorting ? sorting.dir + ":" + sorting.key : "")}</select>
  </label>` : "";
  const headings = cols.map(column => {
    const title = e(column.title || "");
    const sort = column.key && interactive;
    const arrow = sorting && sorting.key === column.key ? (sorting.dir > 0 ? "arrow-up" : "arrow-down") : "chevrons-up-down";
    return `<th role="columnheader" scope="col" class="${isMoneyColumn(column) ? "money-cell" : ""}">${sort
      ? button(title + icon(arrow), "sort", `data-key="${e(key)}" data-field="${e(column.key)}"`, "sort-button")
        + `<span class="table-heading-label">${title}</span>`
      : title}</th>`;
  }).join("");
  const records = list.map(row => `<tr role="row">${cols.map(column => `<td role="cell"
    class="${isMoneyColumn(column) ? "money-cell" : ""}" data-label="${e(column.title || "")}">
    <div class="table-cell-value">${column.render ? column.render(row) : e(row[column.key])}</div>
  </td>`).join("")}</tr>`).join("");
  const emptyRow = `<tr role="row"><td role="cell" colspan="${cols.length}">${empty("Nenhum registro neste período", "Ajuste os filtros ou cadastre o primeiro registro.", "search")}</td></tr>`;
  return `${mobileSort}<div class="table-wrap"><table class="data-table stacked-table" role="table">
    <thead role="rowgroup"><tr role="row">${headings}</tr></thead>
    <tbody role="rowgroup">${records || emptyRow}</tbody>
  </table></div>${paginate ? `<div class="pagination"><span>${data.length ? `${(pg - 1) * per + 1}–${Math.min(pg * per, data.length)}` : "0"} de ${data.length} registros</span><div class="flex">${button(icon("chevron-left"), "pagination", `data-key="${key}" data-value="${pg - 1}" aria-label="Página anterior" ${pg === 1 ? "disabled" : ""}`)}<span>${pg} / ${pages}</span>${button(icon("chevron-right"), "pagination", `data-key="${key}" data-value="${pg + 1}" aria-label="Próxima página" ${pg === pages ? "disabled" : ""}`)}</div></div>` : ""}`;
}
// Temporal charts share the same accessible rendering and exact-value controls.
const chartRegistry = new Map();
let chartSequence = 0, chartObserver;
const selectedScope = () => state.startup ? startupName(state.startup) : 'Consolidado do portfólio';
const shortMonth = m => new Date(m+'-01T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.','');
const longMonth = m => new Date(m+'-01T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
function temporalMonths(){const end=state.to||today(),months=[];for(let i=5;i>=0;i--){const x=new Date(end+'T12:00:00Z');x.setUTCDate(1);x.setUTCMonth(x.getUTCMonth()-i);months.push(x.toISOString().slice(0,7))}return months}
function chartPeriod(months=temporalMonths()){return `${longMonth(months[0])} a ${longMonth(months.at(-1))}`}
const exactChartValue=(v,money)=>v==null?'Sem dados':money?brl(v):fmt(v);
function chartPointDescription(model,index){return `${longMonth(model.months[index])}. `+model.series.map(s=>`${s.label}: ${exactChartValue(s.values[index],model.money)}`).join('; ')}
function temporalChart({id,title,months=temporalMonths(),series,type='columns',money=false,unit=money?'R$ mil':'Quantidade',note=''}){
 series=series.map(s=>({...s,color:s.color||vizColor(s.label)}));
 const key=`chart-${id}-${++chartSequence}`,model={id:key,title,months,series,type,money,unit,selected:months.length-1};chartRegistry.set(key,model);
 const tableRows=months.map((m,i)=>`<tr><th scope="row">${e(longMonth(m))}</th>${series.map(s=>`<td class="numeric-cell ${money?'money-cell':''}">${e(exactChartValue(s.values[i],money))}</td>`).join('')}</tr>`).join('');
 return `<figure class="data-chart" aria-labelledby="${key}-caption"><figcaption id="${key}-caption"><b>${e(title)}</b><span>${e(selectedScope())} · ${e(chartPeriod(months))} · ${e(unit)}</span></figcaption>${chartLegend(series)}<div class="chart-canvas" id="${key}-canvas" data-chart-host="${key}"></div><div class="chart-inspector"><label for="${key}-select">Consultar mês</label><select id="${key}-select" data-chart-select="${key}">${months.map((m,i)=>`<option value="${i}" ${i===model.selected?'selected':''}>${e(longMonth(m))}</option>`).join('')}</select><output id="${key}-value" aria-live="polite" aria-atomic="true">${e(chartPointDescription(model,model.selected))}</output></div><p class="chart-instruction" id="${key}-hint">Toque em um mês ou use Tab e as setas do teclado para consultar os valores exatos.${note?' '+e(note):''}</p><details class="chart-data"><summary>Ver tabela de dados de ${e(title.toLowerCase())}</summary><div class="table-wrap"><table class="data-table chart-data-table"><caption class="sr-only">${e(title)} · ${e(selectedScope())} · ${e(chartPeriod(months))}. Valores ${money?'em reais':'em quantidade'}.</caption><thead><tr><th scope="col">Mês</th>${series.map(s=>`<th scope="col" class="numeric-cell">${e(s.label)}${money?' (R$)':''}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div></details></figure>`;
}
function drawTemporalChart(model,width){
 const w=Math.max(230,Math.round(width)),h=268,left=55,right=12,top=30,bottom=48,pw=w-left-right,ph=h-top-bottom,values=model.series.flatMap(s=>s.values.filter(v=>v!=null&&Number.isFinite(Number(v))).map(Number));
 let lo=Math.min(0,...values),hi=Math.max(0,...values);if(lo===hi)hi=lo+(model.money?100000:1);
 const rough=(hi-lo)/4,power=10**Math.floor(Math.log10(rough)),factor=[1,2,2.5,5,10].find(x=>x*power>=rough)||10,step=model.money?factor*power:Math.max(1,factor*power);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
 const y=v=>top+(hi-v)/(hi-lo)*ph,slot=pw/model.months.length,x=i=>left+(i+.5)*slot,zero=y(0),ticks=[];for(let v=lo;v<=hi+step*.01;v+=step)ticks.push(v);
 const axis=v=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:model.money?2:1}).format(model.money?v/100000:v);
 const grid=ticks.map(v=>`<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" class="${Math.abs(v)<step*.001?'chart-zero':'chart-grid'}"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${e(axis(v))}</text>`).join('');
 let drawing='';
 if(model.type==='line')drawing+=model.series.map(s=>{let d='',gap=true;for(let i=0;i<model.months.length;i++){const value=s.values[i];if(value==null){gap=true;continue}d+=(gap?'M':'L')+x(i).toFixed(2)+','+y(value).toFixed(2)+' ';gap=false}return `<path class="chart-line" d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`}).join('');
 const bar=Math.max(1,Math.min(28,(slot-12-3*(model.series.length-1))/Math.max(1,model.series.length)));
 drawing+=model.months.map((month,i)=>{
  const marks=model.series.map((s,j)=>{const value=s.values[i];if(value==null)return '';const px=x(i)+(j-(model.series.length-1)/2)*(bar+3),py=y(value);if(model.type==='line')return `<circle class="chart-mark" cx="${x(i)}" cy="${py}" r="3.5" fill="${s.color}" stroke="#fff" stroke-width="1.5"/>`;return `<rect class="chart-mark" x="${px-bar/2}" y="${Math.min(py,zero)}" width="${bar}" height="${Math.abs(zero-py)}" fill="${s.color}" rx="4"/>`}).join('');
  return `<g class="chart-point${i===model.selected?' point-selected':''}" role="button" tabindex="0" aria-label="${e(chartPointDescription(model,i))}" data-chart-point="${model.id}" data-index="${i}"><rect class="chart-hit" x="${left+i*slot+1}" y="${top-7}" width="${Math.max(1,slot-2)}" height="${ph+15}" rx="4" fill="transparent"/>${marks}<text x="${x(i)}" y="${h-bottom+24}" text-anchor="middle">${e(shortMonth(month))}</text></g>`;
 }).join('');
 const noValues=values.length?'':`<text x="${left+pw/2}" y="${top+ph/2}" text-anchor="middle" class="chart-empty-text">Sem dados suficientes</text>`;
 return `<svg class="temporal-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="group" aria-labelledby="${model.id}-caption" aria-describedby="${model.id}-hint"><text x="${left}" y="16" class="chart-axis-unit">${e(model.unit)}</text>${grid}${drawing}${noValues}<text x="${left+pw/2}" y="${h-3}" text-anchor="middle">Mês</text></svg>`;
}
// One tooltip for every visualization. Mouse and keyboard share exact values;
// touch users retain the chart inspector and the existing dashboard actions.
let vizTooltip, vizTooltipTarget;
function hideVizTooltip(){
  if(vizTooltip)vizTooltip.hidden=true;
  if(vizTooltipTarget){
    const ids=(vizTooltipTarget.getAttribute('aria-describedby')||'').split(/\s+/).filter(x=>x&&x!=='viz-tooltip');
    if(ids.length)vizTooltipTarget.setAttribute('aria-describedby',ids.join(' '));
    else vizTooltipTarget.removeAttribute('aria-describedby');
  }
  vizTooltipTarget=null;
}
function showVizTooltip(target){
  const point=target.closest('[data-chart-point]');
  let text=target.dataset.vizTooltip;
  if(point){const model=chartRegistry.get(point.dataset.chartPoint),i=Number(point.dataset.index);if(!model)return;
    text=longMonth(model.months[i])+'\n'+model.series.map(s=>`${s.label}: ${exactChartValue(s.values[i],model.money)}`).join('\n');
  }
  if(!text)return;
  if(!vizTooltip){vizTooltip=document.createElement('div');vizTooltip.id='viz-tooltip';vizTooltip.className='viz-tooltip';vizTooltip.setAttribute('role','tooltip');document.body.append(vizTooltip)}
  if(vizTooltipTarget!==target)hideVizTooltip();
  vizTooltipTarget=target;vizTooltip.textContent=text;vizTooltip.hidden=false;
  const ids=(target.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);
  if(!ids.includes('viz-tooltip'))target.setAttribute('aria-describedby',[...ids,'viz-tooltip'].join(' '));
  const rect=target.getBoundingClientRect(),tip=vizTooltip.getBoundingClientRect();
  const vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
  const left=Math.max(12,Math.min(vw-tip.width-12,rect.left+rect.width/2-tip.width/2));
  const top=rect.top-tip.height-10>=12?rect.top-tip.height-10:Math.min(vh-tip.height-12,rect.bottom+10);
  vizTooltip.style.left=left+'px';vizTooltip.style.top=Math.max(12,top)+'px';
}
const vizTooltipSource = target => target.closest?.('[data-chart-point],[data-viz-tooltip]') || target.closest?.('.dashboard-bar')?.querySelector('[data-viz-tooltip]');
document.addEventListener('pointerover',ev=>{if(ev.pointerType==='touch')return;const target=vizTooltipSource(ev.target);if(target)showVizTooltip(target)});
document.addEventListener('pointerout',ev=>{if(!vizTooltipTarget||vizTooltipTarget.contains(ev.relatedTarget))return;hideVizTooltip()});
document.addEventListener('focusin',ev=>{const target=vizTooltipSource(ev.target);if(target)showVizTooltip(target)});
document.addEventListener('focusout',hideVizTooltip);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')hideVizTooltip()});
document.addEventListener('scroll',hideVizTooltip,true);
document.addEventListener('click',hideVizTooltip);
window.addEventListener?.('resize',hideVizTooltip);

function mountCharts(){hideVizTooltip();chartObserver?.disconnect();const hosts=$$('[data-chart-host]');const paint=host=>{const model=chartRegistry.get(host.dataset.chartHost);if(!model)return;const width=Math.floor(host.clientWidth);if(!width||host.dataset.chartWidth===String(width))return;host.dataset.chartWidth=width;host.innerHTML=drawTemporalChart(model,width)};hosts.forEach(paint);chartObserver=new ResizeObserver(entries=>entries.forEach(x=>paint(x.target)));hosts.forEach(x=>chartObserver.observe(x));for(const key of chartRegistry.keys())if(!document.getElementById(key+'-canvas'))chartRegistry.delete(key)}
function showChartPoint(key,index){const model=chartRegistry.get(key);if(!model)return;model.selected=Math.max(0,Math.min(model.months.length-1,Number(index)));const output=document.getElementById(key+'-value'),select=document.getElementById(key+'-select');if(output)output.textContent=chartPointDescription(model,model.selected);if(select)select.value=model.selected;$$(`[data-chart-point="${key}"]`).forEach(el=>el.classList.toggle('point-selected',Number(el.dataset.index)===model.selected))}
document.addEventListener('click',ev=>{const p=ev.target.closest('[data-chart-point]');if(p)showChartPoint(p.dataset.chartPoint,p.dataset.index)});
document.addEventListener('change',ev=>{if(ev.target.dataset.chartSelect)showChartPoint(ev.target.dataset.chartSelect,ev.target.value)});
document.addEventListener('keydown',ev=>{const p=ev.target.closest('[data-chart-point]');if(!p)return;const model=chartRegistry.get(p.dataset.chartPoint);if(!model)return;let i=Number(p.dataset.index);if(['Enter',' '].includes(ev.key)){ev.preventDefault();showChartPoint(model.id,i)}else if(['ArrowLeft','ArrowRight','Home','End'].includes(ev.key)){ev.preventDefault();i=ev.key==='Home'?0:ev.key==='End'?model.months.length-1:Math.max(0,Math.min(model.months.length-1,i+(ev.key==='ArrowRight'?1:-1)));const target=document.querySelector(`[data-chart-point="${model.id}"][data-index="${i}"]`);target?.focus();showChartPoint(model.id,i)}});
const moneyOrMissing=v=>v==null?'Sem dados':brl(v);
const financeMonthsInPeriod = months => months.filter(x =>
  (!state.from || x.month >= state.from.slice(0, 7)) && (!state.to || x.month <= state.to.slice(0, 7)));
function financeTotals(entries){
 const real=periodRows(entries.filter(x=>x.status==='realizado'),'entry_date');
 const incomeRows=real.filter(x=>x.entry_type==='receita'),expenseRows=real.filter(x=>x.entry_type==='despesa');
 return {
   income:incomeRows.length?sum(incomeRows,'amount_cents'):null,
   expense:expenseRows.length?sum(expenseRows,'amount_cents'):null,
   note:state.startup?'Lançamentos realizados desta startup':'Lançamentos realizados do portfólio',
 };
}
function financialSeries(entries){const months=temporalMonths(),context=state.data['finance-context'];return months.map(month=>{if(!state.startup&&context?.monthly){const record=context.monthly.find(x=>x.month===month);return {month,receita:record?.income_cents??null,despesa:record?.expense_cents??null}}const list=entries.filter(x=>x.status==='realizado'&&dateOnly(x.entry_date).startsWith(month)),income=list.filter(x=>x.entry_type==='receita'),expense=list.filter(x=>x.entry_type==='despesa');return {month,receita:income.length?sum(income,'amount_cents'):null,despesa:expense.length?sum(expense,'amount_cents'):null}})}
function chartFinance(entries){const rows=financialSeries(entries);return temporalChart({id:state.section+'-finance',title:'Receitas e despesas mensais',months:rows.map(x=>x.month),money:true,type:'columns',series:[{label:'Receitas',color:VIZ.green,values:rows.map(x=>x.receita)},{label:'Despesas',color:VIZ.amber,values:rows.map(x=>x.despesa)}],note:state.startup?'Ausência de lançamento é indicada como “Sem dados”, sem atribuir totais do portfólio à startup.':'Série mensal calculada a partir dos lançamentos realizados do portfólio.'})}
function chartBalance(entries){const rows=financialSeries(entries);return temporalChart({id:'finance-balance',title:'Saldo mensal',months:rows.map(x=>x.month),money:true,type:'line',series:[{label:'Saldo = receitas − despesas',color:VIZ.blue,values:rows.map(x=>x.receita==null||x.despesa==null?null:x.receita-x.despesa)}],note:'A linha de referência marca zero. O saldo só é calculado quando há receitas e despesas disponíveis no mês.'})}
function commercialTrends(leads){const months=temporalMonths();return `<div class="commercial-trends">${temporalChart({id:'commercial-contacts',title:'Contatos realizados',months,series:[{label:'Primeiros contatos',color:VIZ.blue,values:months.map(m=>leads.filter(x=>dateOnly(x.first_contact_at).startsWith(m)).length)}],note:'Contagem das primeiras abordagens registradas nos contatos.'})}${temporalChart({id:'commercial-meetings',title:'Reuniões marcadas',months,series:[{label:'Agendamentos',color:VIZ.purple,values:months.map(m=>leads.filter(x=>dateOnly(x.meeting_at).startsWith(m)).length)}],note:'Contagem pelo mês agendado para a reunião. Cada gráfico usa escala própria.'})}</div>`}
function activityTrend(tasks){const months=temporalMonths();return temporalChart({id:'activity-evolution',title:'Evolução de atividades',months,series:[{label:'Criadas',color:VIZ.blue,values:months.map(m=>tasks.filter(x=>dateOnly(x.created_at).startsWith(m)).length)},{label:'Concluídas',color:VIZ.green,values:months.map(m=>tasks.filter(x=>x.status==='concluida'&&dateOnly(x.completed_at).startsWith(m)).length)}]})}
function barList(items){if(!items.length)return empty('Sem dados para comparar','Os registros aparecerão conforme a seleção atual.','chart-no-axes-combined');const max=Math.max(1,...items.map(x=>Number(x.value)||0));return `<div class="bar-list">${items.map(x=>{const value=Number(x.value)||0;return `<div class="bar-row" tabindex="0" data-viz-tooltip="${e(x.title)}: ${fmt(value)}" style="--viz-accent:${vizColor(x.title)}" aria-label="${e(x.title)}: ${fmt(value)}"><span>${e(x.title)}</span><div class="progress" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-label="${e(x.title)}"><div style="width:${value/max*100}%"></div></div><b>${fmt(value)}</b></div>`}).join('')}</div>`}
function deliveryByStartup(tasks){const map=new Map(state.startups.map(s=>[String(s.id),{total:0,done:0,open:0,percent:null}]));for(const task of tasks){if(task.status==='cancelada')continue;const row=map.get(String(task.startup_id));if(!row)continue;row.total++;if(task.status==='concluida')row.done++;if(openTask(task))row.open++}for(const row of map.values())row.percent=row.total?Math.round(row.done/row.total*100):null;return map}
function deliveryBar(s){const value=s.percent??(s.total?Math.round(s.done/s.total*100):null);return `<div class="delivery-progress" data-delivery-startup="${s.id}" data-percent="${value??''}"><div class="between"><b>${value==null?'Sem atividades':value+'%'}</b><span>${s.done} de ${s.total}</span></div>${progress(s.done,s.total)}</div>`}
const goalUnit=g=>({contatos:'contatos',reunioes:'reuniões',reels:'reels',stories:'stories',videos:'vídeos',atividade:'atividades'}[g.metric]||g.unit||g.metric||'resultados');
const goalOutcome=g=>`${fmt(g.done)} de ${fmt(g.target)} ${goalUnit(g)} · ${Math.round(Number(g.done)/Number(g.target)*100)}%`;
const goalPeriod=g=>`${human(g.current_from)} a ${human(new Date(new Date(g.current_to).getTime()-86400000).toISOString())}`;
function goalRows(gs){return gs.length?gs.map(g=>`<div class="goal-row"><b>${e(g.title)}</b><p class="goal-outcome">${e(goalOutcome(g))}</p>${progress(g.done,g.target)}<small>${e(g.person_name)} · ${e(goalPeriod(g))}</small>${state.startup?'<small>Contribuição da startup · alvo individual consolidado</small>':''}</div>`).join(''):empty('Sem metas neste ciclo','Sem dados para esta startup no ciclo atual.','target')}

function taskList(rows) {
  return rows.length
    ? rows
        .map(
          (t) =>
            `<div class="task"><div class="between"><div class="task-main">${button(t.status === "concluida" ? icon("check") : "", "task-status", `data-id="${t.id}" data-value="${t.status === "concluida" ? "pendente" : "concluida"}" aria-label="${t.status === "concluida" ? "Reabrir" : "Concluir"} atividade"`, "task-check")}<div>${button(e(t.title), "task-detail", `data-id="${t.id}"`, "text-link")}<div class="task-meta">${e(t.startup_name || startupName(t.startup_id))} · ${e(t.assignee_name || state.me.name)} · <span class="${dueTone(t)}">${human(t.due_date)}</span></div></div></div>${priority(t.priority)}</div></div>`,
        )
        .join("")
    : empty(
        "Nenhuma atividade pendente",
        "Sua equipe pode começar pela próxima entrega.",
        "circle-check",
      );
}
const dashboardMetric = (title, value, key) =>
  dashboardLink(`<small>${e(title)}</small><b>${e(value)}</b>`, key, "mini-metric");
function dashboardBars(items) {
  if(!items.length)return empty('Sem dados para comparar','Os registros aparecerão conforme a seleção atual.','chart-no-axes-combined');
  const max = Math.max(1, ...items.map(([, value]) => value));
  return `<div class="bar-list">${items.map(([title, value, key]) =>
    dashboardLink(`<span class="bar-row" data-viz-tooltip="${e(title)}: ${fmt(value)}" style="--viz-accent:${vizColor(title)}"><span>${e(title)}</span><span class="progress" aria-hidden="true"><span style="width:${value / max * 100}%"></span></span><b>${fmt(value)}</b></span>`, key, "dashboard-bar")
  ).join("")}</div>`;
}
function dashboardTaskRows(rows) {
  return workflowList([...rows].sort(compareWorkTasks).map(x => ({
    id: x.id, title: x.title, action: "task-detail",
    note: [x.startup_name, x.assignee_name, label(x.status), label(x.priority),
      x.planned_date && "Execução " + human(x.planned_date),
      x.due_date && "Prazo " + human(x.due_date)].filter(Boolean).join(" · "),
  })), "Nenhuma atividade nesta seleção");
}
function dashboardLeadRows(rows, dateField) {
  return workflowList(rows.map(x => ({
    id: x.id, title: x.name, action: "lead-detail",
    note: [x.company, x.startup_name, label(x.stage), dateField && dateTime(x[dateField])].filter(Boolean).join(" · "),
  })), "Nenhum lead nesta seleção");
}
function dashboardResultRows(rows) {
  return table(rows, [
    { title: "Data", key: "occurred_at", render: x => human(x.occurred_at) },
    { title: "Pessoa", key: "person_name" }, { title: "Startup", key: "startup_name", render: x => e(x.startup_name || startupName(x.startup_id)) },
    { title: "Indicador", key: "metric", render: x => e(goalUnit(x)) },
    { title: "Quantidade", key: "quantity" },
  ], "dashboard-results", false, false);
}
function dashboardFinanceRows(entries, context, type, totals) {
  const consolidated = !state.startup && context?.monthly;
  const months = consolidated ? financeMonthsInPeriod(context.monthly) : [];
  const rows = type ? entries.filter(x => x.entry_type === type) : entries;
  const monthlyCols = [
    ...(type !== "despesa" ? [{ title: "Receitas", key: "income_cents" }] : []),
    ...(type !== "receita" ? [{ title: "Despesas", key: "expense_cents" }] : []),
    ...(!type ? [{ title: "Resultado", key: "result_cents" }] : []),
  ].map(col => ({...col, render: x => e(moneyOrMissing(x[col.key]))}));
  const available = type === "receita" ? totals.income != null
    : type === "despesa" ? totals.expense != null : totals.income != null && totals.expense != null;
  return (months.length && available ? card("Consolidado mensal", table(months.map((x, index) => ({
    ...x, id: String(index), result_cents: x.income_cents == null || x.expense_cents == null ? null : x.income_cents - x.expense_cents,
  })), [{ title: "Mês", key: "month", render: x => e(longMonth(x.month)) }, ...monthlyCols], "dashboard-finance", false, false)) : "") +
    card(consolidated ? "Lançamentos identificados por startup" : "Lançamentos realizados", table(rows, [
      { title: "Data", key: "entry_date", render: x => human(x.entry_date) },
      { title: "Startup", key: "startup_name" }, { title: "Descrição", key: "description" },
      { title: "Tipo", key: "entry_type", render: x => e(label(x.entry_type)) },
      { title: "Valor", key: "amount_cents", render: x => e(brl(x.amount_cents)) },
    ], "dashboard-finance-entries", false, false), totals.note) +
    `<div class="form-actions">${button("Abrir Financeiro", "navigate", 'data-value="finance"', "small")}</div>`;
}

async function dashboard(version = renderVersion) {
  if(state.me?.role === "desenvolvimento")return materialsPage("overview");
  const [tasks, goals, finance, leads, logs, financeInfo] = await Promise.all([
    load("tasks"),
    load("goals"),
    admin() ? load("finance") : [],
    crmAccess() ? load("leads") : [],
    load("activities"),
    admin()?load("finance-context"):null,
  ]);
  const decisions = admin() ? managementQueue(tasks, leads, await load("marketing")) : [];
  const t = periodTasks(tasks),
    open = t.filter(openTask),
    late = tasks.filter(
      (x) => openTask(x) && x.due_date && dateOnly(x.due_date) < today(),
    ),
    f = periodRows(
      finance.filter((x) => x.status === "realizado"),
      "entry_date",
    );
  const financeSummary = financeTotals(finance);
  const { income, expense } = financeSummary;
  const balance = income == null || expense == null ? null : income - expense;
  const resultNote=financeSummary.note,resultTone=balance!=null&&balance>0?'positive':'';
  const currentGoals = goals.filter(
    (g) => g.active && g.start_date <= today() && g.end_date >= today(),
  );
  const deliveries=deliveryByStartup(t);
  const stats = state.startups
    .filter((x) => !state.startup || String(x.id) === state.startup)
    .map((s) => {
      const st=t.filter(x=>String(x.startup_id)===String(s.id));
      const delivery=deliveries.get(String(s.id));
      return {
        ...s,
        ...delivery,
        leads: leads.filter(
          (x) =>
            String(x.startup_id) === String(s.id) && x.stage !== "Clientes",
        ).length,
        receita: sum(
          f.filter(
            (x) =>
              String(x.startup_id) === String(s.id) &&
              x.entry_type === "receita",
          ),
          "amount_cents",
        ),
      };
    });
  const currentTime = Date.now();
  const meetings = leads.filter(x => x.meeting_at && Date.parse(x.meeting_at) >= currentTime)
    .sort((a, b) => Date.parse(a.meeting_at) - Date.parse(b.meeting_at));
  const activeLeads = leads.filter(x => x.stage !== "Clientes");
  const completed = t.filter(x => x.status === "concluida");
  const achieved = currentGoals.filter(x => x.percent >= 100);
  const results = periodRows(logs, "occurred_at");
  const details = new Map();
  const context = screenContext();
  const add = (key, title, render, scope = context) => {
    details.set(key, { title, render, scope });
    return key;
  };
  const taskDetailKey = (key, title, rows, scope) => add(key, title, () => dashboardTaskRows(rows), scope);
  const leadDetailKey = (key, title, rows, dateField) =>
    add(key, title, () => dashboardLeadRows(rows, dateField), selectedScope() + " · Carteira atual");
  const goalsKey = add("achieved", "Metas atingidas", () =>
    `<p class="tiny muted">${achieved.length} de ${currentGoals.length} metas atingidas</p>` + goalRows(achieved) +
    `<div class="form-actions">${button("Abrir Metas", "navigate", 'data-value="goals"', "small")}</div>`,
    selectedScope() + " · Ciclo atual");
  const portfolioKey = add("portfolio", "Startups no portfólio", () => workflowList(stats.map(x => ({
    id: x.id, title: x.name, action: "dashboard-startup",
    note: x.market_model + " · " + x.open + " atividades pendentes",
  })), "Nenhuma startup neste filtro"), selectedScope());
  const pendingKey = taskDetailKey("open", "Atividades pendentes", open);
  const lateKey = taskDetailKey("late", "Atividades atrasadas", late, selectedScope() + " · Até " + human(today()));
  const completedKey = taskDetailKey("completed", "Entregas concluídas", completed);
  const activeLeadKey = crmAccess() ? leadDetailKey("leads", "Leads em andamento", activeLeads) : "";
  const meetingsKey = crmAccess() ? leadDetailKey("meetings", "Reuniões agendadas", meetings, "meeting_at") : "";
  const incomeKey = admin() ? add("income", "Receitas realizadas", () => dashboardFinanceRows(f, financeInfo, "receita", financeSummary)) : "";
  const expenseKey = admin() ? add("expense", "Despesas realizadas", () => dashboardFinanceRows(f, financeInfo, "despesa", financeSummary)) : "";
  const balanceKey = admin() ? add("balance", "Resultado financeiro", () => dashboardFinanceRows(f, financeInfo, "", financeSummary)) : "";
  const resultsKey = admin() ? "" : add("results", "Registros no período", () => dashboardResultRows(results));
  const pieces = !admin() && marketingViewer() ? await load("marketing") : [];
  const pendingPieces = pieces.filter(x => marketingFlow(x) !== "publicacao");
  const contentTitle = external() ? "Minhas entregas de conteúdo" : "Conteúdos em andamento";
  const contentKey = marketingViewer() && !admin() ? add("content", contentTitle, () => workflowList(pendingPieces.map(x => ({
    id: x.id, title: x.title, action: "marketing-edit",
    note: [x.startup_name, label(marketingFlow(x)), x.delivery_due && "Prazo " + human(x.delivery_due)].filter(Boolean).join(" · "),
  })), "Nenhum conteúdo pendente"), selectedScope() + " · Etapa atual") : "";
  $("#notification-dot").classList.toggle(
    "hidden",
    !late.length &&
      !leads.some(
        (x) => x.next_contact_at && new Date(x.next_contact_at) <= new Date(),
      ),
  );
  let h =
    intro(
      `Tudo sob controle${state.me.name ? " , " + state.me.name.split(" ")[0] : ""}.`.replace(
        "controle ,",
        "controle,",
      ),
      "Acompanhe atividades, metas e resultados das startups disponíveis.",
      admin()
        ? button(icon("plus") + "Nova atividade", "new-task", "", "primary")
        : "",
    ) + periodBar();
  if (admin()) h += card("Fila de decisões", workflowList(decisions, "Nenhuma decisão pendente"));
  h += `<div class="kpis">
    ${kpi("Startups no portfólio", stats.length, state.startup ? "Visão da startup selecionada" : "Negócios acompanhados", "layers", "", portfolioKey)}
    ${kpi("Atividades pendentes", open.length, "Entregas no período selecionado", "circle-check", "", pendingKey)}
    ${crmAccess()
      ? kpi("Leads em andamento", activeLeads.length, "Carteira atual da seleção", "blocks", "", activeLeadKey)
      : contentKey
        ? kpi(contentTitle, pendingPieces.length, "Demandas em aberto", "megaphone", "", contentKey)
        : kpi("Entregas concluídas", completed.length, "No período selecionado", "circle-check", "", completedKey)}
    ${admin() ? kpi("Resultado financeiro", moneyOrMissing(balance), resultNote, "chart-no-axes-combined", resultTone, balanceKey)
      : kpi("Metas atingidas", achieved.length, "No ciclo atual das metas", "target", "", goalsKey)}
  </div>`;
  h += `<div class="metric-strip">
    ${dashboardMetric("Atividades atrasadas", late.length, lateKey)}
    ${crmAccess() ? dashboardMetric("Reuniões agendadas", meetings.length, meetingsKey)
      : dashboardMetric("Atividades pendentes", open.length, pendingKey)}
    ${dashboardMetric("Entregas concluídas", completed.length, completedKey)}
    ${dashboardMetric("Metas atingidas", achieved.length + " / " + currentGoals.length, goalsKey)}
    ${admin() ? dashboardMetric("Receitas realizadas", moneyOrMissing(income), incomeKey) +
      dashboardMetric("Despesas realizadas", moneyOrMissing(expense), expenseKey)
      : dashboardMetric("Registros no período", results.length, resultsKey) +
        dashboardMetric("Minhas startups", stats.length, portfolioKey)}
  </div>`;
  const statusRows = ["pendente", "em_andamento", "concluida", "bloqueada"].map(status => {
    const rows = t.filter(x => x.status === status);
    return [label(status), rows.length, taskDetailKey("status-" + status, "Atividades · " + label(status), rows)];
  });
  const chart = admin()
    ? card(
        "Evolução financeira",
        `<div class="chart-topline">${dashboardMetric("Receita no período", moneyOrMissing(income), incomeKey)}
          ${dashboardMetric("Despesa no período", moneyOrMissing(expense), expenseKey)}</div>
          ${chartFinance(finance.filter(x => x.status === "realizado"))}`,
        "Série mensal · unidade nos eixos e valores exatos disponíveis",
      )
    : card(
        "Evolução de entregas",
        dashboardBars(statusRows),
        "Atividades do período selecionado",
      );
  const stageRows = crmAccess() ? STAGES.map(stage => {
    const rows = leads.filter(x => x.stage === stage);
    return [stage, rows.length, leadDetailKey("stage-" + stage, "Leads · " + stage, rows)];
  }) : [];
  h += `<div class="cols"><div>${chart}</div><div>${card(crmAccess() ? "Desempenho comercial" : "Progresso das metas", crmAccess() ? dashboardBars(stageRows) : goalRows(currentGoals), "Distribuição atual da seleção", button("Ver detalhes " + icon("arrow-up-right"), "navigate", `data-value="${crmAccess() ? "commercial" : "goals"}"`, "text-link"))}</div></div>`;
  const cols = [
    {
      title: "Startup",
      key: "name",
      render: (s) => button(e(s.name) + icon("arrow-up-right") + `<small class="table-sub">${e(s.market_model)}</small>`,
        "dashboard-startup", itemRef(s.id), "text-link"),
    },
    {
      title: "Entregas",
      key: "done",
      render: (s) =>
        deliveryBar(s),
    },
    { title: "Pendências", key: "open" },
    ...(crmAccess() ? [{ title: "Leads ativos", key: "leads" }] : []),
    ...(admin()
      ? [
          {
            title: "Receita identificada (R$)",
            key: "receita",
            render: (s) => f.some(x=>String(x.startup_id)===String(s.id)&&x.entry_type==='receita')?brl(s.receita):'Sem dados',
          },
        ]
      : []),
  ];
  h += card(
    "Seu portfólio",
    table(stats, cols, "portfolio", false),
    "Selecione uma startup para abrir suas atividades",
    badge(
      state.startup ? "1 startup" : state.startups.length + " startups",
      "blue",
    ),
  );
  const owners = [...new Set(t.map((x) => String(x.assigned_to)))];
  const team = owners.map((id) => {
    const all = t.filter((x) => String(x.assigned_to) === id),
      done = all.filter((x) => x.status === "concluida").length;
    const name = all[0]?.assignee_name || state.me.name;
    const key = taskDetailKey("team-" + id, "Atividades de " + name, all);
    return { name, all: all.length, done, key };
  });
  h += `<div class="cols"><div>${card(
    "Próximas entregas",
    taskList(
      tasks
        .filter(openTask)
        .sort(compareWorkTasks)
        .slice(0, 5),
    ),
    "Prioridades atuais do portfólio",
    button(
      "Ver atividades " + icon("arrow-up-right"),
      "navigate",
      'data-value="tasks"',
      "text-link",
    ),
  )}</div><div>${card("Ritmo da equipe", team.map(x => dashboardLink(`<span class="avatar">${e(x.name[0])}</span><span class="team-name"><b>${e(x.name)}</b><small>${x.done} de ${x.all} entregas concluídas</small></span><span class="team-score">${Math.round((x.done / x.all) * 100)}%<small>conclusão</small></span>`, x.key, "team-row")).join("") || empty("A equipe começa por aqui", "Atribua atividades para acompanhar as entregas.", "users"), "Conclusão das atividades no período")}${card("Metas em foco", goalRows(currentGoals.slice(0, 3)), "Ciclo atual · contribuição da seleção", button("Ver metas " + icon("arrow-up-right"), "navigate", 'data-value="goals"', "text-link"))}</div></div>`;
  h += card(
    "Evolução de atividades",
    activityTrend(tasks),
    chartPeriod(),
    chartLegend([{label:'Criadas',color:VIZ.blue},{label:'Concluídas',color:VIZ.green}]),
  );
  if (version === renderVersion) state.dashboardDetails = details;
  state.exports = stats.map((x) => ({
    Startup: x.name,
    Atividades: x.total,
    Concluidas: x.done,
    Pendentes: x.open,
    Leads: x.leads,
    ...(admin() ? { Receita_R$: f.some(r=>String(r.startup_id)===String(x.id)&&r.entry_type==='receita')?Number(x.receita)/100:'Sem dados' } : {}),
  }));
  return h;
}
async function tasksPage() {
  const rows = periodTasks(await load("tasks")),
    data = filtered(rows, "tasks");
  let h =
    intro(
      "Atividades que movem o negócio.",
      "Organize entregas, responsáveis e prioridades entre suas startups.",
      state.startups.length ? button(icon("plus") + "Nova atividade", "new-task", "", "primary") : "",
    ) +
    periodBar() +
    filtersHTML("tasks", [
      ["owner", "Todas as pessoas", state.users.map((x) => [x.id, x.name])],
      [
        "priority",
        "Prioridade",
        ["urgente", "alta", "media", "baixa"].map((x) => [x, label(x)]),
      ],
      [
        "status",
        "Status",
        ["pendente", "em_andamento", "bloqueada", "concluida", "cancelada"].map(
          (x) => [x, label(x)],
        ),
      ],
    ]);
  if (state.view.tasks === "board") {
    h += `<div class="pipeline">${[
      "pendente",
      "em_andamento",
      "bloqueada",
      "concluida",
      "cancelada",
    ]
      .map(
        (s) =>
          `<section class="lane" data-task-lane="${s}"><div class="lane-head">${label(s)}<span class="count">${data.filter((x) => x.status === s).length}</span></div>${
            data
              .filter((x) => x.status === s)
              .map(
                (t) =>
                  `<article class="lead-card board-task" draggable="true" data-task-drag="${t.id}"><div class="between">${button(e(t.title), "task-detail", `data-id="${t.id}"`, "text-link")}</div><p>${e(t.product_name || t.startup_name)} · ${e(t.assignee_name)}</p>${priority(t.priority)}<div class="task-meta ${dueTone(t)}">${icon("calendar")} ${human(t.due_date)}</div><select data-task-status="${t.id}" data-current-status="${e(t.status)}" aria-label="Alterar status de ${e(t.title)}">${options(
                    [
                      "pendente",
                      "em_andamento",
                      "bloqueada",
                      "concluida",
                      "cancelada",
                    ].map((x) => [x, label(x)]),
                    t.status,
                  )}</select></article>`,
              )
              .join("") || '<div class="lane-empty">Nenhuma atividade</div>'
          }</section>`,
      )
      .join("")}</div>`;
    state.exports = data;
    return h;
  }
  return (
    h +
    card(
      "Todas as atividades",
      table(
        data,
        [
          {
            title: "Atividade",
            key: "title",
            render: (t) =>
              button(
                e(t.title),
                "task-detail",
                `data-id="${t.id}"`,
                "text-link",
              ),
          },
          { title: "Startup", key: "startup_name" },
          ...(data.some(t=>t.product_id)?[{title:"Produto",key:"product_name"}]:[]),
          { title: "Responsável", key: "assignee_name" },
          {
            title: "Prioridade",
            key: "priority",
            render: (t) => priority(t.priority),
          },
          {
            title: "Início",
            key: "planned_date",
            render: (t) => human(t.planned_date),
          },
          {
            title: "Entrega",
            key: "due_date",
            render: (t) =>
              `<span class="${dueTone(t)}">${human(t.due_date)}</span>`,
          },
          { title: "Status", key: "status", render: (t) => badge(t.status) },
          {
            title: "",
            render: (t) =>
              button(
                icon("arrow-up-right"),
                "task-detail",
                `data-id="${t.id}" aria-label="Abrir atividade"`,
                "icon-btn",
              ),
          },
        ],
        "tasks",
      ),
      "Entregas, prazos e execução em um só lugar",
    )
  );
}
const workPriority = { urgente: 0, alta: 1, media: 2, baixa: 3 };
const compareWorkTasks = (a, b) =>
  (workPriority[a.priority] ?? 4) - (workPriority[b.priority] ?? 4) ||
  (dateOnly(a.due_date) || "9999").localeCompare(dateOnly(b.due_date) || "9999") ||
  (dateOnly(a.planned_date) || "9999").localeCompare(dateOnly(b.planned_date) || "9999") ||
  a.title.localeCompare(b.title, "pt-BR") ||
  String(a.id).localeCompare(String(b.id));

function organizeWorkDay(tasks, day) {
  const result = { queue: [], future: [], unscheduled: [], blocked: [], completed: [] };
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const task of tasks) {
    if (task.status === "concluida" && task.completed_at) {
      const completed = new Date(task.completed_at);
      if (!Number.isNaN(completed.getTime()) && localDate.format(completed) === day) result.completed.push(task);
    }
    if (!openTask(task)) continue;
    const planned = dateOnly(task.planned_date), due = dateOnly(task.due_date);
    if (task.status === "bloqueada") result.blocked.push(task);
    else if ((planned && planned <= day) || (due && due <= day)) result.queue.push(task);
    else if (planned || due) result.future.push(task);
    else result.unscheduled.push(task);
  }
  for (const rows of Object.values(result)) rows.sort(compareWorkTasks);
  return result;
}

function workTaskList(rows, day, mode, showOwner) {
  if (!rows.length) return empty(mode === "queue" ? "Nenhuma atividade para executar nesta data" : "Nenhuma atividade nesta lista");
  const active = mode === "queue";
  return `<${active ? "ol" : "ul"} class="daily-list" role="list">${rows.map((task, index) => {
    const ref = itemRef(task.id);
    const planned = dateOnly(task.planned_date), due = dateOnly(task.due_date);
    const overdue = mode !== "completed" && due && due < day;
    const dueText = due ? (overdue ? "Prazo vencido" : due === day ? "Vence no dia" : "Prazo") + " · " + human(due) : "Sem prazo";
    const edit = button("Planejar", "task-plan", ref + ` aria-label="Planejar ${e(task.title)}"`, "small");
    const update = (name, status, cls = "small") => button(name, "task-status", ref + ` data-value="${status}" aria-label="${name} ${e(task.title)}"`, cls);
    return `<li class="daily-row" data-work-task="${e(task.id)}">
      <div>
        <div class="daily-task-title">${active ? `<span class="daily-position" aria-hidden="true">${index + 1}</span>` : ""}${button(e(task.title), "task-detail", ref, "text-link")}${priority(task.priority)}${badge(task.status)}</div>
        <div class="daily-task-meta">
          <span>${e(task.product_name || task.startup_name || startupName(task.startup_id))}</span>
          ${showOwner ? `<span>Responsável · ${e(personName(String(task.assigned_to), task.assignee_name))}</span>` : ""}
          ${planned ? `<span>Execução · ${human(planned)}</span>` : ""}
          <span class="${overdue ? "daily-overdue" : ""}">${dueText}</span>
        </div>
      </div>
      <div class="daily-actions">${admin() && mode !== "completed" ? edit : ""}${active
        ? (task.status === "pendente" ? update("Iniciar", "em_andamento") : "") + update("Concluir", "concluida", "small primary")
        : ""}</div>
    </li>`;
  }).join("")}</${active ? "ol" : "ul"}>`;
}

function cabraTechReelSummary(tasks) {
  const reels = tasks.filter(task => /^annike-cabratech-2026-reel-(?:[1-9]|1[0-2])$/.test(String(task.id)))
    .sort((a, b) => Number(a.id.split("-").at(-1)) - Number(b.id.split("-").at(-1)));
  if (!reels.length) return "";
  const delivered = reels.filter(task => task.status === "concluida");
  const pending = reels.filter(openTask);
  const summary = `<div class="flex">${badge(delivered.length + " de 12 entregues", "green")}${badge(pending.length + " pendentes")}</div>`;
  const history = delivered.length ? `<details><summary>Ver entregas concluídas</summary>
    ${workflowList(delivered.map(task => ({
      id: task.id, title: task.title, action: "task-detail",
      note: task.completed_at ? "Concluído em " + dateTime(task.completed_at) : "Data da entrega não informada",
    })), "")}</details>` : "";
  return card("Contrato de Reels · CabraTech", summary + history, "12 Reels · início em 15/10/2026");
}

function upcomingWorkCalendar(tasks) {
  const events = tasks.map(task => ({
    id: task.id,
    title: task.title,
    date: task.planned_date || task.due_date,
    action: "task-detail",
  }));
  return card("Calendário de próximas entregas", calendar(events),
    "Selecione uma entrega para abrir a atividade. " + tasks.length + " futuras no total.", calendarControls());
}

function dailyWork(tasks, team) {
  const now = today();
  const day = state.workDate && state.workDate >= now ? state.workDate : now;
  const isManager = admin();
  const ownerOptions = isManager ? [
    ["", "Minhas atividades"],
    ["team", "Toda a equipe"],
    ...team.filter(person => String(person.id) !== String(state.me.id)).map(person => [person.id, person.name]),
  ] : [];
  const showOwner = isManager && state.workPerson === "team";
  const selectedPerson = ownerOptions.find(([id]) => String(id) === state.workPerson)?.[0];
  const owner = String(selectedPerson || state.me.id);
  const visible = showOwner ? tasks : tasks.filter(task => String(task.assigned_to) === owner);
  const { queue, future, unscheduled, blocked, completed } = organizeWorkDay(visible, day);
  const showDeliveryCalendar = external() || (isManager && owner === "4");
  const late = queue.filter(t => t.due_date && dateOnly(t.due_date) < day);
  state.exports = queue.map((t, i) => ({
    Ordem: i + 1, Atividade: t.title, Responsável: personName(String(t.assigned_to), t.assignee_name),
    Startup: t.startup_name || startupName(t.startup_id),
    Prioridade: label(t.priority), Execução: dateOnly(t.planned_date), Prazo: dateOnly(t.due_date),
    Status: label(t.status),
  }));
  const section = (title, rows, mode) => rows.length
    ? card(title, workTaskList(rows, day, mode, showOwner), rows.length + (rows.length === 1 ? " atividade" : " atividades"))
    : "";
  return intro("Meu dia", "Veja o que executar e acompanhe seus prazos.",
    state.startups.length ? button(icon("plus") + "Nova atividade", "new-task", "", "primary") : "") +
    `<div class="daily-controls">${isManager
      ? sel("Responsável", "work-person", ownerOptions, selectedPerson || '', 'id="work-person"')
      : ""}${sf("Data de execução", "work-date", day, "date", `id="work-date" min="${now}"`)}
      ${day !== now ? button("Voltar para hoje", "workday-today", "", "small") : ""}</div>` +
    `<div class="kpis">
      ${kpi("Para executar", queue.length, human(day), "list-todo")}
      ${kpi("Prazo vencido", late.length, "Na fila de execução", "clock-3", late.length ? "negative" : "")}
      ${kpi("Bloqueadas", blocked.length, "Aguardando desbloqueio", "lock-keyhole")}
      ${kpi("Concluídas no dia", completed.length, human(day), "check-check")}
    </div>` +
    card(day === now ? "Executar hoje" : "Executar em " + human(day), workTaskList(queue, day, "queue", showOwner),
      "Inclui pendências de dias anteriores. Ordem por prioridade, prazo mais próximo e data de execução.") +
    (showDeliveryCalendar && future.length ? upcomingWorkCalendar(future) : section("Próximos dias", future, "future")) +
    (showDeliveryCalendar ? cabraTechReelSummary(visible) : "") +
    section("Sem data de execução ou prazo", unscheduled, "unscheduled") +
    section("Aguardando desbloqueio", blocked, "blocked") +
    section("Concluídas no dia", completed, "completed");
}

async function planTask(id) {
  const task = await api("/api/tasks/" + id);
  formModal("Planejar atividade",
    `<div class="full"><b>${e(task.title)}</b><p class="tiny muted">${e(startupName(task.startup_id))} · ${task.due_date ? "Prazo " + human(task.due_date) : "Sem prazo"}</p></div>` +
    date("Data de execução", "planned_date", task.planned_date || state.workDate || today()) +
    sel("Prioridade", "priority", Object.keys(workPriority).map(x => [x, label(x)]), task.priority),
    b => api("/api/tasks/" + id, "PATCH", { planned_date: b.planned_date || null, priority: b.priority }),
    { submit: "Salvar planejamento" });
}

async function myday() {
  const [tasks, leads, pieces] = await Promise.all([
    load("tasks"),
    state.me.role === "comercial" ? load("leads") : [],
    !admin() && marketingViewer() ? load("marketing") : [],
  ]);
  const assignedIds = new Set(tasks.map(task => String(task.assigned_to)));
  const team = admin() ? state.users.filter(person => person.active || assignedIds.has(String(person.id))) : [];
  let h = dailyWork(tasks, team);
  if (state.me.role === "comercial")
    h += card("Agenda comercial", workflowList(salesAgenda(leads), "Nenhum próximo passo comercial"));
  if (state.me.role === "marketing")
    h += card("Fila de publicação", workflowList(editorialActions(pieces), "Nenhum conteúdo aprovado aguardando publicação"));
  if (external())
    h += card("Minhas entregas de conteúdo", workflowList(pieces.filter(x => marketingFlow(x) !== "publicacao").map(x => ({
      title: x.title, id: x.id, action: "marketing-edit",
      note: `${label(marketingFlow(x))} · ${human(x.delivery_due || x.planned_date)}`,
    })), "Nenhuma entrega pendente"));
  return h;
}
async function goalsPage() {
  if(state.me?.role === "desenvolvimento")return materialsPage("goals");
  const [gs, logs] = await Promise.all([load("goals"), load("activities")]);
  state.exports = gs.map((g) => ({
    Pessoa: g.person_name,
    Meta: g.title,
    Realizado: g.done,
    Alvo: g.target,
    Periodo: label(g.cadence),
  }));
  return (
    intro(
      "Objetivos claros. Evolução visível.",
      "Metas por pessoa, com registros vinculados a cada startup.",
      button(
        icon("plus") + "Registrar resultado",
        "new-activity",
        "",
        "primary",
      ),
    ) +
    `<div class="notice">${state.startup ? "Os valores mostram a contribuição de " + e(startupName(state.startup)) + " para a meta da pessoa." : "Os resultados somam as startups atendidas por cada pessoa."} O alvo é único por pessoa e não se multiplica entre empresas. O progresso usa o ciclo atual da meta.</div><div class="grid3">${gs.map((g) => `<section class="card goal-card"><div class="between">${badge(g.active ? "Ativa" : "Inativa", g.active ? "blue" : "")}${badge(label(g.cadence))}</div><h2 style="margin-top:15px">${e(g.title)}</h2><div class="goal-value" aria-label="${e(goalOutcome(g))}"><strong>${fmt(g.done)}</strong> <span>de ${fmt(g.target)} ${e(goalUnit(g))} · ${Math.round(Number(g.done)/Number(g.target)*100)}%</span></div>${progress(g.done, g.target)}<div class="between tiny muted"><span>${e(g.person_name)}</span><span>${g.percent}%</span></div><div class="task-meta">${human(g.current_from)} a ${human(new Date(new Date(g.current_to).getTime() - 86400000).toISOString())}</div>${admin() ? button("Ajustar meta", "edit-goal", `data-id="${g.id}"`, "text-link") : ""}</section>`).join("") || empty("Nenhuma meta cadastrada")}</div>${admin() ? `<div class="toolbar">${button(icon("plus") + "Criar meta", "new-goal")}</div>` : ""}` +
    periodBar() +
    card(
      "Histórico de resultados",
      table(
        periodRows(logs, "occurred_at"),
        [
          {
            title: "Data",
            key: "occurred_at",
            render: (x) => human(x.occurred_at),
          },
          { title: "Pessoa", key: "person_name" },
          { title: "Startup", key: "startup" },
          { title: "Indicador", key: "metric" },
          {
            title: "Quantidade",
            key: "quantity",
            render: (x) => fmt(x.quantity),
          },
          { title: "Descrição", key: "note" },
        ],
        "activities",
      ),
      "Registros no período selecionado",
    )
  );
}
function leadCard(l) {
  return `<article class="lead-card" draggable="true" data-lead-drag="${l.id}"><div class="between">${button(e(l.name), "lead-detail", `data-id="${l.id}"`, "text-link")}${button(icon("more-horizontal"), "lead-edit", `data-id="${l.id}" aria-label="Editar lead"`, "icon-btn")}</div><p>${e(l.company || "Contato individual")}<br>${e(l.startup_name)} · ${e(l.owner_name || "Sem responsável")}</p><div class="lead-value">${brl(l.estimated_value_cents)}</div><div class="card-divider"></div><div class="between"><span class="tiny muted">${e(l.phone || "Sem telefone")}</span>${button(icon("message-circle"), "lead-contact", `data-id="${l.id}" aria-label="Registrar contato"`, "icon-btn")}</div><div class="task-meta ${l.next_contact_at && new Date(l.next_contact_at) < new Date() ? "due-alert" : ""}">Retorno · ${dateTime(l.next_contact_at)}</div><select data-lead-stage="${l.id}" aria-label="Etapa do lead ${e(l.name)}">${options(
    STAGES.map((x) => [x, x]),
    l.stage,
  )}</select></article>`;
}
async function crmPage() {
  if(!state.view.crmExplicit)state.view.crm=window.matchMedia("(max-width: 700px)").matches?"list":"board";
  const rows = await load("leads"),
    data = filtered(rows, "crm");
  let h =
    intro(
      "Conversas que viram oportunidades.",
      "Acompanhe cada relacionamento, do primeiro contato ao cliente.",
      button(icon("plus") + "Novo lead", "new-lead", "", "primary"),
    ) +
    `<div class="kpis">${kpi("Leads em andamento", rows.filter((x) => x.stage !== "Clientes").length, "Carteira atual", "blocks")}${kpi(
      "Valor em negociação",
      brl(
        sum(
          rows.filter((x) => x.stage !== "Clientes"),
          "estimated_value_cents",
        ),
      ),
      "Potencial informado nos contatos",
      "badge-dollar-sign",
    )}${kpi("Retornos pendentes", rows.filter((x) => x.next_contact_at && new Date(x.next_contact_at) <= new Date()).length, "Hoje ou em atraso", "clock-3")}${kpi("Clientes", rows.filter((x) => x.stage === "Clientes").length, "Convertidos por fechamento", "handshake")}</div>` +
    filtersHTML("crm", [
      [
        "owner",
        "Todos os responsáveis",
        state.users.map((x) => [x.id, x.name]),
      ],
    ]);
  if (!state.view.crm || state.view.crm === "board") {
    h += `<div class="pipeline">${STAGES.map(
      (s) =>
        `<section class="lane" data-lead-lane="${e(s)}"><div class="lane-head">${e(s)}<span class="count">${data.filter((x) => x.stage === s).length}</span></div>${
          data
            .filter((x) => x.stage === s)
            .map(leadCard)
            .join("") ||
          '<div class="lane-empty">Sem contatos nesta etapa</div>'
        }</section>`,
    ).join("")}</div>`;
    state.exports = data;
  } else
    h += card(
      "Carteira de contatos",
      table(
        data,
        [
          {
            title: "Contato",
            key: "name",
            render: (l) =>
              button(
                e(l.name),
                "lead-detail",
                `data-id="${l.id}"`,
                "text-link",
              ),
          },
          { title: "Organização", key: "company" },
          { title: "Startup", key: "startup_name" },
          { title: "Responsável", key: "owner_name" },
          { title: "Telefone", key: "phone" },
          { title: "Etapa", key: "stage", render: (l) => badge(l.stage) },
          {
            title: "Valor potencial (R$)",
            key: "estimated_value_cents",
            render: (l) => brl(l.estimated_value_cents),
          },
          {
            title: "Próximo contato",
            key: "next_contact_at",
            render: (l) => dateTime(l.next_contact_at),
          },
        ],
        "crm",
      ),
    );
  h += card(
    "Agenda de retornos",
    calendar(
      rows.map((x) => ({
        ...x,
        title: x.name,
        date: x.next_contact_at,
        action: "lead-detail",
      })),
    ),
    "Compromissos de relacionamento por mês",
    calendarControls(),
  );
  return h;
}
function calendarControls() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + state.calendar);
  return `<div class="flex"><span class="tiny muted">${d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>${button(icon("chevron-left"), "calendar", 'data-value="-1" aria-label="Mês anterior"', "icon-btn")}${button(icon("chevron-right"), "calendar", 'data-value="1" aria-label="Mês seguinte"', "icon-btn")}</div>`;
}
function calendar(rows) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + state.calendar);
  const year = d.getFullYear(),
    month = d.getMonth(),
    count = new Date(year, month + 1, 0).getDate(),
    offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const grid = Array.from({ length: offset }, () => '<div class="cal-day"></div>');
  const agenda = [];
  const currentDay = today();
  for (let day = 1; day <= count; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = rows.filter(row => dateOnly(row.date) === key).map(row =>
      button(e(row.title), row.action, `data-id="${e(row.id)}" title="${e(row.title)}"`, "cal-event")
    ).join("");
    grid.push(`<div class="cal-day ${key === currentDay ? "today" : ""}"><b>${day}</b>${events}</div>`);
    if (events) {
      const date = new Date(year, month, day).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      agenda.push(`<div class="calendar-agenda-day"><b>${e(date)}</b>${events}</div>`);
    }
  }
  const headings = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => `<div class="cal-heading">${day}</div>`).join("");
  return `<div class="calendar-wrap"><div class="calendar">${headings}${grid.join("")}</div></div>
    <div class="calendar-agenda" aria-label="Agenda do mês">${agenda.join("") || empty("Nenhum compromisso neste mês", "", "calendar")}</div>`;
}
async function commercialPage() {
  const [allLeads, deals, rawReport, customers] = await Promise.all([
    load("leads"),
    load("deals"),
    load("reports"),
    load("customers"),
  ]);
  const ownerFilter = state.filter.commercial?.owner;
  const leads = allLeads.filter(
      (x) => !ownerFilter || String(x.owner_id) === ownerFilter,
    ),
    report = {
      ...rawReport,
      commercial: (rawReport.commercial || []).filter(
        (x) => !ownerFilter || String(x.owner_id) === ownerFilter,
      ),
      sales: (rawReport.sales || []).filter(
        (x) => !ownerFilter || String(x.owner_id) === ownerFilter,
      ),
    };
  const allDeals = deals.filter(
      (x) =>
        (!state.startup || String(x.startup_id) === state.startup) &&
        (!ownerFilter ||
          String(
            allLeads.find((l) => String(l.id) === String(x.lead_id))?.owner_id,
          ) === ownerFilter),
    ),
    sales = periodRows(allDeals, "closed_at"),
    l = periodRows(leads, "created_at"),
    contacts = leads.filter(
      (x) =>
        x.first_contact_at &&
        (state.period === "all" || inPeriod(x, "first_contact_at")),
    ),
    meetings = leads.filter(
      (x) =>
        x.meeting_at && (state.period === "all" || inPeriod(x, "meeting_at")),
    ),
    conversion = leads.length
      ? Math.round(
          (leads.filter((x) => x.stage === "Clientes").length / leads.length) *
            100,
        )
      : 0;
  let h =
    intro(
      "Seu comercial, em movimento.",
      "Da primeira abordagem aos contratos, com visão por startup e pessoa.",
      button(icon("plus") + "Registrar venda", "new-deal", "", "primary"),
    ) +
    periodBar() +
    `<div class="kpis">${kpi("Leads gerados", l.length, "Cadastros no período", "blocks")}${kpi("Contatos realizados", contacts.length, "Primeiras abordagens no período", "phone")}${kpi("Contratos fechados", sales.length, "Vendas no período", "handshake")}${kpi("Receita contratada", brl(sum(sales, "value_cents")), "Valor contratado no período", "badge-dollar-sign")}</div><div class="metric-strip"><div class="mini-metric"><small>Reuniões no período</small><b>${meetings.length}</b></div><div class="mini-metric"><small>Reuniões realizadas</small><b>${leads.filter((x) => x.meeting_done_at && (state.period === "all" || inPeriod(x, "meeting_done_at"))).length}</b></div><div class="mini-metric"><small>Propostas registradas</small><b>${leads.filter((x) => x.proposal_sent_at && (state.period === "all" || inPeriod(x, "proposal_sent_at"))).length}</b></div><div class="mini-metric"><small>Negociações abertas</small><b>${leads.filter((x) => x.stage === "Fechamentos").length}</b></div><div class="mini-metric"><small>Clientes na carteira</small><b>${leads.filter((x) => x.stage === "Clientes").length}</b></div><div class="mini-metric"><small>Conversão da carteira</small><b>${conversion}%</b></div></div>`;
  const months = [
    ...new Set(
      [...(report.commercial || []), ...(report.sales || [])].map(
        (x) => x.month,
      ),
    ),
  ]
    .filter(
      (x) =>
        state.period === "all" ||
        ((!state.from || x >= state.from.slice(0, 7)) &&
          (!state.to || x <= state.to.slice(0, 7))),
    )
    .sort();
  const rows = months.map((month) => {
    const c = report.commercial.filter((x) => x.month === month),
      s = report.sales.filter((x) => x.month === month);
    return {
      month,
      contacts: sum(c, "contatos"),
      meetings: sum(c, "reunioes"),
      sales: sum(s, "vendas"),
      value: sum(s, "cents"),
    };
  });
  h += card("Propostas comerciais", workflowList(leads.filter(x => x.proposal || x.proposal_sent_at).map(x => ({
    id: x.id, title: x.company || x.name, action: "proposal-edit",
    note: `${x.startup_name} · ${x.owner_name} · ${label(x.proposal?.status || "enviada")} · ${x.proposal?.value ? brl(Number(x.proposal.value) * 100) : "Valor a definir"} · validade ${human(x.proposal?.valid_until)}`,
  })), "Nenhuma proposta registrada"), "Acompanhamento da carteira atual");
  h += card("Evolução comercial",commercialTrends(leads),selectedScope()+" · "+chartPeriod());
  h += `<div class="grid2">${card("Distribuição do funil", barList(STAGES.map((s) => ({ title: s, value: leads.filter((x) => x.stage === s).length }))), "Carteira atual")}${card("Desempenho por responsável", barList([...new Set(leads.map((x) => x.owner_name || "Sem responsável"))].map((name) => ({ title: name, value: leads.filter((x) => (x.owner_name || "Sem responsável") === name && x.stage === "Clientes").length }))), "Clientes convertidos na carteira")}</div>`;
  h += card(
    "Evolução mensal",
    table(
      rows,
      [
        { title: "Mês", key: "month" },
        { title: "Contatos", key: "contacts" },
        { title: "Reuniões agendadas", key: "meetings" },
        { title: "Vendas", key: "sales" },
        {
          title: "Valor contratado (R$)",
          key: "value",
          render: (x) => moneyOrMissing(x.value),
        },
      ],
      "commercial-months",
    ),
    "Meses abrangidos pela seleção",
  );
  h += filtersHTML(
    "commercial",
    [
      [
        "owner",
        "Todos os responsáveis",
        state.users.map((x) => [x.id, x.name]),
      ],
    ],
    false,
  );
  h += `<div class="toolbar"><div class="segmented">${[
    ["contracts", "Contratos"],
    ["customers", "Clientes cadastrados"],
    ["annual", "Consolidado anual"],
  ]
    .map(([v, t]) =>
      button(
        t,
        "view",
        `data-key="commercial" data-value="${v}"`,
        (state.view.commercial || "contracts") === v ? "active" : "",
      ),
    )
    .join("")}</div></div>`;
  const owner = state.filter.commercial?.owner;
  const filteredSales = filtered(
    sales.map((x) => ({
      ...x,
      owner_id: leads.find((l) => String(l.id) === String(x.lead_id))?.owner_id,
    })),
    "commercial",
  );
  if ((state.view.commercial || "contracts") === "contracts")
    h += card(
      "Contratos fechados",
      table(
        filteredSales,
        [
          {
            title: "Data",
            key: "closed_at",
            render: (x) => human(x.closed_at),
          },
          { title: "Startup", key: "startup_name" },
          { title: "Cliente", key: "lead_name" },
          { title: "Negociação", key: "title" },
          {
            title: "Valor (R$)",
            key: "value_cents",
            render: (x) => brl(x.value_cents),
          },
        ],
        "sales",
      ),
      "As parcelas serão acompanhadas no financeiro",
    );
  if (state.view.commercial === "customers") {
    const customerRows = customers.filter(
      (x) =>
        (!state.startup || String(x.startup_id) === state.startup) &&
        (!ownerFilter ||
          String(
            allLeads.find((l) => String(l.id) === String(x.lead_id))?.owner_id,
          ) === ownerFilter),
    );
    h += card(
      "Clientes cadastrados",
      table(
        filtered(customerRows, "commercial"),
        [
          { title: "Cliente", key: "name" },
          { title: "Startup", key: "startup_name" },
          {
            title: "Cadastro",
            key: "created_at",
            render: (x) => human(x.created_at),
          },
        ],
        "customers",
      ),
    );
  }
  if (state.view.commercial === "annual") {
    const years = [
      ...new Set(
        [...(report.commercial || []), ...(report.sales || [])].map((x) =>
          x.month.slice(0, 4),
        ),
      ),
    ].sort();
    const annual = years.map((year) => ({
      year,
      contacts: sum(
        report.commercial.filter((x) => x.month.startsWith(year)),
        "contatos",
      ),
      meetings: sum(
        report.commercial.filter((x) => x.month.startsWith(year)),
        "reunioes",
      ),
      sales: sum(
        report.sales.filter((x) => x.month.startsWith(year)),
        "vendas",
      ),
      value: sum(
        report.sales.filter((x) => x.month.startsWith(year)),
        "cents",
      ),
    }));
    h += card(
      "Consolidado comercial anual",
      table(
        annual,
        [
          { title: "Ano", key: "year" },
          { title: "Contatos", key: "contacts" },
          { title: "Reuniões agendadas", key: "meetings" },
          { title: "Vendas", key: "sales" },
          {
            title: "Contratado (R$)",
            key: "value",
            render: (x) => moneyOrMissing(x.value),
          },
        ],
        "commercial-annual",
        false,
      ),
      "Todos os anos registrados · startup e responsável selecionados",
    );
  }
  return h;
}
async function financePage() {
  const [all, allInvoices, financeInfo] = await Promise.all([
    load("finance"),
    load("invoices"),
    load("finance-context"),
  ]);
  const invoices = allInvoices.filter(
      (x) => !state.startup || String(x.startup_id) === state.startup,
    ),
    entries = periodRows(all, "entry_date"),
    real = entries.filter((x) => x.status === "realizado"),
    income=financeTotals(all).income,
    expense=financeTotals(all).expense,
    openInvoices = invoices
      .map((x) => ({
        ...x,
        pending: Math.max(0, Number(x.amount_cents) - Number(x.paid_cents)),
      }))
      .filter((x) => x.pending > 0),
    pending = periodRows(
      all
        .filter((x) => x.status === "previsto")
        .map((x) => ({ ...x, forecast_date: x.due_date || x.entry_date })),
      "forecast_date",
    );
  const financeSummary=financeTotals(all),balance=income==null||expense==null?null:income-expense;
  const view = state.view.finance || "entries";
  let h =
    intro(
      "Clareza em cada movimento.",
      "Caixa, compromissos e resultados. Cada empresa com suas próprias contas.",
      button(icon("plus") + "Novo lançamento", "new-finance", "", "primary"),
    ) +
    periodBar() +
    `<div class="kpis">${kpi("Receitas realizadas", moneyOrMissing(income), financeSummary.note, "arrow-down-left")}${kpi("Despesas realizadas", moneyOrMissing(expense), financeSummary.note, "arrow-up-right")}${kpi("Resultado realizado", moneyOrMissing(balance), balance==null?"Sem dados para calcular o saldo":financeSummary.note, "wallet")}${kpi(
      "Contas a receber",
      brl(
        sum(openInvoices, "pending") +
          sum(
            all.filter(
              (x) => x.status === "previsto" && x.entry_type === "receita",
            ),
            "amount_cents",
          ),
      ),
      "Parcelas + receitas manuais previstas",
      "calendar-clock",
    )}</div><div class="toolbar"><div class="segmented">${[
      ["entries", "Lançamentos"],
      ["cash", "Fluxo e previsão"],
      ["dre", "DRE gerencial"],
      ["invoices", "Contas a receber"],
      ["annual", "Relatório anual"],
    ]
      .map(([v, t]) =>
        button(
          t,
          "view",
          `data-key="finance" data-value="${v}"`,
          view === v ? "active" : "",
        ),
      )
      .join("")}</div></div>`;
  if (view === "entries") {
    h += card(
      "Evolução financeira",
      chartFinance(all.filter((x) => x.status === "realizado")),
      "Série mensal · unidade nos eixos e valores exatos disponíveis",
      "",
    );
    h += card("Saldo mensal",chartBalance(all),selectedScope()+" · Receitas menos despesas");
    h += `<div class="notice">${state.startup?"A visão desta startup usa somente os lançamentos identificados. Valores ausentes são exibidos como Sem dados.":"O consolidado do portfólio contém valores mensais sem detalhamento por startup. A tabela abaixo mostra os lançamentos identificados, que representam uma parte desse consolidado."}</div>`;
    const f = state.filter.finance || {};
    h += `<div class="toolbar"><div class="filter-group"><div class="toolbar-search">${icon("search")}<input data-filter="finance" placeholder="Buscar lançamentos…" value="${e(f.search || "")}"></div><select data-filter="finance" data-field="status" aria-label="Situação financeira">${options(
      [
        ["", "Todas as situações"],
        ["realizado", "Realizado"],
        ["previsto", "Previsto"],
      ],
      f.status,
    )}</select></div><span class="scope-note">${icon("lock-keyhole")} Valores separados por startup</span></div>`;
    h += card(
      "Movimentações",
      table(
        filtered(entries, "finance"),
        [
          {
            title: "Data",
            key: "entry_date",
            render: (x) => human(x.entry_date),
          },
          { title: "Startup", key: "startup_name" },
          {
            title: "Descrição",
            key: "description",
            render: (x) =>
              `<b>${e(x.description)}</b><div class="table-sub">${e(x.category)} · ${e(x.cost_center)}</div>`,
          },
          {
            title: "Tipo",
            key: "entry_type",
            render: (x) =>
              badge(x.entry_type, x.entry_type === "receita" ? "ok" : ""),
          },
          {
            title: "Classe",
            key: "expense_class",
            render: (x) => e(label(x.expense_class)),
          },
          { title: "Situação", key: "status", render: (x) => badge(x.status) },
          {
            title: "Valor (R$)",
            key: "amount_cents",
            render: (x) => brl(x.amount_cents),
          },
          {
            title: "",
            render: (x) =>
              x.source_type
                ? badge("Vinculado")
                : button(
                    icon("pencil"),
                    "finance-edit",
                    `data-id="${x.id}" aria-label="Editar lançamento"`,
                    "icon-btn",
                  ),
          },
        ],
        "finance",
      ),
    );
  }
  if (view === "cash") {
    const projectedIn =
        sum(
          pending.filter((x) => x.entry_type === "receita"),
          "amount_cents",
        ) +
        sum(
          openInvoices.filter(
            (x) => state.period === "all" || inPeriod(x, "due_date"),
          ),
          "pending",
        ),
      projectedOut = sum(
        pending.filter((x) => x.entry_type === "despesa"),
        "amount_cents",
      );
    h += `<div class="grid3">${kpi("Entradas previstas", brl(projectedIn), "Receitas manuais + parcelas no período", "arrow-down-left")}${kpi("Contas a pagar", brl(projectedOut), "Despesas previstas no período", "arrow-up-right")}${kpi("Resultado projetado", moneyOrMissing(balance==null?null:balance+projectedIn-projectedOut), "Movimentos realizados + previsões", "chart-no-axes-combined")}</div>`;
    const flow = [
      ...all.map((x) => ({
        ...x,
        date:
          x.status === "previsto" ? x.due_date || x.entry_date : x.entry_date,
        value: Number(x.amount_cents) * (x.entry_type === "despesa" ? -1 : 1),
      })),
      ...openInvoices.map((x) => ({
        date: x.due_date,
        description: x.deal_title + " · parcela " + x.installment,
        startup_name: x.startup_name,
        status: "previsto",
        value: x.pending,
      })),
    ];
    h += card(
      "Fluxo de caixa",
      table(
        periodRows(flow, "date"),
        [
          {
            title: "Data prevista / realizada",
            key: "date",
            render: (x) => human(x.date),
          },
          { title: "Startup", key: "startup_name" },
          { title: "Movimento", key: "description" },
          { title: "Situação", key: "status", render: (x) => badge(x.status) },
          {
            title: "Valor (R$)",
            key: "value",
            render: (x) => moneyOrMissing(x.value),
          },
        ],
        "cash",
      ),
      "Valores futuros em aberto separados dos realizados",
    );
  }
  if (view === "dre") {
    const comp = periodRows(
      all
        .filter((x) => x.status === "realizado")
        .map((x) => ({ ...x, competence: x.competence_date || x.entry_date })),
      "competence",
    );
    const revenue = sum(
        comp.filter((x) => x.entry_type === "receita"),
        "amount_cents",
      ),
      fixed = sum(
        comp.filter(
          (x) => x.entry_type === "despesa" && x.expense_class === "fixa",
        ),
        "amount_cents",
      ),
      variable = sum(
        comp.filter(
          (x) => x.entry_type === "despesa" && x.expense_class === "variavel",
        ),
        "amount_cents",
      );
    const result = [
      { title: "Receitas identificadas", value: revenue },
      { title: "(−) Despesas variáveis", value: -variable },
      { title: "Margem de contribuição", value: revenue - variable },
      { title: "(−) Despesas fixas", value: -fixed },
      { title: "Resultado gerencial", value: revenue - variable - fixed },
    ];
    if(!comp.some(x=>x.entry_type==='receita')){result[0].value=null;result[2].value=null;result[4].value=null}
    if(!comp.some(x=>x.entry_type==='despesa')){result[1].value=null;result[2].value=null;result[3].value=null;result[4].value=null}
    h += `<div class="notice">Esta DRE considera somente lançamentos identificados. Valores consolidados sem detalhamento por empresa não são atribuídos a uma startup.</div>`;
    h += card(
      "DRE dos lançamentos identificados",
      table(
        result,
        [
          { title: "Descrição", key: "title" },
          {
            title: "Valor (R$)",
            key: "value",
            render: (x) => moneyOrMissing(x.value),
          },
        ],
        "dre",
        false,
      ),
      "Lançamentos realizados agrupados pela data de competência informada",
    );
    const centers = [
      ...new Set(comp.map((x) => x.cost_center || "Operação")),
    ].map((name) => ({
      name,
      income: !comp.some(x=>(x.cost_center||'Operação')===name&&x.entry_type==='receita')?null:sum(
        comp.filter(
          (x) =>
            (x.cost_center || "Operação") === name &&
            x.entry_type === "receita",
        ),
        "amount_cents",
      ),
      expense: !comp.some(x=>(x.cost_center||'Operação')===name&&x.entry_type==='despesa')?null:sum(
        comp.filter(
          (x) =>
            (x.cost_center || "Operação") === name &&
            x.entry_type === "despesa",
        ),
        "amount_cents",
      ),
    }));
    h += card(
      "Centros de custo",
      table(
        centers,
        [
          { title: "Centro", key: "name" },
          {
            title: "Receita (R$)",
            key: "income",
            render: (x) => moneyOrMissing(x.income),
          },
          {
            title: "Despesa (R$)",
            key: "expense",
            render: (x) => moneyOrMissing(x.expense),
          },
          { title: "Resultado", render: (x) => moneyOrMissing(x.income==null||x.expense==null?null:x.income-x.expense) },
        ],
        "centers",
        false,
      ),
    );
  }
  if (view === "invoices") {
    h += card(
      "Parcelas de contratos",
      table(
        invoices,
        [
          {
            title: "Vencimento",
            key: "due_date",
            render: (x) => human(x.due_date),
          },
          { title: "Startup", key: "startup_name" },
          { title: "Contrato", key: "deal_title" },
          { title: "Parcela", key: "installment" },
          {
            title: "Valor (R$)",
            key: "amount_cents",
            render: (x) => brl(x.amount_cents),
          },
          {
            title: "Recebido (R$)",
            key: "paid_cents",
            render: (x) => brl(x.paid_cents),
          },
          {
            title: "Saldo",
            render: (x) => brl(Number(x.amount_cents) - Number(x.paid_cents)),
          },
          {
            title: "",
            render: (x) =>
              Number(x.amount_cents) > Number(x.paid_cents)
                ? button(
                    "Receber",
                    "payment",
                    `data-id="${x.id}"`,
                    "small primary",
                  )
                : badge("Quitado", "ok"),
          },
        ],
        "invoices",
      ),
      "Cada recebimento gera um registro financeiro na startup do contrato",
    );
  }
  if (view === "annual") {
    const years = [
      ...new Set(all.map((x) => dateOnly(x.entry_date).slice(0, 4))),
    ].sort();
    h += card(
      "Lançamentos identificados por ano",
      table(
        years.map((year) => {
          const rows = all.filter(
            (x) =>
              x.status === "realizado" &&
              dateOnly(x.entry_date).startsWith(year),
          );
          return {
            year,
            income: !rows.some(x=>x.entry_type==='receita')?null:sum(
              rows.filter((x) => x.entry_type === "receita"),
              "amount_cents",
            ),
            expense: !rows.some(x=>x.entry_type==='despesa')?null:sum(
              rows.filter((x) => x.entry_type === "despesa"),
              "amount_cents",
            ),
          };
        }),
        [
          { title: "Ano", key: "year" },
          {
            title: "Receitas (R$)",
            key: "income",
            render: (x) => moneyOrMissing(x.income),
          },
          {
            title: "Despesas (R$)",
            key: "expense",
            render: (x) => moneyOrMissing(x.expense),
          },
          { title: "Resultado", render: (x) => moneyOrMissing(x.income==null||x.expense==null?null:x.income-x.expense) },
        ],
        "annual",
        false,
      ),
      "Todos os anos com lançamentos · startup selecionada",
    );
  }
  return h;
}
const FLOW = ["planejamento", "producao", "ajustes_solicitados", "revisao", "aprovacao", "publicacao"];
const marketingFlow = (x) =>
  x.workflow && x.workflow !== "planejamento"
    ? x.workflow
    : {
        rascunho: "planejamento",
        ajustes: "producao",
        em_revisao: "revisao",
        aprovado: "aprovacao",
        publicado: "publicacao",
      }[x.status] || "planejamento";
async function marketingPage() {
  const all = await load("marketing"),
    rows = periodRows(
      all.map((x) => ({ ...x, date: x.planned_date || x.created_at })),
      "date",
    );
  let h =
    intro(
      "Marketing e conteúdo",
      "Planeje, produza e acompanhe cada publicação da sua startup.",
      marketingAccess()
        ? button(icon("plus") + "Novo conteúdo", "new-marketing", "", "primary")
        : "",
    ) +
    periodBar() +
    `<div class="kpis">${kpi("Em produção", rows.filter((x) => ["planejamento", "producao", "ajustes_solicitados"].includes(marketingFlow(x))).length, "Pautas e peças em criação", "clapperboard")}${kpi("Em revisão", rows.filter((x) => marketingFlow(x) === "revisao").length, "Aguardando a gestão", "scan-eye")}${kpi("Publicados", rows.filter((x) => marketingFlow(x) === "publicacao").length, "Peças publicadas no período", "send")}${kpi("Alcance registrado", fmt(sum(rows, "reach")), "Métricas informadas pela equipe", "chart-no-axes-combined")}</div><div class="toolbar"><div class="segmented">${[
      ["board", "Pipeline"],
      ["calendar", "Calendário editorial"],
      ["list", "Lista"],
    ]
      .map(([v, t]) =>
        button(
          t,
          "view",
          `data-key="marketing" data-value="${v}"`,
          (state.view.marketing || "board") === v ? "active" : "",
        ),
      )
      .join("")}</div></div>`;
  if (external()) {
    state.exports = all.map(x => ({ Conteúdo: x.title, Startup: x.startup_name, Prazo: x.delivery_due || x.planned_date, Etapa: label(marketingFlow(x)) }));
    return intro("Minhas entregas", "Briefings, prazos e revisões das suas demandas.") +
      card("Demandas atribuídas", workflowList(all.map(x => ({
        title: x.title, id: x.id, action: "marketing-edit",
        note: `${x.startup_name} · ${label(marketingFlow(x))} · Entrega ${human(x.delivery_due || x.planned_date)}`,
      })), "Nenhuma demanda atribuída"));
  }
  h += card("Fila de publicação", workflowList(editorialActions(all), "Nenhum conteúdo aprovado aguardando publicação"));
  const stories = (await load("tasks")).filter(task => task.source === "story_repost");
  const upcomingStories = stories.filter(task => !["concluida", "cancelada"].includes(task.status))
    .sort((a, b) => (a.planned_date || "").localeCompare(b.planned_date || ""));
  h += card("Stories programados · sem remuneração", workflowList(upcomingStories.slice(0, 8).map(task => ({
    id: task.id, title: task.title, action: "task-detail",
    note: human(task.planned_date) + " · " + task.startup_name + " · " + label(task.status),
  })), "Ao registrar um Reel publicado no Instagram, a agenda de Stories será criada automaticamente."),
    "Seis abordagens em quatro semanas. A equipe executa e registra as evidências; o calendário editorial reúne as datas.");
  const view = state.view.marketing || "board";
  if (view === "calendar")
    h += card(
      "Calendário editorial",
      calendar(
        rows.map((x) => ({
          ...x,
          date: x.planned_date,
          title: x.title,
          action: "marketing-edit",
        })).concat(periodRows(stories, "planned_date").map(task => ({
          ...task, date: task.planned_date, action: "task-detail",
        }))),
      ),
      "Publicações e repostagens nos Stories · datas em Brasília",
      calendarControls(),
    );
  else if (view === "board")
    h += `<div class="pipeline">${FLOW.map(
      (s) =>
        `<section class="lane"><div class="lane-head">${label(s)}<span class="count">${rows.filter((x) => marketingFlow(x) === s).length}</span></div>${
          rows
            .filter((x) => marketingFlow(x) === s)
            .map(
              (x) =>
                `<article class="lead-card">${badge(x.format, "blue")}${button(e(x.title), "marketing-edit", `data-id="${x.id}"`, "text-link")}<p>${e(x.startup_name)} · ${e(x.creator_name || "")}<br>${e(x.campaign || "Sem campanha")}</p><div class="task-meta">${human(x.planned_date)}</div>${marketingAccess() ? button("Abrir conteúdo " + icon("arrow-up-right"), "marketing-edit", `data-id="${x.id}"`, "text-link") : ""}</article>`,
            )
            .join("") || '<div class="lane-empty">Nenhum conteúdo</div>'
        }</section>`,
    ).join("")}</div>`;
  else
    h += card(
      "Conteúdos e métricas",
      table(
        rows,
        [
          {
            title: "Conteúdo",
            key: "title",
            render: (x) =>
              button(
                e(x.title),
                "marketing-edit",
                `data-id="${x.id}"`,
                "text-link",
              ),
          },
          { title: "Startup", key: "startup_name" },
          { title: "Campanha", key: "campaign" },
          { title: "Responsável", key: "creator_name" },
          {
            title: "Publicação",
            key: "planned_date",
            render: (x) => human(x.planned_date),
          },
          { title: "Etapa", key: "status", render: (x) => badge(x.status) },
          { title: "Alcance", key: "reach" },
          { title: "Engajamentos", key: "engagement" },
          { title: "Leads", key: "leads_generated" },
        ],
        "marketing",
      ),
    );
  h += await campaignCard();
  state.exports = rows.map(x => ({
    Conteúdo: x.title, Startup: x.startup_name, Campanha: x.campaign, Responsável: x.creator_name,
    Etapa: label(marketingFlow(x)), Planejada: x.publication?.scheduled_at || x.planned_date,
    Publicada: x.publication?.published_at, Link: x.publication?.post_url,
    Alcance: x.reach, Engajamentos: x.engagement, Leads: x.leads_generated,
  }));
  return h;
}
async function techPage() {
  const all = await load("technology"),
    rows = periodRows(
      all.map((x) => ({ ...x, date: x.due_date || x.created_at })),
      "date",
    );
  let h =
    intro(
      "Da ideia à próxima entrega.",
      "Backlog, correções e versões de cada produto.",
      admin()
        ? button(icon("plus") + "Novo item", "new-tech", "", "primary")
        : "",
    ) +
    periodBar() +
    `<div class="grid3">${state.startups
      .filter((x) => !state.startup || String(x.id) === state.startup)
      .map((x) =>
        card(
          x.name,
          `<div class="tiny muted">Responsável técnico</div><b class="tiny">${e(x.tech_owner)}</b><div class="task-meta">Participação societária · ${fmt(x.tech_equity_percent)}%</div><div style="margin-top:12px">${badge(x.market_model, "blue")}</div>`,
        ),
      )
      .join("")}</div>` +
    filtersHTML("tech", [
      [
        "priority",
        "Todas as prioridades",
        ["urgente", "alta", "media", "baixa"].map((x) => [x, label(x)]),
      ],
    ]);
  const data = filtered(rows, "tech");
  if (state.view.tech === "board") {
    h += `<div class="pipeline">${[
      "planejado",
      "em_andamento",
      "validacao",
      "concluido",
    ]
      .map(
        (s) =>
          `<section class="lane"><div class="lane-head">${label(s)}<span class="count">${data.filter((x) => x.status === s).length}</span></div>${
            data
              .filter((x) => x.status === s)
              .map(
                (x) =>
                  `<article class="lead-card">${badge(x.kind, "blue")}${button(e(x.title), "tech-edit", `data-id="${x.id}"`, "text-link")}<p>${e(x.startup_name)} · ${e(x.responsible)}<br>${e(x.version || "Sem versão")}</p>${progress(x.progress)}<div class="task-meta">${x.progress}% · ${human(x.due_date)}</div></article>`,
              )
              .join("") || '<div class="lane-empty">Nenhum item</div>'
          }</section>`,
      )
      .join("")}</div>`;
    state.exports = data;
    return h;
  }
  h += card(
    "Roadmap de produto",
    table(
      data,
      [
        {
          title: "Item",
          key: "title",
          render: (x) =>
            button(e(x.title), "tech-edit", `data-id="${x.id}"`, "text-link"),
        },
        { title: "Startup", key: "startup_name" },
        { title: "Tipo", key: "kind", render: (x) => badge(x.kind) },
        { title: "Responsável", key: "responsible" },
        {
          title: "Prioridade",
          key: "priority",
          render: (x) => priority(x.priority),
        },
        { title: "Prazo", key: "due_date", render: (x) => human(x.due_date) },
        { title: "Status", key: "status", render: (x) => badge(x.status) },
        { title: "Versão", key: "version" },
        {
          title: "Progresso",
          key: "progress",
          render: (x) =>
            `<span class="progress-text">${progress(x.progress)}${x.progress}%</span>`,
        },
      ],
      "technology",
    ),
  );
  h += card(
    "Histórico de entregas",
    table(
      all.filter((x) => x.delivered_at),
      [
        { title: "Entrega", key: "title" },
        { title: "Startup", key: "startup_name" },
        { title: "Versão", key: "version" },
        {
          title: "Concluída em",
          key: "delivered_at",
          render: (x) => human(x.delivered_at),
        },
      ],
      "releases",
    ),
    "Itens concluídos e suas versões",
  );
  state.exports = data;
  return h;
}
async function processPage() {
  const [templates, plans] = await Promise.all([
    load("templates"),
    load("plans"),
  ]);
  state.templates = templates;
  let h =
    intro(
      "Bons processos. Execução consistente.",
      "Transforme rotinas em modelos e acompanhe cada etapa.",
      admin()
        ? button(icon("plus") + "Novo modelo", "new-template", "", "primary")
        : "",
    ) +
    `<div class="kpis">${kpi("Modelos disponíveis", templates.length, "Checklists reutilizáveis", "files")}${kpi("Planos em execução", plans.filter((x) => Number(x.done) < Number(x.total)).length, "Rotinas por startup", "workflow")}${kpi("Planos concluídos", plans.filter((x) => Number(x.total) > 0 && Number(x.done) === Number(x.total)).length, "Todas as etapas entregues", "check-check")}${kpi("Setores", new Set(templates.map((x) => x.sector)).size, "Áreas operacionais", "layers")}</div>` +
    card(
      "Planos de execução",
      plans
        .map(
          (x) =>
            `<div class="task"><div class="between"><div><b>${e(x.title)}</b><div class="task-meta">${e(x.startup_name)} · ${e(x.owner_name)} · ${human(x.due_date)}</div></div>${button("Ver etapas " + icon("arrow-up-right"), "plan-detail", `data-id="${x.id}"`, "small")}</div><div class="progress-text" style="margin-top:12px">${progress(x.done, x.total)}${x.done}/${x.total}</div></div>`,
        )
        .join("") ||
        empty(
          "Nenhum plano iniciado",
          "Use um modelo para organizar a próxima rotina.",
          "workflow",
        ),
    ) +
    `<div class="section-label">BIBLIOTECA DE MODELOS</div><div class="grid3">${templates
      .map(
        (t) =>
          `<section class="card goal-card"><div class="between">${badge(t.sector, "blue")}${admin() ? button(icon("pencil"), "template-edit", `data-id="${t.id}" aria-label="Editar modelo"`, "icon-btn") : ""}</div><h2 style="margin:13px 0">${e(t.title)}</h2><div class="tiny muted">${t.steps.length} etapas · ${t.startup_id ? e(startupName(t.startup_id)) : "Todas as startups"}</div><div style="margin:15px 0">${t.steps
            .slice(0, 3)
            .map((x) => `<div class="task-meta">○ ${e(x)}</div>`)
            .join(
              "",
            )}${t.steps.length > 3 ? `<div class="task-meta">+ ${t.steps.length - 3} etapas</div>` : ""}</div>${admin() ? `<div class="flex">${button("Iniciar plano", "new-plan", `data-id="${t.id}"`, "small primary")}${button("Criar tarefa", "task-template", `data-id="${t.id}"`, "small")}${button(icon("copy"), "template-copy", `data-id="${t.id}" aria-label="Duplicar modelo"`, "icon-btn")}</div>` : ""}</section>`,
      )
      .join("")}</div>`;
  state.exports = plans;
  return h;
}
async function peoplePage() {
  const [users, members] = await Promise.all([
    load("users"),
    load("memberships"),
  ]);
  state.users = users;
  state.memberships = members;
  const shown = users.filter(
    (x) =>
      !state.startup ||
      x.role === "admin" ||
      members.some(
        (m) =>
          String(m.user_id) === String(x.id) &&
          String(m.startup_id) === state.startup,
      ),
  );
  state.exports = shown.map((x) => ({
    Nome: x.name,
    Cargo: x.job_title,
    Email: x.email,
    Perfil: label(x.role),
    Acesso: x.active ? "Ativo" : "Suspenso",
    Startups: members
      .filter((m) => String(m.user_id) === String(x.id))
      .map((m) => startupName(m.startup_id))
      .join(", "),
  }));
  return (
    intro(
      "Pessoas conectadas ao propósito.",
      "Papéis claros, responsabilidades e acesso por startup.",
      button(icon("user-plus") + "Nova pessoa", "new-user", "", "primary"),
    ) +
    `<div class="grid3">${shown
      .map(
        (x) =>
          `<section class="card person-card"><div class="between"><span class="avatar">${x.avatar_url ? `<img src="${e(x.avatar_url)}" alt="Foto de ${e(x.name)}">` : e(x.name[0])}</span>${badge(x.active ? "Ativo" : "Suspenso", x.active ? "ok" : "bad")}</div><h2 style="margin-top:14px">${e(x.name)}</h2><small>${e(x.job_title || label(x.role))}</small><div class="task-meta">${e(x.email || "Credenciais não configuradas")}</div><div class="membership-list">${
            x.role === "admin"
              ? badge("Todas as startups", "blue")
              : members
                  .filter((m) => String(m.user_id) === String(x.id))
                  .map((m) => badge(startupName(m.startup_id)))
                  .join("") || badge("Sem vínculos")
          }</div><div class="tiny muted" style="min-height:30px">${e(x.responsibilities || "Responsabilidades a definir")}</div><div class="flex" style="margin-top:18px">${button("Perfil e acesso", "user-edit", `data-id="${x.id}"`, "small")}${button("Startups", "user-memberships", `data-id="${x.id}"`, "small quiet")}</div></section>`,
      )
      .join("")}</div>` +
    card(
      "Permissões por função",
      table([
        { role: "Gestão", finance: "Acesso completo", commercial: "Todas as startups", operations: "Atribui, aprova e gerencia acessos" },
        { role: "Comercial", finance: "Sem acesso financeiro", commercial: "CRM e contratos das startups vinculadas", operations: "Próprias tarefas e metas" },
        { role: "Social Media", finance: "Sem acesso financeiro", commercial: "Resultados agregados de campanhas", operations: "Cria conteúdo e publica peças aprovadas das startups vinculadas" },
        { role: "Marketing externo", finance: "Sem acesso financeiro", commercial: "Sem acesso ao CRM", operations: "Consulta e entrega somente as demandas atribuídas" },
        { role: "Desenvolvimento de materiais", finance: "Sem acesso financeiro", commercial: "Sem acesso ao CRM", operations: "Produtos, metas, atividades, resultados e evidências de materiais" },
        { role: "Colaborador", finance: "Sem acesso financeiro", commercial: "Sem acesso ao CRM", operations: "Próprias tarefas e metas, consulta à operação vinculada" },
      ], [
        { title: "Função", key: "role" },
        { title: "Gestão e finanças", key: "finance" },
        { title: "Comercial", key: "commercial" },
        { title: "Operação", key: "operations" },
      ], "role-permissions", false, false),
      "As regras são verificadas pelo servidor em cada operação",
    )
  );
}
// Product development shares the task queue and evidence workflow with the workspace.
// Included inside the workspace scope; shares product filters and modal controls.
const trlLevels = [
  [1,"Princípios básicos observados"],[2,"Conceito formulado"],[3,"Prova de conceito"],
  [4,"Validação em laboratório"],[5,"Validação em ambiente relevante"],
  [6,"Demonstração em ambiente relevante"],[7,"Protótipo em ambiente operacional"],
  [8,"Sistema completo e qualificado"],[9,"Tecnologia comprovada em operação"],
];
const trlLabel = product => product.trl ? "TRL " + product.trl : "TRL a avaliar";
const workDuration = minutes => Math.floor(Number(minutes)/60) + "h " + String(Number(minutes)%60).padStart(2,"0") + "min";
function workFields(value = {}, required = false) {
  return '<p class="tiny muted full">Registre cada período de atuação da pessoa em preparação, execução ou análise.</p>' +
    sf("Início do trabalho", "work_started_at", localDatetime(value.work_started_at), "datetime-local", required ? "required" : "") +
    sf("Fim do trabalho", "work_ended_at", localDatetime(value.work_ended_at), "datetime-local", required ? "required" : "");
}
function normalizeWork(body) {
  for (const key of ["work_started_at","work_ended_at"]) {
    if (body[key]) body[key] = new Date(body[key]).toISOString();
    else delete body[key];
  }
}
function readinessPanel(product) {
  const history = (product.trl_history || []).slice().reverse();
  return card("Maturidade tecnológica", `<div class="between"><strong>${e(trlLabel(product))}</strong>
    ${button("Registrar avaliação TRL","material-trl",itemRef(product.id),"small primary")}</div>
    <ol class="trl-scale" aria-label="Escala TRL">${trlLevels.map(([level,label])=>
      `<li class="${level===product.trl?'current':''}"><b>${level}</b><span>${e(label)}</span></li>`).join("")}</ol>` +
    (history.length ? table(history,[
      {title:"Data",render:h=>dateTime(h.recorded_at)},
      {title:"Evolução",render:h=>`${h.from?'TRL '+h.from:'Avaliação inicial'} → TRL ${h.to}`},
      {title:"Justificativa",key:"reason"},{title:"Responsável",key:"author"},
      {title:"Referência",render:h=>externalLink(h.evidence_url,"Abrir referência")},
    ],"trl-history",false,false) : '<p class="tiny muted">Registre a primeira avaliação do material.</p>'),
    "O nível é registrado com justificativa e referência técnica.");
}
async function trlForm(id) {
  const product=await api("/api/material-products/"+id);
  formModal("Avaliar TRL · "+product.name,
    sel("TRL avaliado","trl",trlLevels.map(([n,label])=>[String(n),n+" · "+label]),product.trl||"1")+
    text("Justificativa e resultados que sustentam o nível","trl_reason","","required maxlength=\"3000\"")+
    sf("Link do relatório ou resultado (opcional)","trl_evidence_url","","url"),
    body=>api("/api/material-products/"+id,"PATCH",body),{submit:"Salvar avaliação"});
}
async function experimentForm(id) {
  const products=await api("/api/material-products");
  const old=id?await api("/api/material-experiments/"+id):null;
  const v=old||{product_id:state.materialProduct||products[0]?.id};
  formModal(old?"Revisar roteiro":"Novo roteiro de experimento",
    sel("Material","product_id",products.map(p=>[p.id,p.name]),v.product_id,old?"disabled":"required")+
    sf("Nome do experimento","title",v.title,"text",'required maxlength="200"')+
    text("Objetivo","objective",v.objective,'required maxlength="3000"')+
    text("Hipótese (opcional)","hypothesis",v.hypothesis,'maxlength="3000"')+
    text("Materiais, formulação e quantidades","materials",v.materials,'required maxlength="3000"')+
    text("Procedimento passo a passo","procedure",v.procedure,'required maxlength="3000"')+
    text("Critérios de avaliação","success_criteria",v.success_criteria,'required maxlength="3000"'),
    body=>api("/api/material-experiments"+(id?"/"+id:""),id?"PATCH":"POST",body),
    {submit:old?"Salvar nova versão":"Salvar roteiro"});
}
async function experimentDetail(id) {
  const experiment=await api("/api/material-experiments/"+id);
  dialog(experiment.title,
    `<div class="detail-summary">${badge(experiment.product_name,"blue")}${badge("Versão "+experiment.version)}</div>`+
    ["objective","hypothesis","materials","procedure","success_criteria"].map((key,index)=>
      experiment[key]?`<div class="workflow-item"><b>${["Objetivo","Hipótese","Materiais e quantidades","Procedimento","Critérios de avaliação"][index]}</b><p class="lead-notes">${e(experiment[key])}</p></div>`:"").join("")+
    `<div class="workflow-actions">${button("Registrar resultado","material-experiment-result",itemRef(id),"primary")}
    ${admin()||experiment.user_id===state.me.id?button("Revisar roteiro","material-experiment-edit",itemRef(id)):""}</div>
    <details><summary>Versões anteriores</summary>${(experiment.revisions||[]).slice(0,-1).reverse().map(r=>
      `<div class="workflow-item"><b>Versão ${r.version} · ${e(r.author)}</b><small> ${dateTime(r.recorded_at)}</small>
       ${["objective","hypothesis","materials","procedure","success_criteria"].map(k=>`<p class="lead-notes">${e(r[k])}</p>`).join("")}</div>`).join("")||'<p>Nenhuma versão anterior.</p>'}</details>`);
}
let workLogOptions={tasks:[],experiments:[]};
function syncWorkTasks() {
  const product=$("#worklog-product").value;
  const user=$("#worklog-user")?.value||state.me.id;
  const task=$("#worklog-task"),experiment=$("#worklog-experiment");
  task.innerHTML=options([["","Selecione a atividade"],...workLogOptions.tasks.filter(t=>
    t.product_id===product&&t.assigned_to===user).map(t=>[t.id,t.title])],task.value);
  experiment.innerHTML=options([["","Sem roteiro vinculado"],...workLogOptions.experiments.filter(x=>
    x.product_id===product).map(x=>[x.id,x.title])],experiment.value);
}
async function workLogForm() {
  const [products,tasks,experiments]=await Promise.all(["material-products","tasks","material-experiments"].map(n=>api("/api/"+n)));
  workLogOptions={tasks,experiments};
  formModal("Registrar trabalho de desenvolvimento",
    sel("Material","product_id",products.map(p=>[p.id,p.name]),state.materialProduct||products[0]?.id,'required id="worklog-product"')+
    (admin()?sel("Pessoa","user_id",state.users.filter(u=>u.active&&u.role==="desenvolvimento").map(u=>[u.id,u.name]),materialPerson(),'required id="worklog-user"'):"")+
    sel("Atividade","task_id",[],"",'required id="worklog-task"')+
    sel("Roteiro (opcional)","experiment_id",[],"",'id="worklog-experiment"')+
    workFields({},true)+text("Trabalho realizado","note","","required maxlength=\"3000\""),
    body=>{normalizeWork(body);return api("/api/material-worklogs","POST",body);},{submit:"Salvar período"});
  syncWorkTasks();
}
function workLogRows(tasks,logs) {
  return [...tasks.filter(t=>t.work_started_at).map(t=>({
    ...t,task_title:t.title,user_id:t.assigned_to,person_name:t.assignee_name,
    note:"Período registrado na criação da atividade",
  })),...logs].sort((a,b)=>b.work_started_at.localeCompare(a.work_started_at));
}

const materialStages=[['ideacao','Ideação'],['pesquisa','Pesquisa'],['prototipo','Prototipagem'],['testes','Testes'],['validacao','Validação'],['finalizado','Finalizado']];
const materialTabs=[['overview','Visão geral'],['goals','Metas'],['tasks','Atividades'],['experiments','Experimentos'],['work','Horas de trabalho'],['results','Resultados e evidências']];
const materialPerson=()=>state.users.find(x=>x.active&&x.role==='desenvolvimento')?.id||state.me.id;
const materialName=id=>(state.data['material-products']||[]).find(x=>x.id===id)?.name||'Produto';
function materialTaskField(products,value,startup){
  if(!products.length)return '';
  return `<label ${startup!==MATERIAL_SPACE?'hidden':''}>Produto<select name="product_id" id="material-task-product" ${startup===MATERIAL_SPACE?'required':'disabled'}>${options([['','Selecione o produto'],...products.map(x=>[x.id,x.name])],value)}</select></label>`;
}
function materialMetric(title,value,tab,iconName){
  return `<button type="button" class="kpi dashboard-link" data-action="material-tab" data-value="${tab}"><span class="kpi-head"><span class="label">${e(title)}</span><span class="kpi-icon">${icon(iconName)}</span></span><strong>${fmt(value)}</strong><small>Ver ${tab==='goals'?'metas':tab==='tasks'?'atividades':'resultados'}</small><span class="dashboard-arrow">${icon('arrow-up-right')}</span></button>`;
}
async function materialsPage(requestedTab){
  const tab=typeof requestedTab==='string'?requestedTab:(state.materialTab||'overview');
  const [products,allGoals,allResults,allTasks,allExperiments,allWorklogs]=await Promise.all([load('material-products'),load('material-goals'),load('material-results'),load('tasks'),load('material-experiments'),load('material-worklogs')]);
  const product=products.find(x=>x.id===state.materialProduct),selected=product?.id||'';
  const own=x=>!selected||x.product_id===selected;
  const tasks=allTasks.filter(x=>x.product_id&&own(x)),goals=allGoals.filter(own),results=allResults.filter(own);
  const experiments=allExperiments.filter(own),worklogs=workLogRows(tasks,allWorklogs.filter(own));
  const done=tasks.filter(x=>x.status==='concluida').length,open=tasks.filter(openTask).length;
  const header=intro('Desenvolvimento de materiais', 'Da ideação aos experimentos, resultados e evolução tecnológica.',
    button(icon('plus')+'Novo produto','material-new-product','','primary'));
  if(state.startup&&state.startup!==MATERIAL_SPACE)return header+card('Seleção de projeto',empty('Selecione Materiais de Palma','Esta área reúne o desenvolvimento dos produtos de palma.','flask-conical')+button('Abrir Materiais de Palma','material-scope','','primary'));
  const controls=`<div class="material-controls">${sel('Produto','material-product',[['','Todos os produtos'],...products.map(x=>[x.id,x.name])],selected,'id="material-product"')}${button('Meu dia '+icon('arrow-up-right'),'navigate','data-value="myday"','small')}</div>
    <nav class="material-tabs" aria-label="Seções de desenvolvimento">${materialTabs.map(([key,name])=>button(e(name),'material-tab',`data-value="${key}" ${tab===key?'aria-current="page"':''}`,tab===key?'active':'')).join('')}</nav>`;
  const context=product?`<div class="material-context"><div><span class="eyebrow">PRODUTO SELECIONADO</span><h2>${e(product.name)}</h2><p>${e(product.description||'Registre o objetivo e as características deste produto.')}</p></div><div class="actions">${badge(materialStages.find(([key])=>key===product.stage)?.[1]||'Pesquisa',product.stage==='finalizado'?'ok':'blue')}${button('Editar produto','material-edit-product',itemRef(product.id),'small')}</div></div>${readinessPanel(product)}`:'';
  let body='';
  if(tab==='overview'){
    body=`<div class="kpis">${materialMetric('Atividades em aberto',open,'tasks','list-todo')}${materialMetric('Atividades concluídas',done,'tasks','circle-check')}${materialMetric('Metas atingidas',goals.filter(x=>x.done>=x.target).length,'goals','target')}${materialMetric('Resultados registrados',results.length,'results','flask-conical')}</div>`;
    body+=`<div class="grid3 material-products">${products.filter(x=>!selected||x.id===selected).map(p=>{
      const ts=allTasks.filter(t=>t.product_id===p.id&&t.status!=='cancelada'),gs=allGoals.filter(g=>g.product_id===p.id),rs=allResults.filter(r=>r.product_id===p.id),completed=ts.filter(t=>t.status==='concluida').length;
      return `<section class="card material-product-card"><div class="between"><span class="material-symbol">${icon('flask-conical')}</span>${badge(materialStages.find(([key])=>key===p.stage)?.[1]||'Pesquisa',p.stage==='finalizado'?'ok':'blue')}</div><h2>${e(p.name)}</h2><b>${e(trlLabel(p))}</b><p class="muted">${e(p.description||'Espaço dedicado a este produto, do planejamento aos resultados.')}</p><div class="between tiny"><span>Atividades concluídas</span><b>${completed} / ${ts.length}</b></div>${progress(completed,ts.length)}<p class="tiny muted">${gs.length} metas · ${rs.length} resultados registrados</p><div class="workflow-actions">${button('Abrir produto '+icon('arrow-up-right'),'material-open',itemRef(p.id),'small primary')}${button('Editar','material-edit-product',itemRef(p.id),'small')}</div></section>`;
    }).join('')||empty('Nenhum produto cadastrado','Crie o primeiro produto para organizar seu desenvolvimento.')}</div>`;
    const queue=tasks.filter(openTask).sort(compareWorkTasks);
    body+=card('Próximas atividades',workflowList(queue.map(t=>({id:t.id,title:t.title,action:'task-detail',note:[t.product_name,label(t.priority),human(t.due_date),label(t.status)].join(' · ')})),'Nenhuma atividade pendente'), 'Prioridade, prazo e data de execução. A etapa do produto é atualizada separadamente das atividades.',button('Nova atividade','material-new-task','','small'));
    state.exports=products.filter(p=>!selected||p.id===selected).map(p=>({Produto:p.name,Etapa:materialStages.find(([k])=>k===p.stage)?.[1]}));
  }else if(tab==='experiments'){
    body=card("Roteiros de experimentos",table(experiments,[
      {title:"Experimento",key:"title",render:x=>button(e(x.title),"material-experiment-detail",itemRef(x.id),"text-link")},
      {title:"Material",key:"product_name"},{title:"Versão",key:"version"},{title:"Autor",key:"person_name"},
    ],"material-experiments"),"Roteiros e versões usados nos ensaios.",button("Novo roteiro","material-experiment-new","","primary"));
  }else if(tab==='work'){
    const total=worklogs.reduce((n,r)=>n+Number(r.work_minutes||0),0);
    body=card("Trabalho de desenvolvimento",table(worklogs,[
      {title:"Material",key:"product_name"},{title:"Atividade",key:"task_title"},{title:"Pessoa",key:"person_name"},
      {title:"Início do trabalho",render:r=>dateTime(r.work_started_at)},
      {title:"Fim do trabalho",render:r=>dateTime(r.work_ended_at)},
      {title:"Tempo dedicado",render:r=>workDuration(r.work_minutes)},
      {title:"Trabalho realizado",key:"note"},
    ],"material-worklogs"),"Total dedicado · "+workDuration(total),button("Registrar período","material-work-new","","primary"));
  }else if(tab==='goals'){
    body=`<div class="toolbar"><p class="muted tiny">As metas são definidas pela Gestão. O progresso soma os resultados vinculados à mesma pessoa, produto e período.</p>${admin()?button(icon('plus')+'Nova meta','material-new-goal','','primary'):''}</div><div class="grid3 material-goals">${goals.map(g=>`<section class="card goal-card"><div class="between">${badge(g.product_name,'blue')}${badge(g.done>=g.target?'Atingida':today()>g.end_date?'Prazo encerrado':'Em andamento',g.done>=g.target?'ok':today()>g.end_date?'warn':'blue')}</div><h2>${e(g.title)}</h2><p class="goal-value"><strong>${fmt(g.done)}</strong> de ${fmt(g.target)} ${e(g.unit)}</p>${progress(g.done,g.target)}<p class="tiny muted">${e(g.person_name)} · ${human(g.start_date)} a ${human(g.end_date)}</p><div class="workflow-actions">${button('Registrar resultado','material-new-result',`data-product="${e(g.product_id)}" data-goal="${e(g.id)}"`,'small primary')}${admin()?button('Editar meta','material-edit-goal',itemRef(g.id),'small'):''}</div></section>`).join('')||empty('Nenhuma meta definida','A Gestão pode cadastrar uma meta para cada produto e período.','target')}</div>`;
    state.exports=goals.map(g=>({Produto:g.product_name,Meta:g.title,Pessoa:g.person_name,Realizado:g.done,Alvo:g.target,Unidade:g.unit,Início:g.start_date,Prazo:g.end_date}));
  }else if(tab==='tasks'){
    const list=tasks.filter(t=>!state.materialStatus||t.status===state.materialStatus).sort(compareWorkTasks);
    body=`<div class="material-controls">${sel('Status','material-status',[['','Todos os status'],...['pendente','em_andamento','bloqueada','concluida','cancelada'].map(x=>[x,label(x)])],state.materialStatus||'','id="material-status"')}${button(icon('plus')+'Nova atividade','material-new-task','','primary')}</div>`;
    body+=card('Atividades por produto',table(list,[
      {title:'Atividade',key:'title',render:t=>button(e(t.title),'task-detail',itemRef(t.id),'text-link')},
      {title:'Produto',key:'product_name'},{title:'Responsável',key:'assignee_name'},
      {title:'Prioridade',key:'priority',render:t=>priority(t.priority)},
      {title:'Execução',key:'planned_date',render:t=>human(t.planned_date)},
      {title:'Prazo',key:'due_date',render:t=>human(t.due_date)},
      {title:'Status',key:'status',render:t=>badge(t.status)},
      {title:'Evidências',render:t=>button((t.evidence_log?.length||0)+' registros','task-detail',itemRef(t.id),'text-link')},
    ],'material-tasks',true,false),'Ordem por prioridade, prazo e execução. Abra a atividade para registrar a realização com evidências.');
  }else{
    const entries=periodRows(results,'occurred_on').sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on)||b.created_at.localeCompare(a.created_at));
    body=periodBar()+`<div class="toolbar">${button(icon('plus')+'Registrar resultado','material-new-result','','primary')}</div>`;
    body+=card('Resultados de desenvolvimento',table(entries,[
      {title:'Data',key:'occurred_on',render:r=>human(r.occurred_on)},
      {title:'Produto',key:'product_name'},
      {title:'Resultado',key:'title',render:r=>button(e(r.title),'material-result-detail',itemRef(r.id),'text-link')},
      {title:'Meta vinculada',key:'goal_title'},
      {title:'Contribuição',render:r=>r.goal_id?`${fmt(r.quantity)} ${e(r.unit)}`:'Registro qualitativo'},
      {title:'Responsável',key:'person_name'},
      {title:'Evidências',render:r=>button('Abrir evidências','material-result-detail',itemRef(r.id),'text-link')},
    ],'material-results'),'Cada resultado preserva produto, responsável, data e evidência. Registrar um resultado não conclui a atividade automaticamente.');
    const evidenceTasks=tasks.filter(t=>t.evidence_log?.length);
    body+=card('Evidências das atividades',workflowList(evidenceTasks.map(t=>({id:t.id,title:t.title,action:'task-detail',note:`${t.product_name} · ${t.evidence_log.length} registros de evidência`})), 'Nenhuma evidência de atividade registrada'), 'Histórico completo das atividades do produto, independente do período dos resultados.');
  }
  return header+controls+context+body;
}
async function materialProductForm(id){
  const old=id?await api('/api/material-products/'+id):null,v=old||{stage:'ideacao'};
  formModal(old?'Editar produto':'Novo produto',sf('Nome do produto','name',v.name,'text','required maxlength="120"')+
    sel('Etapa de desenvolvimento','stage',materialStages,v.stage)+text('Objetivo e características','description',v.description,'maxlength="3000"'),
    b=>api('/api/material-products'+(id?'/'+id:''),id?'PATCH':'POST',b),{submit:old?'Salvar produto':'Criar produto'});
}
async function materialGoalForm(id){
  const products=await api('/api/material-products'),old=id?await api('/api/material-goals/'+id):null;
  const v=old||{product_id:state.materialProduct||products[0]?.id,user_id:materialPerson(),start_date:today(),end_date:monthEnd(today())};
  formModal(old?'Editar meta do produto':'Nova meta do produto',sel('Produto','product_id',products.map(x=>[x.id,x.name]),v.product_id,'required')+
    sel('Responsável','user_id',state.users.filter(x=>x.active&&x.role==='desenvolvimento').map(x=>[x.id,x.name]),v.user_id,'required')+
    sf('Título da meta','title',v.title,'text','required maxlength="200"')+
    sf('Quantidade alvo','target',v.target,'number','required min="0.01" step="any"')+sf('Unidade (ex.: protótipos, ensaios)','unit',v.unit,'text','required maxlength="60"')+
    date('Início','start_date',v.start_date,'required')+date('Prazo','end_date',v.end_date,'required'),
    b=>api('/api/material-goals'+(id?'/'+id:''),id?'PATCH':'POST',b),{submit:old?'Salvar meta':'Criar meta'});
}
let materialResultOptions={goals:[],tasks:[]};
function syncMaterialResultOptions(){
  const product=$('#material-result-product')?.value,user=$('#material-result-user')?.value||state.me.id;
  const goal=$('#material-result-goal'),task=$('#material-result-task');
  if(goal){goal.innerHTML=options([['','Sem meta vinculada'],...materialResultOptions.goals.filter(g=>g.product_id===product&&g.user_id===user).map(g=>[g.id,g.title+' · '+g.unit])],goal.value)}
  if(task){task.innerHTML=options([['','Sem atividade vinculada'],...materialResultOptions.tasks.filter(t=>t.product_id===product&&t.assigned_to===user).map(t=>[t.id,t.title])],task.value)}
  const experiment=$('#material-result-experiment');
  if(experiment)experiment.innerHTML=options([['','Sem roteiro vinculado'],...(materialResultOptions.experiments||[]).filter(x=>x.product_id===product).map(x=>[x.id,x.title+' · v'+x.version])],experiment.value);
  const quantity=$('#material-result-quantity');if(quantity){quantity.value='';quantity.required=!!goal?.value;quantity.disabled=!goal?.value;}
}
async function materialResultForm(productId,goalId,experimentId){
  const [products,goals,tasks,experiments]=await Promise.all([api('/api/material-products'),api('/api/material-goals'),api('/api/tasks'),api('/api/material-experiments')]);
  materialResultOptions={goals,tasks,experiments};
  const goal=goals.find(g=>g.id===goalId),product=productId||goal?.product_id||state.materialProduct||products[0]?.id,user=goal?.user_id||materialPerson();
  const relevant=goals.filter(g=>g.product_id===product&&g.user_id===user),related=tasks.filter(t=>t.product_id===product&&t.assigned_to===user);
  formModal('Registrar resultado de desenvolvimento',sel('Produto','product_id',products.map(p=>[p.id,p.name]),product,'required id="material-result-product"')+
    (admin()?sel('Responsável pelo resultado','user_id',state.users.filter(x=>x.active&&x.role==='desenvolvimento').map(x=>[x.id,x.name]),user,'required id="material-result-user"'):'')+
    sel('Roteiro utilizado (opcional)','experiment_id',[['','Sem roteiro vinculado'],...experiments.filter(x=>x.product_id===product).map(x=>[x.id,x.title+' · v'+x.version])],experimentId||'','id="material-result-experiment"')+
    date('Data do resultado','occurred_on',today(),'required')+sf('Título do resultado','title','','text','required maxlength="200"')+
    sel('Meta vinculada (opcional)','goal_id',[['','Sem meta vinculada'],...relevant.map(g=>[g.id,g.title+' · '+g.unit])],goalId||'','id="material-result-goal"')+
    sf('Quantidade realizada para a meta','quantity','','number',`min="0.01" step="any" id="material-result-quantity" ${goalId?'required':'disabled'}`)+
    sel('Atividade relacionada (opcional)','task_id',[['','Sem atividade vinculada'],...related.map(t=>[t.id,t.title])],'','id="material-result-task"')+
    text('Método, versão ou identificação do ensaio','method','','maxlength="3000"')+
    text('Resultado observado','outcome','','required maxlength="3000"')+text('Próximos passos','next_steps','','maxlength="3000"')+
    '<div class="notice full">Inclua pelo menos uma evidência. A contribuição para a meta exige data dentro do período e a mesma unidade da meta.</div>'+
    text('Descrição da evidência','evidence_note','','maxlength="3000"')+sf('Link da evidência','evidence_url','','url')+
    '<label>Arquivo da evidência · até 1 MB<input type="file" id="material-evidence-file"></label>',
    async b=>{const file=$('#material-evidence-file').files[0];if(file?.size>1048576)throw Error('Use um arquivo de até 1 MB ou informe um link.');
      const evidence={note:b.evidence_note,url:b.evidence_url};if(file?.size)evidence.file={name:file.name,data:(await readFile(file)).split(',')[1]};
      delete b.evidence_note;delete b.evidence_url;await api('/api/material-results','POST',{...b,evidence});
    },{submit:'Salvar resultado e evidência'});
}
async function materialResultDetail(id){
  const r=await api('/api/material-results/'+id),ev=r.evidence||{};
  dialog(r.title,`<div class="detail-summary">${badge(r.product_name,'blue')}${badge(human(r.occurred_on))}${badge(r.person_name)}</div>
    <div class="workflow-stack"><div class="workflow-item"><b>Resultado observado</b><p>${e(r.outcome)}</p></div>
    ${r.protocol_snapshot?'<details><summary>Roteiro utilizado · '+e(r.protocol_snapshot.title)+' · v'+r.protocol_snapshot.version+'</summary>'+['objective','hypothesis','materials','procedure','success_criteria'].map(k=>'<p class="lead-notes">'+e(r.protocol_snapshot[k])+'</p>').join('')+'</details>':''}
    ${r.method?`<div class="workflow-item"><b>Método e identificação</b><p>${e(r.method)}</p></div>`:''}
    ${r.goal_id?`<div class="workflow-item"><b>${e(r.goal_title)}</b><p>Contribuição registrada · ${fmt(r.quantity)} ${e(r.unit)}</p></div>`:''}
    ${r.task_id?`<div class="workflow-item">${button('Atividade · '+e(r.task_title),'task-detail',itemRef(r.task_id),'text-link')}</div>`:''}
    ${r.next_steps?`<div class="workflow-item"><b>Próximos passos</b><p>${e(r.next_steps)}</p></div>`:''}
    <div class="workflow-item"><b>Evidências</b>${ev.note?`<p>${e(ev.note)}</p>`:''}<div class="workflow-actions">${externalLink(ev.url,'Abrir link da evidência')}${ev.file?button(icon('download')+' '+e(ev.file.name),'material-download',itemRef(r.id),'small'):''}</div></div></div>
    <p class="tiny muted">Registrado por ${e(r.author)} em ${dateTime(r.created_at)}. O histórico deste registro é preservado.</p>`);
}
async function materialDownload(id){
  const result=await api('/api/material-results/'+id),file=result.evidence?.file;if(!file)return;
  const blob=new Blob([Uint8Array.from(atob(file.data),c=>c.charCodeAt(0))],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const PAGES = {
  dashboard,
  myday,
  tasks: tasksPage,
  goals: goalsPage,
  crm: crmPage,
  commercial: commercialPage,
  finance: financePage,
  "personal-finance": personalFinancePage,
  marketing: marketingPage,
  tech: techPage,
  processes: processPage,
  people: peoplePage,
  materials: materialsPage,
};
let submitModal = null,
  modalAfterSave = true;
function dialog(title, html) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  submitModal = null;
  if (!$("#editor").open) $("#editor").showModal();
  icons();
}
function formModal(title, fields, save, opts = {}) {
  dialog(
    title,
    `<form id="operation-form"><div class="form-grid">${fields}</div><p class="form-error" id="form-error" role="alert"></p><div class="form-actions">${button("Cancelar", "close-dialog")}${opts.remove ? button(icon("trash-2") + "Excluir", opts.remove, `data-id="${opts.id}"`, "danger") : ""}<button class="primary" type="submit">${e(opts.submit || "Salvar alterações")} ${icon("arrow-right")}</button></div></form>`,
  );
  submitModal = save;
  modalAfterSave = opts.refresh !== false;
  const first = $("input,select,textarea", $("#modal-body"));
  first?.focus();
}
function localDatetime(v) {
  if (!v) return "";
  const x = new Date(v);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}
const datetimeField = (title, name, v = "") =>
  sf(title, name, localDatetime(v), "datetime-local");
const normalizeTimes = (b) => {
  for (const k of ["next_contact_at", "meeting_at", "proposal_sent_at"])
    if (k in b) b[k] = b[k] ? new Date(b[k]).toISOString() : null;
  return b;
};
const parseChecklist = (value, old = []) =>
  value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((title, i) => ({
      id: old.find((x) => x.title === title)?.id || String(Date.now() + i),
      title,
      done: old.find((x) => x.title === title)?.done || false,
    }));
const payAmount = cents => cents ? (cents / 100).toFixed(2) : "";
function payTermFields(terms) {
  return `<fieldset class="pay-fields">
    <legend>Remuneração da atividade</legend>
    <div class="grid2">
      ${sf("Valor base (R$)", "pay_base", payAmount(terms?.base_cents), "number", 'min="0" step="0.01"')}
      ${sf("Bonificação prevista (R$)", "pay_bonus", payAmount(terms?.bonus_cents), "number", 'min="0" step="0.01"')}
    </div>
    ${text("Critério de qualidade para aprovar a entrega", "pay_quality", terms?.quality || "", 'maxlength="3000"')}
    ${text("Resultado esperado para bonificar", "pay_result", terms?.result || "", 'maxlength="3000"')}
  </fieldset>`;
}
function taskPayStatus(task) {
  if (task.pay_review?.status === "approved") return "Qualidade aprovada";
  if (task.status === "cancelada") return "Cancelada";
  if (task.pay_review?.status === "changes") return "Ajustes solicitados";
  if (task.status === "concluida") return "Aguardando avaliação";
  return "Aguardando entrega";
}
function taskPaySummary(task) {
  const terms = task.pay_terms;
  if (!terms) return "";
  const review = task.pay_review;
  const bonus = task.bonus_review;
  const eligible = task.source !== "content_reel" && managesTaskPay() && task.status === "concluida" && task.evidence_log?.length;
  const action = (title, value) => button(title, "task-pay-review", itemRef(task.id) + ` data-value="${value}"`, "small");
  return `<div class="section-label">REMUNERAÇÃO E QUALIDADE</div>
    <div class="workflow-stack">
      <div class="workflow-item">${badge(taskPayStatus(task), review?.status === "approved" ? "ok" : "warn")}
        <p>Valor base ${brl(terms.base_cents)}${terms.bonus_cents ? " · Bonificação prevista " + brl(terms.bonus_cents) : ""}</p>
        <p><b>Critério de qualidade</b> · ${e(terms.quality)}</p>
        ${terms.result ? `<p><b>Resultado esperado</b> · ${e(terms.result)}</p>` : ""}
      </div>
      ${(task.pay_review_log || []).slice().reverse().map(item => `<div class="workflow-item">
        <b>${e({ changes: "Ajustes solicitados", approve: "Qualidade aprovada", bonus: "Bonificação aprovada" }[item.decision])}</b>
        <small class="muted"> · ${e(item.author)} · ${dateTime(item.reviewed_at)}</small>
        <p>${e(item.feedback)}</p>
        ${item.metric ? `<p>${e(item.metric)} · ${e(item.measurement)}</p><p>${e(item.result)}</p>${externalLink(item.result_url, "Abrir comprovação")}` : ""}
      </div>`).join("")}
    </div>
    ${eligible ? `<div class="workflow-actions">${review?.status !== "approved"
      ? action("Solicitar ajustes", "changes") + action("Aprovar qualidade", "approve")
      : terms.bonus_cents && !bonus ? action("Validar resultado e bonificar", "bonus") : ""}</div>` : ""}`;
}
async function taskPayReview(id, decision) {
  const task = await api("/api/tasks/" + id);
  const terms = task.pay_terms;
  if (!terms) return;
  const changes = decision === "changes";
  const bonus = decision === "bonus";
  const title = changes ? "Solicitar ajustes" : bonus ? "Validar resultado e bonificar" : "Aprovar qualidade da entrega";
  const reported = [...(task.evidence_log || [])].reverse().find(item => item.result)?.result;
  formModal(title,
    `<div class="notice full"><b>${e(task.title)}</b><p>${e(terms.quality)}</p></div>` +
    text(changes ? "Ajustes necessários" : "Parecer da avaliação", "feedback", "", 'required maxlength="3000"') +
    (!changes && terms.bonus_cents ? `<fieldset class="pay-fields">
      <legend>Comprovação de resultado</legend>
      <p class="tiny muted">Resultado esperado · ${e(terms.result)}</p>
      ${reported ? `<p class="tiny">Resultado informado · ${e(reported)}</p>` : ""}
      ${bonus ? "" : '<label class="checklist-row"><input type="checkbox" name="award_bonus" value="yes"> Aprovar bonificação nesta avaliação</label>'}
      ${sf("Indicador", "metric", "", "text", bonus ? "required" : "")}
      ${sf("Resultado medido", "measurement", "", "text", bonus ? "required" : "")}
      ${text("Como o resultado foi comprovado", "result", "", bonus ? "required" : "")}
      ${sf("Link da comprovação (opcional)", "result_url", "", "url")}
    </fieldset>` : ""),
    b => api("/api/tasks/" + id + "/review", "POST", { ...b, decision }),
    { submit: title });
}
function followerReadingForm() {
  const people = state.users.filter(user => user.active && user.role === "marketing");
  formModal("Validar seguidores do Instagram",
    startupsField() +
    sel("Social Media", "assigned_to", people.map(user => [user.id, user.name]), people[0]?.id, "required") +
    sf("Conta do Instagram (@usuário)", "account", "", "text", 'required maxlength="31"') +
    sf("Total atual de seguidores", "followers", "", "number", 'required min="0" max="1000000000" step="1"') +
    sf("Link da evidência (opcional)", "evidence_url", "", "url") +
    '<p class="notice full">A primeira medição de cada conta define a base. A cada 1.000 novos seguidores acumulados, o extrato registra um bônus de R$ 500.</p>',
    body => api("/api/follower-readings", "POST", body),
    { submit: "Validar contagem" },
  );
}

function followerHistory(rows, manager) {
  return card("Crescimento de seguidores", table(rows, [
    { title: "Conta", key: "account", render: row => "@" + e(row.account) },
    { title: "Startup", key: "startup_name" },
    ...(manager ? [{ title: "Social Media", key: "assignee_name" }] : []),
    { title: "Total validado", key: "followers", render: row => fmt(row.followers) },
    { title: "Novos seguidores", key: "growth", render: row => row.baseline ? "Contagem inicial" : fmt(row.growth) },
    { title: "Validação", key: "approved_at", render: row => dateTime(row.approved_at) },
    { title: "Evidência", render: row => externalLink(row.evidence_url, "Abrir evidência") || "—" },
  ], "follower-history", false, false),
  "R$ 500 por bloco de 1.000 novos seguidores. O saldo de seguidores acumula entre meses.",
  manager ? button("Validar contagem", "new-follower-reading", "", "primary small") : "");
}

async function personalFinancePage() {
  const manager = managesTaskPay();
  const showFollowers = manager || state.me.role === "marketing";
  const [{ entries, pending }, readings] = await Promise.all([
    load("task-payments"), showFollowers ? load("follower-readings") : [],
  ]);
  const month = state.payMonth || today().slice(0, 7);
  const inPerson = row => !manager || !state.payPerson || String(row.assigned_to) === state.payPerson;
  const approved = entries.filter(x => x.month === month && inPerson(x));
  const waiting = pending.filter(inPerson);
  const base = sum(approved.filter(x => x.kind === "base"), "cents");
  const bonus = sum(approved.filter(x => x.kind === "bonus"), "cents");
  const followersBonus = sum(approved.filter(x => x.kind === "followers"), "cents");
  const paymentType = x => ({base:"Valor base", bonus:"Bônus por atividade", followers:"Bônus por seguidores"})[x.kind];
  const taskButton = x => x.task_id
    ? button(e(x.title), "task-detail", itemRef(x.task_id), "text-link")
    : e(x.title) + `<small class="table-sub">${fmt(x.follower_count)} seguidores</small>`;
  const controls = `<div class="daily-controls">
    ${sf("Mês de competência", "pay-month", month, "month", 'id="pay-month"')}
    ${manager ? sel("Pessoa", "pay-person", [["", "Toda a equipe"],
      ...state.users.filter(x => taskPayRoles.includes(x.role) ||
        [...entries, ...pending].some(row => row.assigned_to === x.id)).map(x => [x.id, x.name])],
      state.payPerson, 'id="pay-person"') : ""}
  </div>`;
  const statements = card("Extrato de valores aprovados", table(approved, [
    { title: "Registro", key: "title", render: taskButton },
    ...(manager ? [{ title: "Pessoa", key: "assignee_name" }] : []),
    { title: "Startup", key: "startup_name" },
    { title: "Tipo", key: "kind", render: paymentType },
    { title: "Aprovação", key: "approved_at", render: x => dateTime(x.approved_at) },
    { title: "Valor (R$)", key: "cents", render: x => brl(x.cents) },
  ], "pay-statement"), "A competência é o mês da aprovação. O extrato soma os valores a receber.");
  const waitingList = card("Atividades sem aprovação", workflowList(waiting.map(x => ({
    id: x.id, title: x.title, action: "task-detail",
    note: [x.startup_name, manager && x.assignee_name, taskPayStatus(x), "Valor previsto " + brl(x.pay_terms.base_cents)].filter(Boolean).join(" · "),
  })), "Nenhuma atividade aguardando entrega ou avaliação"), "Pendências atuais de todos os meses, fora do total a receber.");
  state.exports = approved.map(x => ({
    Mês: x.month, Pessoa: x.assignee_name, Startup: x.startup_name, Atividade: x.title,
    Tipo: paymentType(x), Valor_R$: (x.cents / 100).toFixed(2).replace(".", ","),
  }));
  return intro(manager ? "Remuneração da equipe" : "Finanças pessoais",
    manager ? "Acompanhe as entregas a avaliar e o total aprovado por pessoa." : "Consulte os valores aprovados das suas atividades.") +
    controls + `<div class="kpis">
      ${kpi("Valor base aprovado", brl(base), "Entregas com qualidade aprovada", "circle-check")}
      ${kpi("Bonificações aprovadas", brl(bonus), "Resultados validados", "award")}
      ${kpi("Total a receber", brl(base + bonus + followersBonus), longMonth(month), "wallet")}
      ${showFollowers ? kpi("Bônus por seguidores", brl(followersBonus), "Aprovado no mês", "award") : ""}
      ${kpi("Atividades pendentes", waiting.length, "Aguardando entrega ou avaliação", "clock-3")}
    </div>` + statements + (showFollowers ? followerHistory(readings.filter(inPerson), manager) : "") + waitingList;
}

async function taskForm(record = null, template = null) {
  const old = record ? await api("/api/tasks/" + record) : null;
  if (old?.source === "content_reel") return openReelContent(old);
  if (!state.startups.length || (old && !admin())) return;
  const products=materialAccess()?await api("/api/material-products"):[];
  const person = state.section === "myday"
    ? state.users.find(user => user.active && String(user.id) === state.workPerson)
    : null;
  const defaultStartup = template?.startup_id || (state.section === "materials" ? MATERIAL_SPACE : "") || state.startup ||
    (person && state.memberships.find(m => String(m.user_id) === String(person.id))?.startup_id) ||
    state.startups[0]?.id;
  const owner = person && assignedPeople(defaultStartup).some(user => user.id === person.id)
    ? person.id : state.section === "materials" ? (assignedPeople(defaultStartup).find(x=>x.role==="desenvolvimento")?.id||state.me.id) : state.me.id;
  const v = old || {
    product_id: state.materialProduct || "",
    title: template?.title || "",
    startup_id: defaultStartup,
    assigned_to: owner,
    priority: "media",
    status: "pendente",
    planned_date: state.section === "myday" && state.workDate ? state.workDate : today(),
    checklist: (template?.steps || []).map((title, i) => ({
      id: String(i + 1),
      title,
      done: false,
    })),
  };
  formModal(
    old ? "Editar atividade" : "Nova atividade",
    startupsField(v.startup_id) + materialTaskField(products,v.product_id,v.startup_id) +
      (admin() ? ownerField(v.assigned_to, v.startup_id)
        : `<div class="notice full">Responsável · ${e(state.me.name)}</div>`) +
      sf("Título", "title", v.title, "text", 'required maxlength="200"') +
      sel(
        "Prioridade",
        "priority",
        ["urgente", "alta", "media", "baixa"].map((x) => [x, label(x)]),
        v.priority,
      ) +
      (admin() && v.pay_review?.status !== "approved" ? sel("Status", "status",
        ["pendente", "em_andamento", "bloqueada", "cancelada", ...(v.status === "concluida" ? ["concluida"] : [])]
          .map(x => [x, label(x)]), v.status) : "") +
      (!old&&materialAccess()?`<fieldset id="material-work-fields" class="pay-fields" ${v.startup_id===MATERIAL_SPACE?"":"hidden disabled"}><legend>Trabalho já realizado (opcional)</legend>${workFields()}</fieldset>`:"") +
      date("Data de execução", "planned_date", v.planned_date) +
      date("Prazo de entrega", "due_date", v.due_date) +
      text("Descrição detalhada", "description", v.description || "") +
      text(
        "Checklist · uma etapa por linha",
        "checklist",
        (v.checklist || []).map((x) => x.title).join("\n"),
      ) + (managesTaskPay() && old?.source !== "story_repost" && (!old || (old.creator_id === "1" && !old.evidence_log?.length && !old.pay_review)) ? payTermFields(v.pay_terms) : ""),
    async (b) => {
      if(b.startup_id!==MATERIAL_SPACE)delete b.product_id;
      normalizeWork(b);
      b.checklist = parseChecklist(b.checklist, v.checklist);
      await api(
        "/api/tasks" + (old ? "/" + old.id : ""),
        old ? "PATCH" : "POST",
        b,
      );
    },
    {
      remove: old && !(old.pay_terms && old.evidence_log?.length) ? "task-delete" : null,
      id: old?.id,
      submit: old ? "Salvar atividade" : "Criar atividade",
    },
  );
}
function historyHTML(events) {
  return events.length
    ? events
        .map(
          (h) =>
            `<div class="history-item"><b>${e(h.author || h.person_name || "Equipe")}</b> · ${e(h.action || h.event_type)}<div class="tiny">${e(h.note || "")}</div>${
              h.changes && Object.keys(h.changes).length
                ? `<div class="history-changes">${e(
                    Object.entries(h.changes)
                      .map(
                        ([k, v]) =>
                          `${label(k)}: ${typeof v === "object" ? JSON.stringify(v) : v}`,
                      )
                      .join("\n"),
                  )}</div>`
                : ""
            }<small>${dateTime(h.created_at)}</small></div>`,
        )
        .join("")
    : empty(
        "Nenhuma alteração registrada",
        "O histórico passa a registrar as operações desta versão.",
        "history",
      );
}
function taskEvidence(task) {
  const entries = (task.evidence_log || []).slice().reverse();
  const items = entries.map(entry => {
    const file = (task.attachments || []).find(x => x.id === entry.attachment_id);
    return `<div class="workflow-item">
      <b>${e(entry.author)}</b> <small class="muted">${dateTime(entry.created_at)}</small>
      ${entry.note ? `<p class="detail-description">${e(entry.note)}</p>` : ""}
      ${entry.result ? `<p><b>Resultado informado</b> · ${e(entry.result)}</p>` : ""}
      <div class="workflow-actions">${externalLink(entry.url, "Abrir link da evidência")}
        ${file ? `<a href="/api/tasks/${e(task.id)}/attachments/${e(file.id)}" download="${e(file.name)}" >${icon("paperclip")} ${e(file.name)}</a>` : ""}</div>
    </div>`;
  }).join("");
  return `<div class="section-label">EVIDÊNCIAS DA ATIVIDADE</div>
    <div class="workflow-stack">${items || '<p class="tiny muted">Nenhuma evidência registrada.</p>'}</div>
    ${task.status !== "cancelada" ? `<div class="workflow-actions">${button(task.status === "concluida"
      ? "Adicionar evidência" : "Concluir com evidência", "task-status",
      itemRef(task.id) + ' data-value="concluida"', "small primary")}</div>` : ""}`;
}

const usesPublicationEvidence = task => String(task.assigned_to) === "4";
const latestPublicationEvidence = task => (task.evidence_log || []).findLast(entry => entry.published_on && entry.url);

function publicationTaskDetail(task) {
  const publication = latestPublicationEvidence(task);
  const accepted = task.status === "concluida";
  const contractReel = String(task.id).startsWith("annike-cabratech-2026-reel-");
  const publicationInfo = publication
    ? `<p><b>Publicação em ${human(publication.published_on)}</b></p><p>${externalLink(publication.url, "Abrir publicação")}</p>`
    : accepted ? '<p class="muted">Data e link da publicação ainda não registrados.</p>' : "";
  const action = publication ? "Atualizar publicação" : accepted ? "Registrar publicação" : "Concluir entrega";
  dialog(task.title,
    `<div class="detail-summary">${badge(task.status)}${task.due_date ? badge("Prazo " + human(task.due_date)) : ""}</div>
    ${!contractReel && task.description ? `<p class="detail-description">${e(task.description)}</p>` : ""}
    ${publicationInfo}
    ${taskPaySummary(task)}
    <div class="form-actions">
      ${admin() ? button("Editar atividade", "task-edit", itemRef(task.id)) : ""}
      ${task.status !== "cancelada"
        ? button(action, "task-status", itemRef(task.id) + ' data-value="concluida"', "primary") : ""}
    </div>`);
}

async function setTaskStatus(id, status) {
  const linked = await api("/api/tasks/" + id);
  if (linked.source === "content_reel") return openReelContent(linked);
  if (status !== "concluida") {
    await api("/api/tasks/" + id, "PATCH", { status });
    toast("Atividade atualizada");
    return render();
  }
  const task = linked;
  const alreadyDone = task.status === "concluida";
  if (usesPublicationEvidence(task)) {
    const publication = latestPublicationEvidence(task);
    return formModal(alreadyDone ? "Registrar publicação" : "Concluir entrega",
      date("Data da publicação", "published_on", publication?.published_on || "", `required max="${today()}"`) +
      sf("Link da publicação", "url", publication?.url || "", "url", 'required maxlength="3000"'),
      ({ published_on, url }) => api("/api/tasks/" + id, "PATCH", {
        status, evidence: { published_on, url },
      }),
      { submit: alreadyDone ? "Salvar publicação" : "Concluir entrega" },
    );
  }
  return formModal(alreadyDone ? "Adicionar evidência" : "Concluir atividade",
    `<div class="notice full"><b>${e(task.title)}</b><br>Preencha pelo menos uma forma de evidência.</div>` +
    text("O que foi realizado", "note", "", 'maxlength="3000"') +
    sf("Link da evidência", "url", "", "url") +
    (task.pay_terms?.bonus_cents ? text("Resultado alcançado (se houver)", "result", "", 'maxlength="3000"') : "") +
    '<label>Arquivo da evidência · até 1 MB<input id="task-evidence-file" type="file"></label>',
    async ({ note, url, result }) => {
      const file = $("#task-evidence-file").files[0];
      if (file?.size > 1048576) throw Error("O arquivo da evidência deve ter até 1 MB. Para arquivos maiores, use um link.");
      const evidence = { note, url, result };
      if (file?.size) evidence.file = { name: file.name, data: (await readFile(file)).split(",")[1] };
      await api("/api/tasks/" + id, "PATCH", { status, evidence });
    },
    { submit: alreadyDone ? "Salvar evidência" : "Concluir atividade" },
  );
}

async function taskDetail(id) {
  const t = await api("/api/tasks/" + id);
  if (t.source === "content_reel") return openReelContent(t);
  if (usesPublicationEvidence(t)) return publicationTaskDetail(t);
  let workSummary="";
  if(t.product_id&&materialAccess()){
    const logs=(await api("/api/material-worklogs")).filter(r=>r.task_id===t.id);
    const rows=workLogRows([t],logs);
    workSummary=card("Tempo dedicado",rows.length?rows.map(r=>'<p>'+dateTime(r.work_started_at)+' — '+dateTime(r.work_ended_at)+' · '+workDuration(r.work_minutes)+'</p>').join(""):'<p>Nenhum período registrado.</p>');
  }
  dialog(
    t.title,
    `<div class="detail-summary">${badge(startupName(t.startup_id), "blue")}${t.product_name?badge(t.product_name,"blue"):""}${badge(t.source === "story_repost" ? "Repostagem · sem remuneração" : t.source === "propria" ? "Atividade própria" : "Definida pela gestão")}${priority(t.priority)}${badge(t.status)}${t.planned_date ? badge("Execução " + human(t.planned_date)) : ""}${t.due_date ? badge("Prazo " + human(t.due_date)) : ""}</div><p class="detail-description">${e(t.description || "Sem descrição adicional.")}</p>${externalLink(t.source_url, "Abrir Reel original")}${workSummary}${taskPaySummary(t)}${taskEvidence(t)}<div class="section-label">CHECKLIST · ${(t.checklist || []).filter((x) => x.done).length}/${(t.checklist || []).length}</div>${(t.checklist || []).map((x) => `<label class="checklist-row ${x.done ? "done" : ""}"><input type="checkbox" data-task-check="${t.id}" data-check-id="${e(x.id)}" ${x.done ? "checked" : ""}><span>${e(x.title)}</span></label>`).join("") || '<div class="tiny muted">Nenhuma etapa cadastrada.</div>'}<div class="section-label">COMENTÁRIOS</div>${(t.comments || []).map((x) => `<div class="comment">${e(x.content)}<small>${e(x.author)} · ${dateTime(x.created_at)}</small></div>`).join("")}<form id="comment-form" data-id="${t.id}"><label>Adicionar comentário<textarea name="content" required maxlength="3000" placeholder="Registre uma atualização para a equipe…"></textarea></label><div class="form-actions"><button class="primary small">Publicar comentário</button></div></form><div class="section-label">ANEXOS</div>${(t.attachments || []).filter(a => !a.evidence).map((a) => `<div class="attachment"><a href="/api/tasks/${t.id}/attachments/${a.id}" download="${e(a.name)}" >${icon("paperclip")} ${e(a.name)}</a><span class="muted tiny">${fmt(Math.ceil(a.size_bytes / 1024))} KB</span>${admin() ? button(icon("x"), "attachment-delete", `data-id="${a.id}" data-task="${t.id}" aria-label="Remover anexo"`, "icon-btn") : ""}</div>`).join("") || '<p class="tiny muted">Nenhum anexo nesta atividade.</p>'}<label>Anexar arquivo · até 5 MB<input class="file-input" type="file" data-task-upload="${t.id}"></label><div class="section-label">HISTÓRICO DE ALTERAÇÕES</div>${historyHTML(t.events || [])}<div class="form-actions">${button("Fechar", "close-dialog")}${admin() ? button(icon("pencil") + "Editar atividade", "task-edit", `data-id="${t.id}"`, "primary") : ""}</div>`,
  );
}
async function leadForm(v = null) {
  const campaigns = await load("campaign-options");
  const old = v,
    base = v || {
      startup_id: state.startup || state.startups[0]?.id,
      owner_id: state.me.id,
    };
  const f =
    (old
      ? sel(
          "Startup",
          "startup_id",
          [[base.startup_id, startupName(base.startup_id)]],
          base.startup_id,
          "disabled",
        )
      : startupsField(base.startup_id)) +
    ownerField(base.owner_id, base.startup_id, "owner_id") +
    sf(
      "Nome do contato",
      "name",
      base.name || "",
      "text",
      'required maxlength="200"',
    ) +
    sf("Empresa ou instituição", "company", base.company || "") +
    sf("Telefone / WhatsApp", "phone", base.phone || "", "tel") +
    sf("E-mail", "email", base.email || "", "email") +
    sf("Cidade", "city", base.city || "") +
    sf("Segmento", "segment", base.segment || "") +
    sf("Origem do lead", "origin", base.origin || "") +
    `<label>Campanha de origem<input name="campaign_name" value="${e(base.campaign_name || "")}" list="campaign-suggestions"><datalist id="campaign-suggestions">${[...new Set(campaigns.filter(x => x.startup_id === base.startup_id).map(x => x.campaign))].map(x => `<option value="${e(x)}"></option>`).join("")}</datalist></label>` +
    sf("Órgão público (quando aplicável)", "public_body", base.public_body) +
    sf("Interlocutores", "stakeholders", base.stakeholders) +
    date("Prazo da documentação", "documents_due", base.documents_due) +
    text("Documentação e próximos passos", "documents_notes", base.documents_notes) +
    sf(
      "Valor potencial (R$)",
      "estimated_value",
      Number(base.estimated_value_cents || 0) / 100,
      "number",
      'min="0" step="0.01" required',
    ) +
    datetimeField("Próximo contato", "next_contact_at", base.next_contact_at) +
    datetimeField("Reunião agendada", "meeting_at", base.meeting_at) +
    text("Observações", "notes", base.notes || "");
  formModal(
    old ? "Editar contato" : "Novo lead",
    f,
    async (b) => {
      normalizeTimes(b);
      b.campaign_name = b.campaign_name.trim();
      const x = await api(
        "/api/leads" + (old ? "/" + base.id : ""),
        old ? "PATCH" : "POST",
        b,
      );
      if (!old && b.meeting_at)
        await api("/api/leads/" + x.id, "PATCH", {
          meeting_at: b.meeting_at,
          stage: "Reunião marcada",
        });
    },
    {
      remove: old && admin() ? "lead-delete" : null,
      id: old?.id,
      submit: old ? "Salvar contato" : "Cadastrar lead",
    },
  );
}
async function leadDetail(id) {
  const l = (state.data.leads || (await load("leads"))).find(
    (x) => String(x.id) === String(id),
  );
  if (!l) return;
  const events = await api("/api/leads/" + id + "/events");
  const additional = [l.campaign_name && "Campanha · " + l.campaign_name, l.public_body && "Órgão · " + l.public_body,
    l.stakeholders && "Interlocutores · " + l.stakeholders, l.documents_due && "Documentação até " + human(l.documents_due),
    l.documents_notes].filter(Boolean);
  const p = l.proposal;
  const proposal = `<div class="workflow-item"><b>Proposta comercial</b>
    <p class="tiny muted">${p ? e([label(p.status), p.value && brl(Number(p.value) * 100), p.valid_until && "Validade " + human(p.valid_until)].filter(Boolean).join(" · ")) : "Acompanhe envio, validade e negociação."}</p>
    ${p?.loss_reason ? `<p>${e(p.loss_reason)}</p>` : ""}
    ${button(p ? "Abrir proposta" : "Criar proposta", "proposal-edit", itemRef(id), "small")} ${externalLink(p?.url, "Abrir documento")}</div>`;
  dialog(
    l.name,
    `<div class="detail-summary">${badge(l.startup_name || startupName(l.startup_id), "blue")}${badge(l.stage)}</div><div class="form-grid"><div><label>Organização</label><p class="tiny">${e(l.company || "Não informada")}</p></div><div><label>Responsável</label><p class="tiny">${e(l.owner_name || "Não informado")}</p></div><div><label>Telefone</label><p class="tiny">${e(l.phone || "Não informado")}</p></div><div><label>E-mail</label><p class="tiny">${e(l.email || "Não informado")}</p></div><div><label>Potencial</label><p class="tiny">${brl(l.estimated_value_cents)}</p></div><div><label>Próximo contato</label><p class="tiny">${dateTime(l.next_contact_at)}</p></div><div><label>Reunião</label><p class="tiny">${dateTime(l.meeting_at)}</p></div><div><label>Origem</label><p class="tiny">${e(l.origin || "Não informada")}</p></div></div><p class="detail-description lead-notes">${e(l.notes)}</p>${additional.map(x => `<p class="tiny">${e(x)}</p>`).join("")}${proposal}<div class="flex">${button(icon("phone") + "Registrar contato", "lead-contact", `data-id="${id}"`, "small primary")}${button("Reagendar", "lead-reschedule", `data-id="${id}"`, "small")}${button("Reunião realizada", "lead-meeting", `data-id="${id}"`, "small")}${button("Editar ficha", "lead-edit", `data-id="${id}"`, "small")}</div><div class="section-label">HISTÓRICO DE RELACIONAMENTO</div>${historyHTML(events)}`,
  );
}
async function stageLead(id, stage) {
  const l = (state.data.leads || []).find((x) => String(x.id) === String(id));
  if (!l || l.stage === stage) return;
  if (stage === "Clientes") {
    await render();
    toast("Registre o fechamento para gerar o cliente e as parcelas.");
    return dealForm(l);
  }
  if (stage === "Reunião marcada" && !l.meeting_at) {
    await render();
    formModal(
      "Agendar reunião",
      datetimeField("Data e hora da reunião", "meeting_at") +
        text("Observações", "notes", l.notes || ""),
      async (b) => {
        if (!b.meeting_at) throw Error("Informe a data da reunião");
        await api("/api/leads/" + id, "PATCH", { ...normalizeTimes(b), stage });
      },
    );
    return;
  }
  await api("/api/leads/" + id, "PATCH", { stage });
  toast("Etapa atualizada");
  await render();
}
function financeForm(v = null) {
  const base = v || {
    startup_id: state.startup || state.startups[0]?.id,
    entry_type: "despesa",
    expense_class: "fixa",
    status: "previsto",
    entry_date: today(),
    category: "Geral",
    cost_center: "Operação",
  };
  formModal(
    v ? "Editar lançamento" : "Novo lançamento",
    startupsField(base.startup_id) +
      sel(
        "Tipo",
        "entry_type",
        ["receita", "despesa"].map((x) => [x, label(x)]),
        base.entry_type,
      ) +
      sf(
        "Descrição",
        "description",
        base.description || "",
        "text",
        'required maxlength="200"',
      ) +
      sf(
        "Valor (R$)",
        "amount",
        v ? Number(base.amount_cents) / 100 : "",
        "number",
        'required min="0.01" step="0.01"',
      ) +
      sel(
        "Classe da despesa",
        "expense_class",
        ["fixa", "variavel"].map((x) => [x, label(x)]),
        base.expense_class || "fixa",
      ) +
      sel(
        "Situação",
        "status",
        ["previsto", "realizado"].map((x) => [x, label(x)]),
        base.status,
      ) +
      sf("Categoria", "category", base.category) +
      sf("Centro de custo", "cost_center", base.cost_center) +
      date(
        "Data do lançamento / pagamento",
        "entry_date",
        base.entry_date,
        "required",
      ) +
      date("Vencimento", "due_date", base.due_date || base.entry_date) +
      date(
        "Competência",
        "competence_date",
        base.competence_date || base.entry_date,
      ),
    async (b) => {
      await api(
        "/api/finance" + (v ? "/" + v.id : ""),
        v ? "PATCH" : "POST",
        b,
      );
    },
    {
      remove: v ? "finance-delete" : null,
      id: v?.id,
      submit: v ? "Salvar lançamento" : "Registrar lançamento",
    },
  );
}
async function dealForm(selected = null) {
  const leads = state.data.leads || (await load("leads"));
  formModal(
    "Registrar fechamento",
    sel(
      "Lead negociado",
      "lead_id",
      leads.map((x) => [x.id, `${x.name} · ${x.startup_name}`]),
      selected?.id,
      "required",
    ) +
      sf(
        "Título do contrato",
        "title",
        "Contrato comercial",
        "text",
        "required",
      ) +
      sf(
        "Valor total (R$)",
        "value",
        selected ? Number(selected.estimated_value_cents) / 100 : "",
        "number",
        'required min="0.01" step="0.01"',
      ) +
      sf(
        "Parcelas mensais",
        "installments",
        "1",
        "number",
        'required min="1" max="36"',
      ) +
      date(
        "Vencimento da primeira parcela",
        "first_due_date",
        today(),
        "required",
      ) +
      `<div class="notice full">O fechamento cria o cliente e as parcelas a receber na startup vinculada ao lead. A receita realizada será registrada a cada recebimento.</div>`,
    async (b) => {
      await api("/api/deals", "POST", b);
    },
    { submit: "Fechar contrato e gerar parcelas" },
  );
}
const itemRef = id => `data-id="${e(id)}"`;
const validWeb = url => {
  try { return ["https:", "http:"].includes(new URL(url).protocol); }
  catch { return false; }
};
const externalLink = (url, caption) => validWeb(url)
  ? `<a class="text-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(caption)}</a>` : "";
const personName = (id, fallback) => state.users.find(u => u.id === id)?.name || fallback || "—";
const workflowList = (items, emptyText) => items.length
  ? `<div class="workflow-stack">${items.map(x => `<div class="workflow-item">${button(e(x.title), x.action, itemRef(x.id), "text-link")}<p class="tiny muted">${e(x.note)}</p></div>`).join("")}</div>`
  : empty(emptyText);
function editorialActions(rows) {
  return rows.filter(x => marketingFlow(x) === "aprovacao").map(x => ({
    id: x.id, title: x.title, action: "marketing-edit",
    note: [x.startup_name, x.creator_name, x.publication?.scheduled_at ? "Planejada para " + dateTime(x.publication.scheduled_at) : "Pronta para planejar"].filter(Boolean).join(" · "),
  }));
}
function managementQueue(tasks, leads, pieces) {
  return [
    ...tasks.filter(x => x.source !== "content_reel" && managesTaskPay() && x.pay_review?.status === "pending" && x.status === "concluida").map(x => ({
      id: x.id, title: x.title, action: "task-detail",
      note: `Avaliar entrega remunerada · ${x.startup_name} · ${x.assignee_name}`,
    })),
    ...pieces.filter(x => marketingFlow(x) === "revisao").map(x => ({
      id: x.id, title: x.title, action: "marketing-edit",
      note: `Conteúdo em revisão · ${x.startup_name} · ${x.creator_name} · ${human(x.delivery_due || x.planned_date)}`,
    })),
    ...leads.filter(x => x.proposal?.status === "aguardando_validacao").map(x => ({
      id: x.id, title: x.company || x.name, action: "proposal-edit",
      note: `Validar proposta · ${x.startup_name} · ${x.owner_name} · validade ${human(x.proposal.valid_until)}`,
    })),
    ...tasks.filter(x => x.status === "bloqueada").map(x => ({
      id: x.id, title: x.title, action: "task-detail",
      note: `Desbloquear atividade · ${x.startup_name} · ${x.assignee_name} · ${human(x.due_date)}`,
    })),
  ];
}
function salesAgenda(leads) {
  const items = [];
  for (const x of leads) {
    if (x.owner_id !== state.me.id && !admin()) continue;
    if (x.stage === "Clientes" || x.proposal?.status === "perdida") continue;
    const add = (title, at, action) => items.push({
      id: x.id, title: title + " · " + (x.company || x.name),
      action, at, note: x.startup_name + " · " + (at ? dateTime(at) : "Sem data definida"),
    });
    if (x.next_contact_at) add("Retorno", x.next_contact_at, "lead-detail");
    if (x.meeting_at && (!x.meeting_done_at || Date.parse(x.meeting_at) > Date.parse(x.meeting_done_at))) add("Reunião", x.meeting_at, "lead-detail");
    const p = x.proposal;
    if (!p && x.proposal_sent_at) add("Acompanhar proposta enviada", x.next_contact_at, "proposal-edit");
    if (p && !["fechada", "perdida"].includes(p.status)) add(label(p.status) + " · proposta", p.valid_until ? p.valid_until + "T23:59:00-03:00" : "", "proposal-edit");
    if (x.documents_due) add("Prazo de documentação", x.documents_due + "T23:59:00-03:00", "lead-detail");
  }
  return items.sort((a, b) => (a.at ? Date.parse(a.at) : Infinity) - (b.at ? Date.parse(b.at) : Infinity));
}
async function campaignCard() {
  const rows = await load("campaign-results");
  return card("Resultados por campanha", table(rows, [
    { title: "Campanha", key: "campaign" }, { title: "Startup", key: "startup_name" },
    { title: "Leads vinculados", key: "leads" }, { title: "Leads com reunião", key: "meetings" },
    { title: "Contratos", key: "deals" },
  ], "campaign-results"), "Totais dos leads vinculados pelo Comercial");
}
function proposalForm(lead) {
  if (!lead) return;
  const p = lead.proposal || {};
  const statuses = ["rascunho_proposta", "aguardando_validacao", "perdida"];
  if (p.status === "aguardando_validacao" && admin()) statuses.splice(2, 0, "liberada");
  if (["liberada", "enviada", "negociacao"].includes(p.status)) statuses.splice(2, 0, "enviada", "negociacao");
  if (p.status && !statuses.includes(p.status)) statuses.push(p.status);
  const details = externalLink(p.url, "Abrir documento da proposta");
  const back = button("Abrir ficha do contato", "lead-detail", itemRef(lead.id), "small");
  if (lead.stage === "Clientes") {
    return dialog("Proposta · " + lead.name, `
      <div class="workflow-stack"><p>${e(label(p.status || "fechada"))}
        ${p.value ? " · " + brl(Number(p.value) * 100) : ""}
        ${p.valid_until ? " · Validade " + human(p.valid_until) : ""}</p>
        ${p.note ? `<p>${e(p.note)}</p>` : ""}<p>${details}</p></div>${back}`);
  }
  formModal("Proposta · " + (lead.company || lead.name),
    `<div class="full">${back} ${details}</div>` +
    sf("Documento ou link da proposta", "url", p.url || "", "url") +
    sf("Valor da proposta (R$)", "value", p.value || "", "number", 'min="0.01" step="0.01"') +
    date("Validade", "valid_until", p.valid_until) +
    sel("Etapa da proposta", "status", statuses.map(x => [x, label(x)]), p.status || statuses[0]) +
    text("Observações ou devolutiva da gestão", "note", p.note || "") +
    text("Motivo de perda", "loss_reason", p.loss_reason || "") +
    (p.updated_by ? `<small class="muted full">Última atualização por ${e(p.updated_by)} · ${dateTime(p.updated_at)}</small>` : ""),
    b => api("/api/leads/" + lead.id, "PATCH", { proposal: b }),
    { submit: "Salvar proposta" });
}
async function openReelContent(task) {
  const piece = (await api("/api/marketing")).find(piece => piece.id === task.source_piece_id);
  if (piece) return contentDetail(piece);
  toast("Conteúdo indisponível para este perfil.");
}
async function contentDetail(piece) {
  if (!piece) return;
  const related = piece.production_task_id || piece.repost_task_ids ? await api("/api/tasks") : [];
  const production = related.find(task => task.id === piece.production_task_id);
  const reposts = related.filter(task => piece.repost_task_ids?.includes(task.id))
    .sort((a, b) => (a.planned_date || "").localeCompare(b.planned_date || ""));
  const flow = marketingFlow(piece);
  const creator = admin() || piece.creator_id === state.me.id;
  const publisher = marketingAccess();
  const p = piece.publication || {};
  const versions = piece.versions || [];
  const action = (title, name, cls = "small") => button(title, name, itemRef(piece.id), cls);
  const editable = ["planejamento", "producao", "ajustes_solicitados"].includes(flow);
  const actions = [
    ...(creator && editable ? [
      ...(!external() ? [action("Editar ficha", "content-fields")] : []),
      action("Enviar versão para revisão", "content-submit", "small primary"),
    ] : []),
    ...(admin() && flow === "revisao" ? [action("Solicitar ajustes", "content-changes"), ...(versions.length ? [action("Aprovar versão", "content-approve", "small primary")] : [])] : []),
    ...(publisher && ["aprovacao", "publicacao"].includes(flow) ? [
      ...(flow === "aprovacao" ? [action("Planejar publicação", "content-schedule")] : []),
      action(flow === "publicacao" ? "Atualizar publicação e métricas" : "Registrar publicação", "content-publish", "small primary"),
    ] : []),
  ];
  dialog(piece.title, `
    <div class="detail-summary">${badge(piece.startup_name, "blue")}${badge(flow)}${badge(piece.format)}</div>
    <div class="workflow-stack">
      ${piece.production_task_id ? `<section class="workflow-item"><b>Produção do Reel · R$ 100,00</b><p class="muted">Valor liberado uma única vez após a aprovação da versão pela Gestão. Repostagens nos Stories não geram pagamento.</p>${production ? badge(taskPayStatus(production), production.pay_review?.status === "approved" ? "ok" : "warn") : ""}</section>` : ""}
      ${reposts.length ? `<section class="workflow-item"><b>Agenda de Stories · sem remuneração</b><p class="muted">Datas em Brasília. Use os Insights para escolher o horário; acrescente um contexto diferente em cada ação. A publicação no Instagram é feita pela equipe.</p>${workflowList(reposts.map(task => ({id: task.id, title: human(task.planned_date) + " · " + task.title, action: "task-detail", note: label(task.status)})), "Nenhuma repostagem agendada")}</section>` : ""}
      <section class="workflow-item"><b>Briefing</b><p class="detail-description">${e(piece.notes || "Briefing a definir")}</p>
        <p class="tiny muted">${e(personName(piece.creator_id, piece.creator_name))} · Entrega ${human(piece.delivery_due || piece.planned_date)}${piece.campaign ? " · " + e(piece.campaign) : ""}</p></section>
      <section class="workflow-item"><b>Versões da entrega</b>
        ${versions.length ? [...versions].reverse().map(v => `<div class="workflow-item"><b>Versão ${v.number}</b>
          ${piece.approved_version === v.id ? badge("Aprovada", "ok") : ""} <small class="muted">${e(v.author)} · ${dateTime(v.created_at)}</small>
          <p>${externalLink(v.url, "Abrir material")} ${v.file ? button("Baixar " + e(v.file.name), "content-download", itemRef(piece.id) + ` data-value="${v.id}"`, "text-link") : ""}</p>
          ${v.note ? `<p>${e(v.note)}</p>` : ""}</div>`).join("") : '<p class="muted">Nenhuma versão enviada.</p>'}</section>
      ${!external() && (p.network || p.post_url) ? `<section class="workflow-item"><b>Publicação</b>
        <p>${e(p.network)} · ${e(p.account)}</p><p>${e(p.caption)}</p>
        <p class="tiny muted">Planejada ${dateTime(p.scheduled_at)} · Efetiva ${dateTime(p.published_at)}</p>
        <p>${externalLink(p.post_url, "Abrir publicação")}</p></section>` : ""}
      <section class="workflow-item"><b>Histórico de revisões</b>
        ${piece.workflow_log?.length ? historyHTML([...piece.workflow_log].reverse().map(x => ({...x, action: x.action + (x.version ? " · v" + x.version : "")}))) : '<p class="muted">Nenhuma revisão registrada.</p>'}</section>
    </div><div class="workflow-actions">${actions.join("")}</div>`);
}
function contentAction(piece, action) {
  const p = piece.publication || {};
  const send = b => api("/api/marketing/" + piece.id + "/workflow", "POST", { ...b, action });
  if (action === "approve") return formModal("Aprovar versão", (piece.production_task_id ? '<p class="notice full">Confirme a qualidade do Reel e a conformidade com o briefing. A aprovação libera R$ 100,00 no extrato da pessoa responsável, uma única vez.</p>' : "") + text("Comentário de aprovação", "note"), send, { submit: "Aprovar versão" });
  if (action === "changes") return formModal("Solicitar ajustes", text("Ajustes necessários", "note", "", "required"), send, { submit: "Enviar feedback" });
  if (action === "submit") return formModal("Enviar versão para revisão",
    sf("Link do material", "url", "", "url") +
    '<label>Arquivo da entrega · até 1 MB<input id="content-file" type="file"></label>' +
    text("Observações da versão", "note"),
    async b => {
      const file = $("#content-file").files[0];
      if (file?.size > 1048576) throw Error("Use um link para arquivos acima de 1 MB.");
      if (file) b.file = { name: file.name, data: (await readFile(file)).split(",")[1] };
      await send(b);
    }, { submit: "Enviar versão" });
  const publishing = action === "publish";
  formModal(publishing ? "Registrar publicação" : "Planejar publicação",
    sel("Rede social", "network", [["", "Selecione"], ...["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Outra"].map(x => [x, x])], p.network, "required") +
    sf("Conta ou perfil", "account", p.account, "text", "required") +
    text("Legenda", "caption", p.caption, "required") +
    datetimeField("Data e hora planejadas", "scheduled_at", p.scheduled_at) +
    (publishing && piece.format === "reel" ? '<p class="notice full">Ao registrar a publicação no Instagram, serão criadas seis atividades de Stories: 1, 3, 7, 14, 21 e 28 dias depois. Datas ocupadas na mesma conta são deslocadas para o próximo dia livre. Cada ação traz uma sugestão de abordagem. Sem remuneração adicional; a equipe publica no Instagram. Agendas anteriores recebem as ações que faltam, preservando as tarefas já registradas.</p>' : "") +
    (publishing ? datetimeField("Data e hora efetivas", "published_at", p.published_at) +
      sf("Link da publicação", "post_url", p.post_url, "url", "required") +
      sf("Alcance", "reach", piece.reach || 0, "number", 'min="0" step="1"') +
      sf("Engajamentos", "engagement", piece.engagement || 0, "number", 'min="0" step="1"') +
      sf("Leads informados", "leads_generated", piece.leads_generated || 0, "number", 'min="0" step="1"') : ""),
    b => {
      for (const field of ["scheduled_at", "published_at"]) if (b[field]) b[field] = new Date(b[field]).toISOString();
      return send(b);
    }, { submit: publishing ? "Salvar publicação" : "Salvar planejamento" });
}
function marketingForm(v = null) {
  const base = v || { startup_id: state.startup || state.startups[0]?.id, creator_id: state.me.id, format: "post" };
  formModal(v ? "Editar ficha de conteúdo" : "Novo conteúdo",
    '<p class="notice full">Novos Reels criados por Diego para Social Media ou Marketing externo têm valor de R$ 100,00, sujeito à aprovação da qualidade. Após registrar a publicação no Instagram, a agenda de Stories será gerada sem remuneração adicional.</p>' +
    (v ? `<div class="notice full">${e(startupName(base.startup_id))}</div>` : startupsField(base.startup_id)) +
    (admin() ? sel("Responsável", "creator_id", assignedPeople(base.startup_id)
      .filter(x => ["admin", "marketing", "marketing_externo"].includes(x.role))
      .map(x => [x.id, x.name]), base.creator_id, "required data-owner-field data-marketing-owner" + (v?.production_task_id ? " disabled" : "")) : "") +
    sf("Título", "title", base.title, "text", "required") +
    sf("Campanha", "campaign", base.campaign) +
    sel("Formato", "format", ["reel", "story", "post", "video", "outro"].map(x => [x, label(x)]), base.format, v?.production_task_id ? "disabled" : "") +
    date("Prazo de entrega", "delivery_due", base.delivery_due || base.planned_date) +
    date("Data editorial prevista", "planned_date", base.planned_date) +
    text("Briefing e referências", "notes", base.notes) +
    (marketingFlow(base) === "planejamento" ? '<label class="checklist-row full"><input type="checkbox" name="production_started" value="yes"> Marcar como em produção</label>' : ""),
    b => api("/api/marketing" + (v ? "/" + v.id : ""), v ? "PATCH" : "POST", b),
    { submit: v ? "Salvar ficha" : "Criar conteúdo", remove: v && admin() && !v.production_task_id ? "marketing-delete" : null, id: v?.id });
}

function techForm(v = null) {
  const base = v || {
    startup_id: state.startup || state.startups[0]?.id,
    kind: "implementacao",
    priority: "media",
    status: "planejado",
    progress: 0,
  };
  if (!admin())
    return dialog(
      base.title,
      `<div class="detail-summary">${badge(base.startup_name, "blue")}${badge(base.status)}</div><p class="detail-description">${e(base.notes)}</p>${progress(base.progress)}<div class="tiny muted">${base.progress}% · ${e(base.responsible)} · ${e(base.version || "Sem versão")}</div>`,
    );
  formModal(
    v ? "Atualizar roadmap" : "Novo item tecnológico",
    startupsField(base.startup_id) +
      sel(
        "Tipo",
        "kind",
        ["implementacao", "tarefa", "correcao"].map((x) => [x, label(x)]),
        base.kind,
      ) +
      sf("Título", "title", base.title || "", "text", "required") +
      sf("Responsável técnico", "responsible", base.responsible || "") +
      sel(
        "Prioridade",
        "priority",
        ["urgente", "alta", "media", "baixa"].map((x) => [x, label(x)]),
        base.priority,
      ) +
      sel(
        "Status",
        "status",
        ["planejado", "em_andamento", "validacao", "concluido"].map((x) => [
          x,
          label(x),
        ]),
        base.status,
      ) +
      date("Prazo de entrega", "due_date", base.due_date) +
      sf(
        "Progresso (%)",
        "progress",
        base.progress,
        "number",
        'required min="0" max="100" step="1"',
      ) +
      sf("Versão / release", "version", base.version || "") +
      text("Requisitos, erros e observações", "notes", base.notes || "") +
      (v
        ? `<div class="full">${button(icon("history") + "Histórico de entregas e alterações", "record-history", `data-entity="technology" data-id="${v.id}"`, "text-link")}</div>`
        : ""),
    async (b) => {
      await api(
        "/api/technology" + (v ? "/" + v.id : ""),
        v ? "PATCH" : "POST",
        b,
      );
    },
    { remove: v ? "tech-delete" : null, id: v?.id },
  );
}
function templateForm(v = null, copy = false) {
  const base = v || { sector: "Operações", steps: [] };
  formModal(
    copy ? "Duplicar modelo" : v ? "Editar modelo" : "Novo modelo de processo",
    sf(
      "Título",
      "title",
      (base.title || "") + (copy ? " · cópia" : ""),
      "text",
      "required",
    ) +
      sf("Setor", "sector", base.sector, "text", "required") +
      sel(
        "Vínculo do modelo",
        "startup_id",
        [
          ["", "Todas as startups"],
          ...state.startups.map((x) => [x.id, x.name]),
        ],
        base.startup_id || "",
      ) +
      text(
        "Etapas do checklist · uma por linha",
        "steps",
        base.steps.join("\n"),
        "required",
      ),
    async (b) => {
      b.steps = b.steps
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      await api(
        "/api/templates" + (v && !copy ? "/" + v.id : ""),
        v && !copy ? "PATCH" : "POST",
        b,
      );
      state.templates = await load("templates");
    },
  );
}
function planForm(t) {
  formModal(
    "Iniciar plano de execução",
    sel("Modelo", "template_id", [[t.id, t.title]], t.id) +
      startupsField(t.startup_id || state.startup || state.startups[0]?.id) +
      ownerField(
        state.me.id,
        t.startup_id || state.startup || state.startups[0]?.id,
        "owner_id",
      ) +
      sf("Nome do plano", "title", t.title, "text", "required") +
      date("Prazo das etapas", "due_date", ""),
    async (b) => {
      await api("/api/plans", "POST", b);
    },
    { submit: "Gerar plano com checklist" },
  );
}
async function planDetail(id) {
  const p = (state.data.plans || (await load("plans"))).find(
      (x) => String(x.id) === String(id),
    ),
    steps = await api("/api/plans/" + id + "/steps"),
    can = admin() || String(p.owner_id) === String(state.me.id);
  dialog(
    p.title,
    `<div class="detail-summary">${badge(p.startup_name, "blue")}${badge(p.owner_name)}${badge(human(p.due_date))}</div>${steps.map((x) => `<label class="checklist-row ${x.status === "concluida" ? "done" : ""}"><input type="checkbox" data-plan-step="${x.id}" data-plan="${id}" ${x.status === "concluida" ? "checked" : ""} ${can ? "" : "disabled"}><span>${e(x.title)}<small class="task-meta"> · ${human(x.due_date)}</small></span></label>`).join("")}`,
  );
}
function userForm(v = null) {
  const base = v || { role: "colaborador", active: true };
  formModal(
    v ? "Perfil e acesso" : "Nova pessoa",
    sf("Nome", "name", base.name || "", "text", "required") +
      sf("Cargo", "job_title", base.job_title || "") +
      sf("E-mail de acesso", "email", base.email || "", "email", "required") +
      sf(
        v
          ? "Nova senha · vazio para manter"
          : "Senha inicial · 12 ou mais caracteres",
        "password",
        "",
        "password",
        `${v ? "" : "required"} minlength="12" autocomplete="new-password"`,
      ) +
      sel(
        "Função",
        "role",
        ["admin", "comercial", "marketing", "marketing_externo", "desenvolvimento", "colaborador"].map((x) => [
          x,
          label(x),
        ]),
        base.role,
      ) +
      sel(
        "Status de acesso",
        "active",
        [
          ["true", "Ativo"],
          ["false", "Suspenso"],
        ],
        String(base.active),
      ) +
      text(
        "Responsabilidades",
        "responsibilities",
        base.responsibilities || "",
      ) +
      `<label class="full">Foto · PNG, JPG ou WebP até 280 KB<input type="file" id="profile-photo" accept="image/png,image/jpeg,image/webp"></label><input type="hidden" name="avatar_url" value="${e(base.avatar_url || "")}">`,
    async (b) => {
      b.active = b.active === "true";
      if (!b.password) delete b.password;
      if (v) await api("/api/users/" + v.id, "PATCH", b);
      else await api("/api/users", "POST", b);
      state.users = await api("/api/users");
    },
    { submit: v ? "Salvar perfil" : "Cadastrar pessoa" },
  );
}
function goalForm(v = null) {
  if (v) {
    formModal(
      "Ajustar meta",
      sf(
        "Alvo da meta",
        "target",
        v.target,
        "number",
        'required min="0.01" step="0.01"',
      ) +
        sel(
          "Situação",
          "active",
          [
            ["true", "Ativa"],
            ["false", "Inativa"],
          ],
          String(v.active),
        ),
      async (b) => {
        await api("/api/goals/" + v.id, "PATCH", {
          target: Number(b.target),
          active: b.active === "true",
        });
      },
    );
    return;
  }
  formModal(
    "Nova meta por pessoa",
    sel(
      "Pessoa",
      "user_id",
      state.users.filter((x) => x.active).map((x) => [x.id, x.name]),
      state.users[0]?.id,
    ) +
      sf("Título da meta", "title", "", "text", "required") +
      sel(
        "Indicador",
        "metric",
        ["contatos", "reunioes", "reels", "stories", "videos", "atividade"].map(
          (x) => [x, x],
        ),
      ) +
      sf(
        "Quantidade alvo",
        "target",
        "",
        "number",
        'required min="0.01" step="0.01"',
      ) +
      sel(
        "Ciclo",
        "cadence",
        ["weekly", "monthly", "fixed"].map((x) => [x, label(x)]),
      ) +
      date("Início de vigência", "start_date", today(), "required") +
      date("Fim de vigência", "end_date", "", "required"),
    (b) => api("/api/goals", "POST", b),
    { submit: "Criar meta" },
  );
}
async function activityForm() {
  const gs = state.data.goals || (await load("goals"));
  formModal(
    "Registrar resultado",
    startupsField() +
      sel("Meta / pessoa", "goal_id", [
        ["", "Registro sem meta"],
        ...gs
          .filter((x) => x.active)
          .map((x) => [x.id, `${x.person_name} · ${x.title}`]),
      ]) +
      sel(
        "Indicador sem meta",
        "metric",
        ["contatos", "reunioes", "reels", "stories", "videos", "atividade"].map(
          (x) => [x, x],
        ),
      ) +
      sf(
        "Quantidade realizada",
        "quantity",
        "1",
        "number",
        'required min="0.01" step="0.01"',
      ) +
      text("Descrição do resultado", "note", "", "required"),
    async (b) => {
      if (b.goal_id) {
        const g = gs.find((x) => String(x.id) === b.goal_id);
        b.metric = g.metric;
        b.user_id = g.user_id;
      } else delete b.goal_id;
      await api("/api/activities", "POST", b);
    },
    { submit: "Registrar resultado" },
  );
}
async function searchDialog() {
  window.searchIndex = null;
  dialog(
    "Buscar no workspace",
    `<div class="search-box">${icon("search")}<input id="global-search" placeholder="Atividades, contatos, conteúdos, roadmap…" autocomplete="off" autofocus></div><div class="search-results" id="global-results">${empty("Encontre o que você precisa", "Digite para buscar nos módulos aos quais você tem acesso.", "search")}</div>`,
  );
  $("#global-search").focus();
  const types = [
    ["tasks", "Atividade", "title", "task-detail", "circle-check"],
    ...(crmAccess()
      ? [["leads", "Contato", "name", "lead-detail", "blocks"]]
      : []),
    ...(marketingViewer() ? [["marketing", "Conteúdo", "title", "marketing-edit", "megaphone"]] : []),
    ...(admin() ? [["technology", "Tecnologia", "title", "tech-edit", "code-xml"], ["plans", "Processo", "title", "plan-detail", "workflow"]] : []),
    ...(admin()
      ? [["finance", "Financeiro", "description", "finance-edit", "wallet"]]
      : []),
  ];
  const result = await Promise.all(
    types.map(async ([source, title, key, action, ic]) => {
      const rows = await load(source);
      return rows.map((x) => ({
        id: x.id,
        title: x[key],
        sub: title + " · " + (x.startup_name || startupName(x.startup_id)),
        action,
        icon: ic,
      }));
    }),
  );
  window.searchIndex = result.flat();
  updateSearch($("#global-search")?.value || "");
}
function updateSearch(term) {
  const target = $("#global-results");
  if (!target) return;
  if (window.searchIndex === null) {
    target.innerHTML =
      '<div class="skeleton"></div><div class="tiny muted">Buscando nos módulos autorizados…</div>';
    return;
  }
  const hits = (window.searchIndex || [])
    .filter((x) =>
      (x.title + " " + x.sub).toLowerCase().includes(term.toLowerCase()),
    )
    .slice(0, 30);
  target.innerHTML = term
    ? hits
        .map((x) =>
          button(
            icon(x.icon) +
              `<span><b>${e(x.title)}</b><small>${e(x.sub)}</small></span>`,
            x.action,
            `data-id="${x.id}"`,
            "search-result",
          ),
        )
        .join("") ||
      empty("Nenhum resultado", "Tente buscar por outro termo.", "search")
    : empty(
        "O que você procura?",
        "A busca respeita a startup selecionada e suas permissões.",
        "search",
      );
  icons();
}
async function notificationItems() {
  const [tasks, leads, pieces] = await Promise.all([
    load("tasks"), crmAccess() ? load("leads") : [], marketingViewer() ? load("marketing") : [],
  ]);
  const myTasks = tasks.filter(t => t.assigned_to === state.me.id && openTask(t) && t.due_date && dateOnly(t.due_date) <= today())
    .map(x => ({title: x.title, note: `Prazo ${human(x.due_date)} · ${x.startup_name}`, id: x.id, action: "task-detail"}));
  const sales = salesAgenda(leads).filter(x => x.at && dateOnly(x.at) <= today());
  const editorial = state.me.role === "marketing" ? editorialActions(pieces) : [];
  const adjustments = pieces.filter(x => x.creator_id === state.me.id && marketingFlow(x) === "ajustes_solicitados")
    .map(x => ({title: x.title, note: "Ajustes solicitados · " + x.startup_name, id: x.id, action: "marketing-edit"}));
  const deliveries = pieces.filter(x => x.creator_id === state.me.id &&
    ["planejamento", "producao"].includes(marketingFlow(x)) && x.delivery_due && x.delivery_due <= today())
    .map(x => ({title: x.title, note: "Prazo de entrega · " + human(x.delivery_due), id: x.id, action: "marketing-edit"}));
  const proposals = state.me.role === "comercial" ? leads.filter(x => x.owner_id === state.me.id && x.proposal?.status === "liberada")
    .map(x => ({title: x.company || x.name, note: "Proposta liberada para envio · " + x.startup_name, id: x.id, action: "proposal-edit"})) : [];
  const returned = tasks.filter(x => x.assigned_to === state.me.id && x.pay_review?.status === "changes")
    .map(x => ({title: x.title, note: "Ajustes de qualidade solicitados · " + x.startup_name, id: x.id, action: "task-detail"}));
  return [...returned, ...(admin() ? managementQueue(tasks, leads, pieces) : []), ...myTasks, ...sales, ...editorial, ...adjustments, ...deliveries, ...proposals];
}
async function notifications() {
  dialog("Central de notificações", workflowList(await notificationItems(), "Nenhuma pendência no momento"));
}
function exportCSV() {
  const rows = state.exports;
  if (!rows.length) {
    toast("Não há registros para exportar com estes filtros.");
    return;
  }
  const keys = [...new Set(rows.flatMap((x) => Object.keys(x)))],
    cell = (v) => {
      let value = String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""));
      if (typeof v === "string" && /^[=+@-]/.test(value) && !/^[-+]?\d+([,.]\d+)?$/.test(value)) value = "'" + value;
      return '"' + value.replace(/"/g, '""') + '"';
    };
  const csv =
    "\uFEFF" +
    [
      keys.map(cell).join(";"),
      ...rows.map((x) => keys.map((k) => cell(x[k])).join(";")),
    ].join("\r\n");
  download(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `workspace-${state.section}-${state.startup ? startupName(state.startup).replace(/\s/g, "-") : "consolidado"}-${today()}.csv`,
  );
  toast("Relatório exportado");
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function navigate(section) {
  if (!canOpen(section) || !PAGES[section]) return;
  $("#editor").close();
  state.section = section;
  state.pagination = {};
  state.calendar = 0;
  $("#sidebar").classList.remove("open");
  $("#menu-shade").classList.add("hidden");
  syncSidebarAccessibility();
  await render();
  $("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function confirmDelete(title, description, remove) {
  formModal(title, `<p class="tiny muted full">${e(description)}</p>`, remove, {
    submit: "Confirmar exclusão",
  });
}
document.addEventListener("click", async (ev) => {
  const navbtn = ev.target.closest("[data-nav]");
  if (navbtn) return navigate(navbtn.dataset.nav);
  if (ev.target.closest("#mobile-menu")) return setMobileMenu(true);
  if (ev.target.closest("#close-mobile-menu, #menu-shade")) return setMobileMenu(false, true);
  if (ev.target.closest("#collapse-nav")) {
    const collapsed = $("#shell").classList.toggle("collapsed");
    $("#collapse-nav").setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
    $("#collapse-nav").title = collapsed ? "Expandir menu" : "Recolher menu";
    return;
  }
  if (ev.target.closest("#close-editor")) {
    $("#editor").close();
    return;
  }
  try {
    if (ev.target.closest("#open-search")) return searchDialog();
    if (ev.target.closest("#notifications")) return notifications();
    if (
      ev.target.closest("#settings") ||
      ev.target.closest("#profile-button") ||
      ev.target.closest("#avatar")
    ) {
      if ($("#sidebar").classList.contains("open")) setMobileMenu(false, true);
      dialog(
        "Seu workspace",
        `<div class="between"><span class="avatar">${e(state.me.name[0])}</span><div><b>${e(state.me.name)}</b><div class="tiny muted">${e(state.me.email || "")} · ${e(label(state.me.role))}</div></div></div><div class="section-label">STARTUPS DISPONÍVEIS</div><div class="flex">${state.startups.map((x) => badge(x.name, "blue")).join("")}</div><div class="notice">${admin() ? "Gerencie perfis, credenciais e vínculos em Pessoas." : "Seus acessos são definidos pela gestão do workspace."}</div><div class="form-actions">${admin() ? button("Gerenciar pessoas", "navigate", 'data-value="people"', "primary") : button("Fechar", "close-dialog")}</div>`,
      );
      return;
    }
    if (ev.target.closest("#logout, [data-action=switch-profile]")) {
      await api("/api/auth/logout", "POST");
      return showLogin();
    }
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const { action, id, value, key, field } = btn.dataset;
    if (action === "close-dialog") {
      $("#editor").close();
      return;
    }
    if (action === "reload") return render();
    if (action === "navigate") return navigate(value);
    if (action === "dashboard-detail" && state.section === "dashboard") {
      const detail = state.dashboardDetails.get(key);
      if (detail) dialog(detail.title, `<p class="scope-context">${e(detail.scope)}</p>
        <div class="dashboard-detail-list">${detail.render()}</div>`);
      return;
    }
    if (action === "dashboard-startup" && state.section === "dashboard" &&
      state.startups.some(startup => String(startup.id) === id)) {
      state.startup = id;
      $("#startup-filter").value = id;
      state.data = {};
      state.filter.tasks = {};
      return navigate("tasks");
    }
    if(action==='material-trl')return trlForm(id);
    if(action==='material-experiment-new')return experimentForm();
    if(action==='material-experiment-detail')return experimentDetail(id);
    if(action==='material-experiment-edit')return experimentForm(id);
    if(action==='material-experiment-result'){
      const experiment=await api("/api/material-experiments/"+id);
      return materialResultForm(experiment.product_id,undefined,id);
    }
    if(action==='material-work-new')return workLogForm();
    if(action==='material-scope'){state.startup=MATERIAL_SPACE;$('#startup-filter').value=MATERIAL_SPACE;return render()}
    if(action==='material-tab'){state.materialTab=value;return navigate('materials')}
    if(action==='material-open'){state.materialProduct=id;state.materialTab='overview';return navigate('materials')}
    if(action==='material-new-product')return materialProductForm();
    if(action==='material-edit-product')return materialProductForm(id);
    if(action==='material-new-goal'&&admin())return materialGoalForm();
    if(action==='material-edit-goal'&&admin())return materialGoalForm(id);
    if(action==='material-new-task'){state.section='materials';return taskForm()}
    if(action==='material-new-result')return materialResultForm(btn.dataset.product,btn.dataset.goal);
    if(action==='material-result-detail')return materialResultDetail(id);
    if(action==='material-download')return materialDownload(id);
    if (action === "export") return exportCSV();
    if (action === "period") {
      state.period = value;
      const now = today();
      state.to = now;
      if (value === "all") {
        state.from = "";
        state.to = "";
      } else if (value === "month") {
        state.from = monthStart(now);
        state.to = monthEnd(now);
      } else if (value === "year") {
        state.from = now.slice(0, 4) + "-01-01";
        state.to = now.slice(0, 4) + "-12-31";
      } else {
        const x = new Date(now + "T12:00:00Z");
        x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
        state.from = x.toISOString().slice(0, 10);
        x.setUTCDate(x.getUTCDate() + 6);
        state.to = x.toISOString().slice(0, 10);
      }
      state.pagination = {};
      return render();
    }
    if (action === "view") {
      state.view[key] = value;
      if(key==='crm')state.view.crmExplicit=true;
      return render();
    }
    if (action === "sort") {
      const old = state.sort[key];
      state.sort[key] = { key: field, dir: old?.key === field ? -old.dir : 1 };
      return render();
    }
    if (action === "pagination") {
      state.pagination[key] = Number(value);
      return render();
    }
    if (action === "calendar") {
      state.calendar += Number(value);
      return render();
    }
    if (action === "workday-today") {
      state.workDate = "";
      return render();
    }
    if (action === "task-plan" && admin()) return planTask(id);
    if (action === "new-task") return taskForm();
    if (action === "task-edit") return taskForm(id);
    if (action === "task-detail") return taskDetail(id);
    if (action === "task-status") return await setTaskStatus(id, value);
    if (action === "task-pay-review" && managesTaskPay()) return await taskPayReview(id, value);
    if (action === "task-delete")
      return confirmDelete(
        "Excluir atividade",
        "A atividade, seus comentários e anexos serão removidos. O registro de exclusão será preservado.",
        () => api("/api/tasks/" + id, "DELETE"),
      );
    if (action === "attachment-delete") {
      const task = btn.dataset.task;
      return confirmDelete(
        "Remover anexo",
        "Este arquivo será removido da atividade.",
        () => api(`/api/tasks/${task}/attachments/${id}`, "DELETE"),
      );
    }
    if (action === "new-lead") return leadForm();
    if (action === "lead-edit") {
      const l = (state.data.leads || (await load("leads"))).find(
        (x) => String(x.id) === id,
      );
      return leadForm(l);
    }
    if (action === "lead-detail") return leadDetail(id);
    if (action === "lead-delete")
      return confirmDelete(
        "Excluir lead",
        "O contato e suas interações serão removidos. Leads com contratos são preservados.",
        () => api("/api/leads/" + id, "DELETE"),
      );
    if (
      [
        "lead-contact",
        "lead-reschedule",
        "lead-meeting",
      ].includes(action)
    ) {
      const type = {
        "lead-contact": "contato",
        "lead-reschedule": "reagendamento",
        "lead-meeting": "reuniao_realizada",
      }[action];
      return formModal(
        {
          contato: "Registrar contato",
          reagendamento: "Agendar próximo retorno",
          reuniao_realizada: "Registrar reunião realizada",
        }[type],
        text("Resumo da interação", "note", "", "required") +
          datetimeField("Próximo contato", "next_contact_at"),
        async (b) => {
          normalizeTimes(b);
          await api("/api/leads/" + id + "/events", "POST", { ...b, type });
        },
        { submit: "Registrar interação" },
      );
    }
    if (action === "new-deal") return dealForm();
    if (action === "new-finance") return financeForm();
    if (action === "finance-edit")
      return financeForm(
        (state.data.finance || (await load("finance"))).find(
          (x) => String(x.id) === id,
        ),
      );
    if (action === "finance-delete")
      return confirmDelete(
        "Excluir lançamento",
        "O registro manual será removido. Recebimentos de contratos são preservados.",
        () => api("/api/finance/" + id, "DELETE"),
      );
    if (action === "payment") {
      const x = (state.data.invoices || (await load("invoices"))).find(
          (x) => String(x.id) === id,
        ),
        max = Number(x.amount_cents) - Number(x.paid_cents);
      return formModal(
        "Registrar recebimento",
        sf(
          "Valor recebido (R$)",
          "amount",
          (max / 100).toFixed(2),
          "number",
          `required min="0.01" max="${max / 100}" step="0.01"`,
        ) +
          date("Recebido em", "paid_on", today(), "required") +
          `<div class="notice full">${e(x.startup_name)} · ${e(x.deal_title)} · Parcela ${x.installment}. Saldo ${brl(max)}.</div>`,
        (b) => api("/api/invoices/" + id + "/payments", "POST", b),
        { submit: "Confirmar recebimento" },
      );
    }
    if (action === "new-marketing" && marketingAccess()) return marketingForm();
    if (action === "proposal-edit") {
      const lead = (await load("leads")).find(x => x.id === id);
      return proposalForm(lead);
    }
    if (action === "marketing-edit" || action.startsWith("content-")) {
      const piece = (await load("marketing")).find(x => x.id === id);
      if (!piece) return;
      if (action === "marketing-edit") return contentDetail(piece);
      if (action === "content-fields") return marketingForm(piece);
      if (action === "content-download") {
        const file = piece.versions?.find(x => x.id === value)?.file;
        if (file) download(new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))]), file.name);
        return;
      }
      return contentAction(piece, action.slice("content-".length));
    }
    if (action === "marketing-delete")
      return confirmDelete(
        "Excluir conteúdo",
        "O conteúdo será removido. Seu histórico de alterações será preservado.",
        () => api("/api/marketing/" + id, "DELETE"),
      );
    if (action === "new-tech") return techForm();
    if (action === "tech-edit")
      return techForm(
        (state.data.technology || (await load("technology"))).find(
          (x) => String(x.id) === id,
        ),
      );
    if (action === "tech-delete")
      return confirmDelete(
        "Excluir item tecnológico",
        "O item será removido do roadmap. Seu histórico será preservado.",
        () => api("/api/technology/" + id, "DELETE"),
      );
    if (action === "new-template") return templateForm();
    if (action === "template-edit")
      return templateForm(state.templates.find((x) => String(x.id) === id));
    if (action === "template-copy")
      return templateForm(
        state.templates.find((x) => String(x.id) === id),
        true,
      );
    if (action === "task-template")
      return taskForm(
        null,
        state.templates.find((x) => String(x.id) === id),
      );
    if (action === "new-plan")
      return planForm(state.templates.find((x) => String(x.id) === id));
    if (action === "plan-detail") return planDetail(id);
    if (action === "record-history") {
      const h = await api(`/api/history?entity=${btn.dataset.entity}&id=${id}`);
      return dialog("Histórico de alterações", historyHTML(h));
    }
    if (action === "new-user") return userForm();
    if (action === "user-edit")
      return userForm(state.users.find((x) => String(x.id) === id));
    if (action === "user-memberships") {
      const x = state.users.find((x) => String(x.id) === id);
      return formModal(
        "Startups de " + x.name,
        `<div class="full">${x.role === "admin" ? '<div class="notice">O perfil de gestão possui acesso a todas as startups.</div>' : ""}${state.startups.map((s) => `<label class="checklist-row"><input type="checkbox" name="startup-${s.id}" value="${s.id}" ${state.memberships.some((m) => String(m.user_id) === id && String(m.startup_id) === String(s.id)) ? "checked" : ""}>${e(s.name)}</label>`).join("")}</div>`,
        async (b) => {
          await api("/api/memberships", "PUT", {
            userId: Number(id),
            startupIds: Object.entries(b)
              .filter(([k]) => k.startsWith("startup-"))
              .map(([, v]) => Number(v)),
          });
          state.memberships = await api("/api/memberships");
        },
      );
    }
    if (action === "new-goal") return goalForm();
    if (action === "edit-goal")
      return goalForm(
        (state.data.goals || []).find((x) => String(x.id) === id),
      );
    if (action === "new-activity") return activityForm();
    if (action === "new-follower-reading" && managesTaskPay()) return followerReadingForm();
  } catch (err) {
    toast(err.message, true);
    console.error(err);
  }
});
document.addEventListener("submit", async (ev) => {
  const form = ev.target;
  ev.preventDefault();
  const b = Object.fromEntries(new FormData(form));
  const submit = $('button[type="submit"],button:not([type])', form);
  if (submit?.disabled) return;
  if (submit) submit.disabled = true;
  try {
    if (form.id === "login-form") {
      clearLoginError();
      $("#login-submit-label").textContent = "Entrando…";
      await api("/api/auth/login", "POST", { email: b.email.trim(), password: b.password });
      await bootstrap();
      return;
    }
    if (form.id === "operation-form" && submitModal) {
      $("#form-error").textContent = "";
      await submitModal(b);
      $("#editor").close();
      toast("Registro salvo com sucesso");
      if (modalAfterSave) await render();
      return;
    }
    if (form.id === "comment-form") {
      await api("/api/tasks/" + form.dataset.id + "/comments", "POST", b);
      await taskDetail(form.dataset.id);
      toast("Comentário registrado");
      return;
    }
  } catch (err) {
    if (form.id === "login-form") {
      $("#login-error").textContent = err.message;
      if (err.message === "E-mail ou senha inválidos.") {
        $("#login-email").setAttribute("aria-invalid", "true");
        const password = $("#login-password");
        password.setAttribute("aria-invalid", "true");
        password.value = "";
        password.focus();
      }
    }
    else if ($("#form-error")) $("#form-error").textContent = err.message;
    toast(err.message, true);
  } finally {
    if (form.id === "login-form") $("#login-submit-label").textContent = "Entrar";
    if (submit) submit.disabled = false;
  }
});
const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });
document.addEventListener("change", async (ev) => {
  const x = ev.target;
  try {
    if (x.id === "pay-month") {
      state.payMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(x.value) ? x.value : "";
      return render();
    }
    if (x.id === "pay-person" && managesTaskPay()) {
      state.payPerson = x.value;
      return render();
    }
    if (x.id === "work-person" && admin()) {
      state.workPerson = x.value;
      return render();
    }
    if (x.id === "work-date") {
      state.workDate = x.value >= today() ? x.value : "";
      return render();
    }
    if(x.id==="module-selector") return navigate(x.value);
    if (x.dataset.tableSort) {
      const [direction, key] = x.value.split(":");
      const tableKey = x.dataset.tableSort;
      if (key) state.sort[tableKey] = { key, dir: Number(direction) };
      else delete state.sort[tableKey];
      state.pagination[tableKey] = 1;
      return render();
    }
    if (x.name === "startup_id" && $("#campaign-suggestions")) {
      const campaigns = state.data["campaign-options"] || [];
      $("#campaign-suggestions").innerHTML = [...new Set(campaigns.filter(c => c.startup_id === x.value).map(c => c.campaign))]
        .map(name => `<option value="${e(name)}"></option>`).join("");
    }
    if (x.id === "startup-filter") {
      state.startup = x.value;
      state.data = {};
      state.pagination = {};
      return render();
    }
    if (x.id === "period-from" || x.id === "period-to") {
      const from = $("#period-from").value,
        to = $("#period-to").value;
      if (from && to && from > to) {
        toast("A data inicial deve vir antes da final.", true);
        return;
      }
      state.from = from;
      state.to = to;
      state.period = "custom";
      state.pagination = {};
      return render();
    }
    if(['worklog-product','worklog-user'].includes(x.id)){syncWorkTasks();return}
    if(x.id==='material-product'){state.materialProduct=x.value;state.pagination={};return render()}
    if(x.id==='material-status'){state.materialStatus=x.value;state.pagination={};return render()}
    if(['material-result-product','material-result-user'].includes(x.id)){syncMaterialResultOptions();return}
    if(x.id==='material-result-goal'){const input=$('#material-result-quantity');input.value='';input.required=!!x.value;input.disabled=!x.value;return}
    if (x.dataset.filter) {
      const key = x.dataset.filter;
      state.filter[key] = {
        ...state.filter[key],
        [x.dataset.field || "search"]: x.value,
      };
      state.pagination = {};
      return render();
    }
    if (x.name === "startup_id" && $("#operation-form")) {
      const workFields=$("#material-work-fields");
      if(workFields){workFields.hidden=x.value!==MATERIAL_SPACE;workFields.disabled=workFields.hidden;}
      const product=$("#material-task-product");
      if(product){product.disabled=x.value!==MATERIAL_SPACE;product.required=!product.disabled;product.closest("label").hidden=product.disabled;}
      const owner = $("[data-owner-field]");
      if (owner) {
        const people = assignedPeople(x.value).filter(p => !owner.hasAttribute("data-marketing-owner") ||
          ["admin", "marketing", "marketing_externo"].includes(p.role));
        owner.innerHTML = options(
          people.map((x) => [x.id, x.name]),
          owner.value,
        );
      }
      return;
    }
    if (x.dataset.taskStatus) {
      const status = x.value;
      if (status === "concluida") x.value = x.dataset.currentStatus;
      return await setTaskStatus(x.dataset.taskStatus, status);
    }
    if (x.dataset.leadStage) return stageLead(x.dataset.leadStage, x.value);
    if (x.dataset.taskCheck) {
      const t = await api("/api/tasks/" + x.dataset.taskCheck);
      t.checklist = t.checklist.map((item) =>
        item.id === x.dataset.checkId ? { ...item, done: x.checked } : item,
      );
      await api("/api/tasks/" + t.id, "PATCH", { checklist: t.checklist });
      toast("Checklist atualizado");
      return;
    }
    if (x.dataset.planStep) {
      await api(
        `/api/plans/${x.dataset.plan}/steps/${x.dataset.planStep}`,
        "PATCH",
        { status: x.checked ? "concluida" : "pendente" },
      );
      toast("Etapa atualizada");
      return;
    }
    if (x.dataset.taskUpload) {
      const file = x.files[0];
      if (!file) return;
      if (file.size > 5242880) throw Error("Anexo deve ter até 5 MB");
      x.disabled = true;
      const data = await readFile(file);
      await api("/api/tasks/" + x.dataset.taskUpload + "/attachments", "POST", {
        name: file.name,
        mime_type: file.type,
        data: data.split(",")[1],
      });
      await taskDetail(x.dataset.taskUpload);
      toast("Anexo salvo");
      return;
    }
    if (x.id === "profile-photo") {
      const file = x.files[0];
      if (!file) return;
      if (
        file.size > 280000 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw Error("Use PNG, JPG ou WebP de até 280 KB");
      $('[name="avatar_url"]', $("#operation-form")).value =
        await readFile(file);
      toast("Foto pronta para salvar");
      return;
    }
  } catch (err) {
    if (x.dataset.leadStage || x.dataset.taskStatus) await render();
    if (x.type === "checkbox") x.checked = !x.checked;
    if (x.dataset.taskUpload) x.disabled = false;
    toast(err.message, true);
    console.error(err);
  }
});
let filterTimer;
document.addEventListener("input", (ev) => {
  const x = ev.target;
  if (x.id === "login-email" || x.id === "login-password") clearLoginError();
  if (x.id === "global-search") return updateSearch(x.value);
  if (x.dataset.filter && x.tagName === "INPUT") {
    clearTimeout(filterTimer);
    const key = x.dataset.filter,
      text = x.value,
      caret = x.selectionStart;
    filterTimer = setTimeout(async () => {
      state.filter[key] = { ...state.filter[key], search: text };
      state.pagination = {};
      await render();
      const target = $(`input[data-filter="${key}"]`);
      if (target) {
        target.focus();
        target.setSelectionRange(caret, caret);
      }
    }, 250);
  }
});
document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k" && state.me) {
    ev.preventDefault();
    searchDialog().catch((err) => toast(err.message, true));
  }
  if (ev.key === "Escape" && $("#sidebar").classList.contains("open")) setMobileMenu(false, true);
});
let drag = null;
document.addEventListener("dragstart", (ev) => {
  const x = ev.target.closest("[data-lead-drag],[data-task-drag]");
  if (!x) return;
  drag = {
    id: x.dataset.leadDrag || x.dataset.taskDrag,
    type: x.dataset.leadDrag ? "lead" : "task",
  };
  ev.dataTransfer.setData("text/plain", JSON.stringify(drag));
  ev.dataTransfer.effectAllowed = "move";
});
document.addEventListener("dragover", (ev) => {
  const lane = ev.target.closest("[data-lead-lane],[data-task-lane]");
  if (lane) {
    ev.preventDefault();
    lane.classList.add("hover");
  }
});
document.addEventListener("dragleave", (ev) =>
  ev.target
    .closest("[data-lead-lane],[data-task-lane]")
    ?.classList.remove("hover"),
);
document.addEventListener("drop", async (ev) => {
  const lane = ev.target.closest("[data-lead-lane],[data-task-lane]");
  $$(".lane.hover").forEach((x) => x.classList.remove("hover"));
  if (!lane || !drag) return;
  ev.preventDefault();
  const item = drag;
  drag = null;
  try {
    if (item.type === "lead" && lane.dataset.leadLane)
      return await stageLead(item.id, lane.dataset.leadLane);
    if (item.type === "task" && lane.dataset.taskLane) {
      await setTaskStatus(item.id, lane.dataset.taskLane);
    }
  } catch (err) {
    toast(err.message, true);
  }
});
state.view.crm = window.matchMedia("(max-width: 700px)").matches ? "list" : "board";
(async () => {
  icons();
  try {
    await bootstrap();
  } catch {
    showLogin();
  }
})();
})();
