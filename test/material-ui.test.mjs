import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workspaceDomain} from '../src/domain.mjs';

test('Telas e formulários de desenvolvimento usam a API e mantêm o filtro por produto',async()=>{
  const db=JSON.parse(await readFile(new URL('../src/seed.json',import.meta.url),'utf8'));
  db["material-experiments"]=[];db["material-worklogs"]=[];
  for(const u of db.users)u.active=true;
  const model={db,sequence:1000},nodes=new Map();
  const el=()=>({innerHTML:'',value:'',open:false,showModal(){this.open=true},close(){},focus(){},setAttribute(){},classList:{add(){},remove(){},toggle(){},contains(){return false}},querySelector:()=>el(),querySelectorAll:()=>[]});
  const document={addEventListener(){},querySelector(s){if(!nodes.has(s))nodes.set(s,el());return nodes.get(s)},querySelectorAll:()=>[]};
  const ctx=vm.createContext({document,window:{matchMedia:()=>({matches:false,addEventListener(){}})},URL,console,setTimeout,fetch:async(path,opts={})=>workspaceDomain(model,'vanessa-materials')(path,opts.method||'GET',JSON.parse(opts.body||'{}'))});
  const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  vm.runInContext('const MATERIAL_SPACE="materials-palma";const taskPayRoles=["comercial","marketing","marketing_externo"];'+js.slice(js.indexOf('const $ ='),js.lastIndexOf('(async () => {')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  ctx.me=db.users.find(u=>u.id==='vanessa-materials');ctx.startups=db.startups.filter(s=>s.id==='materials-palma');
  run('Object.assign(state,{me,startups,users:[me],section:"materials",materialProduct:"material-fralda",period:"all"})');
  for(const tab of ['overview','experiments','work','results','tasks','goals']){
    ctx.tab=tab;const html=await run('materialsPage(tab)');assert.match(html,/Fralda de Palma/);assert.doesNotMatch(html,/NaN|>undefined</);
  }
  await run('experimentForm()');assert.match(nodes.get('#modal-body').innerHTML,/name="procedure"/);
  await run('taskForm()');assert.match(nodes.get('#modal-body').innerHTML,/name="work_started_at"/);
  await run('materialResultForm()');assert.match(nodes.get('#modal-body').innerHTML,/name="experiment_id"/);
  await run('workLogForm()');assert.match(nodes.get('#modal-body').innerHTML,/name="work_ended_at"[^>]*required/);
});
