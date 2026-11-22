import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';

const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
function model(){
  const db=structuredClone(seed);
  for(const key of ['material-experiments','material-worklogs','commercial-worklogs','commercial-settlements','task-preferences'])db[key]=[];
  for(const user of db.users)user.active=true;
  db.tasks=db.users.flatMap(user=>['open','future','done'].map((kind,index)=>({
    id:user.id+'-'+kind,title:'Atividade '+user.id+' '+kind,startup_id:db.memberships.find(m=>m.user_id===user.id)?.startup_id||db.startups[0].id,
    assigned_to:user.id,creator_id:'1',source:'gestao',status:kind==='done'?'concluida':'pendente',priority:index?'media':'alta',
    due_date:kind==='future'?'2026-12-02':'2026-11-20',planned_date:kind==='future'?'2026-12-01':'2026-11-20',
    product_id:user.id==='vanessa-materials'?'material-fralda':'',checklist:[],description:'Descrição da atividade',evidence_log:[],
  })));
  return {db,sequence:1000};
}
function ui(state,userId,mobile=true){
  const nodes=new Map(),listeners=new Map();
  function el(){
    const classes=new Set();
    return {innerHTML:'',value:'',dataset:{},style:{},open:false,showModal(){this.open=true;},close(){this.open=false;},focus(){},setSelectionRange(){},setAttribute(){},
      classList:{add(...names){names.forEach(x=>classes.add(x));},remove(...names){names.forEach(x=>classes.delete(x));},contains:name=>classes.has(name),toggle(name,value){if(value??!classes.has(name))classes.add(name);else classes.delete(name);}},querySelector:()=>el(),querySelectorAll:()=>[]};
  }
  const document={body:el(),addEventListener(name,callback){listeners.set(name,[...(listeners.get(name)||[]),callback]);},querySelector(name){if(!nodes.has(name))nodes.set(name,el());return nodes.get(name);},querySelectorAll:()=>[]};
  const window={matchMedia:()=>({matches:mobile,addEventListener(){}}),scrollTo(){},scrollY:0};
  const ctx=vm.createContext({document,window,URL,console,setTimeout,clearTimeout,fetch:(path,opts={})=>workspaceDomain(state,userId)(path,opts.method||'GET',JSON.parse(opts.body||'{}'))});
  vm.runInContext('const MATERIAL_SPACE="materials-palma";const taskPayRoles=["comercial","marketing","marketing_externo"];'+source.slice(source.indexOf('const $ ='),source.lastIndexOf('(async () => {')),ctx);
  ctx.me=state.db.users.find(u=>u.id===userId);ctx.startups=state.db.startups.filter(s=>ctx.me.role==='admin'||state.db.memberships.some(m=>m.user_id===userId&&m.startup_id===s.id));ctx.users=ctx.me.role==='admin'?state.db.users:[ctx.me];
  const run=code=>vm.runInContext(code,ctx);
  run('Object.assign(state,{me,startups,users,section:"tasks",startup:"",period:"all",calendar:0})');
  run('render=async()=>{document.querySelector("#main").innerHTML=await tasksPage();}');
  const click=async(action,id,value)=>{
    const btn={dataset:{action,id,value},disabled:false};
    await listeners.get('click').at(-1)({target:{closest:selector=>selector==='[data-action]'?btn:null}});
  };
  return {run,nodes,ctx,click,listeners};
}

test('Lista mobile dos cinco perfis mantém o escopo, evidências e concluídas recolhidas',async()=>{
  const state=model();
  for(const user of state.db.users){
    const {run,nodes}=ui(state,user.id);
    const html=await run('tasksPage()');
    assert.match(html,/activity-mobile-shell/);assert.match(html,/aria-label="Ordenar atividades"/);assert.match(html,/activity-search/);
    assert.match(html,new RegExp('Atividade '+user.id+' open'));assert.match(html,/data-action="task-status"/);
    assert.match(html,/<details class="activity-archive"[^>]*><summary>Concluídas/);
    assert.doesNotMatch(html,/Exportar|data-action="export"|class="data-table/);
    const others=state.db.users.filter(u=>u.id!==user.id);
    for(const other of others)assert(!html.includes('Atividade '+other.id+' open'));
    await run(`setTaskStatus(${JSON.stringify(user.id+'-open')},'concluida')`);
    assert.match(nodes.get('#modal-body').innerHTML,user.id==='4'?/publicação/i:/evidência/i);
    assert.equal(state.db.tasks.find(t=>t.id===user.id+'-open').status,'pendente');
    run('state.section="myday"');
    const daily=await run('myday()');assert.match(daily,/activity-mobile-shell/);
    if(user.id==='2')assert.match(daily,/Agenda comercial/);
  }
  const vanessa=ui(state,'vanessa-materials');
  assert.match(await vanessa.run('materialsPage("tasks")'),/activity-mobile-shell/);
});

test('Destaques pessoais, ordenação e filtros respondem aos toques sem alterar prioridades',async()=>{
  const state=model(),{run,nodes,click}=ui(state,'3');
  await run('tasksPage()');
  await click('activity-star','3-future');
  assert.equal(state.db['task-preferences'][0].starred,true);
  assert.equal(state.db.tasks.find(t=>t.id==='3-future').priority,'media');
  await click('activity-sort');assert.match(nodes.get('#modal-body').innerHTML,/Destaques recentes/);
  assert(nodes.get('#editor').classList.contains('activity-sheet'));
  await click('activity-order',undefined,'starred');
  let html=nodes.get('#main').innerHTML;
  assert(html.indexOf('Atividade 3 future')<html.indexOf('Atividade 3 open'));
  await click('activity-favorites');html=nodes.get('#main').innerHTML;
  assert.match(html,/Atividade 3 future/);assert.doesNotMatch(html,/Atividade 3 open/);
  await click('activity-clear');
  await click('activity-range',undefined,'future');
  html=nodes.get('#main').innerHTML;assert.match(html,/Atividade 3 future/);assert.doesNotMatch(html,/Atividade 3 open/);
  await click('activity-star','3-future');assert.equal(state.db['task-preferences'][0].starred,false);
  const other=ui(state,'4');assert.match(await other.run('tasksPage()'),/Atividade 4 open/);
  assert.equal(Object.keys(await other.run('state.activityPreferences')).length,0);
});

test('Preferências respeitam permissões; exportação foi removida do código e da interface',async()=>{
  const state=model();
  const request=async(user,body)=>{const r=await workspaceDomain(state,user)('/api/task-preferences','PUT',body);return r;};
  assert.equal((await request('2',{task_id:'3-open',starred:true})).status,403);
  assert.equal((await request('2',{task_id:'2-open',starred:'yes'})).status,400);
  assert.equal((await request('1',{task_id:'3-open',starred:true})).status,200);
  const response=await workspaceDomain(state,'3')('/api/task-preferences','GET',{});assert.deepEqual(await response.json(),[]);
  assert.doesNotMatch(source,/exportCSV|state\.exports|data-action="export"|"Exportar"/);
  const desktop=ui(state,'1',false);assert.doesNotMatch(await desktop.run('tasksPage()'),/Exportar|activity-mobile-shell/);
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');assert.match(html,/href="\/activities.css"/);
  const css=await readFile(new URL('../public/activities.css',import.meta.url),'utf8');assert.match(css,/max-width: 700px/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/min-width: 44px/);
});
