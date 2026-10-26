import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type View = "login" | "register" | "verify" | "reset-email" | "reset-code" | "reset-password";

export function ProgressiveAuth() {
  const [view, setView] = useState<View>("reset-email");
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("youssefdarwish20009@gmail.com");

  const step = view.startsWith("reset") ? (view === "reset-email" ? 1 : view === "reset-code" ? 2 : 3) : 0;
  const title = view === "login" ? "مرحباً بعودتك" : view === "register" ? "أنشئ حسابك" :
    view === "verify" ? "تحقق من بريدك" : view === "reset-email" ? "استعادة كلمة المرور" :
    view === "reset-code" ? "أدخل رمز التحقق" : "اختر كلمة مرور جديدة";
  const subtitle = view === "reset-email" ? "سنرسل رمزاً آمناً إلى بريدك الإلكتروني." :
    view === "reset-code" ? `أدخل الرمز الذي أرسلناه إلى ${email}` :
    view === "reset-password" ? "اختر كلمة مرور قوية لحماية حسابك." :
    view === "verify" ? `أرسلنا رمز التوثيق إلى ${email}` :
    view === "login" ? "سجّل الدخول للعودة إلى مساحة تسعيرة." : "ابدأ تنظيم تسعيرك وعروضك في مكان واحد.";

  return <main className="auth-demo" dir="rtl">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box}.auth-demo{min-height:100vh;display:grid;place-items:center;padding:20px;background:#f7f4ec;color:#183c2c;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif}
      .auth-card{width:min(100%,420px);background:#fff;border:1px solid #e6e2d8;border-radius:22px;padding:26px 28px 24px;box-shadow:0 16px 42px #132c2012;animation:rise .45s cubic-bezier(.2,.7,.2,1) both}
      .auth-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.auth-head img{width:124px;height:72px;object-fit:contain}.secure{display:flex;align-items:center;gap:6px;color:#697970;font-size:12px}.secure svg{color:#b4963e}
      .graphic{width:52px;height:52px;display:grid;place-items:center;background:#eff4ef;border:1px solid #dce8de;color:#1a4b33;border-radius:16px;margin-bottom:16px}.graphic svg{width:24px;height:24px}
      h1{font-size:23px;margin:0 0 5px;line-height:1.5;font-weight:700}.sub{margin:0 0 21px;color:#6a796f;font-size:14px;line-height:1.8}
      .steps{display:flex;align-items:center;gap:8px;margin:0 0 23px}.step{display:flex;align-items:center;gap:7px;color:#929b94;font-size:11px;white-space:nowrap}.step b{width:22px;height:22px;border:1px solid #d5dbd5;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:600}.step.active{color:#1a4b33;font-weight:600}.step.active b{background:#1a4b33;color:#fff;border-color:#1a4b33}.step.done b{background:#edf4ee;color:#1a4b33;border-color:#cadccd}.line{height:1px;flex:1;background:#e5e8e2}
      .field{margin-bottom:15px}.field label{display:block;font-size:13px;font-weight:600;margin-bottom:7px;color:#30493a}.input-wrap{position:relative}.input-wrap svg{position:absolute;right:13px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:#87938a}.input-wrap input{padding-right:40px}
      input{width:100%;height:48px;border:1px solid #d8ddd5;border-radius:11px;padding:0 13px;background:#fff;color:#1f3026;font:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}input:focus{border-color:#1a4b33;box-shadow:0 0 0 3px #1a4b3314}input[dir=ltr]{text-align:left}
      .action{width:100%;height:48px;border:0;border-radius:11px;background:#1a4b33;color:#fff;font:inherit;font-weight:600;cursor:pointer;transition:transform .18s,background .18s,box-shadow .18s}.action:hover{background:#123b28;transform:translateY(-1px);box-shadow:0 7px 15px #1a4b3324}.action:active{transform:translateY(0)}
      .secondary{width:100%;height:46px;margin-top:9px;border:1px solid #d8ddd5;background:#fff;color:#244332;border-radius:11px;font:inherit;font-weight:600;cursor:pointer}.text-link{border:0;background:none;color:#1a4b33;font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:0}
      .row{display:flex;justify-content:space-between;align-items:center;margin:13px 0 19px;color:#6e7b72;font-size:13px}.note{display:flex;gap:8px;align-items:flex-start;padding:11px 12px;border-radius:10px;background:#f6f7f3;color:#647369;font-size:12px;line-height:1.7;margin-top:15px}.note svg{flex:none;width:16px;height:16px;color:#b4963e;margin-top:2px}
      .success{display:flex;align-items:center;gap:8px;color:#26734a;background:#eff7f0;padding:12px;border-radius:10px;font-size:13px;margin-bottom:14px}.success svg{width:17px;height:17px}.footer{border-top:1px solid #edf0eb;margin-top:22px;padding-top:15px;text-align:center;color:#7e8981;font-size:12px}.footer button{margin-right:4px}
      .otp{direction:ltr;text-align:center;font-size:22px;letter-spacing:7px;font-weight:700}.enter{animation:enter .32s ease both}
      @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes enter{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
      @media(max-width:480px){.auth-demo{padding:12px}.auth-card{padding:22px 20px 18px;border-radius:18px}.auth-head{margin-bottom:17px}.auth-head img{width:112px;height:64px}h1{font-size:21px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
    `}</style>
    <section className="auth-card enter">
      <header className="auth-head"><img src="/__mockup/images/brand-logo.png" alt="تسعيرة"/><span className="secure"><ShieldCheck size={16}/> اتصال آمن</span></header>
      <div className="graphic">{view === "login" ? <LockKeyhole/> : view === "register" ? <ShieldCheck/> : <Mail/>}</div>
      <h1>{title}</h1><p className="sub">{subtitle}</p>
      {step > 0 && <div className="steps" aria-label={`الخطوة ${step} من 3`}>
        {["البريد","الرمز","كلمة المرور"].map((label,index)=><span key={label} style={{display:"contents"}}>
          <span className={`step ${step===index+1?"active":step>index+1?"done":""}`}><b>{step>index+1?<Check size={12}/>:index+1}</b>{label}</span>{index<2&&<i className="line"/>}
        </span>)}
      </div>}
      {view === "reset-email" && <div className="enter">
        <div className="field"><label htmlFor="email">البريد الإلكتروني</label><div className="input-wrap"><Mail/><input id="email" type="email" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div></div>
        <button className="action" onClick={()=>{setSent(true);setView("reset-code")}}>إرسال رمز الاستعادة</button>
        <div className="note"><ShieldCheck/>لا نكشف إن كان البريد مرتبطاً بحساب. إذا لم يكن لديك حساب، يمكنك إنشاء حساب جديد بالبريد.</div>
      </div>}
      {view === "reset-code" && <div className="enter">
        {sent&&<div className="success"><Check/>تم إرسال الرمز إن كان البريد مرتبطاً بحساب.</div>}
        <div className="field"><label htmlFor="otp">رمز التحقق</label><input id="otp" className="otp" inputMode="numeric" maxLength={6} placeholder="••••••"/></div>
        <button className="action" onClick={()=>setView("reset-password")}>متابعة</button>
        <div className="row"><span>لم يصلك الرمز؟</span><button className="text-link" onClick={()=>setSent(true)}>إعادة الإرسال</button></div>
        <button className="secondary" onClick={()=>setView("register")}>ليس لديك حساب؟ إنشاء حساب بالبريد</button>
      </div>}
      {view === "reset-password" && <div className="enter">
        <div className="field"><label htmlFor="new-password">كلمة المرور الجديدة</label><div className="input-wrap"><LockKeyhole/><input id="new-password" type={showPassword?"text":"password"} dir="ltr" placeholder="8 أحرف على الأقل" autoComplete="new-password"/><button aria-label="إظهار كلمة المرور" onClick={()=>setShowPassword(!showPassword)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",border:0,background:"none",color:"#78867b"}}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
        <button className="action" onClick={()=>setView("login")}>حفظ كلمة المرور الجديدة</button>
      </div>}
      {view === "login" && <div className="enter"><div className="field"><label>البريد الإلكتروني</label><input type="email" dir="ltr" placeholder="you@example.com"/></div><div className="field"><label>كلمة المرور</label><input type="password" dir="ltr" placeholder="••••••••"/></div><div className="row"><span>تسجيل آمن بالبريد</span><button className="text-link" onClick={()=>setView("reset-email")}>نسيت كلمة المرور؟</button></div><button className="action">تسجيل الدخول</button></div>}
      {(view === "register" || view === "verify") && <div className="enter">
        {view === "register" ? <><div className="field"><label>الاسم الكامل</label><input placeholder="الاسم الكامل"/></div><div className="field"><label>البريد الإلكتروني</label><input type="email" dir="ltr" placeholder="you@example.com"/></div><div className="field"><label>كلمة المرور</label><input type="password" dir="ltr" autoComplete="new-password"/></div><button className="action" onClick={()=>setView("verify")}>إنشاء الحساب</button></> :
        <><div className="field"><label>رمز توثيق البريد</label><input className="otp" maxLength={6} inputMode="numeric" placeholder="••••••"/></div><button className="action" onClick={()=>setView("login")}>تأكيد البريد</button></>}
      </div>}
      <footer className="footer">{view === "reset-email" || view === "reset-code" || view === "reset-password" ? "تذكرت كلمة المرور؟" : "لديك حساب بالفعل؟"} <button className="text-link" onClick={()=>setView(view.startsWith("reset")?"login":view==="login"?"register":"login")}>{view.startsWith("reset")||view==="register"?"تسجيل الدخول":"إنشاء حساب بالبريد"}</button></footer>
    </section>
  </main>;
}
