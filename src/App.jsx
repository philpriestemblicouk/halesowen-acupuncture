import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL  = "admin@halesowenacupuncture.co.uk";
const ADMIN_PASS   = "Halesowen2024!";
const DEPOSIT_RATE = 0.25;

const TREATMENTS = [
  { id: 1, name: "Initial Consultation", duration: 90, price: 120, description: "Comprehensive assessment & first treatment", initialOnly: true },
  { id: 2, name: "Follow-up Session",    duration: 60, price: 85,  description: "Ongoing treatment & progress check",          requiresInitial: true },
  { id: 3, name: "Express Treatment",    duration: 30, price: 55,  description: "Targeted relief for specific concerns",        requiresInitial: true },
  { id: 4, name: "Cupping & Acupuncture",duration: 75, price: 100, description: "Combined therapy for deep tension release",    requiresInitial: true },
];

const PRACTITIONERS = [
  { id: 1, name: "Lucy Priest",        specialty: "Acupuncture & Holistic Wellness", avatar: "LP" },
  { id: 2, name: "Dr. Lin Wei",        specialty: "Chronic Pain & Stress",           avatar: "LW" },
  { id: 3, name: "Dr. Sarah Nakamura", specialty: "Fertility & Women's Health",      avatar: "SN" },
  { id: 4, name: "Dr. Marco Chen",     specialty: "Sports & Rehabilitation",         avatar: "MC" },
];

