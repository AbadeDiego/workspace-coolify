import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';
const seed=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function model(){const db={...structuredClone(seed),'material-experiments':[],'material-worklogs':[],'commercial-worklogs':[],'commercial-settlements':[]};for(const u of db.users)u.active=true;return {db,sequence:1000};}
function ui(state,userId){
  const nodes=new Map();
  const el=()=>({innerHTML:'',value:'',checked:false,dataset:{},style:{},open:false,showModal(){this.open=true;},close(){},focus(){},setAttribute(){},classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelector:()=>el(),querySelectorAll:()=>[]});
  const document={addEventListener(){},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s);},querySelectorAll:()=>[]};
  const ctx=vm.createContext({document,window:{matchMedia:()=>({matches:true,addEventListener(){}})},URL,console,setTimeout,clearTimeout,fetch:(path,opts={})=>workspaceDomain(state,userId)(path,opts.method||'GET',JSON.parse(opts.body||'{}'))});
  vm.runInContext('const MATERIAL_SPACE="materials-palma";const taskPayRoles=["comercial","marketing","marketing_externo"];'+source.slice(source.indexOf('const $ ='),source.lastIndexOf('(async () => {')),ctx);
  const run=s=>vm.runInContext(s,ctx);ctx.me=state.db.users.find(u=>u.id===userId);ctx.users=userId==='1'?state.db.users:[ctx.me];ctx.startups=state.db.startups.filter(s=>userId==='1'||state.db.memberships.some(m=>m.user_id===userId&&m.startup_id===s.id));
  run('Object.assign(state,{me,users,startups,section:"tasks",startup:"",period:"all"})');
  return {run,nodes,ctx};
}
test('Criação oferece fluxo contínuo e valores opcionais; Reel não é remunerado sem seleção',async()=>{
  const state=model();
  for(const userId of ['1','3']){
    const {run,nodes}=ui(state,userId);
    await run('taskForm()');let form=nodes.get('#modal-body').innerHTML;
    assert.match(form,/name="execution_mode"/);assert.match(form,/Fluxo contínuo/);
    if(userId==='1'){
      assert.match(form,/id="task-pay-enabled" >/);assert.match(form,/id="task-pay-inputs"[^>]*hidden disabled/);
      nodes.get('#task-pay-enabled').checked=true;run('syncOptionalPay()');assert.equal(nodes.get('#task-pay-inputs').disabled,false);
      nodes.get('#task-pay-enabled').checked=false;run('syncOptionalPay()');assert.equal(nodes.get('#task-pay-inputs').disabled,true);
    }else assert.doesNotMatch(form,/id="task-pay-enabled"/);
    await run('marketingForm()');form=nodes.get('#modal-body').innerHTML;
    assert.match(form,/não gera remuneração automaticamente/);
    if(userId==='1'){
      assert.match(form,/name="paid_production" value="yes">/);
      nodes.get('#marketing-format').value='reel';run('syncMarketingProductionPay()');assert.equal(nodes.get('#marketing-production-pay').disabled,false);
      nodes.get('#marketing-format').value='post';run('syncMarketingProductionPay()');assert.equal(nodes.get('#marketing-production-pay').disabled,true);
    }else assert.doesNotMatch(form,/name="paid_production"/);
  }
});
test('Registrar execução usa evidência, mantém o fluxo e permite abrir os registros do histórico',async()=>{
  const state=model(),startup=state.db.memberships.find(m=>m.user_id==='3').startup_id;
  const response=await workspaceDomain(state,'1')('/api/tasks','POST',{startup_id:startup,assigned_to:'3',title:'Rotina de comunidade',execution_mode:'continuo'});
  const task=await response.json();assert(response.ok);
  const {run,nodes,ctx}=ui(state,'3');ctx.id=task.id;
  await run('taskDetail(id)');assert.match(nodes.get('#modal-body').innerHTML,/Fluxo contínuo/);assert.match(nodes.get('#modal-body').innerHTML,/Sem remuneração ou bonificação vinculada/);assert.match(nodes.get('#modal-body').innerHTML,/Registrar execução/);
  await run('setTaskStatus(id,"concluida")');let form=nodes.get('#modal-body').innerHTML;assert.match(form,/Data da execução/);assert.match(form,/id="flow-evidence-file"/);
  await run('submitModal({executed_on:"2026-11-21",note:"Respostas e interações documentadas",url:""})');
  assert.equal(state.db.tasks.find(t=>t.id===task.id).status,'em_andamento');
  await run('taskDetail(id)');form=nodes.get('#modal-body').innerHTML;assert.match(form,/Abrir execução e evidências/);assert.match(form,/Respostas e interações documentadas/);
});
