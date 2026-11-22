import { InputError } from './validation.mjs';
import { workInterval, assertNoOverlap } from './material-development.mjs';

export const commercialTerms = { weekly_minutes:1200, monthly_cents:150000, effective_month:'2026-11' };
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'});
const dayAt=value=>dayFormat.format(new Date(value));
const midnight=day=>Date.parse(day+'T00:00:00-03:00');
const shift=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const monday=day=>shift(day,-((new Date(day+'T12:00:00Z').getUTCDay()+6)%7));
function monthBounds(month){
  if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<'2020-01'||month>'2100-12') throw new InputError('Selecione um mês válido.');
  const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);
  return {from:month+'-01',to:d.toISOString().slice(0,10)};
}
const overlapMinutes=(rows,from,to)=>Math.round(rows.reduce((sum,r)=>sum+Math.max(0,Math.min(Date.parse(r.work_ended_at),midnight(to))-Math.max(Date.parse(r.work_started_at),midnight(from))),0)/60000);
const text=(value,label,max=3000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new InputError('Informe '+label+'.');return value.trim();};
function locked(db,userId,interval){
  return db['commercial-settlements'].some(s=>{
    if(s.user_id!==userId||s.status!=='approved')return false;
    const {from,to}=monthBounds(s.month);
    return Date.parse(interval.work_started_at)<midnight(to)&&Date.parse(interval.work_ended_at)>midnight(from);
  });
}

export function commercialReport(db,user,month,at){
  const {from,to}=monthBounds(month);
  const logs=db['commercial-worklogs'].filter(r=>r.user_id===user.id&&!r.voided_at);
  const weeks=[];
  for(let start=monday(from);start<to;start=shift(start,7)){
    const end=shift(start,7),minutes=overlapMinutes(logs,start,end);
    weeks.push({week_start:start,week_end:shift(end,-1),minutes,month_minutes:overlapMinutes(logs,start<from?from:start,end>to?to:end),
      remaining_minutes:Math.max(0,commercialTerms.weekly_minutes-minutes),partial:start<from||end>to});
  }
  const weekStart=monday(dayAt(at)),weekEnd=shift(weekStart,7);
  const currentMinutes=overlapMinutes(logs,weekStart,weekEnd);
  const during=value=>value&&dayAt(value)>=from&&dayAt(value)<to;
  const leads=db.leads.filter(l=>l.owner_id===user.id);
  const deals=db.deals.filter(d=>leads.some(l=>l.id===d.lead_id)&&during(d.closed_at));
  const monthLogs=logs.filter(r=>Date.parse(r.work_started_at)<midnight(to)&&Date.parse(r.work_ended_at)>midnight(from));
  const tasks=db.tasks.filter(t=>t.assigned_to===user.id);
  return {user_id:user.id,person_name:user.name,month,...commercialTerms,
    monthly_minutes:overlapMinutes(logs,from,to),worklogs_count:monthLogs.length,
    current_week:{week_start:weekStart,week_end:shift(weekEnd,-1),minutes:currentMinutes,remaining_minutes:Math.max(0,commercialTerms.weekly_minutes-currentMinutes)},weeks,
    indicators:{contacts:leads.filter(l=>during(l.first_contact_at)).length,meetings:leads.filter(l=>during(l.meeting_done_at)).length,
      proposals:leads.filter(l=>during(l.proposal_sent_at)).length,contracts:deals.length,contracted_cents:deals.reduce((n,d)=>n+Number(d.value_cents||0),0),
      completed_tasks:tasks.filter(t=>t.status==='concluida'&&during(t.completed_at)).length,
      overdue_tasks:tasks.filter(t=>!['concluida','cancelada'].includes(t.status)&&t.due_date&&t.due_date<dayAt(at)).length},
    settlement:db['commercial-settlements'].find(s=>s.user_id===user.id&&s.month===month)||null,
    can_close:month>=commercialTerms.effective_month&&month<dayAt(at).slice(0,7),
  };
}

