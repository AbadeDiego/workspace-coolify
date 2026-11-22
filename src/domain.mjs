import { materialCollections, developmentRoute, updateReadiness, workInterval, assertNoOverlap } from "./material-development.mjs";
import { commissionReel, reviewReel, recordFollowers, scheduleReposts } from "./social-media.mjs";
import { commercialRoute } from "./commercial-work.mjs";
import { continuousTask, continuousAction } from "./continuous-tasks.mjs";
import { hashPassword, normalizeEmail, validEmail } from "./password.mjs";
import { validateRoute, validateWrite, InputError, attachmentBytes } from "./validation.mjs";

const MATERIAL_SPACE = "materials-palma";
const taskPayRoles = ["comercial", "marketing", "marketing_externo"];

export function workspaceDomain(snapshot, actorId) {
  const { db } = snapshot;
  const {
    startups: starts, users, tasks, leads, activities, deals, invoices,
    steps, templates, customers, history, comments, events,
  } = db;
  const now = () => new Date().toISOString();
  const activeProfile = () => users.find(person => person.id === actorId && person.active);
  function goalBounds(g){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());let start,end;if(g.cadence==='monthly'){start=day.slice(0,7)+'-01';const x=new Date(start+'T12:00:00Z');x.setUTCMonth(x.getUTCMonth()+1);end=x.toISOString().slice(0,10)}else if(g.cadence==='weekly'){const x=new Date(day+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));start=x.toISOString().slice(0,10);x.setUTCDate(x.getUTCDate()+7);end=x.toISOString().slice(0,10)}else{start=g.start_date;const x=new Date(g.end_date+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+1);end=x.toISOString().slice(0,10)}return {current_from:start,current_to:end}}
  function financeByMonth() {
    const months = new Map();
    for (const entry of db.finance) {
      if (entry.status !== "realizado") continue;
      const month = entry.entry_date.slice(0, 7);
      const values = months.get(month) || { month, income_cents: null, expense_cents: null };
      const key = entry.entry_type === "receita" ? "income_cents" : "expense_cents";
      values[key] = (values[key] ?? 0) + Number(entry.amount_cents);
      months.set(month, values);
    }
    return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  }
  const belongsTo = (person, startup) => db.memberships.some(m =>
    m.user_id === String(person) && m.startup_id === String(startup));
  const webLink = value => {
    try { return ["https:", "http:"].includes(new URL(value).protocol); }
    catch { return false; }
  };

  const add = (table, b) => {
    const x = { ...b, id: String(++snapshot.sequence), created_at: now() };
    db[table].unshift(x);
    return x;
  };
  const record = (entity, x, action) =>
    add("history", {
      entity,
      entity_id: x.id,
      startup_id: x.startup_id,
      action,
      author: activeProfile()?.name || "Equipe",
      changes: {},
      created_at: now(),
    });
  const decorate = (name, x) => ({
    ...x,
    ...(name === "tasks" && users.find(u=>u.id===x.assigned_to)?.role === "comercial" ? {
      commercial_work_minutes: (db["commercial-worklogs"] || []).filter(r=>r.task_id===x.id&&!r.voided_at).reduce((n,r)=>n+r.work_minutes,0),
    } : {}),
    product_name: db['material-products'].find(p=>p.id===x.product_id)?.name,
    startup_name: starts.find((s) => s.id === String(x.startup_id))?.name,
    startup: starts.find((s) => s.id === String(x.startup_id))?.name,
    person_name: users.find((s) => s.id === String(x.user_id))?.name,
    assignee_name: users.find((s) => s.id === String(x.assigned_to))?.name,
    owner_name: users.find((s) => s.id === String(x.owner_id))?.name,
    creator_name: users.find((s) => s.id === String(x.creator_id))?.name,
    ...(name === "deals"
      ? { lead_name: leads.find((l) => l.id === String(x.lead_id))?.name }
      : {}),
    ...(name === "invoices"
      ? { deal_title: deals.find((l) => l.id === String(x.deal_id))?.title }
      : {}),
    ...(name === "plans"
      ? {
          total: steps.filter((s) => s.plan_id === x.id).length,
          done: steps.filter(
            (s) => s.plan_id === x.id && s.status === "concluida",
          ).length,
        }
      : {}),
    ...(name === "goals"
      ? goalBounds(x)
      : {}),
  });
  function respond(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  async function handle(input, method, payload) {
    try {
      const url = new URL(input, "http://workspace.internal"),
        p = url.pathname.split("/").filter(Boolean),
        name = p[1],
        id = p[2],
        m = method,
        b = payload,
        filter = url.searchParams.get("startupId"),
        table = name === "history" ? "history" : name;
      if (!validateRoute(p.slice(1), m)) return respond({ error: "Operação indisponível." }, 404);
      const me = activeProfile();
      if (!me) return respond({ error: "Entre com um perfil para continuar." }, 401);
      const isAdmin = me.role === "admin", isSales = me.role === "comercial";
      const isSocial = me.role === "marketing", isExternal = me.role === "marketing_externo";
      const allowsStartup = startup => isAdmin || belongsTo(me.id, startup);
      const available = starts.filter(s => allowsStartup(s.id));
      const canSee = (collection, x) => {
        if (!x) return false;
        if (isAdmin) return true;
        if (x.startup_id && !allowsStartup(x.startup_id)) return false;
        if (collection === "tasks") return x.assigned_to === me.id;
        if (["goals", "activities"].includes(collection)) return x.user_id === me.id;
        if (collection === "marketing") return isSocial || (isExternal && x.creator_id === me.id);
        return isSales && ["leads", "deals", "customers"].includes(collection);
      };
      const scoped = (xs, collection = name) => xs.filter(x =>
        (!filter || !x.startup_id || x.startup_id === filter) && canSee(collection, x));
      const find = () => db[table]?.find(x => String(x.id) === String(id));
      const canManagePay = isAdmin && me.id === "1";
      if(name==='tasks'&&id&&['executions','close-flow'].includes(p[3])){
        const task=find();
        if(!canSee('tasks',task))return respond({error:'Atividade fora do escopo deste perfil.'},403);
        validateWrite(name,p[3],m,b,task);
        const result=await continuousAction({task,action:p[3],body:b,db,me,isAdmin,add,record,now,
          complete:(childId,evidence)=>handle('/api/tasks/'+childId,'PATCH',{status:'concluida',evidence})});
        if(result.response)return result.response;
        return respond({task:decorate('tasks',result.task),...(result.execution?{execution:decorate('tasks',result.execution)}:{})});
      }
      if (name === "task-preferences") {
        const preferences = db["task-preferences"] ||= [];
        if (m === "GET") return respond(preferences.filter(row=>row.user_id===me.id&&canSee("tasks",tasks.find(t=>t.id===row.task_id))));
        validateWrite(name, undefined, m, b);
        const task = tasks.find(t=>t.id===b.task_id);
        if (!canSee("tasks",task)) return respond({error:"Atividade fora do escopo deste perfil."},403);
        if (typeof b.starred !== "boolean") throw new InputError("Informe se a atividade está em destaque.");
        const old = preferences.find(row=>row.user_id===me.id&&row.task_id===task.id);
        const data = {user_id:me.id,task_id:task.id,starred:b.starred,starred_at:b.starred?(old?.starred?old.starred_at:now()):null};
        return respond(old?Object.assign(old,data):add("task-preferences",data));
      }
      if (["commercial-worklogs", "commercial-reports", "commercial-settlements"].includes(name)) {
        validateWrite(name, undefined, m, b);
        const result = commercialRoute({name,id,method:m,body:b,url,db,me,add,now});
        return respond(result.data,result.status);
      }
      if (materialCollections.includes(name)) {
        if (!(isAdmin || me.role === "desenvolvimento") || !allowsStartup(MATERIAL_SPACE)) {
          return respond({error:"Área de materiais indisponível."},403);
        }
        validateWrite(name, undefined, m, b);
        if (filter && filter !== MATERIAL_SPACE) return respond([]);
        const result = developmentRoute({name,id,method:m,body:b,db,me,add,now});
        return respond(result.data,result.status);
      }
      // Product records are independent from marketing and the commercial funnel.
      if (["material-products", "material-goals", "material-results"].includes(name)) {
        if (!(isAdmin || me.role === "desenvolvimento") || !allowsStartup(MATERIAL_SPACE))
          return respond({error:"Área de materiais indisponível para este perfil."},403);
        validateWrite(name, undefined, m, b);
        const products=db['material-products'], goals=db['material-goals'], results=db['material-results'];
        const productFor=key=>products.find(x=>x.id===String(key));
        const show=x=>({...x,product_name:productFor(x.product_id)?.name,
          person_name:users.find(u=>u.id===x.user_id)?.name,
          task_title:tasks.find(t=>t.id===x.task_id)?.title,
          goal_title:goals.find(g=>g.id===x.goal_id)?.title});
        const goalValue=g=>results.filter(r=>r.goal_id===g.id&&r.user_id===g.user_id&&r.product_id===g.product_id&&r.occurred_on>=g.start_date&&r.occurred_on<=g.end_date).reduce((n,r)=>n+Number(r.quantity||0),0);
        if(m==='GET'){
          const rows=(filter&&filter!==MATERIAL_SPACE?[]:db[name]).filter(x=>name==='material-products'||isAdmin||x.user_id===me.id);
          const present=x=>name==='material-goals'?{...show(x),done:goalValue(x)}:show(x);
          if(id){const row=rows.find(x=>x.id===id);return row?respond(present(row)):respond({error:'Registro indisponível.'},404)}
          return respond(rows.map(present));
        }
        if(!['POST','PATCH'].includes(m)||p.length>3)return respond({error:'Operação indisponível.'},403);
        if((m==='POST'&&id)||(m==='PATCH'&&!id))throw Error('Operação inválida.');
        const old=id?db[name].find(x=>x.id===id):null;
        if(id&&!old)throw Error('Registro não encontrado.');
        const required=(value,label,max=3000)=>{const str=String(value||'').trim();if(!str||str.length>max)throw Error('Preencha '+label+' (até '+max+' caracteres).');return str};
        const dayValue=(value,label)=>{const str=String(value||'');const dt=new Date(str+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(str)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==str)throw Error('Informe uma data válida para '+label+'.');return str};
        let data;
        if(name==='material-products'){
          const title=required(b.name??old?.name,'o nome do produto',120);
          if(products.some(x=>x.id!==old?.id&&x.name.toLocaleLowerCase('pt-BR')===title.toLocaleLowerCase('pt-BR')))throw Error('Já existe um produto com esse nome.');
          const stage=b.stage||old?.stage||'ideacao';
          if(!['ideacao','pesquisa','prototipo','testes','validacao','finalizado'].includes(stage))throw Error('Selecione uma etapa válida.');
          const description=String(b.description??old?.description??'').trim();
          if(description.length>3000)throw Error('Use até 3.000 caracteres na descrição.');
          data={name:title,stage,description,startup_id:MATERIAL_SPACE,...updateReadiness(old,b,me,now())};
        }else{
          const product=productFor(b.product_id||old?.product_id);
          if(!product)throw Error('Selecione o produto.');
          if(name==='material-goals'){
            if(!isAdmin)return respond({error:'As metas são definidas pela Gestão.'},403);
            const owner=users.find(u=>u.id===String(b.user_id||old?.user_id)&&u.active&&u.role==='desenvolvimento'&&belongsTo(u.id,MATERIAL_SPACE));
            if(!owner)throw Error('Selecione uma pessoa de Desenvolvimento vinculada a Materiais de Palma.');
            const target=Number(b.target??old?.target);
            if(!Number.isFinite(target)||target<=0)throw Error('A quantidade alvo deve ser maior que zero.');
            const start=dayValue(b.start_date||old?.start_date,'o início'),end=dayValue(b.end_date||old?.end_date,'o prazo');
            if(end<start)throw Error('O prazo não pode ser anterior ao início.');
            const unit=required(b.unit??old?.unit,'a unidade',60);
            if(old&&results.some(r=>r.goal_id===old.id)&&
              (product.id!==old.product_id||owner.id!==old.user_id||unit!==old.unit||start!==old.start_date||end!==old.end_date))
              throw Error('Esta meta já possui resultados. Preserve produto, pessoa, unidade e período.');
            data={title:required(b.title??old?.title,'o título da meta',200),product_id:product.id,user_id:owner.id,target,unit,start_date:start,end_date:end,startup_id:MATERIAL_SPACE};
          }else{
            if(m!=='POST')return respond({error:'Resultados preservam o histórico. Adicione um novo registro.'},403);
            const goal=b.goal_id?goals.find(g=>g.id===String(b.goal_id)):null;
            if(b.goal_id&&(!goal||goal.product_id!==product.id))throw Error('A meta deve pertencer ao produto selecionado.');
            const userId=isAdmin?String(b.user_id||goal?.user_id||me.id):me.id;
            if(goal&&goal.user_id!==userId)throw Error('A meta pertence a outra pessoa.');
            if(!isAdmin&&String(b.user_id||me.id)!==me.id)return respond({error:'Registre somente seus próprios resultados.'},403);
            const owner=users.find(u=>u.id===userId&&u.active&&u.role==='desenvolvimento'&&belongsTo(u.id,MATERIAL_SPACE));
            if(!owner)throw Error('Selecione a pessoa responsável pelo resultado.');
            const occurred=dayValue(b.occurred_on,'o resultado');
            if(goal&&(occurred<goal.start_date||occurred>goal.end_date))throw Error('A data precisa estar no período da meta.');
            const quantity=goal?Number(b.quantity):0;
            if(goal&&(!Number.isFinite(quantity)||quantity<=0))throw Error('Informe uma quantidade realizada maior que zero.');
            const task=b.task_id?tasks.find(t=>t.id===String(b.task_id)):null;
            if(b.task_id&&(!task||task.product_id!==product.id||task.assigned_to!==userId))throw Error('A atividade deve ser da mesma pessoa e produto.');
            const experiment=b.experiment_id?db['material-experiments'].find(x=>x.id===String(b.experiment_id)&&x.product_id===product.id):null;
            if(b.experiment_id&&!experiment)throw Error('Selecione um roteiro do mesmo material.');
            const evidence=b.evidence||{},note=String(evidence.note||'').trim(),url=String(evidence.url||'').trim(),file=evidence.file;
            if(!note&&!url&&!file?.data)throw Error('Anexe uma evidência em texto, link ou arquivo.');
            if(note.length>3000)throw Error('A evidência deve ter até 3.000 caracteres.');
            if(url&&!webLink(url))throw Error('Use um link HTTP ou HTTPS para a evidência.');
            if(file&&(!file.name||!file.data||file.data.length>1398104||atob(file.data).length>1048576))throw Error('O arquivo deve ter até 1 MB. Para arquivos maiores, use um link.');
            data={experiment_id:experiment?.id||'',protocol_snapshot:experiment?{id:experiment.id,title:experiment.title,version:experiment.version,objective:experiment.objective,hypothesis:experiment.hypothesis,materials:experiment.materials,procedure:experiment.procedure,success_criteria:experiment.success_criteria}:null,title:required(b.title,'o título do resultado',200),outcome:required(b.outcome,'o resultado observado'),
              method:String(b.method||'').slice(0,3000),next_steps:String(b.next_steps||'').slice(0,3000),
              product_id:product.id,user_id:userId,goal_id:goal?.id||'',task_id:task?.id||'',quantity,unit:goal?.unit||'',
              occurred_on:occurred,evidence:{note,url,...(file?{file:{name:String(file.name).slice(0,200),data:file.data}}:{})},
              startup_id:MATERIAL_SPACE,author:me.name};
          }
        }
        const row=old?Object.assign(old,data,{updated_at:now()}):add(name,data);
        record(name,row,m==='POST'?'Registro de materiais criado':'Registro de materiais atualizado');
        return respond(show(row),m==='POST'?201:200);
      }

      if (name === "follower-readings") {
        if (!canManagePay && !isSocial) return respond({ error: "Acesso indisponível." }, 403);
        if (m === "GET") {
          return respond(db.followerReadings.filter(row =>
            (!filter || row.startup_id === filter) && (canManagePay || row.assigned_to === me.id)
          ).map(row => decorate(name, row)));
        }
        if (!canManagePay) return respond({ error: "Apenas Diego pode validar a contagem de seguidores." }, 403);
        validateWrite(name, undefined, m, b);
        const reading = recordFollowers({ db, body: b, me, users, starts, belongsTo, add, now, webLink });
        return respond(decorate(name, reading), 201);
      }

      if (name === "taskPayments" || (name === "task-payments" && m !== "GET"))
        return respond({ error: "O extrato é gerado pelas avaliações de atividades." }, 403);
      if (name === "task-payments" && m === "GET") {
        if (!canManagePay && !taskPayRoles.includes(me.role))
          return respond({ error: "Extrato indisponível para este perfil." }, 403);
        const visible = row => (!filter || row.startup_id === filter || row.kind === "commercial_monthly") &&
          (canManagePay || row.assigned_to === me.id);
        return respond({
          entries: db.taskPayments.filter(visible).map(x => decorate(name, x)),
          pending: tasks.filter(x => visible(x) && x.pay_terms && !continuousTask(x) &&
            x.status !== "cancelada" && x.pay_review?.status !== "approved").map(x => decorate("tasks", x)),
        });
      }
      if (name === "tasks" && id && p[3] === "review" && m === "POST") {
        if (!canManagePay) return respond({ error: "A avaliação cabe à Gestão." }, 403);
        const task = find();
        if(continuousTask(task))throw new InputError('Avalie cada execução do fluxo, não a atividade principal.');
        if (task?.source === "content_reel") throw new InputError("Avalie a versão na ficha do conteúdo em Marketing.");
        if (!task?.pay_terms || task.status !== "concluida" || !task.evidence_log?.length)
          throw Error("Aguarde a entrega com evidência para avaliar.");
        const existing = db.taskPayments.filter(x => x.task_id === id);
        const approved = task.pay_review?.status === "approved" || existing.some(x => x.kind === "base");
        if (!["changes", "approve", "bonus"].includes(b.decision) || (b.decision === "bonus") !== approved)
          throw Error("Ação indisponível para esta avaliação.");
        const feedback = String(b.feedback || "").trim();
        if (!feedback || feedback.length > 3000) throw Error("Registre a avaliação da qualidade ou os ajustes necessários.");
        const award = b.decision === "bonus" || b.award_bonus === "yes";
        const metric = String(b.metric || "").trim();
        const measurement = String(b.measurement || "").trim();
        const result = String(b.result || "").trim();
        const resultUrl = String(b.result_url || "").trim();
        if (award && (b.decision === "changes" || !task.pay_terms.bonus_cents || existing.some(x => x.kind === "bonus")))
          throw Error("Bonificação indisponível para esta atividade.");
        if (award && (!metric || !measurement || !result || [metric, measurement, result].some(value => value.length > 3000) ||
          (resultUrl && !webLink(resultUrl))))
          throw Error("Para bonificar, informe indicador, resultado medido e como ele foi comprovado.");
        const reviewedAt = now();
        const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
          .format(new Date(reviewedAt)).slice(0, 7);
        const review = { status: b.decision === "changes" ? "changes" : "approved",
          feedback, author: me.name, reviewed_at: reviewedAt, ...(award ? { metric, measurement, result, result_url: resultUrl } : {}) };
        if (b.decision === "changes") {
          task.status = "em_andamento";
          task.completed_at = null;
        }
        const addEntry = (kind, cents) => add("taskPayments", {
          task_id: id, title: task.title, startup_id: task.startup_id,
          assigned_to: task.assigned_to, kind, cents, month, approved_at: reviewedAt,
        });
        if (b.decision === "approve" && task.pay_terms.base_cents) addEntry("base", task.pay_terms.base_cents);
        if (award) addEntry("bonus", task.pay_terms.bonus_cents);
        if (b.decision !== "bonus") task.pay_review = review;
        if (award) task.bonus_review = review;
        task.pay_review_log = [...(task.pay_review_log || []), { ...review, decision: b.decision }];
        record("task", task, b.decision === "changes" ? "Ajustes de qualidade solicitados" :
          b.decision === "bonus" ? "Resultado validado e bônus aprovado" : "Qualidade da entrega aprovada");
        return respond(decorate("tasks", task));
      }

      if (name === "me") return respond({ ...me, memberships: available.map(s => s.id) });
      if (name === "bootstrap") return respond({
        startups: available,
        users: isAdmin ? users : [me],
        templates: isAdmin ? templates : [],
      });
      if (name === "campaign-results" && (isAdmin || isSocial)) {
        const groups = new Map();
        const group = (startup, campaign) => {
          const key = JSON.stringify([startup, campaign.trim().toLowerCase()]);
          if (!groups.has(key)) groups.set(key, {
            id: String(groups.size + 1), startup_id: startup, campaign: campaign.trim(),
            leads: 0, meetings: 0, deals: 0,
          });
          return groups.get(key);
        };
        for (const piece of db.marketing) {
          if (allowsStartup(piece.startup_id) && (!filter || piece.startup_id === filter) && piece.campaign?.trim())
            group(piece.startup_id, piece.campaign);
        }
        for (const lead of leads) {
          if (!allowsStartup(lead.startup_id) || (filter && lead.startup_id !== filter) || !lead.campaign_name?.trim()) continue;
          const row = group(lead.startup_id, lead.campaign_name);
          row.leads++;
          row.meetings += Number(Boolean(lead.meeting_at || lead.meeting_done_at));
          row.deals += deals.filter(d => d.lead_id === lead.id).length;
        }
        return respond([...groups.values()].map(x => decorate(name, x)));
      }
      if (name === "campaign-options" && (isAdmin || isSales)) {
        return respond(db.marketing.filter(x => allowsStartup(x.startup_id) && x.campaign?.trim())
          .map(({id, startup_id, campaign, title}) => ({id, startup_id, campaign, title})));
      }
      const allowed = isAdmin || (isSales && ["leads", "deals", "customers", "reports"].includes(name))
        || (name === "marketing" && (isSocial || isExternal))
        || ["tasks", "goals", "activities", "history"].includes(name);
      if (!allowed || (id && find() && !canSee(name, find())) || (b.startup_id && !allowsStartup(b.startup_id)))
        return respond({ error: "Registro fora do escopo deste perfil." }, 403);
      if (!isAdmin && m !== "GET") {
        const allowedWrite = (isSales && ["leads", "deals"].includes(name) && m !== "DELETE")
          || (name === "marketing" && (isSocial || isExternal) && m !== "DELETE")
          || (name === "tasks" && !id && m === "POST" && Object.keys(b).every(k =>
            ["startup_id", "product_id", "title", "description", "expected_result", "execution_mode", "priority", "planned_date", "due_date", "checklist", "work_started_at", "work_ended_at"].includes(k)))
          || (name === "tasks" && id && find() && (p[3] === "comments" || (p[3] === "attachments" && m === "POST")
            || (!p[3] && m === "PATCH" && Object.keys(b).every(k => ["status", "checklist", "evidence"].includes(k)))))
          || (name === "activities" && m === "POST" && String(b.user_id || me.id) === me.id);
        if (!allowedWrite) return respond({ error: "Ação indisponível para este perfil." }, 403);
      }
      const existing = id ? find() : null;
      if (id && !existing) return respond({ error: "Registro não encontrado." }, 404);
      if(name==='tasks'&&existing?.parent_task_id&&(m==='DELETE'||
        ['startup_id','assigned_to','execution_mode','pay_enabled','pay_base','pay_bonus','pay_quality','pay_result'].some(k=>k in b)))
        throw new InputError('Preserve os dados e valores da execução registrada.');
      if(name==='tasks'&&existing&&tasks.some(t=>t.parent_task_id===id)&&(m==='DELETE'||
        ['startup_id','assigned_to','execution_mode'].some(k=>b[k]&&b[k]!==existing[k])))
        throw new InputError('O fluxo possui execuções. Preserve a pessoa, a startup e o tipo de atividade.');
      if (name === "tasks" && existing && (db["commercial-worklogs"] || []).some(r=>r.task_id===id) &&
        (m === "DELETE" || ["assigned_to","startup_id"].some(k=>b[k]&&b[k]!==existing[k])))
        throw new InputError("Preserve a pessoa e a startup da atividade com horas comerciais registradas.");
      if (name === "tasks" && existing?.source === "content_reel" && ["PATCH", "DELETE"].includes(m))
        throw new InputError("Atualize esta atividade pela ficha do conteúdo em Marketing.");
      if (name !== "history") validateWrite(name, p[3], m, b, existing);
      if (name === "deals" && m === "POST") {
        const lead = leads.find(x => x.id === String(b.lead_id));
        if (!canSee("leads", lead)) return respond({ error: "Contato indisponível." }, 403);
        if (lead.stage === "Clientes") throw Error("O contato já possui contrato.");
        if (lead.proposal && !["enviada", "negociacao"].includes(lead.proposal.status))
          throw Error("A proposta precisa estar enviada ou em negociação para registrar o fechamento.");
      }

      if(name==="finance-context")return respond({scope:filter||"portfolio",monthly:filter?null:financeByMonth(),detail:"Lançamentos realizados do portfólio"});
      if (name === "reports") {
        const f = new Map(),
          c = new Map(),
          sales = new Map();
        for (const x of (isAdmin ? scoped(db.finance, "finance") : []).filter(
          (x) => x.status === "realizado",
        )) {
          const month = x.entry_date.slice(0, 7),
            key = x.startup_id + month + x.entry_type + x.expense_class;
          const v = f.get(key) || {
            startup_id: x.startup_id,
            month,
            entry_type: x.entry_type,
            expense_class: x.expense_class,
            cents: 0,
          };
          v.cents += Number(x.amount_cents);
          f.set(key, v);
        }
        for (const x of scoped(db.leads, "leads")) {
          const month =
              x.first_contact_at?.slice(0, 7) || x.created_at.slice(0, 7),
            key = x.startup_id + month,
            v = c.get(key) || {
              startup_id: x.startup_id,
              month,
              owner_id: x.owner_id,
              contatos: 0,
              reunioes: 0,
            };
          if (x.first_contact_at) v.contatos++;
          if (x.meeting_at) v.reunioes++;
          c.set(key, v);
        }
        for (const x of scoped(db.deals, "deals")) {
          const month = x.closed_at.slice(0, 7),
            key = x.startup_id + month,
            v = sales.get(key) || {
              startup_id: x.startup_id,
              month,
              owner_id: leads.find((l) => l.id === x.lead_id)?.owner_id,
              vendas: 0,
              cents: 0,
            };
          v.vendas++;
          v.cents += Number(x.value_cents);
          sales.set(key, v);
        }
        return respond({
          finance: [...f.values()],
          commercial: [...c.values()],
          sales: [...sales.values()],
        });
      }
      if (name === "history")
        return respond(
          history.filter(
            (x) =>
              canSee(x.entity === "task" ? "tasks" : x.entity, db[x.entity === "task" ? "tasks" : x.entity]?.find(item => item.id === x.entity_id)) &&
              x.entity === url.searchParams.get("entity") &&
              x.entity_id === url.searchParams.get("id"),
          ),
        );
      if (name === "memberships" && m === "PUT") {
        if (!users.some(user => user.id === String(b.userId)) || !Array.isArray(b.startupIds) ||
          b.startupIds.some(id => !starts.some(startup => startup.id === String(id)))) {
          throw new InputError("Selecione uma pessoa e startups válidas.");
        }
        b.startupIds = [...new Set(b.startupIds.map(String))];
        db.memberships.splice(0, db.memberships.length, ...db.memberships.filter(x => String(x.user_id) !== String(b.userId)));
        b.startupIds.forEach((s) =>
          db.memberships.push({
            user_id: String(b.userId),
            startup_id: String(s),
          }),
        );
        return respond({ ok: true });
      }
      if (name === "tasks" && id && p[3] === "comments" && m === "POST") {
        if (!find()) throw Error("Atividade indisponível.");
        return respond(
          add("comments", { task_id: id, content: b.content, author: activeProfile()?.name || "Equipe" }),
          201,
        );
      }
      if (name === "tasks" && id && p[3] === "attachments") {
        if (m === "POST" && String(find()?.assigned_to) === "4") {
          throw new InputError("Registre a data e o link da publicação na entrega.");
        }
        const attachment = p[4] && db.attachments.find(item => item.id === p[4] && item.task_id === id);
        if (p[4] && !attachment) return respond({ error: "Anexo não encontrado." }, 404);
        if (m === "GET") {
          return new Response(attachmentBytes(attachment, 5 * 1024 * 1024), {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(attachment.name.replace(/[\r\n]/g, "")),
            },
          });
        }
        if (m === "POST") {
          const x = add("attachments", {
            task_id: id,
            ...b,
            size_bytes: attachmentBytes(b, 5 * 1024 * 1024).length,
          });
          record("task", find(), "anexo adicionado");
          const { data, ...metadata } = x;
          return respond(metadata, 201);
        }
        if (m === "DELETE") {
          if (db.attachments.some(x => x.id === p[4] && x.task_id === id && x.evidence))
            throw Error("Este arquivo faz parte do registro de evidências.");
          db.attachments.splice(0, db.attachments.length, ...db.attachments.filter(x => x.id !== p[4] || x.task_id !== id));
          return respond({ ok: true });
        }
      }
      if (name === "tasks" && id && m === "GET") {
        const x = find();
        return respond({
          ...decorate(name, x),
          ...(continuousTask(x)?{executions:tasks.filter(t=>t.parent_task_id===id).map(t=>decorate('tasks',t))}:{}),
          comments: comments.filter((x) => x.task_id === id),
          attachments: db.attachments
            .filter((x) => x.task_id === id)
            .map(({ data, ...x }) => x),
          events: history.filter(
            (x) => x.entity === "task" && x.entity_id === id,
          ),
        });
      }
      if (name === "leads" && p[3] === "events") {
        if (m === "GET")
          return respond(
            events
              .filter((x) => x.lead_id === id)
              .map((x) => ({ ...x, person_name: users.find(u => u.id === x.user_id)?.name })),
          );
        const lead = leads.find((x) => x.id === id);
        if (b.type === "contato" && !lead.first_contact_at) {
          lead.first_contact_at = now();
          if (lead.stage === "Lead") lead.stage = "Contactados";
        }
        if (b.type === "proposta") lead.proposal_sent_at = now();
        if (b.type === "reuniao_realizada") lead.meeting_done_at = now();
        if (b.next_contact_at !== undefined)
          lead.next_contact_at = b.next_contact_at;
        return respond(
          add("events", {
            lead_id: id,
            ...b,
            event_type: b.type,
            user_id: me.id,
          }),
          201,
        );
      }
      if (name === "plans" && p[3] === "steps") {
        if (m === "GET") return respond(steps.filter((x) => x.plan_id === id));
        const step = steps.find(item => item.id === p[4] && item.plan_id === id);
        if (!step) return respond({ error: "Etapa não encontrada." }, 404);
        Object.assign(step, b);
        return respond({ ok: true });
      }
      if (name === "invoices" && p[3] === "payments") {
        const inv = invoices.find((x) => x.id === id),
          amount = Math.round(Number(b.amount) * 100);
        if (
          amount <= 0 ||
          amount > Number(inv.amount_cents) - Number(inv.paid_cents)
        )
          throw Error("Valor supera o saldo da parcela");
        inv.paid_cents += amount;
        add("finance", {
          startup_id: inv.startup_id,
          entry_type: "receita",
          status: "realizado",
          description: "Recebimento de contrato",
          amount_cents: amount,
          entry_date: b.paid_on,
          category: "Contratos",
          cost_center: "Comercial",
          source_type: "payment",
        });

        return respond({ ok: true }, 201);
      }
      if (m === "GET") {
        let rows = scoped(db[table] || []);
        if (name === "goals")
          rows = rows.filter(g=>!filter||db.memberships.some(m=>String(m.user_id)===String(g.user_id)&&String(m.startup_id)===filter)).map((g) => {
            const bounds=goalBounds(g);
            const done = activities
              .filter(
                (x) =>
                  x.goal_id === g.id && canSee("activities", x) && (!filter || x.startup_id === filter) && x.occurred_at.slice(0,10)>=bounds.current_from && x.occurred_at.slice(0,10)<bounds.current_to,
              )
              .reduce((n, x) => n + Number(x.quantity), 0);
            return {
              ...g,
              done,
              percent: Math.round((done / Number(g.target)) * 100),
            };
          });
        return respond(rows.map((x) => decorate(name, x)));
      }
      if (m === "DELETE") {
        if (name === "marketing" && existing?.production_task_id)
          throw new InputError("Preserve o conteúdo vinculado à atividade remunerada.");
        if(name==='tasks'&&(existing?.work_started_at||db['material-worklogs'].some(r=>r.task_id===id)))throw new InputError('Esta atividade possui horas registradas.');
        if(name==='tasks'&&db['material-results'].some(r=>r.task_id===id))throw Error('Esta atividade está vinculada a resultados de desenvolvimento e deve ser preservada.');
        if (name === "tasks" && (db.taskPayments.some(x => x.task_id === id) || (find()?.pay_terms && find()?.evidence_log?.length)))
          throw Error("A atividade remunerada integra o histórico de entregas.");
        if (name === "leads" && deals.some((x) => x.lead_id === id))
          throw Error("Lead com contrato deve ser preservado");
        if (name === "finance" && existing?.source_type === "payment") {
          throw new InputError("Recebimentos de contratos são preservados.");
        }
        record(name.replace(/s$/, ""), find(), "excluído");
        db[table].splice(0, db[table].length, ...db[table].filter(x => x.id !== id));
        if (name === "tasks") {
          db.attachments = db.attachments.filter(item => item.task_id !== id);
          db.comments = db.comments.filter(item => item.task_id !== id);
        }
        if (name === "leads") db.events = db.events.filter(item => item.lead_id !== id);
        return respond({ ok: true });
      }
      if (name === "deals" && m === "POST") {
        const lead = leads.find((x) => x.id === String(b.lead_id)),
          value = Math.round(Number(b.value) * 100),
          count = Number(b.installments);
        const deal = add("deals", {
          ...b,
          startup_id: lead.startup_id,
          value_cents: value,
          closed_at: now(),
        });
        lead.stage = "Clientes";
        if (lead.proposal) lead.proposal.status = "fechada";
        if (!customers.some((x) => x.lead_id === lead.id))
          add("customers", {
            lead_id: lead.id,
            startup_id: lead.startup_id,
            name: lead.company || lead.name,
          });
        for (let i = 0; i < count; i++) {
          const date = new Date(b.first_due_date + "T12:00:00Z"),
            day = date.getUTCDate();
          date.setUTCDate(1);
          date.setUTCMonth(date.getUTCMonth() + i);
          const max = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
          ).getUTCDate();
          date.setUTCDate(Math.min(day, max));
          add("invoices", {
            startup_id: lead.startup_id,
            deal_id: deal.id,
            installment: i + 1,
            amount_cents:
              i === count - 1
                ? value - Math.floor(value / count) * i
                : Math.floor(value / count),
            paid_cents: 0,
            due_date: date.toISOString().slice(0, 10),
          });
        }
        return respond(deal, 201);
      }
      const data = { ...b };
      let newCredential;
      if (name === "users") {
        const current = find();
        if (current?.id === "1" && (b.active === false || (b.role && b.role !== "admin"))) {
          throw new InputError("A conta principal de Gestão deve permanecer ativa.");
        }
        data.active = b.active ?? current?.active ?? true;
        if (b.email !== undefined || !current) {
          data.email = normalizeEmail(b.email);
          if (!validEmail(data.email))
            throw Error("Informe um e-mail válido.");
          if (users.some(u => u.id !== current?.id && normalizeEmail(u.email) === data.email))
            throw Error("Este e-mail já está cadastrado.");
        }
        if (!current || b.password) {
          if (typeof b.password !== "string" || b.password.length < 12)
            throw Error("Use pelo menos 12 caracteres na senha.");
          newCredential = await hashPassword(b.password);
        }
        if (data.active && !newCredential && !db.credentials.some(item => item.user_id === current?.id)) {
          throw new InputError("Defina uma senha antes de ativar este perfil.");
        }
        delete data.password;
      }
      for (const k of [
        "startup_id",
        "assigned_to",
        "owner_id",
        "creator_id",
        "user_id",
        "goal_id",
        "template_id",
      ])
        if (data[k]) data[k] = String(data[k]);
      const startupId = data.startup_id || existing?.startup_id;
      if ((data.startup_id || ["tasks","leads","finance","activities","marketing","technology","plans"].includes(name)) &&
          !starts.some(startup => startup.id === startupId)) throw new InputError("Selecione uma startup.");
      if (name === "leads") {
        if (!isAdmin) data.owner_id = me.id;
        const ownerId = data.owner_id || existing?.owner_id || me.id;
        if (!users.some(user => user.id === ownerId && (user.role === "admin" || belongsTo(user.id, startupId)))) {
          throw new InputError("Selecione um responsável vinculado à startup.");
        }
        data.owner_id = ownerId;
      }
      if (name === "goals" && !users.some(user => user.id === (data.user_id || existing?.user_id))) {
        throw new InputError("Selecione uma pessoa válida.");
      }
      if (name === "activities") {
        data.user_id = data.user_id || me.id;
        const person = users.find(user => user.id === data.user_id && user.active);
        if (!person || (person.role !== "admin" && !belongsTo(person.id, startupId))) {
          throw new InputError("Pessoa sem vínculo com a startup.");
        }
        if (data.goal_id) {
          const goal = db.goals.find(item => item.id === data.goal_id && item.user_id === person.id && item.active);
          if (!goal) throw new InputError("Selecione uma meta ativa desta pessoa.");
          data.metric = goal.metric;
        }
      }
      if (name === "plans") {
        if (!templates.some(template => template.id === data.template_id)) throw new InputError("Selecione um modelo válido.");
        if (!users.some(user => user.id === data.owner_id && (user.role === "admin" || belongsTo(user.id, startupId)))) {
          throw new InputError("Selecione um responsável vinculado à startup.");
        }
      }
      if (name === "finance") {
        if (existing?.source_type === "payment") throw new InputError("Recebimentos de contratos são preservados.");
        data.amount_cents =
          b.amount === undefined
            ? find()?.amount_cents
            : Math.round(Number(b.amount) * 100);
      }
      if (name === "leads") {
        if (b.estimated_value !== undefined)
          data.estimated_value_cents = Math.round(
            Number(b.estimated_value) * 100,
          );
        if (
          b.stage === "Reunião marcada" &&
          !b.meeting_at &&
          !find()?.meeting_at
        )
          throw Error("Informe a data da reunião");
        if (b.stage === "Clientes" && find()?.stage !== "Clientes")
          throw Error("Registre o fechamento no Comercial");
      }
      if (name === "leads" && data.proposal) {
        const lead = find(), next = data.proposal, old = lead?.proposal;
        if (!lead || lead.stage === "Clientes") throw Error("Proposta de contrato fechado é somente para consulta.");
        if (next.url && !webLink(next.url)) throw Error("Use um link HTTP ou HTTPS para a proposta.");
        if (next.status === "perdida" && !next.loss_reason?.trim()) throw Error("Informe o motivo da perda.");
        if (!isAdmin && next.status === "liberada" && old?.status !== "liberada") throw Error("A validação é feita pela Gestão.");
        if (next.status === "aguardando_validacao" && (!next.url || !Number(next.value) || !next.valid_until))
          throw Error("Preencha link, valor e validade antes de enviar para validação.");
        if (old?.status === "aguardando_validacao" && !isAdmin && next.status !== "rascunho_proposta")
          throw Error("Aguarde a validação da Gestão ou volte a proposta para rascunho.");
        if (["enviada", "negociacao"].includes(next.status) && !["liberada", "enviada", "negociacao"].includes(old?.status))
          throw Error("A Gestão precisa liberar a proposta antes do envio.");
        if (next.status === "liberada" && !["aguardando_validacao", "liberada"].includes(old?.status))
          throw Error("A proposta precisa estar aguardando validação.");
        if (["enviada", "negociacao", "liberada"].includes(next.status) &&
          ["url", "value", "valid_until"].some(key => String(next[key] ?? "") !== String(old?.[key] ?? "")))
          throw Error("Alterações de link, valor ou validade precisam passar por nova validação.");
        if (next.status === "enviada") data.proposal_sent_at = lead.proposal_sent_at || now();
        next.updated_at = now();
        next.updated_by = me.name;
      }
      if (name === "marketing") {
        const piece = find();
        if(b.paid_production!==undefined&&(piece||!canManagePay))throw new InputError('Diego define a remuneração opcional ao criar o conteúdo.');
        if(b.paid_production==='yes'&&b.format!=='reel')throw new InputError('O valor opcional de R$ 100 se aplica à produção de um Reel.');
        if (p[3] === "workflow" && m === "POST") {
          if (!piece) throw Error("Conteúdo indisponível.");
          const versions = piece.versions || [];
          const stage = piece.workflow || "planejamento";
          const creator = isAdmin || piece.creator_id === me.id;
          const canPublish = isAdmin || isSocial;
          const action = b.action;
          if (piece.production_task_id && ["approve", "changes"].includes(action) && !canManagePay)
            return respond({ error: "Diego avalia a qualidade dos Reels remunerados." }, 403);
          if (action === "submit" && creator && ["planejamento", "producao", "ajustes_solicitados"].includes(stage)) {
            if (!b.url && !b.file?.data) throw Error("Adicione o link ou arquivo da entrega.");
            if (b.url && !webLink(b.url)) throw Error("Use um link HTTP ou HTTPS.");
            if (b.file?.data && b.file.data.length > 1500000) throw Error("Use um link para arquivos acima de 1 MB.");
            const version = { id: String(++snapshot.sequence), number: versions.length + 1, url: b.url,
              file: b.file, note: b.note, author: me.name, created_at: now() };
            piece.versions = [...versions, version];
            piece.workflow = "revisao";
            piece.status = "em_revisao";
          } else if (["approve", "changes"].includes(action) && isAdmin && stage === "revisao") {
            if (action === "approve" && !versions.length) throw Error("Solicite o arquivo ou link da versão antes da aprovação.");
            if (action === "changes" && !b.note?.trim()) throw Error("Informe os ajustes solicitados.");
            piece.workflow = action === "approve" ? "aprovacao" : "ajustes_solicitados";
            piece.status = action === "approve" ? "aprovado" : "ajustes";
            piece.approved_version = action === "approve" ? versions.at(-1)?.id : null;
          } else if (["schedule", "publish"].includes(action) && canPublish && ["aprovacao", "publicacao"].includes(stage)) {
            if (!b.network || !b.account?.trim() || !b.caption?.trim()) throw Error("Informe rede, conta e legenda.");
            if (action === "schedule" && !b.scheduled_at) throw Error("Informe a data e a hora planejadas.");
            if (action === "publish" && (!b.published_at || !webLink(b.post_url)))
              throw Error("Informe a data efetiva e um link válido da publicação.");
            if (b.scheduled_at) piece.planned_date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(b.scheduled_at));
            const publication = {
              network: b.network, account: b.account, caption: b.caption,
              scheduled_at: b.scheduled_at || piece.publication?.scheduled_at || "",
              ...(action === "publish" ? { published_at: b.published_at, post_url: b.post_url } : {}),
            };
            piece.publication = { ...piece.publication, ...publication };
            if (action === "publish") {
              piece.workflow = "publicacao";
              piece.status = "publicado";
              scheduleReposts(piece, me, users, belongsTo, add, tasks, db.marketing);
              for (const key of ["reach", "engagement", "leads_generated"]) piece[key] = Number(b[key]) || 0;
            }
          } else {
            throw Error("Ação indisponível nesta etapa.");
          }
          reviewReel(piece, action, me, db, add, now, b.note);
          const description = {submit: "Versão enviada para revisão", approve: "Versão aprovada", changes: "Ajustes solicitados", schedule: "Planejamento de publicação salvo", publish: "Publicação registrada"}[action];
          piece.workflow_log = [...(piece.workflow_log || []), { action: description,
            version: piece.versions?.at(-1)?.number, note: b.note, author: me.name, created_at: now() }];
          record("marketing", piece, description);
          return respond(decorate(name, piece));
        }
        if (isExternal) throw Error("A Gestão edita o briefing das demandas externas.");
        if (piece?.production_task_id && ((data.format && data.format !== piece.format) ||
          (data.creator_id && data.creator_id !== piece.creator_id)))
          throw new InputError("Preserve o formato e o responsável do Reel contratado.");
        if (piece && !isAdmin && piece.creator_id !== me.id) throw Error("A ficha pertence a outra pessoa.");
        if (piece && !["planejamento", "producao", "ajustes_solicitados"].includes(piece.workflow))
          throw Error("A ficha está em revisão ou publicação.");
        if (!isAdmin) data.creator_id = me.id;
        const startup = piece?.startup_id || data.startup_id;
        const creator = users.find(u => u.id === (data.creator_id || piece?.creator_id) && u.active);
        if (!creator || !["admin", "marketing", "marketing_externo"].includes(creator.role) ||
          (creator.role !== "admin" && !belongsTo(creator.id, startup)))
          throw Error("Selecione um responsável de marketing vinculado à startup.");
        if(b.paid_production==='yes'&&!['marketing','marketing_externo'].includes(creator.role))throw new InputError('Atribua a produção remunerada a Social Media ou Marketing externo.');
        if (piece) delete data.startup_id;
        if (!startup || !starts.some(s => s.id === startup)) throw Error("Selecione a startup.");
        data.workflow = piece?.workflow || "planejamento";
        if (data.workflow === "planejamento" && data.production_started) data.workflow = "producao";
        data.status = { planejamento: "rascunho", producao: "ajustes", ajustes_solicitados: "ajustes" }[data.workflow];
        delete data.production_started;
      }

      if (name === "technology" && data.status === "concluido")
        data.delivered_at = now();
      if(name==='tasks'&&existing&&(existing.work_started_at||db['material-worklogs'].some(r=>r.task_id===existing.id))){
        if(m==='DELETE'||['startup_id','assigned_to','product_id'].some(k=>data[k]&&data[k]!==existing[k]))throw new InputError('Preserve o material e a pessoa da atividade com horas registradas.');
      }
      let completion;
      if (name === "tasks") {
        const previous = find();
        if (!id && m === "POST") {
          if (!starts.some(startup => startup.id === data.startup_id)) throw Error("Selecione uma startup.");
          if (!String(data.title || "").trim()) throw Error("Informe o título.");
          data.title = data.title.trim();
          data.creator_id = me.id;
          data.assigned_to = data.assigned_to || me.id;
          if (!isAdmin) {
            data.assigned_to = me.id;
            data.status = "pendente";
          }
          data.source = data.assigned_to === me.id ? "propria" : "gestao";
        } else {
          delete data.creator_id;
          delete data.source;
        }
        const owner = users.find(user => user.id === (data.assigned_to || previous?.assigned_to));
        if (!owner || (owner.role !== "admin" && !belongsTo(owner.id, startupId))) {
          throw new InputError("Selecione um responsável vinculado à startup.");
        }
        const mode=data.execution_mode||previous?.execution_mode||'pontual';
        if(data.execution_mode==='continuo'&&!previous&&!['admin','marketing','marketing_externo'].includes(me.role))throw new InputError('A Gestão e os perfis de Marketing podem criar fluxos contínuos.',403);
        if(previous&&data.execution_mode&&data.execution_mode!==(previous.execution_mode||'pontual')&&(previous.evidence_log?.length||previous.pay_review))throw new InputError('Preserve o tipo da atividade que já teve entrega registrada.');
        if(mode==='continuo'&&data.status==='concluida'&&previous?.status!=='concluida')throw new InputError('Registre uma execução ou use Encerrar fluxo.');
        if(previous?.flow_closed_at&&data.status&&data.status!==previous.status)throw new InputError('O fluxo foi encerrado. Crie uma nova atividade para retomar o trabalho.');
        if(mode==='continuo'&&previous&&data.status&&!isAdmin&&previous.creator_id!==me.id&&
          (data.status==='cancelada'||previous.status==='cancelada'&&data.status!==previous.status))
          throw new InputError('A Gestão ou quem criou a atividade pode cancelar ou retomar este fluxo.',403);
        if(!previous&&mode==='continuo'&&(!data.status||data.status==='pendente'))data.status='em_andamento';
        const hasWork = b.work_started_at || b.work_ended_at;
        delete data.work_started_at;
        delete data.work_ended_at;
        if (hasWork) {
          if (previous) throw new InputError("Registre novos períodos em Horas de trabalho.");
          if (startupId !== MATERIAL_SPACE || !data.product_id) throw new InputError("Selecione uma atividade de desenvolvimento de material.");
          const interval = workInterval(b.work_started_at, b.work_ended_at);
          assertNoOverlap(db, owner.id, interval);
          Object.assign(data, interval);
        }
        delete data.pay_terms;
        delete data.pay_review;
        delete data.pay_review_log;
        delete data.bonus_review;
        for (const field of ["pay_enabled", "pay_base", "pay_bonus", "pay_quality", "pay_result"]) delete data[field];
        const updatesTerms = ["pay_enabled", "pay_base", "pay_bonus", "pay_quality", "pay_result"].some(field => field in b);
        const payLocked = previous?.evidence_log?.length || previous?.pay_review;
        const paid = previous?.pay_review?.status === "approved";
        if (paid && ((data.status && data.status !== "concluida") ||
          ["startup_id", "assigned_to"].some(field => data[field] && data[field] !== previous[field])))
          throw Error("A aprovação já foi registrada no extrato desta atividade.");
        if (payLocked && previous?.pay_terms && ["startup_id", "assigned_to"]
          .some(field => data[field] && data[field] !== previous[field]))
          throw Error("A entrega já foi registrada para esta pessoa e startup.");
        if (previous?.source === "story_repost" && updatesTerms) {
          throw new InputError("Repostagens automáticas são atividades sem remuneração.");
        }
        if (updatesTerms) {
          if (!canManagePay || (previous && previous.creator_id !== "1") || payLocked)
            throw Error("A remuneração só pode ser definida pelo Diego em atividades que ele criou e que ainda não foram entregues.");
          const cents = value => {
            const text = String(value || "0").trim();
            if (!/^\d{1,9}(?:[.,]\d{1,2})?$/.test(text)) throw Error("Informe um valor em reais com até duas casas decimais.");
            return Math.round(Number(text.replace(",", ".")) * 100);
          };
          const base_cents = b.pay_enabled==='no'?0:cents(b.pay_base), bonus_cents = b.pay_enabled==='no'?0:cents(b.pay_bonus);
          const quality = String(b.pay_quality || "").trim(), result = String(b.pay_result || "").trim();
          const owner = users.find(person => person.id === (data.assigned_to || previous?.assigned_to));
          if (owner.role === "comercial" && !previous?.pay_terms && (base_cents || bonus_cents))
            throw new InputError("O Comercial segue a remuneração mensal de R$ 1.500 para 20 horas semanais. Acompanhe em Horas e resultados.");
          if ((base_cents||bonus_cents) && !taskPayRoles.includes(owner?.role))
            throw Error("Atribua a atividade remunerada a um perfil de Comercial, Social Media ou Marketing externo.");
          if ((base_cents||bonus_cents) && !belongsTo(owner.id, data.startup_id || previous?.startup_id))
            throw Error("O responsável precisa estar vinculado à startup da atividade.");
          if (((base_cents||bonus_cents) && !quality) || (bonus_cents && !result))
            throw Error("Informe o critério de qualidade e, para a bonificação, o resultado esperado.");
          if(b.pay_enabled==='yes'&&!base_cents&&!bonus_cents)throw new InputError('Informe um valor base ou uma bonificação, ou desmarque a remuneração.');
          data.pay_terms = base_cents||bonus_cents ? { base_cents, bonus_cents, quality, result } : null;
        } else if (previous?.pay_terms && ["startup_id", "assigned_to"].some(field => data[field] && data[field] !== previous[field])) {
          throw Error("Revise a remuneração ao mudar o responsável ou a startup.");
        }
        delete data.completed_at;
        delete data.evidence_log;
        delete data.evidence;
        if (data.status === "concluida" && (previous?.status !== "concluida" || b.evidence)) {
          if (!previous || previous.status === "cancelada") throw Error("Abra uma atividade ativa para registrar a evidência.");
          const evidence = b.evidence || {};
          let publication = {};
          if (String(owner.id) === "4") {
            const day = evidence.published_on;
            const currentDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
            const parsed = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
              ? new Date(day + "T12:00:00Z") : null;
            if (!parsed || !Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== day || day > currentDay) {
              throw new InputError("Informe uma data válida de publicação até hoje.");
            }
            if (typeof evidence.url !== "string" || evidence.url.length > 3000 || !webLink(evidence.url.trim())) {
              throw new InputError("Informe o link HTTP ou HTTPS da publicação.");
            }
            if (evidence.file) throw new InputError("Use o link da publicação como evidência.");
            publication = { published_on: day };
          }
          const note = String(evidence.note || "").trim();
          const url = String(evidence.url || "").trim();
          const file = evidence.file;
          if (!note && !url && !file?.data) throw Error("Inclua texto, link ou arquivo como evidência.");
          if (url && !webLink(url)) throw Error("Informe um link HTTP ou HTTPS.");
          if (note.length > 3000) throw Error("A descrição deve ter até 3.000 caracteres.");
          if (file && (!file.name || !file.data || file.data.length > 1398104 || atob(file.data).length > 1048576))
            throw Error("O arquivo da evidência deve ter até 1 MB. Para arquivos maiores, use um link.");
          const reportedResult = previous.pay_terms?.bonus_cents ? String(evidence.result || "").trim() : "";
          if (reportedResult.length > 3000) throw Error("O resultado deve ter até 3.000 caracteres.");
          completion = { ...publication, note, url, file, result: reportedResult, author: me.name, created_at: now() };
          data.completed_at = previous.status !== "concluida"
            ? completion.created_at : previous.completed_at ?? null;
          if (previous.pay_terms && previous.pay_review?.status !== "approved")
            data.pay_review = { status: "pending" };
        } else if (data.status && data.status !== "concluida") {
          data.completed_at = null;
        }
      }
      if(name==='tasks'){
        const previous=find(),workspace=data.startup_id||previous?.startup_id;
        const productId=String(data.product_id??previous?.product_id??'');
        if(workspace===MATERIAL_SPACE){
          const product=db['material-products'].find(x=>x.id===productId);
          if(!product)throw Error('Selecione o produto desta atividade.');
          const owner=users.find(x=>x.id===(data.assigned_to||previous?.assigned_to));
          if(!owner?.active||!belongsTo(owner.id,MATERIAL_SPACE))throw Error('O responsável precisa estar vinculado a Materiais de Palma.');
          data.product_id=productId;
        }else if(productId)throw Error('O produto deve pertencer à área Materiais de Palma.');
        if(previous&&(previous.evidence_log?.length||db['material-results'].some(r=>r.task_id===previous.id))&&productId!==String(previous.product_id||''))throw Error('Uma atividade com evidências ou resultados não pode mudar de produto.');
        if(previous?.product_id&&db['material-results'].some(r=>r.task_id===previous.id)&&['assigned_to','startup_id'].some(k=>data[k]&&data[k]!==previous[k]))throw Error('Preserve a pessoa e o projeto da atividade vinculada a resultados.');
      }
      let x;
      if (m === "PATCH") {
        x = find();
        if (!x) throw Error("Registro não encontrado");
        Object.assign(x, data);
      } else {
        x = add(table, {
          ...({
            tasks: { status: "pendente", priority: "media", checklist: [] },
            leads: { stage: "Lead", owner_id: "1" },
            marketing: { reach: 0, engagement: 0, leads_generated: 0 },
            technology: { progress: 0 },
            activities: { occurred_at: now() },
            goals: { active: true },
          }[table] || {}),
          ...data,
        });
      }
      if (completion) {
        const { file, ...evidence } = completion;
        if (file) {
          const attachment = add("attachments", {
            task_id: x.id, name: file.name, data: file.data, mime_type: "application/octet-stream",
            size_bytes: atob(file.data).length, evidence: true,
          });
          evidence.attachment_id = attachment.id;
        }
        x.evidence_log = [...(x.evidence_log || []), evidence];
      }
      if (name === "marketing") {
        if (m === "POST") commissionReel(x, me, users, add);
        const production = tasks.find(task => task.id === x.production_task_id);
        if (production) {
          production.title = "Produzir Reel · " + x.title.slice(0, 175);
          production.planned_date = production.due_date = x.delivery_due || x.planned_date;
        }
      }
      if (newCredential) {
        const index = db.credentials.findIndex(entry => entry.user_id === x.id);
        const entry = { user_id: x.id, ...newCredential };
        if (index < 0) db.credentials.push(entry);
        else db.credentials[index] = entry;
      }
      if (name === "plans" && m === "POST") {
        const template = templates.find((x) => x.id === String(b.template_id));
        template.steps.forEach((title, i) =>
          add("steps", {
            plan_id: x.id,
            title,
            position: i + 1,
            status: "pendente",
            due_date: b.due_date,
          }),
        );
      }
      record(
        name === "tasks" ? "task" : name,
        x,
        completion ? "Evidência de realização registrada" : m === "POST" ? "criado" : "atualizado",
      );
      return respond(decorate(name, x), m === "POST" ? 201 : 200);
    } catch (err) {
      if (err instanceof InputError) return respond({ error: err.message }, err.status);
      if (err instanceof TypeError || err instanceof RangeError || err.name === "InvalidCharacterError") {
        return respond({ error: "Confira os campos enviados." }, 400);
      }
      return respond({ error: err.message }, 400);
    }
  }
  return handle;
}
