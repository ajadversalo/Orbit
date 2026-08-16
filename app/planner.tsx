"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, Moon, Plus, RotateCcw, Settings, Sparkles, Sun, Target, Trash2, X } from "lucide-react";
import { createSession, createTopic, deleteSession, deleteTopic, moveOrResizeSession, reopenTopic, resizeTopicBoundary, toggleSession, toggleTopicDay, updateSession, updateTopicSchedule } from "./actions";

type Topic = { id: number; title: string; description: string; color: string; startDate: string; targetDate: string; status: string };
type Session = { id: number; topicId: number; title: string; notes: string; startsAt: Date; endsAt: Date; status: string };
type CompletedDay = { id: number; topicId: number; date: string; completedAt: Date };
// Store semantic color names in Turso instead of hex values. This lets the visual
// palette evolve later without migrating every saved topic.
const colors: Record<string, string> = {
  violet: "#8b5cf6",
  coral: "#f97360",
  cyan: "#27b4c2",
  gold: "#e6a92f",
  green: "#36a269",
  blue: "#3b82f6",
  pink: "#ec4899",
  indigo: "#6366f1",
  lime: "#84b82e",
  orange: "#f28c28",
  red: "#dc4c64",
  slate: "#64748b",
};
// Produce a local YYYY-MM-DD key. Topic coverage is a calendar concept, so local
// dates prevent evening activity from appearing on the following UTC day.
const fmtDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

