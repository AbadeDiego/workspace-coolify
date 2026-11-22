import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';
import {scheduleReposts, upgradeRepostSchedules} from '../src/social-media.mjs';

const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
function model(){
  const db={...structuredClone(seed),'material-experiments':[],'material-worklogs':[]};
  for(const u of db.users)u.active=true;
  return {db,sequence:1000};
}
async function call(state,user,path,method='GET',body={}){
  const result=await workspaceDomain(state,user)('/api/'+path,method,body);
  return {status:result.status,data:await result.json()};
}
function startupFor(state,user){return state.db.memberships.find(m=>m.user_id===user).startup_id;}

test('Reel da Gestão: R$100 apenas após qualidade aprovada, sem duplicação ou alteração por outra rota',async()=>{
  const state=model(),startup=startupFor(state,'3');
  const created=await call(state,'1','marketing','POST',{startup_id:startup,creator_id:'3',title:'Reel de produção',format:'reel',delivery_due:'2026-12-10'});
  assert.equal(created.status,201,JSON.stringify(created.data));
  const piece=created.data,task=state.db.tasks.find(t=>t.id===piece.production_task_id),path='marketing/'+piece.id+'/workflow';
  assert.equal(task.pay_terms.base_cents,10000);
  assert.equal(task.creator_id,'1');assert.equal(task.due_date,'2026-12-10');
  assert.equal((await call(state,'3','task-payments')).data.pending.find(t=>t.id===task.id).pay_terms.base_cents,10000);
  assert.equal((await call(state,'1','marketing/'+piece.id,'PATCH',{creator_id:'1'})).status,400);
  assert.equal((await call(state,'1','marketing/'+piece.id,'PATCH',{format:'post'})).status,400);
  assert.equal((await call(state,'1','tasks/'+task.id,'PATCH',{pay_base:'200'})).status,400);
  assert.equal((await call(state,'1','tasks/'+task.id,'DELETE')).status,400);
  assert.equal((await call(state,'1','marketing/'+piece.id,'DELETE')).status,400);
  await call(state,'3',path,'POST',{action:'submit',url:'https://example.test/v1'});
  assert.equal(task.pay_review.status,'pending');assert.equal(state.db.taskPayments.length,0);
  assert.equal((await call(state,'3',path,'POST',{action:'approve'})).status,403);
  assert.equal((await call(state,'1','tasks/'+task.id+'/review','POST',{decision:'approve',feedback:'teste'})).status,400);
  assert.equal((await call(state,'1',path,'POST',{action:'changes',note:'Melhorar áudio'})).status,200);
  assert.equal(task.status,'em_andamento');assert.equal(state.db.taskPayments.length,0);
  await call(state,'3',path,'POST',{action:'submit',url:'https://example.test/v2'});
  assert.equal(task.evidence_log.length,2);
  assert.equal((await call(state,'1',path,'POST',{action:'approve',note:'Áudio revisado e briefing atendido'})).status,200);
  assert.equal(task.pay_review.status,'approved');
  assert.deepEqual(state.db.taskPayments.map(p=>[p.task_id,p.kind,p.cents]),[[task.id,'base',10000]]);
  assert.equal((await call(state,'1',path,'POST',{action:'approve'})).status,400);
  assert.equal(state.db.taskPayments.length,1);
  assert.equal((await call(state,'2','tasks/'+task.id)).status,403);
});

test('Conteúdo próprio e outros formatos não criam remuneração; Reel externo da Gestão tem R$100',async()=>{
  const state=model();
  for(const [actor,owner,format,paid] of [['3','3','reel',false],['1','3','post',false],['1','4','reel',true]]){
    const result=await call(state,actor,'marketing','POST',{startup_id:startupFor(state,owner),creator_id:owner,title:'Conteúdo',format});
    assert.equal(result.status,201,JSON.stringify(result.data));
    assert.equal(Boolean(result.data.production_task_id),paid);
  }
});

test('Stories: seis ações, Brasília, contas separadas, colisões e idempotência',()=>{
  const state=model(),users=state.db.users,actor=users.find(u=>u.id==='3'),tasks=[],pieces=[];
  let sequence=0;
  const add=(_,body)=>{const task={...body,id:String(++sequence)};tasks.push(task);return task;};
  const piece=(id,account='@Coleta')=>({id,startup_id:'s',creator_id:'3',title:'Reel '+id,format:'reel',publication:{network:'Instagram',account,published_at:'2090-11-14T01:30:00Z',post_url:'https://example.test/'+id}});
  const first=piece('a');pieces.push(first);
  scheduleReposts(first,actor,users,()=>true,add,tasks,pieces);
  assert.deepEqual(tasks.map(t=>t.planned_date),['2090-11-14','2090-11-16','2090-11-20','2090-11-27','2090-12-04','2090-12-11']);
  assert.equal(new Set(tasks.map(t=>t.title)).size,6);
  assert(tasks.every(t=>!t.pay_terms&&t.assigned_to==='3'&&t.source_account==='coleta'));
  scheduleReposts(first,actor,users,()=>true,add,tasks,pieces);assert.equal(tasks.length,6);
  const second=piece('b','coleta');pieces.push(second);
  scheduleReposts(second,actor,users,()=>true,add,tasks,pieces);
  assert.equal(new Set(tasks.map(t=>t.planned_date)).size,12);
  const other=piece('c','@Outra');pieces.push(other);
  scheduleReposts(other,actor,users,()=>true,add,tasks,pieces);
  assert.equal(tasks[12].planned_date,tasks[0].planned_date);
  const old=piece('d','antiga');old.publication.published_at='2020-01-01T12:00:00Z';
  scheduleReposts(old,actor,users,()=>true,add,tasks,pieces);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  assert(tasks.slice(18).every(t=>t.planned_date>=today));
  const legacy=piece('e');legacy.repost_task_ids=['old1','old2'];
  scheduleReposts(legacy,actor,users,()=>true,add,tasks,pieces);assert.equal(tasks.length,28);
  assert(legacy.repost_task_ids.includes('old1'));assert(legacy.repost_task_ids.includes('old2'));
  scheduleReposts(legacy,actor,users,()=>true,add,tasks,pieces);assert.equal(tasks.length,28);
});

test('Atualização de agenda legada preserva entregas e datas e acrescenta somente quatro atividades',()=>{
  const state=model(),startup=startupFor(state,'3');
  const oldTasks=[7,14].map((offset,index)=>({id:'legacy-'+index,startup_id:startup,assigned_to:'3',source:'story_repost',source_piece_id:'legacy',planned_date:'2026-11-'+(offset===7?'20':'27'),status:index?'pendente':'concluida',evidence_log:index?[]:[{note:'Story publicado'}]}));
  const preserved=structuredClone(oldTasks);
  state.db.tasks.push(...oldTasks);
  state.db.marketing.push({id:'legacy',startup_id:startup,creator_id:'4',title:'Contrato antigo',format:'reel',status:'publicado',repost_task_ids:oldTasks.map(t=>t.id),publication:{network:'Instagram',account:'@conta',published_at:'2026-11-13T15:00:00Z',post_url:'https://example.test/reel'}});
  const count=state.db.tasks.length;
  upgradeRepostSchedules(state);
  assert.equal(state.db.tasks.length,count+4);
  assert.deepEqual(oldTasks,preserved);
  assert.equal(state.db.taskPayments.length,0);
  const total=state.db.tasks.length;
  upgradeRepostSchedules(state);assert.equal(state.db.tasks.length,total);
});
