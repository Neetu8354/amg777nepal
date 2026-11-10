import Link from "next/link";

export const metadata = { title: "Billy777 — Links" };

const CSS = `
  .s-page { min-height:100vh; min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:40px 18px; gap:0;
    background: radial-gradient(ellipse 70% 42% at 50% -4%, rgba(255,96,32,0.20), transparent 70%),
      radial-gradient(ellipse 55% 38% at 88% 82%, rgba(255,80,30,0.07), transparent 70%), #0a0a0b;
    font-family: system-ui,-apple-system,'Segoe UI',sans-serif; color:#f2f2f2; }
  .s-logo { width:210px; max-width:76vw; height:auto; object-fit:contain;
    filter:drop-shadow(0 6px 30px rgba(255,90,30,0.45)); }
  .s-title { margin:18px 0 5px; font-size:24px; font-weight:800; color:#fff; letter-spacing:.2px; }
  .s-sub { margin:0 0 30px; color:#9aa0a6; font-size:14px; text-align:center; }
  .s-links { width:100%; max-width:400px; display:flex; flex-direction:column; gap:14px; }
  .s-link { position:relative; display:flex; align-items:center; gap:14px; padding:14px 16px 14px 18px; border-radius:16px;
    background:#151a1f; border:1px solid rgba(255,255,255,0.06); color:#f2f2f2; text-decoration:none; overflow:hidden;
    transition:transform .15s, border-color .15s, background .15s; }
  .s-link:hover { transform:translateY(-2px); background:#1b2129; border-color:rgba(255,255,255,0.12); }
  .s-link::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--ac); }
  .s-ico { flex-shrink:0; width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center;
    font-size:20px; color:#fff; background:var(--tile); box-shadow:0 6px 14px rgba(0,0,0,0.35); }
  .s-txt { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; text-align:left; }
  .s-txt b { font-size:15.5px; font-weight:700; }
  .s-txt small { font-size:12.5px; color:#8f979e; font-weight:400; }
  .s-chev { color:#5c646b; font-size:13px; }
  .s-apk { width:100%; max-width:400px; margin-top:26px; }
  .s-apkbtn { display:flex; align-items:center; justify-content:center; gap:13px; padding:15px 20px; border-radius:16px;
    background:linear-gradient(135deg,#ffb300,#ff5e00); color:#fff; text-decoration:none;
    box-shadow:0 10px 30px rgba(255,110,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28);
    transition:transform .15s, box-shadow .15s; }
  .s-apkbtn:hover { transform:translateY(-2px); box-shadow:0 14px 38px rgba(255,110,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28); }
  .s-apkbtn:active { transform:translateY(0) scale(.98); }
  .s-apkbtn .ai { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.20);
    display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
  .s-apkbtn .at { display:flex; flex-direction:column; align-items:center; line-height:1.25; }
  .s-apkbtn .at b { font-size:16.5px; font-weight:800; }
  .s-apkbtn .at small { font-size:10.5px; letter-spacing:1.6px; opacity:.88; font-weight:700; }
  .s-foot { margin-top:28px; padding-top:18px; width:100%; max-width:400px; text-align:center;
    border-top:1px solid rgba(255,255,255,0.07); color:#6b7178; font-size:11.5px; }
`;

export default function SocialPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="s-page">
        <img className="s-logo" src="/app/billy-logo.png" alt="Billy777" />
        <h1 className="s-title">Billy777 Customer Support</h1>
        <p className="s-sub">Follow us &amp; stay connected</p>
        <div className="s-links">
          <Link className="s-link" href="/chat" style={{ "--ac": "#22c55e", "--tile": "linear-gradient(135deg,#2fdc6f,#0d9448)" }}>
            <span className="s-ico"><i className="fas fa-comments" /></span>
            <span className="s-txt"><b>Live chat support</b><small>Chat with us — instant reply</small></span>
            <i className="fas fa-chevron-right s-chev" />
          </Link>
          <Link className="s-link" href="/verify" style={{ "--ac": "#25d366", "--tile": "linear-gradient(135deg,#34e07b,#128c7e)" }}>
            <span className="s-ico"><i className="fab fa-whatsapp" /></span>
            <span className="s-txt"><b>Login / Register</b><small>Mobile OTP login</small></span>
            <i className="fas fa-chevron-right s-chev" />
          </Link>
          <a className="s-link" href="/chat" style={{ "--ac": "#2aabee", "--tile": "linear-gradient(135deg,#37b6f6,#1d86c7)" }}>
            <span className="s-ico"><i className="fab fa-telegram" /></span>
            <span className="s-txt"><b>Telegram</b><small>Join our Telegram channel</small></span>
            <i className="fas fa-chevron-right s-chev" />
          </a>
          <a className="s-link" href="https://billy777.com/" target="_blank" rel="noopener noreferrer" style={{ "--ac": "#2dd4a8", "--tile": "linear-gradient(135deg,#34d8a8,#0d9488)" }}>
            <span className="s-ico"><i className="fas fa-globe" /></span>
            <span className="s-txt"><b>Website</b><small>Visit our official website</small></span>
            <i className="fas fa-chevron-right s-chev" />
          </a>
        </div>
        <div className="s-apk">
          <a className="s-apkbtn" href="/billy777-168.apk" download>
            <span className="ai"><i className="fas fa-download" /></span>
            <span className="at"><b>Download APK</b><small>GET THE MOBILE APP</small></span>
          </a>
        </div>
        <p className="s-foot">Billy777 Customer Support · Secure · 24/7</p>
      </div>
    </>
  );
}
