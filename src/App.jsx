import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const ADMIN_EMAIL  = "admin@halesowenacupuncture.co.uk";
const ADMIN_PASS   = "Halesowen2024!";
const DEPOSIT_RATE = 0.25;
const SLOT_INTERVAL = 30;

const TREATMENTS = [
  { id: 1, name: "Initial Consultation", duration: 90,  price: 120, description: "Comprehensive assessment & first treatment", initialOnly: true },
  { id: 2, name: "Follow-up Session",    duration: 60,  price: 85,  description: "Ongoing treatment & progress check",         requiresInitial: true },
  { id: 3, name: "Express Treatment",    duration: 30,  price: 55,  description: "Targeted relief for specific concerns",       requiresInitial: true },
  { id: 4, name: "Cupping & Acupuncture",duration: 75,  price: 100, description: "Combined therapy for deep tension release",   requiresInitial: true },
];

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STEP_LABELS = ["Service","Schedule","Details","Deposit"];

function timeToMins(str) {
  if (!str) return 0;
  if (str.includes("AM") || str.includes("PM")) {
    const [time, period] = str.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
function minsToDisplay(mins) {
  let h = Math.floor(mins / 60); const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2,"0")} ${period}`;
}
function minsTo24(mins) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
}
function generateSlots(startTime, endTime, durationMins) {
  const start = timeToMins(startTime); const end = timeToMins(endTime); const slots = [];
  for (let t = start; t + durationMins <= end; t += SLOT_INTERVAL) slots.push(minsToDisplay(t));
  return slots;
}
function getEndTime(startStr, durationMins) { return minsToDisplay(timeToMins(startStr) + durationMins); }
function getBlockedSlots(existingBookings, allSlots, newDuration) {
  const blocked = new Set();
  allSlots.forEach(slotStr => {
    const slotStart = timeToMins(slotStr); const slotEnd = slotStart + newDuration;
    for (const b of existingBookings) {
      const bStart = timeToMins(b.time); const bEnd = bStart + (parseInt(b.duration) || 60);
      if (slotStart < bEnd && slotEnd > bStart) { blocked.add(slotStr); break; }
    }
  });
  return blocked;
}
function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m)   { return new Date(y,m,1).getDay(); }

async function getUser(email) {
  const { data } = await supabase.from("users").select("*").eq("email", email.toLowerCase()).single();
  return data;
}
async function createUser(email, name, passwordHash) {
  const { data } = await supabase.from("users").insert({ email: email.toLowerCase(), name, password_hash: passwordHash, has_initial: false }).select().single();
  return data;
}
async function updateUserInitial(email) {
  await supabase.from("users").update({ has_initial: true }).eq("email", email.toLowerCase());
}
async function getAllBookings() {
  const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
  return data || [];
}
async function getBookingsForDate(dateStr) {
  const { data } = await supabase.from("bookings").select("*").eq("date", dateStr);
  return data || [];
}
async function getAllUsers() {
  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  return data || [];
}
async function insertBooking(booking) {
  const { error } = await supabase.from("bookings").insert(booking);
  return error ? error.message : null;
}
async function getSchedule() {
  const { data } = await supabase.from("schedule").select("*").order("day_of_week");
  return data || [];
}
async function saveScheduleDay(dayOfWeek, startTime, endTime, isActive) {
  const { data: existing } = await supabase.from("schedule").select("id").eq("day_of_week", dayOfWeek).single();
  if (existing) {
    await supabase.from("schedule").update({ start_time: startTime, end_time: endTime, is_active: isActive }).eq("day_of_week", dayOfWeek);
  } else {
    await supabase.from("schedule").insert({ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, is_active: isActive });
  }
}
async function deleteUser(userId) {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  return !error;
}
function makePlaceholderEmail() {
  return `noemail-${Date.now()}-${Math.random().toString(36).slice(2,6)}@manual`;
}
function isManualEmail(email) {
  return email && email.startsWith("noemail-") && email.endsWith("@manual");
}

const C = {
  bg:"linear-gradient(135deg,#030d1f 0%,#050f22 40%,#040c1c 100%)",
  acc:"#4da6ff", acc2:"#1a7fd4", acc3:"#2196f3", dark:"#010d1a",
  card:"rgba(255,255,255,0.03)", bord:"rgba(77,166,255,0.15)", bord2:"rgba(77,166,255,0.25)",
  muted:"#8fa0b8", text:"#e8e0d0", sub:"#c8c0b0",
};
const SS = {
  app:  { minHeight:"100vh", background:C.bg, fontFamily:"Georgia,serif", color:C.text, position:"relative", overflowX:"hidden" },
  deco1:{ position:"fixed", top:"-20%", right:"-10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle,rgba(77,166,255,0.06) 0%,transparent 70%)", zIndex:0, pointerEvents:"none" },
  deco2:{ position:"fixed", bottom:"-20%", left:"-10%", width:"600px", height:"600px", borderRadius:"50%", background:"radial-gradient(circle,rgba(0,100,200,0.07) 0%,transparent 70%)", zIndex:0, pointerEvents:"none" },
  wrap: { maxWidth:"720px", margin:"0 auto", padding:"40px 20px", position:"relative", zIndex:1 },
  card: { background:C.card, border:`1px solid ${C.bord}`, borderRadius:"16px", padding:"28px", marginBottom:"20px", backdropFilter:"blur(10px)" },
  hdr:  { textAlign:"center", marginBottom:"36px" },
  logoW:{ display:"inline-flex", alignItems:"center", gap:"10px", marginBottom:"8px" },
  logoI:{ width:"36px", height:"36px", background:`linear-gradient(135deg,${C.acc},${C.acc2})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" },
  logoT:{ fontSize:"12px", letterSpacing:"4px", textTransform:"uppercase", color:C.acc },
  title:{ fontSize:"clamp(24px,5vw,38px)", fontWeight:"normal", margin:"8px 0 4px", color:"#f0ebe0", fontFamily:"Palatino,serif" },
  sub:  { fontSize:"13px", color:"#7ab8d4", letterSpacing:"2px", textTransform:"uppercase", margin:0 },
  secT: { fontSize:"10px", letterSpacing:"3px", textTransform:"uppercase", color:C.acc, marginBottom:"20px" },
  inp:  { width:"100%", padding:"11px 13px", background:"rgba(255,255,255,0.04)", border:`1px solid rgba(77,166,255,0.2)`, borderRadius:"8px", color:C.text, fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"Georgia,serif" },
  lbl:  { display:"block", fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:C.acc, marginBottom:"7px" },
  ig:   { marginBottom:"16px" },
  r2:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" },
  btnP: (on) => ({ padding:"12px 28px", background:on?`linear-gradient(135deg,${C.acc},${C.acc3})`:"rgba(255,255,255,0.05)", border:"none", borderRadius:"8px", color:on?C.dark:"rgba(255,255,255,0.2)", cursor:on?"pointer":"not-allowed", fontSize:"12px", letterSpacing:"1px", fontWeight:"bold", fontFamily:"Georgia,serif" }),
  btnS: { padding:"11px 22px", background:"transparent", border:`1px solid rgba(77,166,255,0.3)`, borderRadius:"8px", color:C.acc, cursor:"pointer", fontSize:"12px", letterSpacing:"1px", fontFamily:"Georgia,serif" },
  sumB: { background:"rgba(77,166,255,0.06)", borderRadius:"10px", padding:"16px", marginBottom:"16px" },
  sumR: (last) => ({ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:last?"none":"1px solid rgba(255,255,255,0.06)", fontSize:"12px" }),
  sumL: { color:C.muted }, sumV: { color:C.text },
  err:  { color:"#ff6b6b", fontSize:"12px", marginTop:"8px", textAlign:"center" },
  badge:(ok) => ({ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px", fontSize:"11px", background:ok?"rgba(77,166,255,0.12)":"rgba(255,100,100,0.1)", color:ok?C.acc:"#ff8888", border:`1px solid ${ok?"rgba(77,166,255,0.3)":"rgba(255,100,100,0.3)"}` }),
};

function Logo() {
  return (
    <div style={SS.hdr}>
      <div style={SS.logoW}><div style={SS.logoI}>✦</div><span style={SS.logoT}>Halesowen Acupuncture</span></div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode,setMode]=useState("login"); const [email,setEmail]=useState(""); const [name,setName]=useState("");
  const [pass,setPass]=useState(""); const [pass2,setPass2]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit = async () => {
    setErr(""); setLoading(true);
    if (!email||!pass){ setErr("Please fill in all fields."); setLoading(false); return; }
    if (email.trim().toLowerCase()===ADMIN_EMAIL.toLowerCase()&&pass===ADMIN_PASS){ setLoading(false); onLogin({email:ADMIN_EMAIL,name:"Admin",isAdmin:true}); return; }
    if (mode==="register") {
      if (!name){ setErr("Please enter your name."); setLoading(false); return; }
      if (pass!==pass2){ setErr("Passwords do not match."); setLoading(false); return; }
      if (pass.length<6){ setErr("Password must be at least 6 characters."); setLoading(false); return; }
      const existing = await getUser(email);
      if (existing){ setErr("An account with this email already exists."); setLoading(false); return; }
      const user = await createUser(email, name, btoa(pass));
      if (!user){ setErr("Registration failed. Please try again."); setLoading(false); return; }
      setLoading(false); onLogin({email:user.email,name:user.name,isAdmin:false});
    } else {
      const user = await getUser(email);
      if (!user||user.password_hash!==btoa(pass)){ setErr("Invalid email or password."); setLoading(false); return; }
      setLoading(false); onLogin({email:user.email,name:user.name,isAdmin:false});
    }
  };
  return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={SS.wrap}>
        <Logo/>
        <h1 style={{...SS.title,textAlign:"center",marginBottom:"4px"}}>Welcome</h1>
        <p style={{...SS.sub,textAlign:"center",marginBottom:"28px"}}>Halesowen Acupuncture · Online Booking</p>
        <div style={{...SS.card,maxWidth:"420px",margin:"0 auto 20px"}}>
          <div style={SS.secT}>{mode==="login"?"Sign In":"Create Account"}</div>
          {mode==="register"&&<div style={SS.ig}><label style={SS.lbl}>Full Name *</label><input style={SS.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith"/></div>}
          <div style={SS.ig}><label style={SS.lbl}>Email Address *</label><input style={SS.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com"/></div>
          <div style={SS.ig}><label style={SS.lbl}>Password *</label><input style={SS.inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          {mode==="register"&&<div style={SS.ig}><label style={SS.lbl}>Confirm Password *</label><input style={SS.inp} type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••"/></div>}
          {err&&<div style={SS.err}>{err}</div>}
          <div style={{marginTop:"20px"}}><button style={SS.btnP(true)} onClick={submit} disabled={loading}>{loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}</button></div>
          <div style={{marginTop:"16px",fontSize:"12px",color:C.muted,textAlign:"center"}}>
            {mode==="login"?<>No account? <span style={{color:C.acc,cursor:"pointer"}} onClick={()=>{setMode("register");setErr("");}}>Register here</span></>
              :<>Already registered? <span style={{color:C.acc,cursor:"pointer"}} onClick={()=>{setMode("login");setErr("");}}>Sign in</span></>}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:"11px",color:"rgba(77,166,255,0.4)"}}>You must register to book an appointment</div>
      </div>
    </div>
  );
}

function BookingFlow({ user, onLogout }) {
  const today = new Date();
  const [step,setStep]=useState(1); const [treatment,setTreatment]=useState(null);
  const [viewMonth,setVM]=useState(today.getMonth()); const [viewYear,setVY]=useState(today.getFullYear());
  const [selDate,setSelDate]=useState(null); const [selTime,setSelTime]=useState(null);
  const [slots,setSlots]=useState([]); const [blocked,setBlocked]=useState(new Set());
  const [form,setForm]=useState({name:user.name,email:user.email,phone:"",notes:""});
  const [card,setCard]=useState({number:"",expiry:"",cvc:"",nameOnCard:""});
  const [processing,setProc]=useState(false); const [confirmed,setConfirmed]=useState(false);
  const [hasInitial,setHasInit]=useState(false); const [schedule,setSchedule]=useState([]);
  const [bookingRef,setBookingRef]=useState("");

  useEffect(()=>{
    getUser(user.email).then(u=>{ if(u) setHasInit(u.has_initial||false); });
    getSchedule().then(setSchedule);
  },[user.email]);

  useEffect(()=>{
    if(!selDate||!treatment||schedule.length===0) return;
    const dow = new Date(viewYear,viewMonth,selDate).getDay();
    const daySched = schedule.find(s=>s.day_of_week===dow);
    if(!daySched||!daySched.is_active){ setSlots([]); return; }
    const avail = generateSlots(daySched.start_time, daySched.end_time, treatment.duration);
    setSlots(avail);
    const dateStr = `${MONTHS[viewMonth]} ${selDate}, ${viewYear}`;
    getBookingsForDate(dateStr).then(ex=>setBlocked(getBlockedSlots(ex, avail, treatment.duration)));
  },[selDate,treatment,schedule,viewMonth,viewYear]);

  const depositAmt = treatment ? Math.round(treatment.price * DEPOSIT_RATE) : 0;
  const isToday  = (d)=>d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
  const isPast   = (d)=>{ const dt=new Date(viewYear,viewMonth,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; };
  const isUnavail= (d)=>{ const dow=new Date(viewYear,viewMonth,d).getDay(); const s=schedule.find(x=>x.day_of_week===dow); return !s||!s.is_active; };
  const prevMonth=()=>{ if(viewMonth===0){setVM(11);setVY(y=>y-1);}else setVM(m=>m-1); setSelDate(null);setSelTime(null); };
  const nextMonth=()=>{ if(viewMonth===11){setVM(0);setVY(y=>y+1);}else setVM(m=>m+1); setSelDate(null);setSelTime(null); };
  const fmtCard=(v)=>v.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19);
  const fmtExp=(v)=>{ const x=v.replace(/\D/g,"").slice(0,4); return x.length>=3?x.slice(0,2)+"/"+x.slice(2):x; };
  const canGo=()=>{
    if(step===1) return !!treatment;
    if(step===2) return !!selDate&&!!selTime;
    if(step===3) return !!(form.name&&form.email);
    if(step===4) return card.number.replace(/\s/g,"").length===16&&card.expiry.length===5&&card.cvc.length>=3&&!!card.nameOnCard;
    return false;
  };
  const doConfirm=async()=>{
    setProc(true);
    const id="ACP-"+Math.random().toString(36).substring(2,8).toUpperCase();
    const booking={ id, treatment:treatment.name, practitioner:"Lucy Priest", date:`${MONTHS[viewMonth]} ${selDate}, ${viewYear}`, time:selTime, duration:treatment.duration, deposit_paid:depositAmt, notes:form.notes, source:"patient", patient_name:user.name, patient_email:user.email };
    await insertBooking(booking);
    if(treatment.initialOnly) await updateUserInitial(user.email);
    setBookingRef(id);
    setTimeout(()=>{ setProc(false); setConfirmed(true); },1500);
  };

  if(confirmed) return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={SS.wrap}><Logo/>
        <div style={SS.card}>
          <div style={{textAlign:"center",padding:"30px 0"}}>
            <div style={{width:"72px",height:"72px",borderRadius:"50%",background:`linear-gradient(135deg,${C.acc},${C.acc3})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",margin:"0 auto 20px"}}>✓</div>
            <div style={{fontSize:"24px",fontFamily:"Palatino,serif",color:"#f0ebe0",marginBottom:"8px"}}>Appointment Confirmed</div>
            <div style={{fontSize:"13px",color:C.muted,marginBottom:"24px",lineHeight:"1.7"}}>See you soon, <strong style={{color:C.sub}}>{user.name.split(" ")[0]}</strong>!</div>
            <div style={SS.sumB}>
              {[["Treatment",treatment.name],["With","Lucy Priest"],["Date & Time",`${MONTHS[viewMonth]} ${selDate}, ${viewYear} · ${selTime}`],["Deposit Paid",`£${depositAmt}`]].map(([l,v],i,a)=>(
                <div key={l} style={SS.sumR(i===a.length-1)}><span style={SS.sumL}>{l}</span><span style={{...SS.sumV,color:l==="Deposit Paid"?C.acc:C.text}}>{v}</span></div>
              ))}
            </div>
            <div style={{display:"inline-block",padding:"8px 20px",background:"rgba(77,166,255,0.1)",border:"1px solid rgba(77,166,255,0.3)",borderRadius:"8px",fontSize:"12px",color:C.acc,letterSpacing:"3px",marginBottom:"24px"}}>{bookingRef}</div>
            <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
              <button style={SS.btnP(true)} onClick={()=>{setConfirmed(false);setStep(1);setTreatment(null);setSelDate(null);setSelTime(null);}}>Book Another</button>
              <button style={SS.btnS} onClick={onLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={SS.wrap}>
        <Logo/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"14px",color:C.sub}}>Hello, <strong style={{color:"#f0ebe0"}}>{user.name}</strong></div>
            <div style={SS.badge(hasInitial)}>{hasInitial?"✓ Initial consultation completed":"Initial consultation required first"}</div>
          </div>
          <button style={SS.btnS} onClick={onLogout}>Sign Out</button>
        </div>
        <h2 style={{...SS.title,textAlign:"center",marginBottom:"4px"}}>Book Your Session</h2>
        <p style={{...SS.sub,textAlign:"center",marginBottom:"24px"}}>Traditional Acupuncture · Halesowen</p>
        <div style={{display:"flex",justifyContent:"center",marginBottom:"28px",position:"relative"}}>
          <div style={{position:"absolute",top:"13px",left:"calc(10% + 13px)",right:"calc(10% + 13px)",height:"1px",background:"rgba(77,166,255,0.2)",zIndex:0}}/>
          {STEP_LABELS.map((label,i)=>{ const n=i+1; const a=step===n; const d=step>n; return (
            <div key={n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",flex:1,position:"relative",zIndex:1,cursor:d?"pointer":"default"}} onClick={()=>d&&setStep(n)}>
              <div style={{width:"26px",height:"26px",borderRadius:"50%",background:d?C.acc:"transparent",border:d?"none":a?`2px solid ${C.acc}`:`1px solid rgba(77,166,255,0.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:d?C.dark:a?C.acc:"rgba(77,166,255,0.4)",fontWeight:"bold"}}>{d?"✓":n}</div>
              <span style={{fontSize:"9px",letterSpacing:"1.5px",textTransform:"uppercase",color:d||a?C.acc:"rgba(77,166,255,0.3)"}}>{label}</span>
            </div>
          ); })}
        </div>

        {step===1&&(
          <div style={SS.card}>
            <div style={SS.secT}>Select a Treatment</div>
            {!hasInitial&&<div style={{background:"rgba(77,166,255,0.06)",border:"1px solid rgba(77,166,255,0.15)",borderRadius:"10px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px",color:C.muted}}>ℹ️ As a new patient, please book the <strong style={{color:C.acc}}>Initial Consultation</strong> first. Other treatments unlock after your first visit.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {TREATMENTS.map(t=>{ const locked=t.requiresInitial&&!hasInitial; const sel=treatment?.id===t.id; return (
                <div key={t.id} style={{padding:"16px",borderRadius:"12px",border:sel?`1px solid ${C.acc}`:"1px solid rgba(255,255,255,0.08)",background:sel?"rgba(77,166,255,0.08)":locked?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",cursor:locked?"not-allowed":"pointer",opacity:locked?0.45:1,position:"relative"}} onClick={()=>!locked&&setTreatment(t)}>
                  {locked&&<div style={{position:"absolute",top:"10px",right:"10px",fontSize:"12px"}}>🔒</div>}
                  <div style={{fontSize:"14px",marginBottom:"3px",color:"#f0ebe0",fontFamily:"Palatino,serif"}}>{t.name}</div>
                  <div style={{fontSize:"11px",color:C.muted,marginBottom:"8px",lineHeight:"1.5"}}>{t.description}</div>
                  <div style={{display:"flex",gap:"10px",fontSize:"11px",color:C.acc}}><span>⏱ {t.duration}min</span><span>£{t.price}</span></div>
                  {locked&&<div style={{fontSize:"10px",color:"rgba(77,166,255,0.5)",marginTop:"4px"}}>Unlocks after initial consultation</div>}
                </div>
              ); })}
            </div>
          </div>
        )}

        {step===2&&(
          <div style={SS.card}>
            <div style={SS.secT}>Pick a Date & Time</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
              <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"30px",height:"30px",borderRadius:"7px",cursor:"pointer",fontSize:"16px"}} onClick={prevMonth}>‹</button>
              <span style={{fontSize:"15px",color:"#f0ebe0",fontFamily:"Palatino,serif"}}>{MONTHS[viewMonth]} {viewYear}</span>
              <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"30px",height:"30px",borderRadius:"7px",cursor:"pointer",fontSize:"16px"}} onClick={nextMonth}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"16px"}}>
              {DAY_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:"9px",color:C.muted,padding:"3px 0",marginBottom:"2px"}}>{d}</div>)}
              {Array.from({length:getFirstDay(viewYear,viewMonth)}).map((_,i)=><div key={"e"+i}/>)}
              {Array.from({length:getDaysInMonth(viewYear,viewMonth)}).map((_,i)=>{ const d=i+1; const dis=isPast(d)||isUnavail(d); const sel=selDate===d&&!dis; const tod=isToday(d); return (
                <div key={d} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",fontSize:"12px",cursor:dis?"not-allowed":"pointer",background:sel?C.acc:tod?"rgba(77,166,255,0.12)":"transparent",color:sel?C.dark:dis?"rgba(255,255,255,0.15)":tod?C.acc:"#c8c0b0",border:tod&&!sel?`1px solid rgba(77,166,255,0.4)`:"1px solid transparent",fontWeight:sel||tod?"bold":"normal"}} onClick={()=>{ if(!dis){setSelDate(d);setSelTime(null);} }}>{d}</div>
              ); })}
            </div>
            {selDate&&slots.length===0&&<div style={{fontSize:"12px",color:C.muted,textAlign:"center",padding:"12px"}}>No availability on this day.</div>}
            {selDate&&slots.length>0&&<>
              <div style={{fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:C.muted,marginBottom:"10px"}}>Available times · {MONTHS[viewMonth]} {selDate}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}}>
                {slots.map(t=>{ const un=blocked.has(t); const sel=selTime===t; return (
                  <div key={t} style={{padding:"10px 6px",textAlign:"center",borderRadius:"8px",fontSize:"11px",cursor:un?"not-allowed":"pointer",background:sel?C.acc:un?"transparent":"rgba(255,255,255,0.03)",color:sel?C.dark:un?"rgba(255,255,255,0.2)":"#c8c0b0",border:sel?"none":un?"1px dashed rgba(255,100,100,0.2)":"1px solid rgba(255,255,255,0.1)",fontWeight:sel?"bold":"normal"}} onClick={()=>{ if(!un)setSelTime(t); }}>
                    <div>{t}</div><div style={{fontSize:"9px",opacity:0.7}}>– {getEndTime(t,treatment.duration)}</div>
                    {un&&<div style={{fontSize:"9px",color:"rgba(255,100,100,0.5)"}}>Booked</div>}
                  </div>
                ); })}
              </div>
            </>}
          </div>
        )}

        {step===3&&(
          <div style={SS.card}>
            <div style={SS.secT}>Your Details</div>
            <div style={SS.sumB}>
              {[["Treatment",`${treatment?.name} · ${treatment?.duration}min`],["With","Lucy Priest"],["Date & Time",`${MONTHS[viewMonth]} ${selDate} · ${selTime}`]].map(([l,v],i,a)=>(
                <div key={l} style={SS.sumR(i===a.length-1)}><span style={SS.sumL}>{l}</span><span style={SS.sumV}>{v}</span></div>
              ))}
            </div>
            <div style={SS.r2}>
              <div style={SS.ig}><label style={SS.lbl}>Full Name *</label><input style={SS.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jane Smith"/></div>
              <div style={SS.ig}><label style={SS.lbl}>Phone</label><input style={SS.inp} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 7700 000000"/></div>
            </div>
            <div style={SS.ig}><label style={SS.lbl}>Email Address *</label><input style={SS.inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="jane@example.com"/></div>
            <div style={SS.ig}><label style={SS.lbl}>Notes for Practitioner</label><textarea style={{...SS.inp,resize:"vertical",minHeight:"75px"}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any health conditions, concerns, or areas to focus on..."/></div>
          </div>
        )}

        {step===4&&(
          <div style={SS.card}>
            <div style={SS.secT}>Secure Your Appointment</div>
            <div style={{background:`linear-gradient(135deg,rgba(77,166,255,0.08),rgba(33,150,243,0.05))`,border:`1px solid ${C.bord2}`,borderRadius:"12px",padding:"16px 18px",marginBottom:"18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"11px",color:C.muted,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"3px"}}>Deposit Due Today</div>
                <div style={{fontSize:"26px",color:C.acc,fontFamily:"Palatino,serif"}}>£{depositAmt}</div>
                <div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>25% of £{treatment?.price} · balance due at appointment</div>
              </div>
              <div style={{width:"48px",height:"48px",borderRadius:"10px",background:"rgba(77,166,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>💳</div>
            </div>
            <div style={{background:"linear-gradient(135deg,#0d1e38,#061428)",border:`1px solid rgba(77,166,255,0.2)`,borderRadius:"14px",padding:"18px",marginBottom:"16px"}}>
              <div style={{width:"30px",height:"22px",background:"linear-gradient(135deg,#d4af37,#b8962e)",borderRadius:"4px",marginBottom:"12px"}}/>
              <div style={{fontSize:"14px",letterSpacing:"3px",color:C.text,marginBottom:"12px",fontFamily:"monospace"}}>{card.number||"•••• •••• •••• ••••"}</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><div style={{fontSize:"8px",color:C.muted,letterSpacing:"1px",textTransform:"uppercase"}}>Card Holder</div><div style={{fontSize:"11px",color:C.muted,letterSpacing:"2px",textTransform:"uppercase"}}>{card.nameOnCard||"YOUR NAME"}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:"8px",color:C.muted,letterSpacing:"1px",textTransform:"uppercase"}}>Expires</div><div style={{fontSize:"12px",color:C.sub,fontFamily:"monospace"}}>{card.expiry||"MM/YY"}</div></div>
              </div>
            </div>
            <div style={SS.ig}><label style={SS.lbl}>Name on Card *</label><input style={SS.inp} value={card.nameOnCard} onChange={e=>setCard({...card,nameOnCard:e.target.value})} placeholder="Jane Smith"/></div>
            <div style={SS.ig}><label style={SS.lbl}>Card Number *</label><input style={SS.inp} value={card.number} onChange={e=>setCard({...card,number:fmtCard(e.target.value)})} placeholder="1234 5678 9012 3456" maxLength={19}/></div>
            <div style={SS.r2}>
              <div style={SS.ig}><label style={SS.lbl}>Expiry *</label><input style={SS.inp} value={card.expiry} onChange={e=>setCard({...card,expiry:fmtExp(e.target.value)})} placeholder="MM/YY" maxLength={5}/></div>
              <div style={SS.ig}><label style={SS.lbl}>CVC *</label><input style={SS.inp} value={card.cvc} onChange={e=>setCard({...card,cvc:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="123" maxLength={4}/></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:C.muted,marginTop:"12px"}}>🔒 Payment is encrypted & secure.</div>
          </div>
        )}

        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end",marginTop:"4px"}}>
          {step>1&&!processing&&<button style={SS.btnS} onClick={()=>setStep(s=>s-1)}>← Back</button>}
          {step<4?<button style={SS.btnP(canGo())} onClick={()=>canGo()&&setStep(s=>s+1)}>Continue →</button>
            :<button style={SS.btnP(canGo()&&!processing)} onClick={()=>canGo()&&!processing&&doConfirm()}>{processing?"Processing…":`Pay £${depositAmt} & Confirm`}</button>}
        </div>
      </div>
    </div>
  );
}

function ScheduleTab() {
  const [edits,setEdits]=useState({}); const [saving,setSaving]=useState(null); const [saveOk,setSaveOk]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    getSchedule().then(data=>{
      const init={};
      for(let d=0;d<=6;d++){ const row=data.find(s=>s.day_of_week===d); init[d]={ is_active:row?row.is_active:(d>=1&&d<=5), start_time:row?row.start_time:"09:00", end_time:row?row.end_time:"17:00" }; }
      setEdits(init); setLoading(false);
    });
  },[]);
  const update=(day,field,value)=>setEdits(prev=>({...prev,[day]:{...prev[day],[field]:value}}));
  const save=async(day)=>{ setSaving(day); setSaveOk(""); const e=edits[day]; await saveScheduleDay(day,e.start_time,e.end_time,e.is_active); setSaving(null); setSaveOk(`${DAY_NAMES[day]} saved!`); setTimeout(()=>setSaveOk(""),2000); };
  const previewSlots=(day)=>{ const e=edits[day]; if(!e||!e.is_active) return []; return generateSlots(e.start_time,e.end_time,30); };
  const timeOptions=[];
  for(let m=6*60;m<=22*60;m+=30) timeOptions.push(minsTo24(m));
  if(loading) return <div style={{color:C.muted,fontSize:"13px"}}>Loading schedule…</div>;
  return (
    <div>
      <div style={{fontSize:"12px",color:C.muted,marginBottom:"20px",lineHeight:"1.6"}}>Set Lucy's working hours. Patients only see slots within these hours. Toggle a day off to mark it as closed.</div>
      {saveOk&&<div style={{color:"#6dd06d",fontSize:"12px",marginBottom:"16px",textAlign:"center"}}>{saveOk}</div>}
      {[1,2,3,4,5,6,0].map(day=>{ const e=edits[day]||{is_active:false,start_time:"09:00",end_time:"17:00"}; const preview=previewSlots(day); return (
        <div key={day} style={{padding:"16px",borderRadius:"12px",border:`1px solid ${e.is_active?"rgba(77,166,255,0.2)":"rgba(255,255,255,0.06)"}`,background:e.is_active?"rgba(77,166,255,0.04)":"rgba(255,255,255,0.01)",marginBottom:"10px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:"120px"}}>
              <div style={{width:"42px",height:"22px",borderRadius:"11px",background:e.is_active?C.acc:"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative"}} onClick={()=>update(day,"is_active",!e.is_active)}>
                <div style={{position:"absolute",top:"3px",left:e.is_active?"22px":"3px",width:"16px",height:"16px",borderRadius:"50%",background:"white",transition:"left 0.2s"}}/>
              </div>
              <span style={{fontSize:"14px",color:e.is_active?"#f0ebe0":C.muted,fontFamily:"Palatino,serif",minWidth:"90px"}}>{DAY_NAMES[day]}</span>
            </div>
            {e.is_active?(
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <div><div style={{fontSize:"9px",color:C.acc,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>Start</div>
                  <select style={{...SS.inp,width:"100px",padding:"7px 10px",appearance:"none"}} value={e.start_time} onChange={ev=>update(day,"start_time",ev.target.value)}>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select>
                </div>
                <div style={{color:C.muted,fontSize:"14px",marginTop:"16px"}}>→</div>
                <div><div style={{fontSize:"9px",color:C.acc,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"4px"}}>End</div>
                  <select style={{...SS.inp,width:"100px",padding:"7px 10px",appearance:"none"}} value={e.end_time} onChange={ev=>update(day,"end_time",ev.target.value)}>{timeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select>
                </div>
                <div><div style={{fontSize:"9px",color:"transparent",marginBottom:"4px"}}>.</div>
                  <button style={{...SS.btnP(true),padding:"8px 16px",fontSize:"11px"}} onClick={()=>save(day)}>{saving===day?"Saving…":"Save"}</button>
                </div>
              </div>
            ):<div style={{fontSize:"12px",color:"rgba(255,255,255,0.2)"}}>Closed</div>}
          </div>
          {e.is_active&&preview.length>0&&(
            <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(77,166,255,0.1)"}}>
              <div style={{fontSize:"9px",color:C.muted,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px"}}>{preview.length} slots · {e.start_time} – {e.end_time}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                {preview.map(t=><div key={t} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(77,166,255,0.08)",border:"1px solid rgba(77,166,255,0.15)",color:C.muted}}>{t}</div>)}
              </div>
            </div>
          )}
          {e.is_active&&preview.length===0&&<div style={{marginTop:"8px",fontSize:"11px",color:"rgba(255,100,100,0.6)"}}>⚠️ End time must be after start time</div>}
        </div>
      ); })}
    </div>
  );
}

function AdminPanel({ onLogout }) {
  const today=new Date();
  const [tab,setTab]=useState("bookings"); const [bookings,setBookings]=useState([]); const [patients,setPatients]=useState([]); const [loading,setLoading]=useState(true);
  const [aEmail,setAEmail]=useState(""); const [aName,setAName]=useState(""); const [aTreat,setATreat]=useState(TREATMENTS[0]);
  const [aMonth,setAMonth]=useState(today.getMonth()); const [aYear,setAYear]=useState(today.getFullYear());
  const [aDate,setADate]=useState(null); const [aTime,setATime]=useState(null);
  const [aSlots,setASlots]=useState([]); const [aBlocked,setABlocked]=useState(new Set());
  const [aNotes,setANotes]=useState(""); const [addErr,setAddErr]=useState(""); const [addOk,setAddOk]=useState("");
  const [schedule,setSchedule]=useState([]);
  const [showAddPatient,setShowAddPatient]=useState(false);
  const [pName,setPName]=useState(""); const [pEmail,setPEmail]=useState(""); const [pPhone,setPPhone]=useState(""); const [pHasInitial,setPHasInitial]=useState(false);
  const [patientErr,setPatientErr]=useState(""); const [patientOk,setPatientOk]=useState("");

  const loadAll=async()=>{ setLoading(true); setBookings(await getAllBookings()); setPatients(await getAllUsers()); setSchedule(await getSchedule()); setLoading(false); };
  useEffect(()=>{ loadAll(); },[]);

  useEffect(()=>{
    if(!aDate||!aTreat||schedule.length===0) return;
    const dow=new Date(aYear,aMonth,aDate).getDay();
    const daySched=schedule.find(s=>s.day_of_week===dow);
    if(!daySched||!daySched.is_active){ setASlots([]); return; }
    const avail=generateSlots(daySched.start_time,daySched.end_time,aTreat.duration);
    setASlots(avail);
    const dateStr=`${MONTHS[aMonth]} ${aDate}, ${aYear}`;
    getBookingsForDate(dateStr).then(ex=>setABlocked(getBlockedSlots(ex,avail,aTreat.duration)));
  },[aDate,aTreat,schedule,aMonth,aYear]);

  const prevM=()=>{ if(aMonth===0){setAMonth(11);setAYear(y=>y-1);}else setAMonth(m=>m-1); setADate(null);setATime(null); };
  const nextM=()=>{ if(aMonth===11){setAMonth(0);setAYear(y=>y+1);}else setAMonth(m=>m+1); setADate(null);setATime(null); };
  const isPastA=(d)=>{ const dt=new Date(aYear,aMonth,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; };

  const addBooking=async()=>{
    setAddErr(""); setAddOk("");
    const emailVal=aEmail.trim().toLowerCase(); const nameVal=aName.trim();
    if(!nameVal&&!emailVal){ setAddErr("Enter patient name or email."); return; }
    if(!aDate||!aTime){ setAddErr("Select a date and time."); return; }
    let u=null;
    if(emailVal){ u=await getUser(emailVal); if(!u) u=await createUser(emailVal,nameVal||emailVal,""); }
    else { u=await createUser(makePlaceholderEmail(),nameVal,""); }
    if(!u){ setAddErr("Failed to create patient record."); return; }
    const booking={ id:"ACP-"+Math.random().toString(36).substring(2,8).toUpperCase(), treatment:aTreat.name, practitioner:"Lucy Priest", date:`${MONTHS[aMonth]} ${aDate}, ${aYear}`, time:aTime, duration:aTreat.duration, deposit_paid:0, notes:aNotes, source:"admin", patient_name:u.name||nameVal||emailVal, patient_email:u.email };
    const saveErr=await insertBooking(booking);
    if(saveErr){ setAddErr(`Failed to save: ${saveErr}`); return; }
    if(aTreat.initialOnly||aTreat.requiresInitial) await updateUserInitial(u.email);
    setAddOk(`✓ Booking ${booking.id} added for ${u.name}`);
    setADate(null); setATime(null); setANotes(""); setAEmail(""); setAName("");
    loadAll();
  };

  const handleDeletePatient=async(patientId,patientName)=>{
    if(!window.confirm(`Delete patient "${patientName}"? Their existing bookings will remain.`)) return;
    const ok=await deleteUser(patientId);
    if(ok) loadAll();
  };

  const handleAddPatient=async()=>{
    setPatientErr(""); setPatientOk("");
    if(!pName.trim()){ setPatientErr("Patient name is required."); return; }
    const emailVal=pEmail.trim().toLowerCase();
    if(emailVal){ const existing=await getUser(emailVal); if(existing){ setPatientErr("A patient with this email already exists."); return; } }
    const storeEmail=emailVal||makePlaceholderEmail();
    const u=await createUser(storeEmail,pName.trim()+(pPhone.trim()?` — ${pPhone.trim()}`:""),"");
    if(!u){ setPatientErr("Failed to add patient. Please try again."); return; }
    if(pHasInitial) await updateUserInitial(storeEmail);
    setPatientOk(`✓ ${pName} added successfully.`);
    setPName(""); setPEmail(""); setPPhone(""); setPHasInitial(false); setShowAddPatient(false);
    loadAll();
  };

  const tabBtn=(id,label)=>(
    <button onClick={()=>setTab(id)} style={{padding:"9px 20px",background:tab===id?"rgba(77,166,255,0.15)":"transparent",border:`1px solid ${tab===id?C.acc:"rgba(77,166,255,0.2)"}`,borderRadius:"8px",color:tab===id?C.acc:C.muted,cursor:"pointer",fontSize:"12px",letterSpacing:"1px",fontFamily:"Georgia,serif"}}>{label}</button>
  );

  return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={{...SS.wrap,maxWidth:"900px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:"10px"}}><div style={SS.logoI}>✦</div><span style={SS.logoT}>Halesowen Acupuncture</span></div>
            <div style={{fontSize:"11px",color:C.muted,marginTop:"4px",letterSpacing:"2px",textTransform:"uppercase"}}>Admin Dashboard</div>
          </div>
          <button style={SS.btnS} onClick={onLogout}>Sign Out</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"20px"}}>
          {[["Total Bookings",bookings.length,"📅"],["Registered Patients",patients.length,"👤"],["Admin Added",bookings.filter(b=>b.source==="admin").length,"⚙️"]].map(([l,v,ic])=>(
            <div key={l} style={{...SS.card,padding:"20px",marginBottom:0,textAlign:"center"}}>
              <div style={{fontSize:"24px",marginBottom:"4px"}}>{ic}</div>
              <div style={{fontSize:"22px",color:C.acc,fontFamily:"Palatino,serif"}}>{v}</div>
              <div style={{fontSize:"11px",color:C.muted}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap"}}>
          {tabBtn("bookings","All Bookings")}{tabBtn("patients","Patients")}{tabBtn("add","+ Add Booking")}{tabBtn("schedule","📅 Schedule")}
        </div>

        {tab==="bookings"&&(
          <div style={SS.card}>
            <div style={SS.secT}>All Appointments ({bookings.length})</div>
            {loading&&<div style={{color:C.muted,fontSize:"13px"}}>Loading…</div>}
            {!loading&&bookings.length===0&&<div style={{color:C.muted,fontSize:"13px"}}>No bookings yet.</div>}
            {bookings.map(b=>(
              <div key={b.id} style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(77,166,255,0.1)",marginBottom:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px"}}>
                  <div>
                    <div style={{fontSize:"13px",color:"#f0ebe0",marginBottom:"3px"}}><strong>{b.patient_name||b.patient_email}</strong> — {b.treatment}</div>
                    <div style={{fontSize:"12px",color:C.muted}}>{b.date} · {b.time}{b.duration?` (${b.duration}min)`:""}</div>
                    {b.notes&&<div style={{fontSize:"11px",color:"rgba(77,166,255,0.6)",marginTop:"3px"}}>Note: {b.notes}</div>}
                  </div>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
                    <span style={SS.badge(b.source==="admin")}>{b.source==="admin"?"Admin Added":"Patient"}</span>
                    <span style={{fontSize:"11px",color:C.acc,fontFamily:"monospace"}}>{b.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="patients"&&(
          <div style={SS.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{...SS.secT,margin:0}}>Registered Patients ({patients.length})</div>
              <button style={{...SS.btnP(true),padding:"8px 16px",fontSize:"11px"}} onClick={()=>{setShowAddPatient(s=>!s);setPatientErr("");setPatientOk("");}}>
                {showAddPatient?"Cancel":"+ Add Patient"}
              </button>
            </div>
            {showAddPatient&&(
              <div style={{background:"rgba(77,166,255,0.05)",border:"1px solid rgba(77,166,255,0.2)",borderRadius:"12px",padding:"18px",marginBottom:"20px"}}>
                <div style={{fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:C.acc,marginBottom:"14px"}}>New Patient</div>
                <div style={SS.ig}><label style={SS.lbl}>Full Name *</label><input style={SS.inp} value={pName} onChange={e=>setPName(e.target.value)} placeholder="Jane Smith"/></div>
                <div style={SS.r2}>
                  <div style={SS.ig}><label style={SS.lbl}>Email (optional)</label><input style={SS.inp} type="email" value={pEmail} onChange={e=>setPEmail(e.target.value)} placeholder="jane@example.com"/></div>
                  <div style={SS.ig}><label style={SS.lbl}>Phone (optional)</label><input style={SS.inp} value={pPhone} onChange={e=>setPPhone(e.target.value)} placeholder="+44 7700 000000"/></div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px",cursor:"pointer"}} onClick={()=>setPHasInitial(v=>!v)}>
                  <div style={{width:"18px",height:"18px",borderRadius:"4px",border:`1px solid ${pHasInitial?C.acc:"rgba(77,166,255,0.3)"}`,background:pHasInitial?"rgba(77,166,255,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:C.acc}}>{pHasInitial?"✓":""}</div>
                  <span style={{fontSize:"12px",color:C.muted}}>Initial consultation already completed</span>
                </div>
                {patientErr&&<div style={SS.err}>{patientErr}</div>}
                {patientOk&&<div style={{color:"#6dd06d",fontSize:"12px",marginBottom:"8px"}}>{patientOk}</div>}
                <button style={SS.btnP(true)} onClick={handleAddPatient}>Add Patient</button>
              </div>
            )}
            {loading&&<div style={{color:C.muted,fontSize:"13px"}}>Loading…</div>}
            {!loading&&patients.length===0&&<div style={{color:C.muted,fontSize:"13px"}}>No registered patients yet.</div>}
            {patients.map(p=>{
              const noEmail=isManualEmail(p.email);
              const displayName=noEmail?p.name.split(" — ")[0]:p.name;
              const displayPhone=noEmail&&p.name.includes(" — ")?p.name.split(" — ")[1]:null;
              return (
                <div key={p.id||p.email} style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(77,166,255,0.1)",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                  <div>
                    <div style={{fontSize:"13px",color:"#f0ebe0",marginBottom:"2px"}}>{displayName}</div>
                    <div style={{fontSize:"12px",color:C.muted}}>{noEmail?"No email"+(displayPhone?" · "+displayPhone:""):p.email}</div>
                  </div>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
                    <span style={SS.badge(p.has_initial)}>{p.has_initial?"✓ Initial Complete":"Awaiting Initial"}</span>
                    <button onClick={()=>handleDeletePatient(p.id,displayName)} style={{padding:"5px 12px",background:"transparent",border:"1px solid rgba(255,100,100,0.3)",borderRadius:"6px",color:"#ff8888",cursor:"pointer",fontSize:"11px",fontFamily:"Georgia,serif"}}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="add"&&(
          <div style={SS.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <div style={{...SS.secT,margin:0}}>Add Appointment Manually</div>
              <div style={{padding:"4px 10px",background:"rgba(77,166,255,0.1)",border:"1px solid rgba(77,166,255,0.3)",borderRadius:"6px",fontSize:"10px",color:C.acc,letterSpacing:"1px"}}>Admin Override Active</div>
            </div>
            <div style={{background:"rgba(77,166,255,0.05)",border:"1px solid rgba(77,166,255,0.15)",borderRadius:"8px",padding:"10px 14px",marginBottom:"16px",fontSize:"11px",color:C.muted}}>All treatments are available regardless of patient history. Email is optional for walk-in or phone patients.</div>
            <div style={SS.r2}>
              <div style={SS.ig}><label style={SS.lbl}>Patient Name *</label><input style={SS.inp} value={aName} onChange={e=>setAName(e.target.value)} placeholder="Jane Smith"/></div>
              <div style={SS.ig}><label style={SS.lbl}>Email (optional)</label><input style={SS.inp} value={aEmail} onChange={e=>setAEmail(e.target.value)} placeholder="jane@example.com"/></div>
            </div>
            <div style={SS.ig}><label style={SS.lbl}>Treatment *</label>
              <select style={{...SS.inp,appearance:"none"}} value={aTreat.id} onChange={e=>{setATreat(TREATMENTS.find(t=>t.id===parseInt(e.target.value)));setADate(null);setATime(null);}}>
                {TREATMENTS.map(t=><option key={t.id} value={t.id}>{t.name} — {t.duration}min (£{t.price})</option>)}
              </select>
            </div>
            <label style={SS.lbl}>Date *</label>
            <div style={{...SS.card,padding:"16px",marginBottom:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}} onClick={prevM}>‹</button>
                <span style={{fontSize:"13px",color:"#f0ebe0"}}>{MONTHS[aMonth]} {aYear}</span>
                <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}} onClick={nextM}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
                {DAY_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:"9px",color:C.muted,padding:"2px 0"}}>{d}</div>)}
                {Array.from({length:getFirstDay(aYear,aMonth)}).map((_,i)=><div key={"e"+i}/>)}
                {Array.from({length:getDaysInMonth(aYear,aMonth)}).map((_,i)=>{ const d=i+1; const dis=isPastA(d); const sel=aDate===d&&!dis; return (
                  <div key={d} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"5px",fontSize:"11px",cursor:dis?"not-allowed":"pointer",background:sel?C.acc:"transparent",color:sel?C.dark:dis?"rgba(255,255,255,0.15)":"#c8c0b0",fontWeight:sel?"bold":"normal"}} onClick={()=>{ if(!dis){setADate(d);setATime(null);} }}>{d}</div>
                ); })}
              </div>
            </div>
            {aDate&&aSlots.length===0&&<div style={{fontSize:"12px",color:C.muted,marginBottom:"12px"}}>No slots for this day — check the Schedule tab.</div>}
            {aDate&&aSlots.length>0&&<>
              <label style={SS.lbl}>Time * — {MONTHS[aMonth]} {aDate}</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",marginBottom:"16px"}}>
                {aSlots.map(t=>{ const isBlocked=aBlocked.has(t); const isSel=aTime===t; return (
                  <div key={t} style={{padding:"9px 6px",textAlign:"center",borderRadius:"8px",fontSize:"11px",cursor:isBlocked?"not-allowed":"pointer",background:isSel?C.acc:isBlocked?"transparent":"rgba(255,255,255,0.03)",color:isSel?C.dark:isBlocked?"rgba(255,255,255,0.15)":"#c8c0b0",border:isSel?"none":isBlocked?"1px dashed rgba(255,100,100,0.2)":"1px solid rgba(255,255,255,0.1)",fontWeight:isSel?"bold":"normal"}} onClick={()=>{ if(!isBlocked)setATime(t); }}>
                    <div>{t}</div><div style={{fontSize:"9px",opacity:0.7}}>– {getEndTime(t,aTreat.duration)}</div>
                    {isBlocked&&<div style={{fontSize:"9px",color:"rgba(255,100,100,0.5)"}}>Booked</div>}
                  </div>
                ); })}
              </div>
            </>}
            <div style={SS.ig}><label style={SS.lbl}>Internal Notes</label><textarea style={{...SS.inp,resize:"vertical",minHeight:"60px"}} value={aNotes} onChange={e=>setANotes(e.target.value)} placeholder="Any notes for this appointment…"/></div>
            {addErr&&<div style={SS.err}>{addErr}</div>}
            {addOk&&<div style={{color:"#6dd06d",fontSize:"12px",marginBottom:"8px"}}>{addOk}</div>}
            <button style={SS.btnP(true)} onClick={addBooking}>Add Appointment</button>
          </div>
        )}

        {tab==="schedule"&&(
          <div style={SS.card}>
            <div style={SS.secT}>Lucy's Working Hours</div>
            <ScheduleTab/>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user,setUser]=useState(null);
  if(!user) return <AuthScreen onLogin={setUser}/>;
  if(user.isAdmin) return <AdminPanel onLogout={()=>setUser(null)}/>;
  return <BookingFlow user={user} onLogout={()=>setUser(null)}/>;
}