const TIME_SLOTS = [
  "8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
];
const UNAVAILABLE = ["9:00 AM","10:30 AM","2:00 PM","4:00 PM"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const STEP_LABELS = ["Service","Provider","Schedule","Details","Deposit"];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
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
async function getAllUsers() {
  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  return data || [];
}
async function insertBooking(booking) {
  await supabase.from("bookings").insert(booking);
}

// ─── COLOURS ─────────────────────────────────────────────────────────────────
const C = {
  bg:    "linear-gradient(135deg,#030d1f 0%,#050f22 40%,#040c1c 100%)",
  acc:   "#4da6ff", acc2: "#1a7fd4", acc3: "#2196f3",
  dark:  "#010d1a", card: "rgba(255,255,255,0.03)",
  bord:  "rgba(77,166,255,0.15)", bord2: "rgba(77,166,255,0.25)",
  muted: "#8fa0b8", text: "#e8e0d0", sub: "#c8c0b0",
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

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={SS.hdr}>
      <div style={SS.logoW}>
        <div style={SS.logoI}>✦</div>
        <span style={SS.logoT}>Halesowen Acupuncture</span>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode,setMode]       = useState("login");
  const [email,setEmail]     = useState("");
  const [name,setName]       = useState("");
  const [pass,setPass]       = useState("");
  const [pass2,setPass2]     = useState("");
  const [err,setErr]         = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    if (!email||!pass){ setErr("Please fill in all fields."); setLoading(false); return; }

    // Admin bypass
    if (email.trim().toLowerCase()===ADMIN_EMAIL.toLowerCase() && pass===ADMIN_PASS) {
      setLoading(false); onLogin({ email:ADMIN_EMAIL, name:"Admin", isAdmin:true }); return;
    }

    if (mode==="register") {
      if (!name){ setErr("Please enter your name."); setLoading(false); return; }
      if (pass!==pass2){ setErr("Passwords do not match."); setLoading(false); return; }
      if (pass.length<6){ setErr("Password must be at least 6 characters."); setLoading(false); return; }
      const existing = await getUser(email);
      if (existing){ setErr("An account with this email already exists."); setLoading(false); return; }
      const user = await createUser(email, name, btoa(pass));
      if (!user){ setErr("Registration failed. Please try again."); setLoading(false); return; }
      setLoading(false); onLogin({ email:user.email, name:user.name, isAdmin:false });
    } else {
      const user = await getUser(email);
      if (!user||user.password_hash!==btoa(pass)){ setErr("Invalid email or password."); setLoading(false); return; }
      setLoading(false); onLogin({ email:user.email, name:user.name, isAdmin:false });
    }
  };

  return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={SS.wrap}>
        <Logo/>
        <h1 style={{...SS.title, textAlign:"center", marginBottom:"4px"}}>Welcome</h1>
        <p style={{...SS.sub, textAlign:"center", marginBottom:"28px"}}>Halesowen Acupuncture · Online Booking</p>
        <div style={{...SS.card, maxWidth:"420px", margin:"0 auto 20px"}}>
          <div style={SS.secT}>{mode==="login"?"Sign In":"Create Account"}</div>
          {mode==="register" && <div style={SS.ig}><label style={SS.lbl}>Full Name *</label><input style={SS.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith"/></div>}
          <div style={SS.ig}><label style={SS.lbl}>Email Address *</label><input style={SS.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com"/></div>
          <div style={SS.ig}><label style={SS.lbl}>Password *</label><input style={SS.inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          {mode==="register" && <div style={SS.ig}><label style={SS.lbl}>Confirm Password *</label><input style={SS.inp} type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••"/></div>}
          {err && <div style={SS.err}>{err}</div>}
          <div style={{marginTop:"20px"}}><button style={SS.btnP(true)} onClick={submit} disabled={loading}>{loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}</button></div>
          <div style={{marginTop:"16px",fontSize:"12px",color:C.muted,textAlign:"center"}}>
            {mode==="login"
              ? <>No account? <span style={{color:C.acc,cursor:"pointer"}} onClick={()=>{setMode("register");setErr("");}}>Register here</span></>
              : <>Already registered? <span style={{color:C.acc,cursor:"pointer"}} onClick={()=>{setMode("login");setErr("");}}>Sign in</span></>}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:"11px",color:"rgba(77,166,255,0.4)"}}>You must register to book an appointment</div>
      </div>
    </div>
  );
}

// ─── BOOKING FLOW ─────────────────────────────────────────────────────────────
function BookingFlow({ user, onLogout }) {
  const today = new Date();
  const [step,setStep]           = useState(1);
  const [treatment,setTreatment] = useState(null);
  const [practitioner,setPract]  = useState(null);
  const [viewMonth,setVM]        = useState(today.getMonth());
  const [viewYear,setVY]         = useState(today.getFullYear());
  const [selDate,setSelDate]     = useState(null);
  const [selTime,setSelTime]     = useState(null);
  const [form,setForm]           = useState({ name:user.name, email:user.email, phone:"", notes:"" });
  const [card,setCard]           = useState({ number:"", expiry:"", cvc:"", nameOnCard:"" });
  const [processing,setProc]     = useState(false);
  const [confirmed,setConfirmed] = useState(false);
  const [hasInitial,setHasInit]  = useState(false);
  const [bookingRef,setBookingRef] = useState("");

  useEffect(() => {
    getUser(user.email).then(u => { if(u) setHasInit(u.has_initial||false); });
  }, [user.email]);

  const depositAmt = treatment ? Math.round(treatment.price * DEPOSIT_RATE) : 0;
  const isToday   = (d) => d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
  const isPast    = (d) => { const dt=new Date(viewYear,viewMonth,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; };
  const isWeekend = (d) => { const day=new Date(viewYear,viewMonth,d).getDay(); return day===0||day===6; };
  const prevMonth = () => { if(viewMonth===0){setVM(11);setVY(y=>y-1);}else setVM(m=>m-1); setSelDate(null);setSelTime(null); };
  const nextMonth = () => { if(viewMonth===11){setVM(0);setVY(y=>y+1);}else setVM(m=>m+1); setSelDate(null);setSelTime(null); };
  const fmtCard   = (v) => v.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19);
  const fmtExp    = (v) => { const x=v.replace(/\D/g,"").slice(0,4); return x.length>=3?x.slice(0,2)+"/"+x.slice(2):x; };

  const canGo = () => {
    if(step===1) return !!treatment;
    if(step===2) return !!practitioner;
    if(step===3) return !!selDate&&!!selTime;
    if(step===4) return !!(form.name&&form.email);
    if(step===5) return card.number.replace(/\s/g,"").length===16&&card.expiry.length===5&&card.cvc.length>=3&&!!card.nameOnCard;
    return false;
  };

  const doConfirm = async () => {
    setProc(true);
    const id = "ACP-"+Math.random().toString(36).substring(2,8).toUpperCase();
    const booking = {
      id, treatment: treatment.name, practitioner: practitioner.name,
      date: `${MONTHS[viewMonth]} ${selDate}, ${viewYear}`, time: selTime,
      deposit_paid: depositAmt, notes: form.notes, source: "patient",
      patient_name: user.name, patient_email: user.email,
    };
    await insertBooking(booking);
    if (treatment.initialOnly) await updateUserInitial(user.email);
    setBookingRef(id);
    setTimeout(()=>{ setProc(false); setConfirmed(true); }, 1500);
  };

  if (confirmed) return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={SS.wrap}>
        <Logo/>
        <div style={SS.card}>
          <div style={{textAlign:"center",padding:"30px 0"}}>
            <div style={{width:"72px",height:"72px",borderRadius:"50%",background:`linear-gradient(135deg,${C.acc},${C.acc3})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",margin:"0 auto 20px"}}>✓</div>
            <div style={{fontSize:"24px",fontFamily:"Palatino,serif",color:"#f0ebe0",marginBottom:"8px"}}>Appointment Confirmed</div>
            <div style={{fontSize:"13px",color:C.muted,marginBottom:"24px",lineHeight:"1.7"}}>
              See you soon, <strong style={{color:C.sub}}>{user.name.split(" ")[0]}</strong>!
            </div>
            <div style={SS.sumB}>
              {[["Treatment",treatment.name],["Practitioner",practitioner.name],["Date & Time",`${MONTHS[viewMonth]} ${selDate}, ${viewYear} · ${selTime}`],["Deposit Paid",`£${depositAmt}`]].map(([l,v],i,a)=>(
                <div key={l} style={SS.sumR(i===a.length-1)}><span style={SS.sumL}>{l}</span><span style={{...SS.sumV,color:l==="Deposit Paid"?C.acc:C.text}}>{v}</span></div>
              ))}
            </div>
            <div style={{display:"inline-block",padding:"8px 20px",background:"rgba(77,166,255,0.1)",border:"1px solid rgba(77,166,255,0.3)",borderRadius:"8px",fontSize:"12px",color:C.acc,letterSpacing:"3px",marginBottom:"24px"}}>{bookingRef}</div>
            <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
              <button style={SS.btnP(true)} onClick={()=>{setConfirmed(false);setStep(1);setTreatment(null);setPract(null);setSelDate(null);setSelTime(null);}}>Book Another</button>
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

        {/* Step indicators */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:"28px",position:"relative"}}>
          <div style={{position:"absolute",top:"13px",left:"calc(10% + 13px)",right:"calc(10% + 13px)",height:"1px",background:"rgba(77,166,255,0.2)",zIndex:0}}/>
          {STEP_LABELS.map((label,i)=>{
            const n=i+1; const a=step===n; const d=step>n;
            return (
              <div key={n} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",flex:1,position:"relative",zIndex:1,cursor:d?"pointer":"default"}} onClick={()=>d&&setStep(n)}>
                <div style={{width:"26px",height:"26px",borderRadius:"50%",background:d?C.acc:"transparent",border:d?"none":a?`2px solid ${C.acc}`:`1px solid rgba(77,166,255,0.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:d?C.dark:a?C.acc:"rgba(77,166,255,0.4)",fontWeight:"bold"}}>{d?"✓":n}</div>
                <span style={{fontSize:"9px",letterSpacing:"1.5px",textTransform:"uppercase",color:d||a?C.acc:"rgba(77,166,255,0.3)"}}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1 - Treatment */}
        {step===1 && (
          <div style={SS.card}>
            <div style={SS.secT}>Select a Treatment</div>
            {!hasInitial && <div style={{background:"rgba(77,166,255,0.06)",border:"1px solid rgba(77,166,255,0.15)",borderRadius:"10px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px",color:C.muted}}>ℹ️ As a new patient, please book the <strong style={{color:C.acc}}>Initial Consultation</strong> first. Other treatments unlock after your first visit.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {TREATMENTS.map(t=>{
                const locked=t.requiresInitial&&!hasInitial; const sel=treatment?.id===t.id;
                return (
                  <div key={t.id} style={{padding:"16px",borderRadius:"12px",border:sel?`1px solid ${C.acc}`:"1px solid rgba(255,255,255,0.08)",background:sel?"rgba(77,166,255,0.08)":locked?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",cursor:locked?"not-allowed":"pointer",opacity:locked?0.45:1,position:"relative"}} onClick={()=>!locked&&setTreatment(t)}>
                    {locked&&<div style={{position:"absolute",top:"10px",right:"10px",fontSize:"12px"}}>🔒</div>}
                    <div style={{fontSize:"14px",marginBottom:"3px",color:"#f0ebe0",fontFamily:"Palatino,serif"}}>{t.name}</div>
                    <div style={{fontSize:"11px",color:C.muted,marginBottom:"8px",lineHeight:"1.5"}}>{t.description}</div>
                    <div style={{display:"flex",gap:"10px",fontSize:"11px",color:C.acc}}><span>⏱ {t.duration}min</span><span>£{t.price}</span></div>
                    {locked&&<div style={{fontSize:"10px",color:"rgba(77,166,255,0.5)",marginTop:"4px"}}>Unlocks after initial consultation</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 - Practitioner */}
        {step===2 && (
          <div style={SS.card}>
            <div style={SS.secT}>Choose Your Practitioner</div>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {PRACTITIONERS.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",borderRadius:"12px",cursor:"pointer",border:practitioner?.id===p.id?`1px solid ${C.acc}`:"1px solid rgba(255,255,255,0.08)",background:practitioner?.id===p.id?"rgba(77,166,255,0.08)":"rgba(255,255,255,0.02)"}} onClick={()=>setPract(p)}>
                  <div style={{width:"42px",height:"42px",borderRadius:"50%",background:"linear-gradient(135deg,#0d2a4a,#0a1e38)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:C.acc,flexShrink:0}}>{p.avatar}</div>
                  <div><div style={{fontSize:"14px",color:"#f0ebe0",fontFamily:"Palatino,serif"}}>{p.name}</div><div style={{fontSize:"12px",color:C.muted}}>{p.specialty}</div></div>
                  {practitioner?.id===p.id&&<div style={{marginLeft:"auto",color:C.acc}}>✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 - Calendar */}
        {step===3 && (
          <div style={SS.card}>
            <div style={SS.secT}>Pick a Date & Time</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
              <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"30px",height:"30px",borderRadius:"7px",cursor:"pointer",fontSize:"16px"}} onClick={prevMonth}>‹</button>
              <span style={{fontSize:"15px",color:"#f0ebe0",fontFamily:"Palatino,serif"}}>{MONTHS[viewMonth]} {viewYear}</span>
              <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"30px",height:"30px",borderRadius:"7px",cursor:"pointer",fontSize:"16px"}} onClick={nextMonth}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"16px"}}>
              {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"9px",color:C.muted,padding:"3px 0",marginBottom:"2px"}}>{d}</div>)}
              {Array.from({length:getFirstDay(viewYear,viewMonth)}).map((_,i)=><div key={"e"+i}/>)}
              {Array.from({length:getDaysInMonth(viewYear,viewMonth)}).map((_,i)=>{
                const d=i+1; const dis=isPast(d)||isWeekend(d); const sel=selDate===d&&!dis; const tod=isToday(d);
                return <div key={d} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"7px",fontSize:"12px",cursor:dis?"not-allowed":"pointer",background:sel?C.acc:tod?"rgba(77,166,255,0.12)":"transparent",color:sel?C.dark:dis?"rgba(255,255,255,0.15)":tod?C.acc:"#c8c0b0",border:tod&&!sel?`1px solid rgba(77,166,255,0.4)`:"1px solid transparent",fontWeight:sel||tod?"bold":"normal"}} onClick={()=>{if(!dis){setSelDate(d);setSelTime(null);}}}>{d}</div>;
              })}
            </div>
            {selDate&&<>
              <div style={{fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:C.muted,marginBottom:"10px"}}>Available times · {MONTHS[viewMonth]} {selDate}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"7px"}}>
                {TIME_SLOTS.map(t=>{const un=UNAVAILABLE.includes(t);const sel=selTime===t;
                  return <div key={t} style={{padding:"9px 0",textAlign:"center",borderRadius:"7px",fontSize:"11px",cursor:un?"not-allowed":"pointer",background:sel?C.acc:un?"transparent":"rgba(255,255,255,0.03)",color:sel?C.dark:un?"rgba(255,255,255,0.15)":"#c8c0b0",border:sel?"none":un?"1px dashed rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.1)",textDecoration:un?"line-through":"none",fontWeight:sel?"bold":"normal"}} onClick={()=>{if(!un)setSelTime(t);}}>{t}</div>;
                })}
              </div>
            </>}
          </div>
        )}

        {/* Step 4 - Details */}
        {step===4 && (
          <div style={SS.card}>
            <div style={SS.secT}>Your Details</div>
            <div style={SS.sumB}>
              {[["Treatment",`${treatment?.name} · ${treatment?.duration}min`],["Practitioner",practitioner?.name],["Date & Time",`${MONTHS[viewMonth]} ${selDate} · ${selTime}`]].map(([l,v],i,a)=>(
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

        {/* Step 5 - Deposit */}
        {step===5 && (
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
          {step<5
            ?<button style={SS.btnP(canGo())} onClick={()=>canGo()&&setStep(s=>s+1)}>Continue →</button>
            :<button style={SS.btnP(canGo()&&!processing)} onClick={()=>canGo()&&!processing&&doConfirm()}>{processing?"Processing…":`Pay £${depositAmt} & Confirm`}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const today = new Date();
  const [tab,setTab]           = useState("bookings");
  const [bookings,setBookings] = useState([]);
  const [patients,setPatients] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [aEmail,setAEmail]     = useState("");
  const [aTreat,setATreat]     = useState(TREATMENTS[0]);
  const [aPract,setAPract]     = useState(PRACTITIONERS[0]);
  const [aMonth,setAMonth]     = useState(today.getMonth());
  const [aYear,setAYear]       = useState(today.getFullYear());
  const [aDate,setADate]       = useState(null);
  const [aTime,setATime]       = useState(null);
  const [aNotes,setANotes]     = useState("");
  const [addErr,setAddErr]     = useState("");
  const [addOk,setAddOk]       = useState("");

  const loadAll = async () => {
    setLoading(true);
    setBookings(await getAllBookings());
    setPatients(await getAllUsers());
    setLoading(false);
  };
  useEffect(()=>{ loadAll(); },[]);

  const prevM = ()=>{ if(aMonth===0){setAMonth(11);setAYear(y=>y-1);}else setAMonth(m=>m-1); setADate(null);setATime(null); };
  const nextM = ()=>{ if(aMonth===11){setAMonth(0);setAYear(y=>y+1);}else setAMonth(m=>m+1); setADate(null);setATime(null); };
  const isPastA = (d)=>{ const dt=new Date(aYear,aMonth,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; };
  const isWknd = (d)=>{ const day=new Date(aYear,aMonth,d).getDay(); return day===0||day===6; };

  const addBooking = async () => {
    setAddErr(""); setAddOk("");
    if (!aEmail){ setAddErr("Enter patient email."); return; }
    if (!aDate||!aTime){ setAddErr("Select a date and time."); return; }
    let u = await getUser(aEmail);
    if (!u) {
      u = await createUser(aEmail, aEmail, "");
    }
    const booking = {
      id: "ACP-"+Math.random().toString(36).substring(2,8).toUpperCase(),
      treatment: aTreat.name, practitioner: aPract.name,
      date: `${MONTHS[aMonth]} ${aDate}, ${aYear}`, time: aTime,
      deposit_paid: 0, notes: aNotes, source: "admin",
      patient_name: u?.name||aEmail, patient_email: aEmail.toLowerCase(),
    };
    await insertBooking(booking);
    if (aTreat.initialOnly) await updateUserInitial(aEmail);
    setAddOk(`✓ Booking ${booking.id} added for ${aEmail}`);
    setADate(null); setATime(null); setANotes(""); setAEmail("");
    loadAll();
  };

  const tabBtn = (id,label) => (
    <button onClick={()=>setTab(id)} style={{padding:"9px 20px",background:tab===id?"rgba(77,166,255,0.15)":"transparent",border:`1px solid ${tab===id?C.acc:"rgba(77,166,255,0.2)"}`,borderRadius:"8px",color:tab===id?C.acc:C.muted,cursor:"pointer",fontSize:"12px",letterSpacing:"1px",fontFamily:"Georgia,serif"}}>{label}</button>
  );

  return (
    <div style={SS.app}><div style={SS.deco1}/><div style={SS.deco2}/>
      <div style={{...SS.wrap,maxWidth:"900px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:"10px"}}>
              <div style={SS.logoI}>✦</div>
              <span style={SS.logoT}>Halesowen Acupuncture</span>
            </div>
            <div style={{fontSize:"11px",color:C.muted,marginTop:"4px",letterSpacing:"2px",textTransform:"uppercase"}}>Admin Dashboard</div>
          </div>
          <button style={SS.btnS} onClick={onLogout}>Sign Out</button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"20px"}}>
          {[["Total Bookings",bookings.length,"📅"],["Registered Patients",patients.length,"👤"],["Admin Added",bookings.filter(b=>b.source==="admin").length,"⚙️"]].map(([l,v,ic])=>(
            <div key={l} style={{...SS.card,padding:"20px",marginBottom:0,textAlign:"center"}}>
              <div style={{fontSize:"24px",marginBottom:"4px"}}>{ic}</div>
              <div style={{fontSize:"22px",color:C.acc,fontFamily:"Palatino,serif"}}>{v}</div>
              <div style={{fontSize:"11px",color:C.muted}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:"8px",marginBottom:"20px"}}>
          {tabBtn("bookings","All Bookings")}
          {tabBtn("patients","Patients")}
          {tabBtn("add","+ Add Booking")}
        </div>

        {/* Bookings Tab */}
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
                    <div style={{fontSize:"12px",color:C.muted}}>{b.date} · {b.time} · {b.practitioner}</div>
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

        {/* Patients Tab */}
        {tab==="patients"&&(
          <div style={SS.card}>
            <div style={SS.secT}>Registered Patients ({patients.length})</div>
            {loading&&<div style={{color:C.muted,fontSize:"13px"}}>Loading…</div>}
            {!loading&&patients.length===0&&<div style={{color:C.muted,fontSize:"13px"}}>No registered patients yet.</div>}
            {patients.map(p=>(
              <div key={p.email} style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(77,166,255,0.1)",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                <div>
                  <div style={{fontSize:"13px",color:"#f0ebe0",marginBottom:"2px"}}>{p.name}</div>
                  <div style={{fontSize:"12px",color:C.muted}}>{p.email}</div>
                </div>
                <span style={SS.badge(p.has_initial)}>{p.has_initial?"✓ Initial Complete":"Awaiting Initial"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add Booking Tab */}
        {tab==="add"&&(
          <div style={SS.card}>
            <div style={SS.secT}>Add Appointment Manually</div>
            <div style={SS.ig}><label style={SS.lbl}>Patient Email *</label><input style={SS.inp} value={aEmail} onChange={e=>setAEmail(e.target.value)} placeholder="patient@example.com"/><div style={{fontSize:"11px",color:C.muted,marginTop:"5px"}}>If they don't have an account, one will be created.</div></div>
            <div style={SS.r2}>
              <div style={SS.ig}><label style={SS.lbl}>Treatment *</label>
                <select style={{...SS.inp,appearance:"none"}} value={aTreat.id} onChange={e=>setATreat(TREATMENTS.find(t=>t.id===parseInt(e.target.value)))}>
                  {TREATMENTS.map(t=><option key={t.id} value={t.id}>{t.name} (£{t.price})</option>)}
                </select>
              </div>
              <div style={SS.ig}><label style={SS.lbl}>Practitioner *</label>
                <select style={{...SS.inp,appearance:"none"}} value={aPract.id} onChange={e=>setAPract(PRACTITIONERS.find(p=>p.id===parseInt(e.target.value)))}>
                  {PRACTITIONERS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <label style={SS.lbl}>Date *</label>
            <div style={{...SS.card,padding:"16px",marginBottom:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}} onClick={prevM}>‹</button>
                <span style={{fontSize:"13px",color:"#f0ebe0"}}>{MONTHS[aMonth]} {aYear}</span>
                <button style={{background:"none",border:`1px solid rgba(77,166,255,0.3)`,color:C.acc,width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}} onClick={nextM}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
                {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"9px",color:C.muted,padding:"2px 0"}}>{d}</div>)}
                {Array.from({length:getFirstDay(aYear,aMonth)}).map((_,i)=><div key={"e"+i}/>)}
                {Array.from({length:getDaysInMonth(aYear,aMonth)}).map((_,i)=>{
                  const d=i+1; const dis=isPastA(d)||isWknd(d); const sel=aDate===d&&!dis;
                  return <div key={d} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"5px",fontSize:"11px",cursor:dis?"not-allowed":"pointer",background:sel?C.acc:"transparent",color:sel?C.dark:dis?"rgba(255,255,255,0.15)":"#c8c0b0",fontWeight:sel?"bold":"normal"}} onClick={()=>{if(!dis){setADate(d);setATime(null);}}}>{d}</div>;
                })}
              </div>
            </div>
            {aDate&&<>
              <label style={SS.lbl}>Time *</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"6px",marginBottom:"16px"}}>
                {TIME_SLOTS.map(t=>{const sel=aTime===t;
                  return <div key={t} style={{padding:"7px 0",textAlign:"center",borderRadius:"6px",fontSize:"11px",cursor:"pointer",background:sel?C.acc:"rgba(255,255,255,0.03)",color:sel?C.dark:"#c8c0b0",border:sel?"none":"1px solid rgba(255,255,255,0.1)",fontWeight:sel?"bold":"normal"}} onClick={()=>setATime(t)}>{t}</div>;
                })}
              </div>
            </>}
            <div style={SS.ig}><label style={SS.lbl}>Internal Notes</label><textarea style={{...SS.inp,resize:"vertical",minHeight:"60px"}} value={aNotes} onChange={e=>setANotes(e.target.value)} placeholder="Any notes for this appointment…"/></div>
            {addErr&&<div style={SS.err}>{addErr}</div>}
            {addOk&&<div style={{color:"#6dd06d",fontSize:"12px",marginBottom:"12px"}}>{addOk}</div>}
            <button style={SS.btnP(true)} onClick={addBooking}>Add Appointment</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser] = useState(null);
  return !user
    ? <AuthScreen onLogin={setUser}/>
    : user.isAdmin
      ? <AdminPanel onLogout={()=>setUser(null)}/>
      : <BookingFlow user={user} onLogout={()=>setUser(null)}/>;
}
