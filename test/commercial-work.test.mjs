import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';
import {commercialRoute,commercialReport} from '../src/commercial-work.mjs';

const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
const model=()=>{const db={...structuredClone(seed),'material-experiments':[],'material-worklogs':[],'commercial-worklogs':[],'commercial-settlements':[]};for(const u of db.users)u.active=true;return {db,sequence:1000};};
const call=async(state,user,path,method='GET',body={})=>{const r=await workspaceDomain(state,user)('/api/'+path,method,body);return {status:r.status,data:await r.json()};};
const body=(id,extra={})=>({task_id:id,work_started_at:'2026-11-16T08:00:00-03:00',work_ended_at:'2026-11-16T10:00:00-03:00',note:'Prospectar e fazer retornos',metric:'contatos',quantity:5,result:'Dois contatos pediram proposta; preparar o orçamento.',...extra});
async function task(state){const startup=state.db.memberships.find(m=>m.user_id==='2').startup_id;const r=await call(state,'2','tasks','POST',{startup_id:startup,title:'Prospecção semanal',expected_result:'Avançar os contatos para reunião'});assert.equal(r.status,201);return r.data;}

test('Horas do Comercial: atividade, resultado, privacidade, sobreposição e correção auditada',async()=>{
  const state=model(),t=await task(state);
  const created=await call(state,'2','commercial-worklogs','POST',body(t.id));
  assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.work_minutes,120);
  assert.equal((await call(state,'2','commercial-worklogs','POST',body(t.id))).status,400);
  assert.equal((await call(state,'3','commercial-worklogs')).status,403);
  assert.equal((await call(state,'2','commercial-reports?userId=3')).status,403);
  assert.equal((await call(state,'3','commercial-worklogs','POST',body(t.id))).status,403);
  assert.equal((await call(state,'2','commercial-worklogs','POST',body(t.id,{result:''}))).status,400);
  assert.equal((await call(state,'2','commercial-worklogs','POST',body(t.id,{work_ended_at:'2090-11-16T10:00:00-03:00'}))).status,400);
  assert.equal((await call(state,'1','tasks/'+t.id,'DELETE')).status,400);
  assert.equal((await call(state,'1','tasks/'+t.id,'PATCH',{assigned_to:'1'})).status,400);
  assert.equal((await call(state,'2','commercial-worklogs/'+created.data.id,'PATCH',{void_reason:'Horário incorreto'})).status,403);
  assert.equal((await call(state,'1','commercial-worklogs/'+created.data.id,'PATCH',{void_reason:'Horário duplicado por engano'})).status,200);
  assert.equal((await call(state,'2','commercial-worklogs','POST',body(t.id))).status,201);
  const logs=(await call(state,'2','commercial-worklogs')).data;
  assert.equal(logs.length,2);assert.equal(logs.filter(r=>r.voided_at).length,1);
  const report=(await call(state,'2','commercial-reports?month=2026-11')).data[0];
  assert.equal(report.monthly_minutes,120);assert.equal(report.monthly_cents,150000);assert.equal(report.weekly_minutes,1200);
  assert.equal((await call(state,'2','tasks/'+t.id)).data.commercial_work_minutes,120);
  assert.equal(state.db.taskPayments.length,0);
  const paid=await call(state,'1','tasks','POST',{startup_id:t.startup_id,assigned_to:'2',title:'Comercial mensal',pay_base:'20',pay_quality:'Teste'});
  assert.equal(paid.status,400);
});

test('Semanas e competências dividem períodos corretamente e usam resultados reais do CRM',()=>{
  const state=model(),user=state.db.users.find(u=>u.id==='2'),db=state.db;
  db['commercial-worklogs'].push({id:'l1',user_id:'2',work_started_at:'2026-10-31T23:00:00-03:00',work_ended_at:'2026-11-01T01:00:00-03:00',work_minutes:120});
  db.leads=[{id:'lead',owner_id:'2',first_contact_at:'2026-11-01T01:00:00-03:00',meeting_done_at:'2026-11-04T10:00:00-03:00',proposal_sent_at:'2026-11-05T12:00:00-03:00'},
    {id:'other',owner_id:'3',first_contact_at:'2026-11-01T12:00:00-03:00'}];
  db.deals=[{id:'deal',lead_id:'lead',closed_at:'2026-11-06T12:00:00-03:00',value_cents:45000}];
  const nov=commercialReport(db,user,'2026-11','2026-11-22T12:00:00Z');
  assert.equal(nov.monthly_minutes,60);assert.equal(nov.weeks[0].minutes,120);assert.equal(nov.weeks[0].month_minutes,60);assert.equal(nov.weeks[0].partial,true);
  assert.equal(commercialReport(db,user,'2026-10','2026-11-22T12:00:00Z').monthly_minutes,60);
  assert.deepEqual([nov.indicators.contacts,nov.indicators.meetings,nov.indicators.proposals,nov.indicators.contracts,nov.indicators.contracted_cents],[1,1,1,1,45000]);
  assert.equal(nov.can_close,false);assert.equal(nov.current_week.week_start,'2026-11-16');
});

test('Fechamento com avaliação: R$1500 fixos, apenas mês encerrado, sem descontos ou duplicação',async()=>{
  const state=model(),t=await task(state),db=state.db;
  await call(state,'2','commercial-worklogs','POST',body(t.id));
  const settle={user_id:'2',month:'2026-11',decision:'approve',feedback:'Horas verificadas, propostas e avanços avaliados.'};
  const add=(table,row)=>{const record={...row,id:String(++state.sequence)};db[table].unshift(record);return record;};
  const route=(at,me='1',body=settle)=>commercialRoute({name:'commercial-settlements',method:'POST',body,url:new URL('http://local/api/commercial-settlements'),db,me:db.users.find(u=>u.id===me),add,now:()=>at});
  assert.throws(()=>route('2026-11-22T12:00:00Z'),/encerramento/);
  assert.throws(()=>route('2026-12-02T12:00:00Z','2'),/Diego/);
  route('2026-11-22T12:00:00Z','1',{...settle,decision:'changes',feedback:'Detalhar o próximo passo.'});
  const result=route('2026-12-02T12:00:00Z');assert.equal(result.data.status,'approved');
  assert.equal(result.data.report_snapshot.monthly_minutes,120);
  assert.doesNotThrow(()=>JSON.stringify(db));
  assert.deepEqual(db.taskPayments.map(p=>[p.kind,p.month,p.cents]),[['commercial_monthly','2026-11',150000]]);
  assert.throws(()=>route('2026-12-02T12:00:00Z'),/já está aprovado/);
  assert.equal((await call(state,'2','commercial-worklogs','POST',body(t.id,{work_started_at:'2026-11-17T08:00:00-03:00',work_ended_at:'2026-11-17T09:00:00-03:00'}))).status,400);
  assert.equal((await call(state,'1','commercial-worklogs/'+db['commercial-worklogs'][0].id,'PATCH',{void_reason:'Alterar'})).status,400);
  const ledger=(await call(state,'2','task-payments?startupId='+t.startup_id)).data.entries;
  assert.equal(ledger[0].cents,150000);
});
