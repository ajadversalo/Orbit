"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Flame, Moon, Plus, Sparkles, Sun, Target, X } from "lucide-react";
import { createSession, createTopic, toggleSession, toggleTopicDay, updateSession } from "./actions";

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
  const [modal, setModal] = useState<"topic"|"session"|"edit"|"day"|null>(null);
  const [selectedSession, setSelectedSession] = useState<Session|null>(null);
  const [selectedTopicDay, setSelectedTopicDay] = useState<{topic:Topic;date:string}|null>(null);
  const [selectedDate, setSelectedDate] = useState(fmtDay(new Date()));
  const [theme, setTheme] = useState<"light"|"dark">("light");
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
  const minutes = sessions.filter(s=>s.status === "completed").reduce((n,s)=>n+(new Date(s.endsAt).getTime()-new Date(s.startsAt).getTime())/60000,0);
  // Capture the selected item before opening a shared modal. This lets the same UI
  // support new sessions, rescheduling, and daily topic check-ins.
  const openSession = (date: Date) => { setSelectedDate(fmtDay(date)); setModal("session"); };
  const editSession = (session: Session) => { setSelectedSession(session); setModal("edit"); };
  const openTopicDay = (topic: Topic, date: string) => { setSelectedTopicDay({topic,date}); setModal("day"); };

  return <main>
    <header className="topbar">
      <div className="brand"><div className="brandmark"><Sparkles size={18}/></div><span>orbit</span></div>
      <div className="top-actions"><span className="today-label">Your learning space</span><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} title={`Switch to ${theme==="light"?"dark":"light"} mode`}>{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button><button className="primary" onClick={()=>setModal("topic")}><Plus size={17}/> New topic</button></div>
    </header>
    <section className="hero">
      <div><p className="eyebrow">PERSONAL LEARNING PLANNER</p><h1>Make room for<br/><em>curiosity.</em></h1><p className="lede">Turn the things you want to learn into a rhythm you can keep.</p></div>
      <div className="stats">
        <div><span className="stat-icon purple"><Target/></span><strong>{topics.filter(t=>t.status==="active").length}</strong><small>active topics</small></div>
        <div><span className="stat-icon coral"><Clock3/></span><strong>{Math.round(minutes/60)}h</strong><small>focused so far</small></div>
        <div><span className="stat-icon gold"><Flame/></span><strong>{completed}</strong><small>sessions done</small></div>
      </div>
    </section>
    <section className="workspace">
      <aside>
        <div className="section-title"><span>Your topics</span><button aria-label="Add topic" onClick={()=>setModal("topic")}><Plus size={16}/></button></div>
        <div className="topic-list">{topics.length ? topics.map(t => {
          const total=Math.floor((Date.parse(`${t.targetDate}T00:00:00Z`)-Date.parse(`${t.startDate}T00:00:00Z`))/86400000)+1, done=completedDays.filter(d=>d.topicId===t.id&&d.date>=t.startDate&&d.date<=t.targetDate).length, pct=total>0?Math.round(done/total*100):0;
          return <article className="topic-card" key={t.id} style={{"--accent":colors[t.color]||colors.violet} as React.CSSProperties}>
            <div className="topic-head"><span className="dot"/><span className="topic-status">{t.status}</span></div><h3>{t.title}</h3><p>{t.description||"A new path to explore."}</p>
            <div className="progress"><span style={{width:`${pct}%`}}/></div><div className="topic-meta"><span>{done}/{total} learning days</span><b>{pct}%</b></div>
          </article>}) : <div className="empty-topic"><BookOpen/><h3>Your next obsession?</h3><p>Add something you have always wanted to learn.</p></div>}</div>
        {sessions.length>0&&<div className="upcoming"><div className="section-title"><span>Upcoming sessions</span></div>{sessions.filter(s=>s.status==="planned"&&new Date(s.endsAt)>=new Date()).slice(0,4).map(s=>{const t=topics.find(t=>t.id===s.topicId);return <button className="session-card" key={s.id} onClick={()=>editSession(s)} style={{"--accent":colors[t?.color||"violet"]} as React.CSSProperties}><span className="session-date"><b>{new Date(s.startsAt).getDate()}</b>{new Date(s.startsAt).toLocaleString("en",{month:"short"})}</span><span className="session-copy"><b>{s.title}</b><small>{new Date(s.startsAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} · {t?.title}</small></span><ChevronRight size={15}/></button>})}</div>}
      </aside>
      <div className="calendar-shell">
        <div className="calendar-head"><div><p>LEARNING RHYTHM</p><h2>{month.toLocaleString("en",{month:"long",year:"numeric"})}</h2></div><div className="calendar-nav"><button onClick={()=>setMonth(new Date())}>Today</button><button aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1))}><ChevronLeft/></button><button aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1))}><ChevronRight/></button></div></div>
        <div className="weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d}>{d}</span>)}</div>
        <div className="calendar-grid">{days.map((day,i)=>{ const key=fmtDay(day), ds=sessions.filter(s=>fmtDay(new Date(s.startsAt))===key), covering=topics.filter(t=>key>=t.startDate&&key<=t.targetDate), isToday=key===fmtDay(new Date()), faded=day.getMonth()!==month.getMonth(); return <button className={`day ${faded?"faded":""}`} key={i} onClick={()=>openSession(day)}><span className={isToday?"today":""}>{day.getDate()}</span><div className="coverage-bands">{covering.slice(0,2).map(t=>{const starts=t.startDate===key,ends=t.targetDate===key,weekStart=day.getDay()===1,isDone=completedDays.some(d=>d.topicId===t.id&&d.date===key);return <div key={t.id} className={`coverage ${starts?"coverage-start":""} ${ends?"coverage-end":""} ${isDone?"coverage-done":""}`} style={{"--accent":colors[t.color]||colors.violet} as React.CSSProperties} title={`${t.title}: ${isDone?"done":"not completed"}`} onClick={e=>{e.stopPropagation();openTopicDay(t,key)}}><b>{isDone&&<Check size={10}/>} {(starts||weekStart||i===0)?t.title:""}</b></div>})}</div><div className="day-events">{ds.slice(0,2).map(s=>{const t=topics.find(t=>t.id===s.topicId);return <div key={s.id} className={`event ${s.status}`} style={{"--accent":colors[t?.color||"violet"]} as React.CSSProperties} onClick={e=>{e.stopPropagation();editSession(s)}}><span>{new Date(s.startsAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</span><b>{s.title}</b><i onClick={e=>{e.stopPropagation();toggleSession(s.id,s.status!=="completed")}}><Check size={12}/></i></div>})}</div></button>})}</div>
      </div>
    </section>
    {modal && <Modal title={modal==="topic"?"Begin a learning path":modal==="edit"?"Reschedule your session":modal==="day"?"Daily learning check-in":"Plan a focus session"} close={()=>setModal(null)}>{modal==="day"&&selectedTopicDay?<DailyCheckIn value={selectedTopicDay} done={completedDays.some(d=>d.topicId===selectedTopicDay.topic.id&&d.date===selectedTopicDay.date)} close={()=>setModal(null)}/>:<ActionForm type={modal as "topic"|"session"|"edit"} topics={topics} date={selectedDate} session={modal==="edit"?selectedSession:null} close={()=>setModal(null)}/>}</Modal>}
  </main>
}

// A coverage-band click opens this focused check-in. Only today is mutable so the
// progress history represents a genuine daily habit rather than later backfilling.
function DailyCheckIn({value,done,close}:{value:{topic:Topic;date:string};done:boolean;close:()=>void}) {
  const [pending,startTransition]=useTransition(); const today=fmtDay(new Date()), canEdit=value.date===today;
  return <div className="daily-checkin"><div className="checkin-topic" style={{"--accent":colors[value.topic.color]||colors.violet} as React.CSSProperties}><span/><div><small>{new Date(`${value.date}T12:00:00`).toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</small><h3>{value.topic.title}</h3></div></div>{canEdit?<button className={`done-check ${done?"checked":""}`} disabled={pending} onClick={()=>startTransition(async()=>{await toggleTopicDay(value.topic.id,value.date,!done);close()})}><i>{done&&<Check/>}</i><span><b>{done?"Learning done for today":"Mark today as done"}</b><small>{done?"Click to undo this check-in.":"This advances your topic's daily progress."}</small></span></button>:<div className="checkin-locked"><Clock3/><p>{value.date<today?"This day has passed.":"Come back on this day to check in."}<small>Only today’s learning can be marked complete.</small></p></div>}</div>
}

// One modal frame keeps keyboard, backdrop, and close behavior consistent across
// all editing flows instead of duplicating those interaction details.
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) { return <div className="backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><p>ADD TO YOUR ORBIT</p><h2>{title}</h2></div><button aria-label="Close" onClick={close}><X/></button></div>{children}</div></div> }

// Reuse one form for creation and rescheduling. useActionState supplies pending
// and validation feedback without building a separate client-side API layer.
function ActionForm({type,topics,date,session,close}:{type:"topic"|"session"|"edit";topics:Topic[];date:string;session:Session|null;close:()=>void}) {
  const action=type==="topic"?createTopic:type==="edit"?updateSession:createSession; const [state,formAction,pending]=useActionState(async(_:unknown,fd:FormData)=>action(fd),null);
  useEffect(()=>{ if(state && "ok" in state) close(); },[state,close]);
  return <form action={formAction} className="form">
    {type==="topic" ? <><label>What do you want to learn?<input name="title" required placeholder="e.g. Conversational Japanese" autoFocus/></label><label>Why does it pull you in?<textarea name="description" placeholder="A few words to remember why you started…"/></label><div className="form-row"><label>Start<input type="date" name="startDate" required defaultValue={date}/></label><label>Target<input type="date" name="targetDate" required defaultValue={fmtDay(new Date(Date.now()+28*86400000))}/></label></div><fieldset className="color-field"><legend>Color</legend><div className="color-picks">{Object.entries(colors).map(([n,c])=><label className="color-option" key={n} title={n}><input type="radio" name="color" value={n} defaultChecked={n==="violet"}/><i style={{background:c}}/><span>{n}</span></label>)}</div></fieldset></> : <>{session&&<input type="hidden" name="id" value={session.id}/>}<label>Topic<select name="topicId" required autoFocus defaultValue={session?.topicId||""}><option value="">Choose a topic</option>{topics.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label>Session intention<input name="title" required placeholder="e.g. Practice greetings" defaultValue={session?.title||""}/></label><div className="form-row thirds"><label>Date<input type="date" name="date" required defaultValue={session?fmtDay(new Date(session.startsAt)):date}/></label><label>Start<input type="time" name="startTime" required defaultValue={session?new Date(session.startsAt).toTimeString().slice(0,5):"18:00"}/></label><label>Minutes<input type="number" name="duration" min="15" step="15" defaultValue={session?Math.round((new Date(session.endsAt).getTime()-new Date(session.startsAt).getTime())/60000):45}/></label></div><label>Notes<textarea name="notes" placeholder="What will you focus on?" defaultValue={session?.notes||""}/></label></>}
    {state && "error" in state && <p className="error">{state.error}</p>}<button className="submit" disabled={pending||(!topics.length&&type==="session")}>{pending?"Saving…":type==="topic"?"Start this path":type==="edit"?"Save new schedule":"Schedule session"}</button>
  </form>
}