// This Client Component owns interaction state; persisted records arrive from the
// server and are refreshed automatically after successful Server Actions.
export default function Planner({ topics, sessions, completedDays }: { topics: Topic[]; sessions: Session[]; completedDays: CompletedDay[] }) {
  const [month, setMonth] = useState(() => new Date());
  const [modal, setModal] = useState<"topic"|"session"|"detail"|"edit"|"day"|null>(null);
  const [selectedSession, setSelectedSession] = useState<Session|null>(null);
  const [selectedTopicDay, setSelectedTopicDay] = useState<{topic:Topic;date:string}|null>(null);
  const [selectedDate, setSelectedDate] = useState(fmtDay(new Date()));
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [dragging, setDragging] = useState<{id:number;mode:"move"|"resize"}|null>(null);
  const [topicDrag, setTopicDrag] = useState<{id:number;edge:"start"|"end"|"move";offset?:number}|null>(null);
  useEffect(()=>{ setTheme(document.documentElement.dataset.theme==="dark"?"dark":"light"); },[]);
  const toggleTheme=()=>{const next=theme==="light"?"dark":"light";setTheme(next);document.documentElement.dataset.theme=next;localStorage.setItem("orbit-theme",next)};
  // Render six complete Monday-first weeks. A stable 42-cell grid avoids layout
  // jumps when moving between calendar months of different lengths.
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1); const result: Date[] = [];
    const cursor = new Date(start); cursor.setDate(cursor.getDate() - ((cursor.getDay()+6)%7));
    for(let i=0;i<42;i++){ result.push(new Date(cursor)); cursor.setDate(cursor.getDate()+1); }
    return result;
  }, [month]);
  // Derive dashboard totals from source records so counters cannot drift out of
  // sync when a session is edited, completed, or rescheduled.
  const completed = sessions.filter(s=>s.status === "completed").length;
  const activeTopics = topics.filter(t=>t.status!=="completed");
  const completedTopics = topics.filter(t=>t.status==="completed");
  // Capture the selected item before opening a shared modal. This lets the same UI
  // support new sessions, rescheduling, and daily topic check-ins.
  const openSession = (date: Date) => { setSelectedDate(fmtDay(date)); setModal("session"); };
  const editSession = (session: Session) => { setSelectedSession(session); setModal("detail"); };
  const openTopicDay = (topic: Topic, date: string) => { setSelectedTopicDay({topic,date}); setModal("day"); };
  const dropEvent = async (date:string) => { if(!dragging)return; await moveOrResizeSession(dragging.id,date,dragging.mode); setDragging(null); };
  const dropOnDay = async (date:string) => { if(topicDrag){let target=date;if(topicDrag.edge==="move"&&topicDrag.offset){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()-topicDrag.offset);target=fmtDay(d)}await resizeTopicBoundary(topicDrag.id,target,topicDrag.edge);setTopicDrag(null);return} await dropEvent(date); };

  return <main>
    <header className="topbar">
      <div className="brand"><div className="brandmark"><Sparkles size={18}/></div><span>orbit</span></div>
      <div className="stats header-stats">
        <div><span className="stat-icon purple"><Target/></span><strong>{topics.filter(t=>t.status==="active").length}</strong><small>active topics</small></div>
        <div><span className="stat-icon gold"><Flame/></span><strong>{completed}</strong><small>events done</small></div>
      </div>
      <div className="top-actions"><span className="today-label">Your learning space</span><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} title={`Switch to ${theme==="light"?"dark":"light"} mode`}>{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button><button className="primary" onClick={()=>setModal("topic")}><Plus size={17}/> New topic</button></div>
    </header>
    <section className="workspace">
      <aside>
        <div className="section-title"><span>Your topics</span><button aria-label="Add topic" onClick={()=>setModal("topic")}><Plus size={16}/></button></div>
        <div className="topic-list">{activeTopics.length ? activeTopics.map(t => {
          const total=Math.floor((Date.parse(`${t.targetDate}T00:00:00Z`)-Date.parse(`${t.startDate}T00:00:00Z`))/86400000)+1, done=completedDays.filter(d=>d.topicId===t.id&&d.date>=t.startDate&&d.date<=t.targetDate).length, pct=total>0?Math.round(done/total*100):0;
          return <article className="topic-card" key={t.id} role="button" tabIndex={0} aria-label={`Open ${t.title}`} onClick={()=>openTopicDay(t,fmtDay(new Date()))} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openTopicDay(t,fmtDay(new Date()))}}} style={{"--accent":colors[t.color]||colors.violet} as React.CSSProperties}>
            <div className="topic-head"><span className="dot"/><span className="topic-status">{t.status}</span></div><h3>{t.title}</h3><p>{t.description||"A new path to explore."}</p>
            <div className="progress"><span style={{width:`${pct}%`}}/></div><div className="topic-meta"><span>{done}/{total} learning days</span><b>{pct}%</b></div>
          </article>}) : <div className="empty-topic"><BookOpen/><h3>Your next obsession?</h3><p>Add something you have always wanted to learn.</p></div>}</div>
        {sessions.length>0&&<div className="upcoming"><div className="section-title"><span>Upcoming events</span></div>{sessions.filter(s=>s.status==="planned"&&fmtDay(new Date(s.endsAt))>=fmtDay(new Date())).slice(0,4).map(s=>{const t=topics.find(t=>t.id===s.topicId);return <button className="session-card" key={s.id} onClick={()=>editSession(s)} style={{"--accent":colors[t?.color||"violet"]} as React.CSSProperties}><span className="session-date"><b>{new Date(s.startsAt).getDate()}</b>{new Date(s.startsAt).toLocaleString("en",{month:"short"})}</span><span className="session-copy"><b>{s.title}</b><small>{t?.title}</small></span><ChevronRight size={15}/></button>})}</div>}
        {completedTopics.length>0&&<div className="resume-list"><div className="section-title"><span>Add to resume</span></div>{completedTopics.map(t=><div className="resume-card" key={t.id} style={{"--accent":colors[t.color]||colors.violet} as React.CSSProperties}><span className="dot"/><span><b>{t.title}</b><small>Completed</small></span><button onClick={()=>reopenTopic(t.id)} aria-label={`Undo completion for ${t.title}`} title="Undo completion"><RotateCcw size={14}/><span>Undo</span></button></div>)}</div>}
      </aside>
      <div className="calendar-shell">
        <div className="calendar-head"><div><p>LEARNING RHYTHM</p><h2>{month.toLocaleString("en",{month:"long",year:"numeric"})}</h2></div><div className="calendar-nav"><button onClick={()=>setMonth(new Date())}>Today</button><button aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1))}><ChevronLeft/></button><button aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1))}><ChevronRight/></button></div></div>
        <div className="weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d}>{d}</span>)}</div>
        <div className="calendar-grid">{days.map((day,i)=>{
          const key=fmtDay(day), ds=sessions.filter(s=>fmtDay(new Date(s.startsAt))===key), isToday=key===fmtDay(new Date()), faded=day.getMonth()!==month.getMonth();
          // Reserve topic lanes across the full week so continuous bands do not
          // jump vertically when another topic starts or ends nearby.
          const weekStart=fmtDay(days[i-(i%7)]), weekEnd=fmtDay(days[i-(i%7)+6]);
          const coverageLanes=topics.filter(t=>t.startDate<=weekEnd&&t.targetDate>=weekStart).slice(0,2);
          return <button className={`day ${faded?"faded":""} ${dragging||topicDrag?"drop-ready":""}`} key={i} onClick={()=>openSession(day)} onDragOver={e=>{if(dragging||topicDrag)e.preventDefault()}} onDrop={e=>{e.preventDefault();e.stopPropagation();void dropOnDay(key)}}>
            <span className={isToday?"today":""}>{day.getDate()}</span>
            <div className="coverage-bands">{coverageLanes.map(t=>{const visible=key>=t.startDate&&key<=t.targetDate,starts=t.startDate===key,ends=t.targetDate===key,startsWeek=day.getDay()===1,isDone=completedDays.some(d=>d.topicId===t.id&&d.date===key);return visible?<div key={t.id} draggable className={`coverage ${starts?"coverage-start":""} ${ends?"coverage-end":""} ${isDone?"coverage-done":""}`} style={{"--accent":colors[t.color]||colors.violet} as React.CSSProperties} title="Drag to move; use an edge to resize" onDragStart={e=>{e.stopPropagation();const offset=Math.round((Date.parse(`${key}T00:00:00Z`)-Date.parse(`${t.startDate}T00:00:00Z`))/86400000);setTopicDrag({id:t.id,edge:"move",offset});e.dataTransfer.effectAllowed="move"}} onDragEnd={()=>setTopicDrag(null)} onClick={e=>{e.stopPropagation();openTopicDay(t,key)}}>{starts&&<i className="coverage-handle coverage-handle-start" draggable onClick={e=>e.stopPropagation()} onDragStart={e=>{e.stopPropagation();setTopicDrag({id:t.id,edge:"start"});e.dataTransfer.effectAllowed="move"}} onDragEnd={()=>setTopicDrag(null)} title="Drag to change start date"/>}<b>{isDone&&<Check size={10}/>} {(starts||startsWeek||i===0)?t.title:""}</b>{ends&&<i className="coverage-handle coverage-handle-end" draggable onClick={e=>e.stopPropagation()} onDragStart={e=>{e.stopPropagation();setTopicDrag({id:t.id,edge:"end"});e.dataTransfer.effectAllowed="move"}} onDragEnd={()=>setTopicDrag(null)} title="Drag to change end date"/>}</div>:<div key={t.id} className="coverage coverage-placeholder" aria-hidden="true"/>})}</div>
            <div className="day-events">{ds.slice(0,2).map(s=>{const t=topics.find(t=>t.id===s.topicId), span=Math.max(1,Math.round((new Date(s.endsAt).setHours(0,0,0,0)-new Date(s.startsAt).setHours(0,0,0,0))/86400000)+1);return <div key={s.id} draggable className={`event ${s.status}`} style={{"--accent":colors[t?.color||"violet"]} as React.CSSProperties} onDragStart={e=>{e.stopPropagation();setDragging({id:s.id,mode:"move"});e.dataTransfer.effectAllowed="move"}} onDragEnd={()=>setDragging(null)} onClick={e=>{e.stopPropagation();editSession(s)}} title="Drag to move; drag the right handle to resize by days"><b>{s.title}{span>1?` · ${span} days`:""}</b><i onClick={e=>{e.stopPropagation();toggleSession(s.id,s.status!=="completed")}}><Check size={12}/></i><em draggable onDragStart={e=>{e.stopPropagation();setDragging({id:s.id,mode:"resize"});e.dataTransfer.effectAllowed="move"}} aria-label="Resize event by days" title="Drag to an end date"/></div>})}</div>
          </button>
        })}</div>
      </div>
    </section>
    {modal && <Modal title={modal==="topic"?"":modal==="detail"?(selectedSession?.title||"Calendar event"):modal==="edit"?"Event settings":modal==="day"?"Daily learning check-in":"Add an all-day event"} close={()=>setModal(null)}>{modal==="detail"&&selectedSession?<SessionDetail session={selectedSession} topic={topics.find(t=>t.id===selectedSession.topicId)} settings={()=>setModal("edit")} close={()=>setModal(null)}/>:modal==="edit"&&selectedSession?<SessionSettings session={selectedSession} topics={topics} close={()=>setModal(null)}/>:modal==="day"&&selectedTopicDay?<DailyCheckIn value={selectedTopicDay} done={completedDays.some(d=>d.topicId===selectedTopicDay.topic.id&&d.date===selectedTopicDay.date)} close={()=>setModal(null)}/>:<ActionForm type={modal as "topic"|"session"} topics={topics} date={selectedDate} session={null} close={()=>setModal(null)}/>}</Modal>}
  </main>
}

