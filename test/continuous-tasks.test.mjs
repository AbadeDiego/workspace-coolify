import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';
const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
function model(){const db={...structuredClone(seed),'material-experiments':[],'material-worklogs':[],'commercial-worklogs':[],'commercial-settlements':[]};for(const u of db.users)u.active=true;return {db,sequence:1000};}
async function call(state,user,path,method='GET',body={}){
  // Match the server transaction: failed operations discard all partial changes.
  const draft=structuredClone(state),r=await workspaceDomain(draft,user)('/api/'+path,method,body),data=await r.json();
  if(r.ok)Object.assign(state,draft);return {status:r.status,data};
}
const startup=(state,user)=>state.db.memberships.find(m=>m.user_id===user).startup_id;
const run=(request_id,extra={})=>({request_id,executed_on:'2026-11-21',evidence:{note:'Execução realizada e documentada'},...extra});

test('Fluxo contínuo aceita execuções com evidência e idempotência, sem encerramento ou pagamento automático',async()=>{
  const state=model();
  const created=await call(state,'3','tasks','POST',{startup_id:startup(state,'3'),title:'Relacionamento diário',execution_mode:'continuo'});
  assert.equal(created.status,201);const id=created.data.id,path='tasks/'+id;
  assert.equal(created.data.status,'em_andamento');assert(!created.data.pay_terms);
  assert.equal((await call(state,'3',path,'PATCH',{status:'concluida'})).status,400);
  const count=state.db.tasks.length;
  assert.equal((await call(state,'3',path+'/executions','POST',run('request-empty',{evidence:{}}))).status,400);
  assert.equal(state.db.tasks.length,count);
  const first=await call(state,'3',path+'/executions','POST',run('request-one'));
  assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.task.status,'em_andamento');
  assert.equal(first.data.execution.status,'concluida');assert.equal(first.data.execution.parent_task_id,id);assert.equal(first.data.execution.evidence_log.length,1);
  const repeat=await call(state,'3',path+'/executions','POST',run('request-one'));
  assert.equal(repeat.data.execution.id,first.data.execution.id);
  assert.equal((await call(state,'3',path+'/executions','POST',run('request-two'))).status,200);
  assert.equal((await call(state,'3',path)).data.executions.length,2);
  assert.equal(state.db.taskPayments.length,0);
  assert.equal((await call(state,'2',path+'/executions','POST',run('request-other'))).status,403);
  assert.equal((await call(state,'3',path+'/executions','POST',run('request-future',{executed_on:'2090-01-01'}))).status,400);
  assert.equal((await call(state,'1',path,'DELETE')).status,400);
  assert.equal((await call(state,'1',path,'PATCH',{assigned_to:'1'})).status,400);
  assert.equal((await call(state,'3',path+'/close-flow','POST',{note:'Rotina substituída por novo processo'})).status,200);
  assert.equal((await call(state,'3',path+'/executions','POST',run('request-closed'))).status,400);
  assert.equal((await call(state,'3',path)).data.status,'concluida');
  assert.equal((await call(state,'3',path)).data.executions.length,2);
});

