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
  for(const u of db.users)u.active=true;
  db.goals=[];db.activities=[];db.tasks=[];
  for(const u of db.users.filter(u=>u.id!=='vanessa-materials')){
    const startup=db.memberships.find(m=>m.user_id===u.id)?.startup_id||db.startups[0].id;
    db.goals.push({id:'goal-'+u.id,user_id:u.id,title:'Meta de '+u.name,metric:'atividade',target:4,cadence:'monthly',start_date:'2026-01-01',end_date:'2026-12-31',active:true});
    db.activities.push({id:'result-'+u.id,startup_id:startup,user_id:u.id,goal_id:'goal-'+u.id,metric:'atividade',quantity:2,note:'Avanço documentado de '+u.name,occurred_at:'2026-11-15T12:00:00Z'});
    db.tasks.push({id:'task-'+u.id,startup_id:startup,assigned_to:u.id,creator_id:'1',title:'Próxima entrega de '+u.name,status:'pendente',priority:'alta',planned_date:'2026-11-22',due_date:'2026-11-23',created_at:'2026-11-01T12:00:00Z',checklist:[]});
  }
  db['material-goals']=[{id:'material-goal',product_id:'material-fralda',user_id:'vanessa-materials',title:'Ensaios da Fralda',target:4,unit:'ensaios',start_date:'2026-11-01',end_date:'2026-11-30'}];
  db['material-results']=[{id:'material-result',product_id:'material-fralda',user_id:'vanessa-materials',goal_id:'material-goal',title:'Ensaio registrado',quantity:2,unit:'ensaios',occurred_on:'2026-11-15',created_at:'2026-11-15T12:00:00Z',outcome:'Resultado técnico registrado',evidence:{note:'Relatório técnico'}}];
  return {db,sequence:1000};
}
function ui(state,userId,mobile){
  const nodes=new Map(),classes=()=>{const set=new Set();return {add(...names){names.forEach(n=>set.add(n));},remove(...names){names.forEach(n=>set.delete(n));},contains:n=>set.has(n),toggle(n,v){if(v??!set.has(n))set.add(n);else set.delete(n);}};};
  const el=()=>({innerHTML:'',value:'',dataset:{},open:false,style:{},classList:classes(),showModal(){this.open=true;},close(){this.open=false;},focus(){},setAttribute(){},setSelectionRange(){},querySelector:()=>el(),querySelectorAll:()=>[]});
  const document={body:el(),addEventListener(){},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);},querySelectorAll:()=>[]};
  const ctx=vm.createContext({document,window:{matchMedia:()=>({matches:mobile,addEventListener(){}}),scrollTo(){},scrollY:0},URL,console,setTimeout,clearTimeout,fetch:(path,opts={})=>workspaceDomain(state,userId)(path,opts.method||'GET',JSON.parse(opts.body||'{}'))});
  vm.runInContext('const MATERIAL_SPACE="materials-palma";const taskPayRoles=["comercial","marketing","marketing_externo"];'+source.slice(source.indexOf('const $ ='),source.lastIndexOf('(async () => {')),ctx);
  const run=code=>vm.runInContext(code,ctx);
  ctx.me=state.db.users.find(u=>u.id===userId);ctx.users=userId==='1'?state.db.users:[ctx.me];ctx.startups=state.db.startups.filter(s=>userId==='1'||state.db.memberships.some(m=>m.user_id===userId&&m.startup_id===s.id));
  run('Object.assign(state,{me,users,startups,section:"dashboard",startup:"",period:"all",from:"",to:"",calendar:0,goalUi:{}})');
  return {run,nodes,ctx};
}

test('Visão Geral e Metas adaptadas para os cinco perfis, com dados e escopos preservados',async()=>{
  const state=model();
  for(const mobile of [true,false])for(const user of state.db.users){
    const {run,nodes}=ui(state,user.id,mobile);
    const overview=await run('dashboard()');
    assert.match(overview,/insight-page/);assert.doesNotMatch(overview,/NaN|>undefined<|Exportar/);
    if(user.id==='vanessa-materials')assert.match(overview,/Fralda de Palma/);
    else{
      assert.match(overview,/data-action="dashboard-detail"/);
      if(mobile)assert.match(overview,/Mais indicadores/);
      if(user.id!=='1')assert.doesNotMatch(overview,/Resultado financeiro/);
    }
    run('state.section="goals"');const goals=await run('goalsPage()');
    assert.match(goals,/id="goal-search"/);assert.match(goals,/data-action="goal-detail"/);assert.doesNotMatch(goals,/NaN|>undefined<|Exportar/);
    const id=user.id==='vanessa-materials'?'material-goal':'goal-'+user.id;
    await run(`goalDetail(${JSON.stringify(id)},${user.id==='vanessa-materials'})`);
    const detail=nodes.get('#modal-body').innerHTML;
    assert.match(detail,/de 4/);assert.match(detail,/Resultados deste ciclo · 1/);
    assert.match(detail,user.id==='vanessa-materials'?/Ensaio registrado/:new RegExp('Avanço documentado de '+user.name));
    if(user.id!=='1')assert.doesNotMatch(detail,/Ajustar meta/);
    if(mobile)assert(nodes.get('#editor').classList.contains('activity-detail'));
    if(user.id!=='1')for(const other of state.db.users.filter(u=>u.id!==user.id&&u.id!=='vanessa-materials'))assert(!goals.includes('Meta de '+other.name));
  }
});

test('Filtros, busca e contribuição à meta mantêm o alvo, ciclo e vínculo do resultado',async()=>{
  const state=model(),{run,nodes,ctx}=ui(state,'1',true);
  run('state.section="goals"');await run('goalsPage()');
  run('state.goalUi={query:"Eduarda"}');let html=await run('goalsPage()');assert.match(html,/Meta de Eduarda/);assert.doesNotMatch(html,/Meta de Larissa/);
  run('state.goalUi={phase:"achieved"}');html=await run('goalsPage()');assert.match(html,/Nenhuma meta corresponde/);
  run('state.goalUi={}');await run('goalsPage()');
  await run('activityForm("goal-2")');assert.match(nodes.get('#modal-body').innerHTML,/<option value="goal-2" selected/);assert(nodes.get('#editor').classList.contains('activity-detail'));
  await run('insightFilterSheet(true)');assert.match(nodes.get('#modal-body').innerHTML,/name="period"/);assert(nodes.get('#editor').classList.contains('activity-sheet'));
  run('applyInsightPeriod("month")');assert.equal(run('state.from'),'2026-11-01');assert.equal(run('state.to'),'2026-11-30');
  run('applyInsightPeriod("week")');assert.equal(run('state.from'),'2026-11-16');assert.equal(run('state.to'),'2026-11-22');
  const row=state.db.goals.find(g=>g.id==='goal-2');assert.equal(row.target,4);assert.equal(row.cadence,'monthly');
  ctx.logs=state.db.activities;assert.equal(state.db.activities.length,4);
});

test('Metas de materiais mantêm produto e evidência ao registrar avanço',async()=>{
  const state=model(),{run,nodes}=ui(state,'vanessa-materials',true);
  run('state.section="goals"');await run('goalsPage()');
  await run('goalDetail("material-goal",true)');assert.match(nodes.get('#modal-body').innerHTML,/data-product="material-fralda" data-goal="material-goal"/);
  await run('materialResultForm("material-fralda","material-goal")');assert.match(nodes.get('#modal-body').innerHTML,/<option value="material-goal" selected/);assert.match(nodes.get('#modal-body').innerHTML,/evidência/);
});