export function commercialRoute({name,id,method,body,url,db,me,add,now}){
  db['commercial-worklogs']||=[];db['commercial-settlements']||=[];
  const admin=me.role==='admin';
  if(!admin&&me.role!=='comercial')throw new InputError('Área comercial indisponível para este perfil.',403);
  const forUser=url.searchParams.get('userId');
  if(forUser&&!admin&&forUser!==me.id)throw new InputError('Acompanhe apenas suas próprias horas.',403);
  const visible=row=>(admin||row.user_id===me.id)&&(!forUser||row.user_id===forUser);
  const person=id=>db.users.find(u=>u.id===id&&u.role==='comercial');
  const show=row=>({...row,person_name:db.users.find(u=>u.id===row.user_id)?.name,
    task_title:db.tasks.find(t=>t.id===row.task_id)?.title,startup_name:db.startups.find(s=>s.id===row.startup_id)?.name,
    lead_name:db.leads.find(l=>l.id===row.lead_id)?.company||db.leads.find(l=>l.id===row.lead_id)?.name});
  if(name==='commercial-reports'){
    const month=url.searchParams.get('month')||dayAt(now()).slice(0,7);
    monthBounds(month);
    return {status:200,data:db.users.filter(u=>u.role==='comercial'&&(admin||u.id===me.id)&&(!forUser||u.id===forUser)).map(u=>commercialReport(db,u,month,now()))};
  }
  if(method==='GET'){
    return {status:200,data:db[name].filter(visible).filter(r=>!url.searchParams.get('startupId')||r.startup_id===url.searchParams.get('startupId')).map(show)};
  }
  if(name==='commercial-worklogs'){
    if(method==='PATCH'){
      if(Object.keys(body).some(k=>k!=='void_reason'))throw new InputError('Para corrigir, invalide o período com justificativa e registre um novo.');
      if(me.id!=='1'||!admin)throw new InputError('Diego pode invalidar um período com justificativa.',403);
      const row=db[name].find(r=>r.id===id);
      if(!row||row.voided_at)throw new InputError('Período indisponível.');
      if(locked(db,row.user_id,row))throw new InputError('O mês está aprovado. Preserve o histórico do fechamento.');
      row.void_reason=text(body.void_reason,'a justificativa da correção');row.voided_at=now();row.voided_by=me.name;
      return {status:200,data:show(row)};
    }
    if('void_reason' in body)throw new InputError('Use a avaliação da Gestão para invalidar um período.');
    const task=db.tasks.find(t=>t.id===String(body.task_id));
    const owner=task&&person(task.assigned_to);
    if(!task||!owner?.active||(!admin&&owner.id!==me.id)||
      !db.memberships.some(m=>m.user_id===owner.id&&m.startup_id===task.startup_id))throw new InputError('Selecione uma atividade do Comercial atribuída à pessoa.',403);
    if(task.status==='cancelada')throw new InputError('A atividade foi cancelada.');
    const interval=workInterval(body.work_started_at,body.work_ended_at);
    if(interval.work_minutes<1)throw new InputError('Registre pelo menos um minuto de trabalho.');
    if(locked(db,owner.id,interval))throw new InputError('Este período pertence a um mês já aprovado.');
    assertNoOverlap(db,owner.id,interval);
    const metric=body.metric;
    if(!['contatos','reunioes','propostas','negociacoes','outro'].includes(metric))throw new InputError('Selecione o indicador acompanhado.');
    const quantity=Number(body.quantity);
    if(!['number','string'].includes(typeof body.quantity)||!String(body.quantity).trim()||!Number.isSafeInteger(quantity)||quantity<0||quantity>1000000)throw new InputError('Informe a quantidade do indicador (zero quando não houver avanço).');
    const result=text(body.result,'o resultado observado e o próximo passo');
    const note=text(body.note,'o trabalho realizado');
    const evidenceUrl=body.evidence_url||'';
    if(evidenceUrl){let link;try{link=new URL(evidenceUrl);}catch{}if(!link||!['http:','https:'].includes(link.protocol))throw new InputError('Informe um link HTTP ou HTTPS para a evidência.');}
    const lead=body.lead_id&&db.leads.find(l=>l.id===body.lead_id&&l.startup_id===task.startup_id&&l.owner_id===owner.id);
    if(body.lead_id&&!lead)throw new InputError('Vincule um lead da mesma pessoa e startup.');
    const row=add(name,{...interval,task_id:task.id,startup_id:task.startup_id,user_id:owner.id,note,result,metric,quantity,evidence_url:evidenceUrl,lead_id:lead?.id||'',author:me.name});
    return {status:201,data:show(row)};
  }
  if(me.id!=='1'||!admin)throw new InputError('A avaliação mensal cabe a Diego.',403);
  const owner=person(String(body.user_id));
  if(!owner)throw new InputError('Selecione a pessoa do Comercial.');
  const month=body.month;monthBounds(month);
  if(month<commercialTerms.effective_month||month>dayAt(now()).slice(0,7))throw new InputError('Selecione uma competência válida a partir de novembro de 2026.');
  if(!['approve','changes'].includes(body.decision))throw new InputError('Selecione a avaliação do mês.');
  const old=db[name].find(s=>s.user_id===owner.id&&s.month===month);
  if(old?.status==='approved')throw new InputError('Este mês já está aprovado e registrado no extrato.');
  const feedback=text(body.feedback,'a avaliação das horas, dos indicadores e dos resultados');
  const report=commercialReport(db,owner,month,now());
  if(body.decision==='approve'&&(!report.can_close||!report.worklogs_count))throw new InputError('Aguarde o encerramento do mês e registre as horas e resultados antes de aprovar.');
  const review={status:body.decision==='approve'?'approved':'changes',feedback,author:me.name,reviewed_at:now()};
  const data={user_id:owner.id,month,...review,monthly_cents:commercialTerms.monthly_cents,weekly_minutes:commercialTerms.weekly_minutes,
    reviews:[...(old?.reviews||[]),review],...(body.decision==='approve'?{report_snapshot:{...report,settlement:undefined}}:{}),};
  const row=old?Object.assign(old,data):add(name,data);
  if(body.decision==='approve'){
    add('taskPayments',{kind:'commercial_monthly',assigned_to:owner.id,month,cents:commercialTerms.monthly_cents,title:'Remuneração mensal · Comercial',settlement_id:row.id,approved_at:review.reviewed_at});
  }
  return {status:200,data:show(row)};
}
