import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { start } from "../src/server.mjs";
import { useWorkspace } from "../src/database.mjs";
import { commercialRoute } from "../src/commercial-work.mjs";

const connection = process.env.TEST_DATABASE_URL;
const origin = "https://workspace.example.test";
const date = "2026-11-13";
const password = randomBytes(20).toString("hex");

test("API, login, registros e regras de negócio em PostgreSQL", { skip: !connection }, async t => {
  const database = "workspace_test_" + randomBytes(6).toString("hex");
  const admin = new pg.Client({ connectionString: connection });
  await admin.connect();
  await admin.query('CREATE DATABASE "' + database + '"');
  const url = new URL(connection);
  url.pathname = "/" + database;
  const env = {
    DATABASE_URL: url.href, APP_ORIGIN: origin, PORT: "0", HOST: "127.0.0.1",
    ADMIN_EMAIL: "diego@example.test", ADMIN_PASSWORD: password,
  };
  let app;
  t.after(async () => {
    if (app) await app.close();
    await admin.query('DROP DATABASE "' + database + '" WITH (FORCE)');
    await admin.end();
  });
  await assert.rejects(start({ ...env, ADMIN_PASSWORD: "" }), /primeira implantação/);
  app = await start(env);
  const base = () => "http://127.0.0.1:" + app.server.address().port;
  const req = async (path, method = "GET", body, cookie, expected = 200, requestOrigin = origin) => {
    const headers = { Origin: requestOrigin };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(base() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, expected, method + " " + path + " " + (await response.clone().text()).slice(0, 250));
    return response;
  };
  const api = async (path, method, body, cookie, expected) =>
    (await req("/api/" + path, method, body, cookie, expected)).json();
  const login = async email => {
    const response = await req("/api/auth/login", "POST", { email, password });
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /^__Host-workspace_session=/);
    assert.match(cookie, /HttpOnly.*SameSite=Strict.*Secure/);
    return cookie.split(";")[0];
  };
  const read = (path, cookie) => api(path, "GET", undefined, cookie);
  const post = (path, body, cookie, status = 201) => api(path, "POST", body, cookie, status);
  const patch = (path, body, cookie, status = 200) => api(path, "PATCH", body, cookie, status);

  await req("/healthz");
  const html = await (await req("/")).text();
  assert.match(html, /src="\/app.js"/);
  assert.match(html, /href="\/activities.css"/);
  const activityCss=await req("/activities.css");assert.match(activityCss.headers.get("content-type"),/text\/css/);
  assert.match(await activityCss.text(),/activity-mobile-shell/);
  assert.doesNotMatch(html, /workspace-startups-v2|coleta-prospeccao-/);
  assert.doesNotMatch(await (await req("/app.js")).text(), /window\.fetch\s*=/);
  await req("/src/seed.json", "GET", undefined, undefined, 404);
  await api("me", "GET", undefined, undefined, 401);
  await post("auth/login", {email:"diego@workspace.exemplo",password:"Demo-Diego-2026!"}, undefined, 401);
  const diego = await login(env.ADMIN_EMAIL);
  await req("/api/auth/logout", "POST", undefined, diego, 403, "https://other.example.test");
  const seed = await read("bootstrap", diego);
  assert.equal(seed.users.length, 5);
  assert.equal(seed.users.filter(user => user.active).length, 1);
  assert.equal((await read("leads", diego)).length, 93);
  assert.equal((await read("finance", diego)).length, 0);
  assert.equal((await read("tasks", diego)).length, 12);
  assert.equal((await read("material-products", diego)).length, 3);
  assert.equal((await read("templates", diego)).length > 0, true);

  const sessions = {};
  for (const user of seed.users.filter(user => user.id !== "1")) {
    const email = user.name.toLowerCase() + "@example.test";
    await patch("users/" + user.id, { email, active: true, password }, diego);
    sessions[user.name] = await login(email);
  }
  const { Eduarda: eduarda, Larissa: larissa, Annike: annike, Vanessa: vanessa } = sessions;
  const startup = seed.startups.find(item => item.name === "Coleta Certa").id;
  const leads = await read("leads?startupId=" + startup, eduarda);
  assert.equal(leads.length, 93);
  assert.equal(leads.every(lead => lead.owner_id === "2" && lead.stage === "Lead"), true);
  await api("leads", "GET", undefined, larissa, 403);
  await api("finance", "GET", undefined, eduarda, 403);
  await api("material-results", "GET", undefined, annike, 403);
  await api("credentials", "GET", undefined, diego, 404);
  await api("tasks/inexistente/attachments", "POST", {name:"x",data:"QQ=="}, eduarda, 403);

  const lead = leads[0];
  await post("leads/" + lead.id + "/events", {type:"contato",note:"Primeira abordagem"}, eduarda);
  const proposal = { url: "https://example.test/proposta", value: "400", valid_until: "2026-12-31", note: "Em revisão" };
  await patch("leads/" + lead.id, {proposal:{...proposal,status:"aguardando_validacao"}}, eduarda);
  await patch("leads/" + lead.id, {proposal:{...proposal,status:"liberada"}}, diego);
  await patch("leads/" + lead.id, {proposal:{...proposal,status:"enviada"}}, eduarda);
  const deal = await post("deals", {lead_id:lead.id,title:"Contrato",value:"400",installments:"2",first_due_date:date}, eduarda);
  const invoices = (await read("invoices", diego)).filter(invoice => invoice.deal_id === deal.id);
  assert.equal(invoices.length, 2);
  const pay = () => fetch(base()+"/api/invoices/"+invoices[0].id+"/payments", {
    method:"POST", headers:{Origin:origin,Cookie:diego,"Content-Type":"application/json"},
    body:JSON.stringify({amount:200,paid_on:date}),
  });
  const payments = await Promise.all([pay(),pay()]);
  assert.deepEqual(payments.map(response=>response.status).sort(), [201,400]);
  assert.equal((await read("finance",diego)).length,1);
  assert.equal((await read("finance-context",diego)).monthly[0].income_cents,20000);
  assert.equal((await read("finance-context",diego)).monthly[0].expense_cents,null);

  const task = await post("tasks", {startup_id:startup,assigned_to:"2",title:"Teste de entrega",priority:"alta"}, diego);
  await post("tasks", {startup_id:startup,assigned_to:"2",title:"Modelo antigo bloqueado",pay_base:"80",pay_quality:"Relatório"}, diego,400);
  // An existing paid task from the previous release keeps its agreed terms.
  const legacyClient=new pg.Client({connectionString:url.href});
  await legacyClient.connect();
  await legacyClient.query("UPDATE workspace_records SET data=data || jsonb_build_object('pay_terms',$1::jsonb) WHERE collection='tasks' AND record_key=$2",[JSON.stringify({base_cents:8000,bonus_cents:1000,quality:"Relatório",result:"Resultado comprovado"}),task.id]);
  await legacyClient.end();
  await api("tasks/"+task.id,"GET",undefined,annike,403);
  await patch("tasks/"+task.id,{status:"concluida"},eduarda,400);
  const finished = await patch("tasks/"+task.id,{status:"concluida",evidence:{note:"Concluído",file:{name:"Relatório.txt",data:"T2s="}}},eduarda);
  const download = "tasks/"+task.id+"/attachments/"+finished.evidence_log[0].attachment_id;
  await api(download,"GET",undefined,annike,403);
  const file = await req("/api/"+download,"GET",undefined,eduarda);
  assert.equal(await file.text(),"Ok");
  assert.match(file.headers.get("content-disposition"),/^attachment/);
  await post("tasks/"+task.id+"/review",{decision:"approve",feedback:"Aprovada"},diego,200);
  assert.equal((await read("task-payments",eduarda)).entries[0].cents,8000);
  assert.equal((await read("task-payments",larissa)).entries.length,0);

  const commercialTask=await post("tasks",{startup_id:startup,assigned_to:"2",title:"Retornos comerciais",expected_result:"Avançar os contatos para reunião"},diego);
  const workPeriod={task_id:commercialTask.id,work_started_at:"2026-11-16T08:00:00-03:00",work_ended_at:"2026-11-16T10:00:00-03:00",note:"Retornos aos contatos",metric:"contatos",quantity:4,result:"Contato pediu apresentação; agendar reunião."};
  const commercialLog=await post("commercial-worklogs",workPeriod,eduarda);
  const preference={task_id:commercialTask.id,starred:true};
  await api("task-preferences","PUT",preference,eduarda,200);
  await api("task-preferences","PUT",{...preference,starred:false},annike,403);
  assert.equal((await read("task-preferences",annike)).length,0);
  await post("commercial-worklogs",workPeriod,eduarda,400);
  await api("commercial-worklogs","GET",undefined,annike,403);
  await api("commercial-reports?userId=3","GET",undefined,eduarda,403);
  const hoursReport=(await read("commercial-reports?month=2026-11",eduarda))[0];
  assert.equal(hoursReport.monthly_minutes,120);assert.equal(hoursReport.weekly_minutes,1200);assert.equal(hoursReport.monthly_cents,150000);
  await post("commercial-settlements",{user_id:"2",month:"2026-11",decision:"approve",feedback:"Revisado"},eduarda,403);
  await post("commercial-settlements",{user_id:"2",month:"2026-11",decision:"changes",feedback:"Detalhar próximos passos de cada retorno"},diego,200);

  const product = (await read("material-products",vanessa))[0];
  const materialGoal = await post("material-goals", {product_id:product.id,user_id:"vanessa-materials",title:"Testar material",target:2,unit:"ensaios",start_date:date,end_date:"2026-12-31"}, diego);
  await post("material-results", {product_id:product.id,goal_id:materialGoal.id,title:"Ensaio",outcome:"Observação técnica",occurred_on:date,quantity:1,evidence:{note:"Relatório do ensaio"}},vanessa);
  assert.equal((await read("material-goals",vanessa))[0].done,1);

  const experiment = await post("material-experiments", {
    product_id:product.id,title:"Teste de formulação",objective:"Avaliar absorção",materials:"Palma e água",
    procedure:"Preparar e medir",success_criteria:"Volume previsto",
  },vanessa);
  await patch("material-products/"+product.id,{trl:"2",trl_reason:"Conceito definido"},vanessa);
  await post("material-results",{product_id:product.id,experiment_id:experiment.id,title:"Ensaio com roteiro",outcome:"Medida registrada",occurred_on:date,evidence:{note:"Relatório"}},vanessa);
  await patch("material-experiments/"+experiment.id,{procedure:"Procedimento revisado"},vanessa);
  const workTask=await post("tasks",{startup_id:"materials-palma",product_id:product.id,title:"Preparar formulação",work_started_at:"2025-11-21T08:00:00-03:00",work_ended_at:"2025-11-21T09:30:00-03:00"},vanessa);
  await post("material-worklogs",{product_id:product.id,task_id:workTask.id,experiment_id:experiment.id,note:"Análise",work_started_at:"2025-11-21T10:00:00-03:00",work_ended_at:"2025-11-21T10:45:00-03:00"},vanessa);
  const piece = await post("marketing",{startup_id:startup,creator_id:"3",title:"Vídeo",format:"video"},diego);
  await post("marketing/"+piece.id+"/workflow",{action:"submit",url:"https://example.test/video"},larissa,200);
  await post("marketing/"+piece.id+"/workflow",{action:"approve"},diego,200);
  await post("marketing/"+piece.id+"/workflow",{action:"publish",network:"Instagram",account:"@coleta",caption:"Conteúdo",published_at:date+"T15:00:00Z",post_url:"https://example.test/publicacao",reach:"100"},larissa,200);
  assert.equal((await read("marketing",larissa))[0].status,"publicado");
  assert.equal((await read("tasks", larissa)).filter(task => task.source === "story_repost").length, 0);
  const reel = await post("marketing",{startup_id:startup,creator_id:"3",title:"Reel teste",format:"reel"},diego);
  const reelRoute = "marketing/" + reel.id + "/workflow";
  await post(reelRoute, {action:"submit",url:"https://example.test/reel"},larissa,200);
  assert(reel.production_task_id);
  const approveReel = () => fetch(base()+"/api/"+reelRoute, {method:"POST", headers:{Origin:origin,Cookie:diego,"Content-Type":"application/json"},body:JSON.stringify({action:"approve"})});
  const approvals = await Promise.all([approveReel(),approveReel()]);
  assert.deepEqual(approvals.map(r=>r.status).sort(),[200,400]);
  assert.equal((await read("task-payments",larissa)).entries.filter(x=>x.kind==="base").length,1);
  const publication = {action:"publish",network:"Instagram",account:"@coleta",caption:"Reel",
    published_at:"2090-11-14T01:30:00Z",post_url:"https://example.test/reel-publicado"};
  await post(reelRoute, publication,larissa,200);
  await post(reelRoute, publication,larissa,200);
  const reposts = (await read("tasks",larissa)).filter(task => task.source === "story_repost");
  assert.deepEqual(reposts.map(task => task.planned_date).sort(),["2090-11-14","2090-11-16","2090-11-20","2090-11-27","2090-12-04","2090-12-11"]);
  assert(reposts.every(task => task.assigned_to === "3" && task.source_url === publication.post_url && !task.pay_terms));
  await patch("tasks/"+reposts[0].id,{pay_base:"20"},diego,400);
  const completedRepost = reposts.find(task=>task.repost_offset===7);
  await patch("tasks/"+completedRepost.id,{status:"concluida",evidence:{note:"Repostado nos Stories"}},larissa);
  assert.equal((await read("task-payments",larissa)).entries.filter(x=>x.kind==="followers").length,0);
  const reading = {startup_id:startup,assigned_to:"3",account:"@Coleta",followers:8000};
  await post("follower-readings",reading,larissa,403);
  await api("follower-readings","GET",undefined,eduarda,403);
  assert.equal((await post("follower-readings",reading,diego)).growth,0);
  assert.equal((await post("follower-readings",{...reading,account:"coleta",followers:8600},diego)).growth,600);
  await post("follower-readings",{...reading,followers:8150},diego);
  assert.equal((await post("follower-readings",{...reading,followers:8600},diego)).growth,0);
  assert.equal((await read("task-payments",larissa)).entries.filter(x=>x.kind==="followers").length,0);
  const threshold = { ...reading, followers: 9050 };
  const readings = await Promise.all([post("follower-readings",threshold,diego),post("follower-readings",threshold,diego)]);
  assert.deepEqual(readings.map(row => row.blocks).sort(),[0,1]);
  const followerPayments = (await read("task-payments",larissa)).entries.filter(x=>x.kind==="followers");
  assert.deepEqual(followerPayments.map(row=>[row.kind,row.cents,row.follower_count]),[["followers",50000,1000]]);
  assert.equal((await read("follower-readings",larissa)).length,6);
  const roadmap=await post("technology",{startup_id:startup,title:"Entrega técnica",kind:"implementacao",status:"planejado",progress:0},diego);
  await patch("technology/"+roadmap.id,{status:"concluido",progress:100},diego);
  assert.equal((await read("technology",diego))[0].progress,100);

  const plan = await post("plans",{template_id:seed.templates[0].id,startup_id:startup,title:"Plano",owner_id:"1"},diego);
  const steps = await read("plans/"+plan.id+"/steps",diego);
  assert(steps.length);
  await patch("plans/"+plan.id+"/steps/"+steps[0].id,{status:"concluida"},diego);
  assert.equal((await read("plans",diego))[0].done,1);

  // Reproduce the persisted two-task schedule from the previous release.
  // Restart must supplement it without replacing the delivered Story.
  const legacyIds = reposts.filter(task=>[7,14].includes(task.repost_offset))
    .sort((a,b)=>a.repost_offset-b.repost_offset).map(task=>task.id);
  const migrationClient = new pg.Client({connectionString:url.href});
  await migrationClient.connect();
  await migrationClient.query("UPDATE workspace_records SET data=(data-'repost_schedule_version') || jsonb_build_object('repost_task_ids',$1::jsonb) WHERE collection='marketing' AND record_key=$2",[JSON.stringify(legacyIds),reel.id]);
  await migrationClient.query("DELETE FROM workspace_records WHERE collection='tasks' AND record_key=ANY($1::text[])",[reposts.filter(task=>!legacyIds.includes(task.id)).map(task=>task.id)]);
  await migrationClient.end();
  await app.close();
  app = null;
  app = await start({...env,ADMIN_EMAIL:"",ADMIN_PASSWORD:""});
  assert.equal((await read("me",eduarda)).name,"Eduarda");
  assert.equal((await read("leads",eduarda)).length,93);
  assert.equal((await read("material-goals",vanessa))[0].done,1);
  assert.equal((await read("task-payments",eduarda)).entries.length,1);
  assert.equal((await read("commercial-worklogs",eduarda))[0].id,commercialLog.id);
  const savedPreference=(await read("task-preferences",eduarda)).find(p=>p.task_id===commercialTask.id);
  assert.equal(savedPreference.starred,true);
  assert.equal((await read("commercial-reports?month=2026-11",eduarda))[0].settlement.status,"changes");
  // Exercise two closings against the real transaction lock with a clock
  // after month end, without changing the HTTP server's session clock.
  const closingPool=new pg.Pool({connectionString:url.href});
  try {
    const closeMonth=()=>useWorkspace(closingPool,true,async snapshot=>{
      const add=(collection,body)=>{const row={...body,id:String(++snapshot.sequence),created_at:"2026-12-02T12:00:00Z"};snapshot.db[collection].unshift(row);return row;};
      try {
        const result=commercialRoute({name:"commercial-settlements",method:"POST",body:{user_id:"2",month:"2026-11",decision:"approve",feedback:"Horas, indicadores e resultados avaliados pela Gestão."},url:new URL("http://local/api/commercial-settlements"),db:snapshot.db,me:snapshot.db.users.find(u=>u.id==="1"),add,now:()=>"2026-12-02T12:00:00Z"});
        return Response.json(result.data,{status:result.status});
      }catch(error){return Response.json({error:error.message},{status:error.status||400});}
    });
    const closings=await Promise.all([closeMonth(),closeMonth()]);
    assert.deepEqual(closings.map(r=>r.status).sort(),[200,400]);
  } finally {await closingPool.end();}
  const monthlyEntries=(await read("task-payments?startupId="+startup,eduarda)).entries.filter(x=>x.kind==="commercial_monthly");
  assert.deepEqual(monthlyEntries.map(x=>x.cents),[150000]);
  await post("commercial-worklogs",{...workPeriod,work_started_at:"2026-11-17T08:00:00-03:00",work_ended_at:"2026-11-17T09:00:00-03:00"},eduarda,400);
  assert.equal((await read("follower-readings",larissa)).length,6);
  assert.equal((await read("tasks",larissa)).filter(task => task.source === "story_repost").length,6);
  const retainedRepost=await read("tasks/"+completedRepost.id,larissa);
  assert.equal(retainedRepost.status,"concluida");
  assert.equal(retainedRepost.evidence_log[0].note,"Repostado nos Stories");
  assert.equal(retainedRepost.planned_date,completedRepost.planned_date);
  assert.deepEqual((await read("task-payments",larissa)).entries.filter(x=>x.kind==="base").map(x=>x.cents),[10000]);
  assert.equal((await read("material-products/"+product.id,vanessa)).trl_history.length,1);
  assert.equal((await read("material-experiments/"+experiment.id,vanessa)).version,2);
  assert.equal((await read("material-results",vanessa)).find(r=>r.experiment_id===experiment.id).protocol_snapshot.version,1);
  assert.equal((await read("material-worklogs",vanessa))[0].work_minutes,45);
  assert.equal((await read("tasks/"+workTask.id,vanessa)).work_minutes,90);
  await patch("users/2",{password:randomBytes(20).toString("hex")},diego);
  await api("me","GET",undefined,eduarda,401);
  await req("/api/auth/logout","POST",undefined,diego);
  await api("me","GET",undefined,diego,401);
});