test('Valores opcionais por execução são avaliados pela Gestão e preservam o contrato de cada entrega',async()=>{
  const state=model();
  const created=await call(state,'1','tasks','POST',{startup_id:startup(state,'3'),assigned_to:'3',title:'Rotina de produção',execution_mode:'continuo',pay_enabled:'yes',pay_base:'100',pay_bonus:'50',pay_quality:'Boa qualidade',pay_result:'Resultado comprovado'});
  assert.equal(created.status,201,JSON.stringify(created.data));const path='tasks/'+created.data.id;
  assert.equal((await call(state,'3',path,'PATCH',{status:'cancelada'})).status,403);
  assert.equal((await call(state,'3','task-payments')).data.pending.length,0);
  const first=await call(state,'3',path+'/executions','POST',run('paid-execution'));
  assert.equal(first.status,200);const child=first.data.execution.id;
  assert.equal((await call(state,'3','task-payments')).data.pending[0].id,child);
  assert.equal(state.db.taskPayments.length,0);
  assert.equal((await call(state,'3','tasks/'+child+'/review','POST',{decision:'approve',feedback:'Aprovado'})).status,403);
  assert.equal((await call(state,'1',path+'/review','POST',{decision:'approve',feedback:'Aprovado'})).status,400);
  assert.equal((await call(state,'1','tasks/'+child,'PATCH',{pay_base:'999'})).status,400);
  assert.equal((await call(state,'1',path,'PATCH',{pay_enabled:'yes',pay_base:'80',pay_bonus:'0',pay_quality:'Qualidade revisada'})).status,200);
  assert.equal((await call(state,'1','tasks/'+child+'/review','POST',{decision:'approve',feedback:'Entrega bem feita'})).status,200);
  assert.deepEqual(state.db.taskPayments.map(p=>p.cents),[10000]);
  assert.equal((await call(state,'1','tasks/'+child+'/review','POST',{decision:'approve',feedback:'De novo'})).status,400);
  assert.equal((await call(state,'3',path+'/close-flow','POST',{note:'Encerrar'})).status,403);
  const second=await call(state,'3',path+'/executions','POST',run('paid-execution-2'));
  assert.equal(second.data.execution.pay_terms.base_cents,8000);
  assert.equal((await call(state,'3',path)).data.status,'em_andamento');
});

test('Atividade pode ser gratuita, ter apenas bonificação ou ter os dois valores; Marketing não define pagamento próprio',async()=>{
  const state=model(),base={startup_id:startup(state,'3'),assigned_to:'3',title:'Teste opcional'};
  const unpaid=await call(state,'1','tasks','POST',{...base,pay_enabled:'no'});assert.equal(unpaid.status,201);assert.equal(unpaid.data.pay_terms,null);
  assert.equal((await call(state,'1','tasks','POST',{...base,pay_enabled:'yes'})).status,400);
  const bonus=await call(state,'1','tasks','POST',{...base,pay_enabled:'yes',pay_bonus:'50',pay_quality:'Conforme briefing',pay_result:'Dez respostas qualificadas'});
  assert.equal(bonus.status,201,JSON.stringify(bonus.data));assert.equal(bonus.data.pay_terms.base_cents,0);
  const id=bonus.data.id;
  assert.equal((await call(state,'3','tasks/'+id,'PATCH',{status:'concluida',evidence:{note:'Entrega documentada'}})).status,200);
  assert.equal((await call(state,'1','tasks/'+id+'/review','POST',{decision:'approve',feedback:'Qualidade aprovada'})).status,200);
  assert.equal(state.db.taskPayments.length,0);
  assert.equal((await call(state,'1','tasks/'+id+'/review','POST',{decision:'bonus',feedback:'Resultado validado',metric:'respostas',measurement:'10',result:'Dez respostas comprovadas'})).status,200);
  assert.deepEqual(state.db.taskPayments.map(p=>[p.kind,p.cents]),[['bonus',5000]]);
  assert.equal((await call(state,'1','tasks/'+id+'/review','POST',{decision:'bonus',feedback:'Duplicado',metric:'respostas',measurement:'10',result:'x'})).status,400);
  assert.equal((await call(state,'3','tasks','POST',{startup_id:base.startup_id,title:'Pagar a mim',pay_enabled:'yes',pay_base:'100',pay_quality:'Teste'})).status,403);
});

test('Reel gratuito por padrão; R$100 apenas quando Diego escolhe a remuneração ao criar',async()=>{
  const state=model(),base={startup_id:startup(state,'3'),creator_id:'3',title:'Reel sem contrato',format:'reel'};
  const free=await call(state,'1','marketing','POST',base);assert.equal(free.status,201);assert(!free.data.production_task_id);
  const paid=await call(state,'1','marketing','POST',{...base,title:'Produção remunerada',paid_production:'yes'});
  assert.equal(paid.status,201);assert.equal(state.db.tasks.find(t=>t.id===paid.data.production_task_id).pay_terms.base_cents,10000);
  assert.equal((await call(state,'3','marketing','POST',{...base,paid_production:'yes'})).status,400);
  assert.equal((await call(state,'1','marketing/'+paid.data.id,'PATCH',{paid_production:'no'})).status,400);
});