function SessionDetail({session,topic,settings,close}:{session:Session;topic?:Topic;settings:()=>void;close:()=>void}) {
  const [pending,startTransition]=useTransition();
  const start=new Date(session.startsAt), end=new Date(session.endsAt);
  return <div className="event-detail">
    <div className="event-detail-time"><CalendarDays/><span><b>{start.toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</b>{fmtDay(start)!==fmtDay(end)&&<small>Through {end.toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</small>}</span></div>
    {topic&&<p className="event-detail-topic" style={{"--accent":colors[topic.color]||colors.violet} as React.CSSProperties}><i/>{topic.title}</p>}
    {session.notes&&<p className="event-detail-notes">{session.notes}</p>}
    <div className="event-detail-actions"><button className="settings-button" onClick={settings}><Settings size={16}/> Settings</button><button className="delete-button" disabled={pending} onClick={()=>{if(window.confirm(`Delete “${session.title}”? This cannot be undone.`))startTransition(async()=>{await deleteSession(session.id);close()})}}><Trash2 size={16}/>{pending?"Deleting…":"Delete event"}</button></div>
  </div>;
}

function SessionSettings({session,topics,close}:{session:Session;topics:Topic[];close:()=>void}) {
  const [state,formAction,pending]=useActionState(async(_:unknown,fd:FormData)=>updateSession(fd),null);
  useEffect(()=>{if(state&&"ok" in state)close()},[state,close]);
  const start=new Date(session.startsAt), end=new Date(session.endsAt);
  return <form action={formAction} className="form">
    <input type="hidden" name="id" value={session.id}/>
    <label>Topic<select name="topicId" required defaultValue={session.topicId}>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
    <label>Event name<input name="title" required defaultValue={session.title}/></label>
    <div className="form-row"><label>Start date<input type="date" name="startDate" required defaultValue={fmtDay(start)}/></label><label>End date<input type="date" name="endDate" required defaultValue={fmtDay(end)}/></label></div>
    <label>Notes<textarea name="notes" defaultValue={session.notes}/></label>
    {state&&"error" in state&&<p className="error">{state.error}</p>}
    <button className="submit" disabled={pending}>{pending?"Saving…":"Save settings"}</button>
  </form>;
}

// A coverage-band click opens this focused check-in. Only today is mutable so the
// progress history represents a genuine daily habit rather than later backfilling.
function DailyCheckIn({value,done,close}:{value:{topic:Topic;date:string};done:boolean;close:()=>void}) {
  const [pending,startTransition]=useTransition(); const today=fmtDay(new Date()), canEdit=value.date===today;
  const [settings,setSettings]=useState(false);
  const [state,formAction,saving]=useActionState(async(_:unknown,fd:FormData)=>updateTopicSchedule(fd),null);
  useEffect(()=>{if(state&&"ok" in state)close()},[state,close]);
  if(settings)return <form action={formAction} className="form topic-settings"><input type="hidden" name="id" value={value.topic.id}/><div className="form-row"><label>Start date<input type="date" name="startDate" required defaultValue={value.topic.startDate}/></label><label>End date<input type="date" name="targetDate" required defaultValue={value.topic.targetDate}/></label></div>{state&&"error" in state&&<p className="error">{state.error}</p>}<button className="submit" disabled={saving}>{saving?"Saving…":"Save dates"}</button><button type="button" className="delete-topic" disabled={pending} onClick={()=>{if(window.confirm(`Delete “${value.topic.title}” and all of its events? This cannot be undone.`))startTransition(async()=>{await deleteTopic(value.topic.id);close()})}}><Trash2 size={16}/>{pending?"Deleting…":"Delete entire topic"}</button></form>;
  return <div className="daily-checkin"><div className="checkin-topic" style={{"--accent":colors[value.topic.color]||colors.violet} as React.CSSProperties}><span/><div><small>{new Date(`${value.date}T12:00:00`).toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</small><h3>{value.topic.title}</h3></div></div>{canEdit?<button className={`done-check ${done?"checked":""}`} disabled={pending} onClick={()=>startTransition(async()=>{await toggleTopicDay(value.topic.id,value.date,!done);close()})}><i>{done&&<Check/>}</i><span><b>{done?"Learning done for today":"Mark today as done"}</b><small>{done?"Click to undo this check-in.":"This advances your topic's daily progress."}</small></span></button>:<div className="checkin-locked"><Clock3/><p>{value.date<today?"This day has passed.":"Come back on this day to check in."}<small>Only today’s learning can be marked complete.</small></p></div>}<button className="topic-settings-button" onClick={()=>setSettings(true)}><Settings size={16}/> Settings</button></div>
}

// One modal frame keeps keyboard, backdrop, and close behavior consistent across
// all editing flows instead of duplicating those interaction details.
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p>ADD TO YOUR ORBIT</p>{title&&<h2>{title}</h2>}</div><button aria-label="Close" onClick={close}><X/></button></div>{children}</div></div> }

// Reuse one form for creation and rescheduling. useActionState supplies pending
// and validation feedback without building a separate client-side API layer.
function ActionForm({type,topics,date,session,close}:{type:"topic"|"session"|"edit";topics:Topic[];date:string;session:Session|null;close:()=>void}) {
  const action=type==="topic"?createTopic:type==="edit"?updateSession:createSession; const [state,formAction,pending]=useActionState(async(_:unknown,fd:FormData)=>action(fd),null);
  useEffect(()=>{ if(state && "ok" in state) close(); },[state,close]);
  return <form action={formAction} className="form">
    {type==="topic" ? <><label>What do you want to learn?<input name="title" required placeholder="e.g. Conversational Japanese" autoFocus/></label><div className="form-row"><label>Start<input type="date" name="startDate" required defaultValue={date}/></label><label>Target<input type="date" name="targetDate" required defaultValue={fmtDay(new Date(Date.now()+28*86400000))}/></label></div><fieldset className="color-field"><legend>Color</legend><div className="color-picks">{Object.entries(colors).map(([n,c])=><label className="color-option" key={n} title={n}><input type="radio" name="color" value={n} defaultChecked={n==="violet"}/><i style={{background:c}}/><span>{n}</span></label>)}</div></fieldset></> : <><label>Topic<select name="topicId" required autoFocus><option value="">Choose a topic</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label>Event name<input name="title" required placeholder="e.g. Practice greetings"/></label><div className="form-row"><label>Start date<input type="date" name="startDate" required defaultValue={date}/></label><label>End date<input type="date" name="endDate" required defaultValue={date}/></label></div><label>Notes<textarea name="notes" placeholder="What will you focus on?"/></label></>}
    {state && "error" in state && <p className="error">{state.error}</p>}<button className="submit" disabled={pending||(!topics.length&&type==="session")}>{pending?"Saving…":type==="topic"?"Start this path":type==="edit"?"Save changes":"Add event"}</button>
  </form>
}
