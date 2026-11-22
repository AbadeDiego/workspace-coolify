import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';
import {workInterval} from '../src/material-development.mjs';

const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
function model(){
  const db={...structuredClone(seed),"material-experiments":[],"material-worklogs":[]};
  for(const user of db.users)user.active=true;
  return {db,sequence:1000};
}
const person='vanessa-materials';
const product='material-fralda';
const protocol={product_id:product,title:'Ensaio de absorção',objective:'Medir absorção',hypothesis:'Absorção prevista',materials:'Polpa e água',procedure:'Preparar, pesar e medir',success_criteria:'Absorver o volume previsto'};
const work={work_started_at:'2025-11-21T08:00:00-03:00',work_ended_at:'2025-11-21T09:30:00-03:00'};
async function call(state,user,path,method='GET',body={}){
  const result=await workspaceDomain(state,user)('/api/'+path,method,body);
  return {status:result.status,data:await result.json()};
}

test('Ideação, TRL justificado e histórico',async()=>{
  const state=model();
  let result=await call(state,person,'material-products','POST',{name:'Material novo'});
  assert.equal(result.status,201);assert.equal(result.data.stage,'ideacao');assert.equal(result.data.trl,undefined);
  const id=result.data.id;
  result=await call(state,person,'material-products/'+id,'PATCH',{trl:'2'});
  assert.equal(result.status,400);
  result=await call(state,person,'material-products/'+id,'PATCH',{trl:'2',trl_reason:'Conceito documentado'});
  assert.equal(result.data.trl,2);assert.equal(result.data.trl_history.length,1);
  result=await call(state,person,'material-products/'+id,'PATCH',{trl:'3',trl_reason:'Prova de conceito registrada',trl_evidence_url:'https://example.com/report'});
  assert.equal(result.data.trl_history.length,2);assert.equal(result.data.trl_history[1].from,2);
  assert.equal((await call(state,'2','material-products/'+id,'PATCH',{trl:9,trl_reason:'x'})).status,403);
});

test('Roteiros versionados preservam o protocolo usado no resultado',async()=>{
  const state=model();
  const first=await call(state,person,'material-experiments','POST',protocol);
  assert.equal(first.status,201);const id=first.data.id;
  const result=await call(state,person,'material-results','POST',{product_id:product,experiment_id:id,title:'Primeiro ensaio',outcome:'Volume medido',occurred_on:'2025-11-21',evidence:{note:'Resultados anotados'}});
  assert.equal(result.status,201);assert.equal(result.data.protocol_snapshot.version,1);
  const second=await call(state,person,'material-experiments/'+id,'PATCH',{procedure:'Preparar, repetir, pesar e medir'});
  assert.equal(second.status,200);assert.equal(second.data.revisions.length,2);
  assert.equal(result.data.protocol_snapshot.procedure,protocol.procedure);
  assert.equal((await call(state,person,'material-results','POST',{product_id:'material-biocouro',experiment_id:id,title:'Inválido',outcome:'x',occurred_on:'2025-11-21',evidence:{note:'x'}})).status,400);
  assert.equal((await call(state,'4','material-experiments')).status,403);
});

test('Tempo de trabalho em atividade e períodos adicionais, sem sobreposição',async()=>{
  const state=model();
  const task=await call(state,person,'tasks','POST',{startup_id:'materials-palma',product_id:product,title:'Preparar material',...work});
  assert.equal(task.status,201,JSON.stringify(task.data));assert.equal(task.data.work_minutes,90);
  const log={product_id:product,task_id:task.data.id,note:'Análise do material',work_started_at:'2025-11-22T08:00:00-03:00',work_ended_at:'2025-11-22T08:45:00-03:00'};
  const added=await call(state,person,'material-worklogs','POST',log);
  assert.equal(added.status,201);assert.equal(added.data.work_minutes,45);
  assert.equal((await call(state,person,'material-worklogs','POST',log)).status,400);
  assert.equal((await call(state,person,'material-worklogs','POST',{...log,...work})).status,400);
  assert.equal((await call(state,'1','tasks/'+task.data.id,'PATCH',{product_id:'material-biocouro'})).status,400);
  assert.equal((await call(state,'1','tasks/'+task.data.id,'DELETE')).status,400);
  assert.equal((await call(state,person,'tasks','POST',{startup_id:'materials-palma',product_id:product,title:'Sem horário'})).status,201);
  assert.equal((await call(state,person,'tasks','POST',{startup_id:'materials-palma',product_id:product,title:'Incompleta',work_started_at:work.work_started_at})).status,400);
  assert.throws(()=>workInterval('2025-11-21T09:00','2025-11-21T10:00'));
  assert.throws(()=>workInterval(work.work_ended_at,work.work_started_at));
  assert.throws(()=>workInterval('2099-11-21T08:00:00Z','2099-11-21T09:00:00Z'));
});
