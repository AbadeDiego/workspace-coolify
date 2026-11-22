import { InputError } from './validation.mjs';

export const continuousTask = task => task?.execution_mode === 'continuo';
export async function continuousAction({task,action,body,db,me,isAdmin,add,record,complete,now}) {
  if(!continuousTask(task))throw new InputError('Esta atividade não é de fluxo contínuo.');
  if(action==='close-flow'){
    if(!isAdmin&&task.creator_id!==me.id)throw new InputError('A Gestão ou quem criou a atividade pode encerrar o fluxo.',403);
    if(['concluida','cancelada'].includes(task.status))throw new InputError('Este fluxo já foi encerrado.');
    const note=typeof body.note==='string'?body.note.trim():'';
    if(!note||note.length>3000)throw new InputError('Informe o motivo do encerramento.');
    task.status='concluida';task.completed_at=now();task.flow_closed_at=task.completed_at;
    task.flow_closure={note,author:me.name,created_at:task.completed_at};
    record('task',task,'Fluxo contínuo encerrado: '+note);
    return {task};
  }
  if(typeof body.request_id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(body.request_id))throw new InputError('Abra o formulário novamente para registrar a execução.');
  const existing=db.tasks.find(t=>t.parent_task_id===task.id&&t.execution_request_id===body.request_id);
  if(existing)return {task,execution:existing};
  if(['concluida','cancelada'].includes(task.status))throw new InputError('O fluxo já foi encerrado.');
  const day=body.executed_on,parsed=typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)?new Date(day+'T12:00:00Z'):null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(now()));
  if(!parsed||!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==day||day>today)throw new InputError('Informe uma data válida de execução até hoje.');
  const evidence=body.evidence||{};
  const entry=add('tasks',{
    title:('Execução · '+task.title).slice(0,200),description:task.description,
    startup_id:task.startup_id,product_id:task.product_id,assigned_to:task.assigned_to,creator_id:task.creator_id,
    execution_mode:'pontual',source:'continuous_execution',parent_task_id:task.id,execution_request_id:body.request_id,
    executed_on:day,status:'pendente',priority:task.priority,planned_date:day,due_date:day,checklist:[],
    ...(task.pay_terms?{pay_terms:structuredClone(task.pay_terms)}:{}),
  });
  // Reuse the ordinary completion path for links, files, Annike's publication
  // evidence and payment review. The outer transaction rolls back on failure.
  const response=await complete(entry.id,{...evidence,...(task.assigned_to==='4'?{published_on:day}:{})});
  if(!response.ok)return {response};
  if(task.status!=='bloqueada')task.status='em_andamento';
  task.last_execution_on=[task.last_execution_on||'',day].sort().at(-1);
  record('task',task,'Execução registrada em '+day+' · registro '+entry.id);
  return {task,execution:entry};
}
