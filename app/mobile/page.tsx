export const dynamic = "force-static";

export default function MobilePage() {
  return (
    <main
      dangerouslySetInnerHTML={{
        __html: `
<style>
  html, body {
    margin:0; padding:0; background:#020204; color:white; overflow:hidden;
    font-family:Arial, Helvetica, sans-serif; -webkit-user-select:none; user-select:none;
  }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  #app {
    position:fixed; inset:0; width:100vw; height:100dvh; overflow:hidden;
    background:
      radial-gradient(circle at 50% 22%, rgba(0,82,255,.28), transparent 34%),
      radial-gradient(circle at 20% 82%, rgba(34,211,238,.13), transparent 28%),
      #020204;
  }
  #noise {
    position:absolute; inset:0; pointer-events:none; opacity:.32;
    background-image:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size:38px 38px;
  }
  .screen { position:absolute; inset:0; display:none; padding:22px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .screen.active { display:block; }
  .center { min-height:100%; display:flex; flex-direction:column; justify-content:center; gap:14px; max-width:460px; margin:0 auto; }
  h1 { margin:0; font-size:34px; line-height:.92; letter-spacing:.08em; font-weight:1000; text-align:center; text-shadow:0 0 26px rgba(0,82,255,.85); }
  .sub { text-align:center; color:rgba(255,255,255,.62); font-size:11px; font-weight:900; letter-spacing:.22em; margin-bottom:8px; }
  .card { border:1px solid rgba(255,255,255,.14); background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035)); border-radius:28px; padding:14px; box-shadow:0 0 34px rgba(0,82,255,.14); backdrop-filter: blur(8px); }
  .btn { width:100%; min-height:62px; border:0; border-radius:26px; color:white; background:#0052ff; font-size:15px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 34px rgba(0,82,255,.44); touch-action:manipulation; }
  .btn:active, .arena:active, .difficulty:active, .pill:active { transform:scale(.975); }
  .btn.secondary { background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.16); box-shadow:none; }
  .btn.red { background:#ef4444; box-shadow:0 0 32px rgba(239,68,68,.35); }
  .row { display:flex; gap:10px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .arena, .difficulty {
    min-height:88px; border:1px solid rgba(255,255,255,.13); border-radius:23px;
    background:linear-gradient(160deg, rgba(0,82,255,.22), rgba(255,255,255,.04));
    color:white; font-weight:1000; letter-spacing:.11em; font-size:12px; touch-action:manipulation;
  }
  .difficulty, .region { min-height:58px; }
  .region { border:1px solid rgba(255,255,255,.13); border-radius:23px; background:rgba(255,255,255,.08); color:white; font-weight:1000; letter-spacing:.11em; font-size:12px; touch-action:manipulation; }
  .region.selected { border-color:#22d3ee; box-shadow:0 0 24px rgba(34,211,238,.38); background:rgba(34,211,238,.16); }
  .arena small { display:block; margin-top:7px; opacity:.62; font-size:9px; letter-spacing:.18em; }
  .arena.selected, .difficulty.selected { border-color:#0052ff; box-shadow:0 0 24px rgba(0,82,255,.45); background:linear-gradient(160deg, rgba(0,82,255,.36), rgba(255,255,255,.06)); }
  .arena[data-arena="base"].selected { border-color:#ef4444; box-shadow:0 0 24px rgba(239,68,68,.42); }
  .arena[data-arena="space"].selected { border-color:#22d3ee; box-shadow:0 0 24px rgba(34,211,238,.42); }
  .arena[data-arena="temple"].selected { border-color:#fbbf24; box-shadow:0 0 24px rgba(251,191,36,.38); }
  #gameScreen { padding:0; overflow:hidden; touch-action:none; }
  #gameWrap { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; touch-action:none; overflow:hidden; }
  #gameCanvas { width:min(100vw, calc(100dvh * 0.5714)); height:min(100dvh, calc(100vw * 1.75)); touch-action:none; display:block; }
  #hudTop { position:absolute; top:calc(env(safe-area-inset-top) + 10px); left:10px; right:10px; display:flex; justify-content:space-between; align-items:center; pointer-events:none; gap:8px; }
  #hudTop button { pointer-events:auto; }
  .pill { border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.52); color:white; border-radius:999px; padding:10px 12px; font-weight:1000; font-size:11px; letter-spacing:.12em; touch-action:manipulation; }
  #scoreHud { flex:1; text-align:center; }
  #overlayText { position:absolute; left:0; right:0; top:39%; text-align:center; font-size:42px; font-weight:1000; letter-spacing:.07em; text-shadow:0 0 28px rgba(0,82,255,.95); pointer-events:none; }
  #resultPanel {
    position:absolute; left:22px; right:22px; top:28%; display:none; padding:18px; border-radius:28px;
    border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.76); box-shadow:0 0 44px rgba(0,82,255,.28);
  }
  #resultPanel.active { display:block; }
  #resultTitle { font-size:30px; text-align:center; font-weight:1000; letter-spacing:.08em; margin-bottom:12px; }
  #matchStatus { min-height:44px; display:flex; align-items:center; justify-content:center; text-align:center; color:rgba(255,255,255,.72); font-size:12px; font-weight:900; letter-spacing:.14em; line-height:1.5; }

  #splashScreen { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; z-index:30; transition:opacity .35s ease; }
  #splashScreen.hide { opacity:0; pointer-events:none; }
  #splashLogo { width:min(76vw,360px); aspect-ratio:1/1; border-radius:42px; display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:1000; letter-spacing:.08em; background:radial-gradient(circle at 50% 40%, rgba(0,82,255,.55), rgba(0,0,0,.15) 54%, #020204 100%); border:1px solid rgba(255,255,255,.12); box-shadow:0 0 70px rgba(0,82,255,.45); text-align:center; }
  .titleBadge { margin:0 auto 10px; width:max-content; padding:9px 13px; border-radius:999px; background:rgba(0,82,255,.16); border:1px solid rgba(0,82,255,.30); color:#9dc0ff; font-size:10px; letter-spacing:.22em; font-weight:1000; }
  .menuHero { position:relative; min-height:96px; border-radius:30px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(135deg, rgba(0,82,255,.20), rgba(255,255,255,.04)); }
  .menuHero:before { content:""; position:absolute; inset:-80px; background:conic-gradient(from 0deg, transparent, rgba(0,82,255,.30), transparent, rgba(34,211,238,.18), transparent); animation:spin 8s linear infinite; }
  .menuHeroInner { position:absolute; inset:1px; border-radius:29px; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; flex-direction:column; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
  #gameWrap.shake { animation:shake .32s ease-in-out; }
  #goalFlash { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .22s ease; background:rgba(0,82,255,.24); }
  #goalFlash.active { opacity:1; }
  #roundHint { position:absolute; left:0; right:0; top:calc(env(safe-area-inset-top) + 82px); text-align:center; pointer-events:none; color:rgba(255,255,255,.55); font-size:10px; font-weight:1000; letter-spacing:.2em; }
  #overlayText.pop { animation: popText .42s ease-out; }
  @keyframes popText { 0%{opacity:0;transform:scale(.55)} 45%{opacity:1;transform:scale(1.18)} 100%{opacity:1;transform:scale(1)} }
  #resultPanel { backdrop-filter:blur(10px); }

  .premiumShell { position:relative; padding:16px; border-radius:34px; overflow:hidden; border:1px solid rgba(255,255,255,.14); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); box-shadow:0 0 54px rgba(0,82,255,.20); }
  .premiumShell:before { content:""; position:absolute; inset:-80px; background:conic-gradient(from 180deg, transparent, rgba(0,82,255,.25), transparent, rgba(34,211,238,.16), transparent); animation:spin 10s linear infinite; opacity:.9; }
  .premiumInner { position:relative; z-index:1; border-radius:26px; padding:18px 12px; background:rgba(0,0,0,.58); border:1px solid rgba(255,255,255,.08); }
  .orb { width:92px; height:92px; margin:0 auto 12px; border-radius:999px; background:radial-gradient(circle at 35% 30%, #fff, #8db5ff 16%, #0052ff 42%, #04112f 72%, #000 100%); box-shadow:0 0 46px rgba(0,82,255,.62), inset 0 0 22px rgba(255,255,255,.18); position:relative; }
  .orb:after { content:""; position:absolute; inset:-13px; border-radius:999px; border:1px solid rgba(34,211,238,.28); box-shadow:0 0 24px rgba(34,211,238,.22); }
  .featureGrid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:12px; }
  .feature { border:1px solid rgba(255,255,255,.11); background:rgba(255,255,255,.055); border-radius:16px; padding:9px 6px; text-align:center; }
  .feature strong { display:block; font-size:11px; letter-spacing:.12em; }
  .feature span { display:block; margin-top:4px; font-size:8px; letter-spacing:.12em; color:rgba(255,255,255,.52); font-weight:900; }
  .sectionLabel { display:flex; align-items:center; gap:8px; justify-content:center; color:rgba(255,255,255,.72); font-size:10px; font-weight:1000; letter-spacing:.2em; margin-bottom:10px; }
  .sectionLabel:before, .sectionLabel:after { content:""; height:1px; flex:1; background:linear-gradient(90deg, transparent, rgba(255,255,255,.18)); }
  .sectionLabel:after { background:linear-gradient(90deg, rgba(255,255,255,.18), transparent); }

  #splashScreen { background:
    radial-gradient(circle at 50% 34%, rgba(0,82,255,.34), transparent 34%),
    radial-gradient(circle at 50% 70%, rgba(34,211,238,.12), transparent 30%),
    #000; }
  #splashCard { position:relative; width:min(84vw,380px); min-height:390px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:42px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); box-shadow:0 0 90px rgba(0,82,255,.42); }
  #splashCard:before { content:""; position:absolute; inset:-110px; background:conic-gradient(from 90deg, transparent, rgba(0,82,255,.42), transparent, rgba(34,211,238,.20), transparent); animation:spin 7s linear infinite; }
  #splashCardInner { position:absolute; inset:1px; border-radius:41px; background:rgba(0,0,0,.72); display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .splashOrb { width:116px; height:116px; border-radius:999px; margin-bottom:18px; background:radial-gradient(circle at 32% 25%, #fff, #b7ccff 14%, #0052ff 40%, #03153f 72%, #000 100%); box-shadow:0 0 58px rgba(0,82,255,.68), inset 0 0 28px rgba(255,255,255,.20); position:relative; }
  .splashOrb:before, .splashOrb:after { content:""; position:absolute; inset:-16px; border-radius:999px; border:1px solid rgba(34,211,238,.30); transform:rotate(-18deg) scaleY(.46); box-shadow:0 0 30px rgba(34,211,238,.18); }
  .splashOrb:after { inset:-27px; opacity:.45; transform:rotate(24deg) scaleY(.34); }
  .splashTitle { font-size:31px; line-height:.92; text-align:center; font-weight:1000; letter-spacing:.10em; text-shadow:0 0 32px rgba(0,82,255,.95); }
  .splashSub { margin-top:14px; color:rgba(255,255,255,.58); font-size:10px; letter-spacing:.26em; font-weight:1000; }
  .menuOrbit { position:absolute; width:180px; height:180px; border-radius:999px; border:1px solid rgba(34,211,238,.12); left:50%; top:80px; transform:translateX(-50%) rotate(-12deg) scaleY(.42); pointer-events:none; box-shadow:0 0 42px rgba(0,82,255,.18); }
  .menuActionGrid { display:grid; grid-template-columns:1.15fr .85fr; gap:10px; }
  .miniBtn { min-height:62px; border-radius:26px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.08); color:white; font-size:12px; letter-spacing:.16em; font-weight:1000; touch-action:manipulation; }
  .statusStrip { display:flex; gap:8px; justify-content:center; margin-top:12px; }
  .statusChip { padding:7px 9px; border-radius:999px; background:rgba(0,82,255,.12); border:1px solid rgba(0,82,255,.22); color:rgba(255,255,255,.70); font-size:8px; letter-spacing:.16em; font-weight:1000; }


  /* GAME LOBBY STYLE MENU */
  #menuScreen { padding:16px 18px 20px; background:radial-gradient(circle at 50% 10%, rgba(0,82,255,.22), transparent 30%), #020204; }
  .lobby { min-height:100%; display:flex; flex-direction:column; gap:14px; max-width:430px; margin:0 auto; padding-top:calc(env(safe-area-inset-top) + 4px); padding-bottom:calc(env(safe-area-inset-bottom) + 10px); }
  .topBar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .profilePill { flex:1; min-height:54px; border-radius:22px; padding:8px 10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035)); box-shadow:0 0 26px rgba(0,82,255,.13); }
  .avatarBall { width:38px; height:38px; border-radius:999px; background:radial-gradient(circle at 35% 25%, #fff, #bcd2ff 18%, #0052ff 48%, #061a4d 75%, #000 100%); box-shadow:0 0 22px rgba(0,82,255,.55); position:relative; flex:0 0 auto; }
  .avatarBall:after { content:""; position:absolute; left:5px; right:5px; top:16px; height:6px; border-radius:99px; background:rgba(255,255,255,.78); transform:rotate(-12deg); }
  .profileName { font-weight:1000; font-size:12px; letter-spacing:.09em; color:white; }
  .profileSub { margin-top:3px; color:#72a6ff; font-size:9px; letter-spacing:.13em; font-weight:1000; }
  .coinPill { min-width:74px; height:40px; border-radius:18px; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.44); display:flex; align-items:center; justify-content:center; gap:6px; font-size:10px; font-weight:1000; letter-spacing:.08em; box-shadow:inset 0 0 18px rgba(255,255,255,.035); }
  .coinDot { width:14px; height:14px; border-radius:50%; background:radial-gradient(circle,#fff5b5,#fbbf24 55%,#7a4100); box-shadow:0 0 12px rgba(251,191,36,.35); }
  .hamburger { width:44px; height:40px; border-radius:18px; border:1px solid rgba(255,255,255,.13); background:rgba(0,0,0,.42); color:white; font-size:22px; font-weight:1000; }
  .lobbyHero { position:relative; min-height:282px; border-radius:34px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:linear-gradient(180deg, rgba(8,22,48,.98), rgba(1,4,12,.96)); box-shadow:0 0 48px rgba(0,82,255,.20); }
  .lobbyHero:before { content:""; position:absolute; inset:0; background:linear-gradient(120deg, transparent 8%, rgba(0,82,255,.11) 12%, transparent 20%, transparent 78%, rgba(0,82,255,.13) 86%, transparent 94%); opacity:.95; }
  .lobbyHero:after { content:""; position:absolute; left:50%; bottom:-70px; width:330px; height:170px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 50% 5%, rgba(0,82,255,.36), rgba(0,82,255,.08) 34%, transparent 70%); }
  .heroLogo { position:absolute; top:34px; left:0; right:0; text-align:center; font-size:42px; line-height:.86; font-weight:1000; letter-spacing:.09em; text-shadow:0 4px 0 rgba(255,255,255,.10), 0 0 34px rgba(0,82,255,.95); }
  .heroLogo span { display:block; color:#64a5ff; font-size:50px; letter-spacing:.075em; text-shadow:0 0 30px rgba(0,82,255,.95); }
  .heroArc { position:absolute; top:22px; left:50%; width:170px; height:76px; transform:translateX(-50%); border-top:6px solid rgba(170,210,255,.70); border-radius:50%; filter:drop-shadow(0 0 12px rgba(0,82,255,.8)); opacity:.7; }
  .heroBall { position:absolute; left:50%; bottom:52px; width:82px; height:82px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 32% 24%, #fff, #dceaff 16%, #7fb1ff 36%, #0052ff 62%, #051944 100%); box-shadow:0 0 40px rgba(0,82,255,.74), 0 18px 42px rgba(0,0,0,.7); animation:floatBall 2.4s ease-in-out infinite; }
  .heroBall:before { content:""; position:absolute; left:11px; right:11px; top:34px; height:12px; border-radius:999px; background:rgba(255,255,255,.88); transform:rotate(-10deg); }
  .heroBall:after { content:""; position:absolute; left:27px; top:31px; width:7px; height:13px; border-radius:999px; background:#020817; box-shadow:22px 0 0 #020817; }
  .heroPlatform { position:absolute; left:50%; bottom:26px; width:170px; height:30px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(ellipse, rgba(0,120,255,.72), rgba(0,82,255,.18) 48%, transparent 72%); filter:blur(.2px); }
  @keyframes floatBall { 0%,100%{ transform:translateX(-50%) translateY(0); } 50%{ transform:translateX(-50%) translateY(-13px); } }
  .bigPlay { position:relative; width:92%; min-height:64px; margin:-32px auto 0; border-radius:18px; border:1px solid rgba(155,205,255,.36); background:linear-gradient(180deg,#1e88ff,#0052ff 58%,#05276f); color:white; font-size:22px; font-weight:1000; letter-spacing:.16em; box-shadow:0 0 34px rgba(0,82,255,.56), inset 0 2px 0 rgba(255,255,255,.28); z-index:3; clip-path:polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%); }
  .bigPlay .playIcon { display:inline-block; margin-right:10px; transform:translateY(1px); }
  .quickModes { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .quickCard { min-height:58px; border-radius:18px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035)); color:white; font-weight:1000; font-size:12px; letter-spacing:.12em; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 0 20px rgba(0,82,255,.10); }
  .quickIcon { font-size:18px; filter:drop-shadow(0 0 10px rgba(0,82,255,.7)); }
  .usernameCard { border-radius:22px; padding:10px; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.32); display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
  #usernameInput { width:100%; height:46px; border:1px solid rgba(255,255,255,.13); border-radius:16px; background:rgba(255,255,255,.08); color:white; text-align:center; font-size:14px; font-weight:1000; letter-spacing:.12em; outline:none; text-transform:uppercase; }
  #usernameInput::placeholder { color:rgba(255,255,255,.34); }
  #saveNameBtn { height:46px; min-width:74px; border:0; border-radius:16px; background:white; color:#020204; font-size:11px; font-weight:1000; letter-spacing:.12em; }
  #nameWarn { min-height:16px; text-align:center; color:#ff7b7b; font-size:9px; font-weight:1000; letter-spacing:.12em; margin-top:6px; }
  .premiumRegionWrap { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .region { position:relative; min-height:66px; overflow:hidden; border-radius:22px; background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.025)); }
  .region:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 0%, rgba(34,211,238,.22), transparent 58%); opacity:.35; }
  .region strong { position:relative; display:block; font-size:16px; letter-spacing:.16em; }
  .region span { position:relative; display:block; margin-top:5px; font-size:8px; color:rgba(255,255,255,.48); letter-spacing:.16em; }
  .region.selected { border-color:#64d8ff; background:linear-gradient(180deg, rgba(34,211,238,.22), rgba(0,82,255,.10)); box-shadow:0 0 28px rgba(34,211,238,.32), inset 0 0 18px rgba(255,255,255,.06); }
  .bottomNav { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:10px; border-radius:24px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.36); box-shadow:0 0 26px rgba(0,82,255,.12); }
  .navItem { min-height:48px; border:0; border-radius:16px; background:transparent; color:rgba(255,255,255,.52); font-size:8px; letter-spacing:.10em; font-weight:1000; }
  .navItem b { display:block; font-size:18px; margin-bottom:4px; color:#6aa7ff; }
  .navItem.active { background:rgba(0,82,255,.12); color:#8ebaff; }


  /* CLEANER FINAL MOBILE LOBBY FLOW */
  #splashStage { position:relative; width:min(82vw,360px); min-height:430px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:42px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(6,18,45,.92), rgba(0,0,0,.96)); box-shadow:0 0 88px rgba(0,82,255,.38); }
  #splashStage:before { content:""; position:absolute; inset:-120px; background:conic-gradient(from 180deg, transparent, rgba(0,82,255,.38), transparent, rgba(34,211,238,.18), transparent); animation:spin 9s linear infinite; opacity:.85; }
  #splashStage:after { content:""; position:absolute; inset:1px; border-radius:41px; background:radial-gradient(circle at 50% 35%, rgba(0,82,255,.16), rgba(0,0,0,.78) 58%, rgba(0,0,0,.96)); }
  .splashArenaMini { position:relative; z-index:2; width:210px; height:168px; border-radius:30px; border:1px solid rgba(140,190,255,.24); background:linear-gradient(180deg, rgba(0,82,255,.16), rgba(255,255,255,.035)); box-shadow:inset 0 0 34px rgba(0,82,255,.13), 0 0 42px rgba(0,82,255,.24); margin-bottom:24px; overflow:hidden; }
  .splashArenaMini:before { content:""; position:absolute; left:14px; right:14px; top:50%; height:1px; background:rgba(255,255,255,.16); }
  .splashArenaMini:after { content:""; position:absolute; left:50%; top:50%; width:72px; height:72px; margin:-36px 0 0 -36px; border-radius:50%; border:1px solid rgba(0,82,255,.34); box-shadow:0 0 18px rgba(0,82,255,.28); }
  .splashBoingBall { position:absolute; left:50%; top:50%; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 34px rgba(0,82,255,.8); animation:floatBall 2s ease-in-out infinite; }
  .splashLine { position:absolute; height:7px; width:86px; border-radius:99px; background:rgba(255,255,255,.78); box-shadow:0 0 22px rgba(0,82,255,.52); }
  .splashLine.one { left:28px; bottom:42px; transform:rotate(-14deg); }
  .splashLine.two { right:26px; top:42px; transform:rotate(-14deg); opacity:.38; }
  .splashBrand { position:relative; z-index:2; text-align:center; font-size:30px; line-height:.86; letter-spacing:.12em; font-weight:1000; text-shadow:0 0 34px rgba(0,82,255,.95); }
  .splashBrand span { color:#68a7ff; font-size:42px; }
  .lobbyHero { min-height:300px; }
  .coinPill span:last-child { font-size:9px; letter-spacing:.12em; }
  .bottomNav, .quickModes, #menuScreen .card:has(.difficulty), #menuScreen .card:has(.arena) { display:none !important; }
  .lobby { justify-content:space-between; }
  .usernameCard { margin-top:0; }
  .flowBack { min-height:48px; border-radius:20px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.07); color:white; font-weight:1000; letter-spacing:.14em; }
  .modeGrid { display:grid; grid-template-columns:1fr; gap:12px; }
  .modeBtn { min-height:76px; border-radius:28px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035)); color:white; text-align:left; padding:0 18px; font-weight:1000; letter-spacing:.12em; box-shadow:0 0 26px rgba(0,82,255,.10); touch-action:manipulation; }
  .modeBtn strong { display:block; font-size:17px; }
  .modeBtn span { display:block; margin-top:6px; font-size:9px; color:rgba(255,255,255,.52); letter-spacing:.16em; }
  .modeBtn.primary { background:linear-gradient(180deg, rgba(0,82,255,.34), rgba(0,82,255,.12)); border-color:rgba(91,155,255,.42); box-shadow:0 0 34px rgba(0,82,255,.28); }
  .flowTitle { text-align:center; font-size:30px; line-height:.95; font-weight:1000; letter-spacing:.08em; text-shadow:0 0 24px rgba(0,82,255,.75); }
  .flowMiniHero { min-height:118px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 30%, rgba(0,82,255,.26), rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .flowMiniHero:before { content:""; position:absolute; width:150px; height:78px; border-radius:50%; border:1px solid rgba(100,180,255,.20); transform:rotate(-12deg) scaleY(.46); }
  .flowBall { width:58px; height:58px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 32px rgba(0,82,255,.72); }
  .roomInput { width:100%; height:58px; border:1px solid rgba(255,255,255,.14); border-radius:22px; background:rgba(255,255,255,.08); color:white; text-align:center; font-size:18px; font-weight:1000; letter-spacing:.22em; outline:none; text-transform:uppercase; }

  /* SETTINGS PANEL */
  .settingsBtn { position:relative; width:70%; min-height:48px; margin:-2px auto 0; border-radius:18px; border:1px solid rgba(255,255,255,.16); background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.035)); color:rgba(255,255,255,.86); font-size:12px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 18px rgba(0,82,255,.12); touch-action:manipulation; }
  .settingsBtn:active { transform:scale(.975); }
  .settingsCard { border-radius:30px; padding:16px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.032)); box-shadow:0 0 34px rgba(0,82,255,.16); }
  .settingRow { min-height:66px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 4px; border-bottom:1px solid rgba(255,255,255,.08); }
  .settingRow:last-child { border-bottom:0; }
  .settingTitle { font-size:13px; font-weight:1000; letter-spacing:.14em; }
  .settingSub { margin-top:5px; font-size:9px; color:rgba(255,255,255,.48); letter-spacing:.14em; font-weight:900; }
  .toggleBtn { width:84px; height:42px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.08); color:white; font-size:11px; font-weight:1000; letter-spacing:.12em; }
  .toggleBtn.on { background:linear-gradient(180deg, rgba(0,82,255,.72), rgba(0,82,255,.34)); border-color:rgba(111,170,255,.45); box-shadow:0 0 22px rgba(0,82,255,.28); }
  .regionMiniGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
  .settingsHero { min-height:132px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 28%, rgba(0,82,255,.26), rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; }
  .settingsHero:before { content:""; position:absolute; width:180px; height:82px; border-radius:50%; border:1px solid rgba(100,180,255,.22); transform:rotate(-12deg) scaleY(.46); }
  .settingsHero:after { content:""; width:62px; height:62px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 36px rgba(0,82,255,.75); }


  /* FINAL CLEAN PREMIUM MENU - image inspired, but game-native */
  #menuScreen {
    padding:16px 18px 20px !important;
    overflow-y:auto;
    background:
      radial-gradient(circle at 50% -10%, rgba(255,255,255,.16), transparent 18%),
      radial-gradient(circle at 50% 20%, rgba(0,82,255,.18), transparent 30%),
      radial-gradient(circle at 50% 45%, rgba(251,191,36,.07), transparent 38%),
      #020204 !important;
  }
  .lobby.finalMenu {
    min-height:100%;
    max-width:430px;
    margin:0 auto;
    display:flex;
    flex-direction:column;
    gap:16px;
    padding-top:calc(env(safe-area-inset-top) + 8px);
    padding-bottom:calc(env(safe-area-inset-bottom) + 16px);
  }
  .finalTop {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }
  .finalProfile {
    flex:1;
    min-height:58px;
    border-radius:25px;
    border:1px solid rgba(251,191,36,.34);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    display:flex;
    align-items:center;
    gap:12px;
    padding:9px 12px;
    box-shadow:0 0 28px rgba(0,82,255,.12), inset 0 0 22px rgba(255,255,255,.025);
  }
  .finalAvatar {
    width:42px;
    height:42px;
    border-radius:999px;
    background:radial-gradient(circle at 32% 22%, #fff, #dceaff 18%, #8bbcff 38%, #0052ff 62%, #051944 100%);
    box-shadow:0 0 22px rgba(0,82,255,.58);
    position:relative;
    flex:0 0 auto;
  }
  .finalAvatar:after {
    content:"";
    position:absolute;
    left:6px;
    right:6px;
    top:18px;
    height:6px;
    border-radius:999px;
    background:rgba(255,255,255,.88);
    transform:rotate(-10deg);
    box-shadow:0 0 12px rgba(0,82,255,.55);
  }
  .finalNameWrap {
    min-width:0;
    flex:1;
  }
  .finalName {
    font-size:15px;
    font-weight:1000;
    letter-spacing:.08em;
    color:#fff;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .finalNameSub {
    margin-top:4px;
    color:rgba(255,255,255,.46);
    font-size:8px;
    font-weight:1000;
    letter-spacing:.18em;
  }
  .finalEdit {
    width:34px;
    height:34px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.06);
    color:#f8d890;
    font-size:15px;
    font-weight:1000;
  }
  .finalHow {
    width:54px;
    height:54px;
    border-radius:22px;
    border:1px solid rgba(251,191,36,.30);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.02));
    color:#f8d890;
    font-size:22px;
    font-weight:1000;
    box-shadow:0 0 22px rgba(251,191,36,.10);
  }
  .finalStage {
    position:relative;
    min-height:500px;
    border-radius:36px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.012)),
      radial-gradient(circle at 50% 13%, rgba(255,255,255,.18), transparent 13%),
      radial-gradient(circle at 50% 43%, rgba(0,82,255,.24), transparent 34%),
      #02040a;
    box-shadow:0 0 54px rgba(0,82,255,.18), inset 0 0 80px rgba(0,0,0,.58);
  }
  .finalStage:before {
    content:"";
    position:absolute;
    left:50%;
    top:86px;
    width:270px;
    height:270px;
    margin-left:-135px;
    border-radius:999px;
    border:1px solid rgba(251,191,36,.34);
    box-shadow:0 0 44px rgba(251,191,36,.10);
  }
  .finalStage:after {
    content:"";
    position:absolute;
    left:50%;
    top:-10px;
    width:78px;
    height:260px;
    transform:translateX(-50%);
    background:linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,.08), transparent);
    filter:blur(10px);
    opacity:.55;
  }
  .finalLogo {
    position:absolute;
    top:112px;
    left:0;
    right:0;
    text-align:center;
    z-index:2;
    font-size:40px;
    line-height:.86;
    font-weight:1000;
    letter-spacing:.12em;
    color:#f6f8ff;
    text-shadow:0 0 28px rgba(0,82,255,.82), 0 3px 0 rgba(255,255,255,.08);
  }
  .finalLogo span {
    display:block;
    font-size:53px;
    color:#67a8ff;
    letter-spacing:.07em;
  }
  .finalLogo small {
    display:block;
    margin-top:14px;
    color:#f8d890;
    font-size:13px;
    letter-spacing:.62em;
    text-indent:.62em;
    text-shadow:0 0 16px rgba(251,191,36,.38);
  }
  .finalBot {
    position:absolute;
    left:50%;
    top:295px;
    width:92px;
    height:92px;
    transform:translateX(-50%);
    border-radius:999px;
    background:radial-gradient(circle at 32% 22%, #fff, #dceaff 17%, #8bbcff 38%, #0052ff 64%, #04153e 100%);
    box-shadow:0 0 42px rgba(0,82,255,.74), 0 26px 44px rgba(0,0,0,.64);
    z-index:2;
    animation:floatBall 2.6s ease-in-out infinite;
  }
  .finalBot:before {
    content:"";
    position:absolute;
    left:12px;
    right:12px;
    top:38px;
    height:11px;
    border-radius:999px;
    background:rgba(255,255,255,.92);
    transform:rotate(-10deg);
    box-shadow:0 0 16px rgba(0,82,255,.7);
  }
  .finalBot:after {
    content:"";
    position:absolute;
    left:29px;
    top:36px;
    width:7px;
    height:15px;
    border-radius:999px;
    background:#020817;
    box-shadow:27px 0 0 #020817;
  }
  .finalPlatform {
    position:absolute;
    left:50%;
    top:385px;
    width:220px;
    height:52px;
    transform:translateX(-50%);
    border-radius:50%;
    background:
      radial-gradient(ellipse at 50% 35%, rgba(0,140,255,.9), rgba(0,82,255,.22) 38%, transparent 70%);
    z-index:1;
  }
  .finalPlatform:after {
    content:"";
    position:absolute;
    left:22px;
    right:22px;
    top:10px;
    height:28px;
    border-radius:50%;
    border:2px solid rgba(251,191,36,.38);
    box-shadow:0 0 24px rgba(0,82,255,.44), inset 0 0 18px rgba(0,82,255,.20);
  }
  .finalUsernameEdit {
    display:grid;
    grid-template-columns:1fr auto;
    gap:8px;
    border-radius:22px;
    padding:10px;
    border:1px solid rgba(255,255,255,.11);
    background:rgba(0,0,0,.30);
  }
  #usernameInput {
    width:100%;
    height:46px;
    border:1px solid rgba(255,255,255,.13);
    border-radius:16px;
    background:rgba(255,255,255,.07);
    color:white;
    text-align:center;
    font-size:14px;
    font-weight:1000;
    letter-spacing:.12em;
    outline:none;
    text-transform:uppercase;
  }
  #saveNameBtn {
    height:46px;
    min-width:72px;
    border:0;
    border-radius:16px;
    background:#f6d98b;
    color:#020204;
    font-size:11px;
    font-weight:1000;
    letter-spacing:.12em;
  }
  #nameWarn {
    grid-column:1 / -1;
    min-height:14px;
    text-align:center;
    color:#ff8b8b;
    font-size:9px;
    font-weight:1000;
    letter-spacing:.12em;
  }
  .finalPanel {
    border-radius:32px;
    padding:16px;
    border:1px solid rgba(251,191,36,.30);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    box-shadow:0 0 32px rgba(251,191,36,.08), inset 0 0 38px rgba(255,255,255,.018);
  }
  .finalPanelTitle {
    display:flex;
    align-items:center;
    justify-content:space-between;
    color:#f8d890;
    font-size:24px;
    font-weight:1000;
    letter-spacing:.12em;
    margin:0 4px 14px;
  }
  .finalPanelTitle button {
    width:38px;
    height:38px;
    border-radius:16px;
    border:1px solid rgba(251,191,36,.20);
    background:rgba(255,255,255,.04);
    color:#f8d890;
    font-size:22px;
  }
  .finalModeGrid {
    display:grid;
    grid-template-columns:1fr;
    gap:11px;
  }
  .finalModeBtn {
    min-height:74px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,.14);
    background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02));
    color:#fff;
    display:grid;
    grid-template-columns:58px 1fr 24px;
    align-items:center;
    gap:10px;
    padding:8px 16px 8px 10px;
    text-align:left;
    box-shadow:inset 0 0 22px rgba(255,255,255,.018);
  }
  .finalModeIcon {
    width:42px;
    height:42px;
    border-radius:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:26px;
    filter:drop-shadow(0 0 12px rgba(0,82,255,.45));
  }
  .finalModeBtn strong {
    display:block;
    font-size:18px;
    font-weight:1000;
    letter-spacing:.08em;
  }
  .finalModeBtn span {
    display:block;
    margin-top:6px;
    font-size:10px;
    letter-spacing:.04em;
    color:rgba(255,255,255,.50);
    font-weight:800;
  }
  .finalArrow {
    color:#f8d890;
    font-size:28px;
    text-align:right;
  }
  .finalSettingsGrid {
    display:grid;
    gap:11px;
  }
  .finalSettingRow {
    min-height:68px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,.13);
    background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.018));
    display:grid;
    grid-template-columns:56px 1fr auto;
    align-items:center;
    gap:10px;
    padding:8px 12px;
  }
  .finalSettingIcon {
    width:42px;
    height:42px;
    border-radius:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
    color:#67a8ff;
    filter:drop-shadow(0 0 12px rgba(0,82,255,.45));
  }
  .finalSettingLabel {
    font-size:17px;
    font-weight:1000;
    letter-spacing:.10em;
  }
  .finalSegment {
    display:flex;
    width:124px;
    height:38px;
    border-radius:999px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,.13);
    background:rgba(255,255,255,.05);
  }
  .finalSegment .region,
  .finalSegment .toggleBtn {
    min-height:0 !important;
    height:100%;
    flex:1;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    color:rgba(255,255,255,.62);
    box-shadow:none !important;
    font-size:12px;
    letter-spacing:.08em;
    padding:0;
  }
  .finalSegment .region strong,
  .finalSegment .region span {
    display:inline !important;
    margin:0 !important;
    font-size:12px !important;
    letter-spacing:.08em !important;
    color:inherit !important;
  }
  .finalSegment .region:before { display:none !important; }
  .finalSegment .selected,
  .finalSegment .toggleBtn.on {
    background:linear-gradient(180deg, rgba(0,82,255,.82), rgba(0,82,255,.42)) !important;
    color:white !important;
    box-shadow:0 0 20px rgba(0,82,255,.38) !important;
  }
  .finalSoundOff {
    min-height:0 !important;
    height:100%;
    flex:1;
    border:0;
    background:transparent;
    color:rgba(255,255,255,.62);
    font-size:12px;
    font-weight:1000;
    letter-spacing:.08em;
  }


  /* IMAGE INSPIRED SEPARATE MOBILE FLOW */
  .mobileLobbySimple {
    min-height:100%; max-width:430px; margin:0 auto; display:flex; flex-direction:column; gap:14px;
    padding:calc(env(safe-area-inset-top) + 8px) 0 calc(env(safe-area-inset-bottom) + 14px);
  }
  .mobileHeroCard {
    position:relative; min-height:455px; border-radius:36px; overflow:hidden; border:1px solid rgba(255,255,255,.10);
    background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.012)), radial-gradient(circle at 50% 16%,rgba(255,255,255,.17),transparent 12%), radial-gradient(circle at 50% 46%,rgba(0,82,255,.25),transparent 35%), #02040a;
    box-shadow:0 0 54px rgba(0,82,255,.20), inset 0 0 80px rgba(0,0,0,.62);
  }
  .mobileHeroCard:before { content:""; position:absolute; inset:0; background:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size:34px 34px; opacity:.5; }
  .mobileHeroRing { position:absolute; left:50%; top:78px; width:255px; height:255px; margin-left:-127px; border-radius:999px; border:1px solid rgba(251,191,36,.35); box-shadow:0 0 46px rgba(251,191,36,.12), inset 0 0 38px rgba(0,82,255,.10); }
  .mobileHeroLogo { position:absolute; top:110px; left:0; right:0; text-align:center; z-index:2; font-size:40px; line-height:.86; font-weight:1000; letter-spacing:.12em; color:#f6f8ff; text-shadow:0 0 28px rgba(0,82,255,.85),0 3px 0 rgba(255,255,255,.08); }
  .mobileHeroLogo span { display:block; font-size:53px; color:#67a8ff; letter-spacing:.07em; }
  .mobileHeroLogo small { display:block; margin-top:14px; color:#f8d890; font-size:13px; letter-spacing:.62em; text-indent:.62em; text-shadow:0 0 16px rgba(251,191,36,.38); }
  .mobileHeroBall { position:absolute; left:50%; top:292px; width:92px; height:92px; transform:translateX(-50%); border-radius:999px; background:radial-gradient(circle at 32% 22%,#fff,#dceaff 17%,#8bbcff 38%,#0052ff 64%,#04153e 100%); box-shadow:0 0 42px rgba(0,82,255,.74),0 26px 44px rgba(0,0,0,.64); z-index:2; animation:floatBall 2.6s ease-in-out infinite; }
  .mobileHeroBall:before { content:""; position:absolute; left:12px; right:12px; top:38px; height:11px; border-radius:999px; background:rgba(255,255,255,.92); transform:rotate(-10deg); box-shadow:0 0 16px rgba(0,82,255,.7); }
  .mobileHeroBall:after { content:""; position:absolute; left:29px; top:36px; width:7px; height:15px; border-radius:999px; background:#020817; box-shadow:27px 0 0 #020817; }
  .mobileHeroPlatform { position:absolute; left:50%; top:380px; width:220px; height:52px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(ellipse at 50% 35%,rgba(0,140,255,.9),rgba(0,82,255,.22) 38%,transparent 70%); }
  .mobileHeroPlatform:after { content:""; position:absolute; left:22px; right:22px; top:10px; height:28px; border-radius:50%; border:2px solid rgba(251,191,36,.38); box-shadow:0 0 24px rgba(0,82,255,.44), inset 0 0 18px rgba(0,82,255,.20); }
  .mobileMainActions { display:grid; gap:12px; }
  .mobileMegaPlay { min-height:76px; border:0; border-radius:24px; background:linear-gradient(180deg,#2a95ff,#0052ff 58%,#05276f); color:white; font-size:31px; font-weight:1000; letter-spacing:.20em; box-shadow:0 0 38px rgba(0,82,255,.62), inset 0 2px 0 rgba(255,255,255,.28); clip-path:polygon(7% 0,93% 0,100% 50%,93% 100%,7% 100%,0 50%); touch-action:manipulation; }
  .mobileSettingsBtn { min-height:58px; border-radius:22px; border:1px solid rgba(251,191,36,.30); background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025)); color:#f8d890; font-size:15px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 24px rgba(251,191,36,.08); touch-action:manipulation; }
  .mobileMegaPlay:active, .mobileSettingsBtn:active, .modeBtn:active, .toggleBtn:active, .flowBack:active { transform:scale(.975); }
  .mobileSubPage { min-height:100%; max-width:430px; margin:0 auto; display:flex; flex-direction:column; justify-content:center; gap:14px; padding:calc(env(safe-area-inset-top) + 14px) 0 calc(env(safe-area-inset-bottom) + 14px); }
  .mobileSubHero { min-height:132px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 28%,rgba(0,82,255,.26),rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; box-shadow:0 0 34px rgba(0,82,255,.14); }
  .mobileSubHero:before { content:""; position:absolute; width:180px; height:82px; border-radius:50%; border:1px solid rgba(100,180,255,.22); transform:rotate(-12deg) scaleY(.46); }
  .mobileSubBall { width:62px; height:62px; border-radius:50%; background:radial-gradient(circle at 32% 22%,#fff,#d8e7ff 18%,#0052ff 58%,#031741 100%); box-shadow:0 0 36px rgba(0,82,255,.75); z-index:1; }
  .mobileOptionPanel { border-radius:28px; padding:14px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.032)); box-shadow:0 0 30px rgba(0,82,255,.14); }
  .mobileOptionTitle { color:#f8d890; font-size:14px; font-weight:1000; letter-spacing:.18em; margin:0 0 12px 2px; }
  .mobileTwoGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .mobileTwoGrid .toggleBtn { width:100%; min-height:58px; border-radius:22px; }
  .modeGrid { display:grid; grid-template-columns:1fr; gap:12px; }
  .modeBtn { min-height:76px; border-radius:28px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035)); color:white; text-align:left; padding:0 18px; font-weight:1000; letter-spacing:.12em; box-shadow:0 0 26px rgba(0,82,255,.10); touch-action:manipulation; }
  .modeBtn strong { display:block; font-size:17px; }
  .modeBtn span { display:block; margin-top:6px; font-size:9px; color:rgba(255,255,255,.52); letter-spacing:.16em; }
  .modeBtn.primary { background:linear-gradient(180deg,rgba(0,82,255,.34),rgba(0,82,255,.12)); border-color:rgba(91,155,255,.42); box-shadow:0 0 34px rgba(0,82,255,.28); }

</style>
<div id="app">
  <div id="noise"></div>
  <section id="menuScreen" class="screen active">
    <div class="mobileLobbySimple">
      <div class="finalTop">
        <div class="finalProfile">
          <div class="finalAvatar"></div>
          <div class="finalNameWrap">
            <div id="profileName" class="finalName">PLAYER</div>
            <div class="finalNameSub">READY TO BOING</div>
          </div>
          <button id="editNameBtn" class="finalEdit">✎</button>
        </div>
        <button id="howBtnTop" class="finalHow">?</button>
      </div>

      <div class="mobileHeroCard">
        <div class="mobileHeroRing"></div>
        <div class="mobileHeroLogo">BASE<span>BOING</span><small>BATTLE</small></div>
        <div class="mobileHeroBall"></div>
        <div class="mobileHeroPlatform"></div>
      </div>

      <div class="finalUsernameEdit" id="nameEditPanel">
        <input id="usernameInput" maxlength="10" placeholder="USERNAME" />
        <button id="saveNameBtn">SAVE</button>
        <div id="nameWarn"></div>
      </div>

      <div class="mobileMainActions">
        <button id="playBtn" class="mobileMegaPlay">PLAY</button>
        <button id="settingsBtn" class="mobileSettingsBtn">SETTINGS</button>
      </div>
    </div>
  </section>


  <section id="settingsScreen" class="screen">
    <div class="mobileSubPage">
      <div class="flowTitle">SETTINGS</div>
      <div class="mobileSubHero"><div class="mobileSubBall"></div></div>

      <div class="mobileOptionPanel">
        <div class="mobileOptionTitle">REGION</div>
        <div class="mobileTwoGrid">
          <button class="region selected" data-region="EU"><strong>EU</strong><span>FRANKFURT</span></button>
          <button class="region" data-region="US"><strong>US</strong><span>VIRGINIA</span></button>
        </div>
      </div>

      <div class="mobileOptionPanel">
        <div class="mobileOptionTitle">SOUND</div>
        <div class="mobileTwoGrid">
          <button id="soundToggleBtn" class="toggleBtn on">ON</button>
          <button id="soundOffBtn" class="toggleBtn">OFF</button>
        </div>
      </div>

      <button id="settingsBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="modeScreen" class="screen">
    <div class="mobileSubPage">
      <div class="flowTitle">PLAY</div>
      <div class="mobileSubHero"><div class="mobileSubBall"></div></div>

      <div class="modeGrid">
        <button id="modeAiBtn" class="modeBtn primary"><strong>VS AI</strong><span>CHOOSE ARENA + DIFFICULTY</span></button>
        <button id="modeOnlineBtn" class="modeBtn"><strong>1V1 ONLINE</strong><span>RANDOM MATCHMAKING</span></button>
        <button id="modeCreateBtn" class="modeBtn"><strong>CREATE ROOM</strong><span>PRIVATE ROOM WITH CODE</span></button>
        <button id="modeJoinBtn" class="modeBtn"><strong>JOIN ROOM</strong><span>ENTER FRIEND ROOM CODE</span></button>
      </div>

      <button id="modeBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="arenaScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">SELECT ARENA</div>
        <div class="flowTitle">CHOOSE<br/>MAP</div>
      </div>
      <div class="card">
        <div class="grid">
          <button class="arena selected" data-arena="classic">CLASSIC<small>RETRO GRID</small></button>
          <button class="arena" data-arena="base">BASE<small>NEON STADIUM</small></button>
          <button class="arena" data-arena="space">ORBIT<small>SPACE MODE</small></button>
          <button class="arena" data-arena="temple">TEMPLE<small>CHAIN RUNES</small></button>
        </div>
      </div>
      <button id="arenaNextBtn" class="btn">NEXT</button>
      <button id="arenaBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="difficultyScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">VS AI</div>
        <div class="flowTitle">SELECT<br/>DIFFICULTY</div>
      </div>
      <div class="card">
        <div class="row">
          <button class="difficulty" data-difficulty="easy">EASY</button>
          <button class="difficulty selected" data-difficulty="normal">NORMAL</button>
          <button class="difficulty" data-difficulty="hard">HARD</button>
        </div>
      </div>
      <button id="startAiBtn" class="btn">START MATCH</button>
      <button id="difficultyBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="joinScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">JOIN ROOM</div>
        <div class="flowTitle">ENTER<br/>CODE</div>
      </div>
      <div class="card">
        <input id="roomCodeInput" class="roomInput" maxlength="8" placeholder="ROOM CODE" />
        <div id="roomWarn" class="sub" style="margin-top:10px;color:#ff8585"></div>
      </div>
      <button id="joinRoomBtn" class="btn">JOIN ROOM</button>
      <button id="joinBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="howScreen" class="screen">
    <div class="center">
      <h1>HOW TO PLAY</h1>
      <div class="card" style="line-height:1.75;color:rgba(255,255,255,.80);font-weight:800">
        Draw lines only on your half of the arena. Deflect the ball past the AI. Each line costs energy. First to 7 wins.
      </div>
      <button id="backHowBtn" class="btn">GOT IT</button>
    </div>
  </section>

  <section id="matchScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">ONLINE 1V1</div>
        <h1>SEARCHING<br/>OPPONENT</h1>
        <div class="sub">RANDOM MATCHMAKING</div>
      </div>
      <div class="card">
        <div id="matchStatus">CONNECTING SOCKET...</div>
      </div>
      <button id="cancelMatchBtn" class="btn red">CANCEL</button>
    </div>
  </section>

  <section id="gameScreen" class="screen">
    <div id="gameWrap">
      <canvas id="gameCanvas" width="400" height="700"></canvas>
      <div id="goalFlash"></div>
      <div id="roundHint">FIRST TO 7</div>
      <div id="hudTop">
        <button id="menuBtn" class="pill">MENU</button>
        <div id="scoreHud" class="pill">AI 0 ◇ 0 YOU</div>
        <button id="restartBtn" class="pill">RESTART</button>
      </div>
      <div id="overlayText"></div>
      <div id="resultPanel">
        <div id="resultTitle">YOU WIN</div>
        <div id="resultScore" class="sub">AI 0 ◇ 0 YOU</div>
        <button id="playAgainBtn" class="btn">PLAY AGAIN</button>
        <div style="height:10px"></div>
        <button id="resultMenuBtn" class="btn secondary">MAIN MENU</button>
      </div>
    </div>
  </section>
</div>
<script>
(function(){
  var W=400,H=700;
  var arena='classic', difficulty='normal', socketRegion='EU', mode='ai';
  var canvas, ctx, raf=0;
  var ball, lines, trail, sparks, score, energy, started=false, paused=false, drawing=null, goalLocked=false;
  var frame=0, audioUnlocked=false, soundEnabled=true, lastWallSound=0, lastOnlineScoreTotal=null, lastOnlineRoundKey=null, onlineCountdownTimer=null, onlineBattleTimer=null;
  var socket=null, socketReady=false, isHost=false, roleKnown=false, roomCode=null, mobileId='mobile_'+Math.random().toString(16).slice(2,10), onlineTarget={x:200,y:350,vx:1.2,vy:1.8}, onlineStateAt=Date.now();
  var playerName='PLAYER', rivalName='RIVAL', pendingMode='ai';
  var SOCKET_EU='https://base-boing-battle-1.onrender.com';
  var SOCKET_US='https://base-boing-battle-usa.onrender.com';
  function flash(){ var f=$('goalFlash'); var gw=$('gameWrap'); if(f){ f.classList.add('active'); setTimeout(function(){f.classList.remove('active')},220); } if(gw){ gw.classList.add('shake'); setTimeout(function(){gw.classList.remove('shake')},330); } }

  function $(id){ return document.getElementById(id); }
  function cleanName(value){ return String(value||'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,10).toUpperCase(); }
  function loadName(){
    var saved=''; try{ saved=localStorage.getItem('bbb_mobile_username')||''; }catch(e){}
    playerName=cleanName(saved)||'PLAYER';
    var input=$('usernameInput'); if(input) input.value=playerName==='PLAYER'?'':playerName;
    var profile=$('profileName'); if(profile) profile.textContent=playerName;
  }
  function saveName(){
    var input=$('usernameInput');
    var finalName=cleanName(input&&input.value);
    var warn=$('nameWarn');
    if(!finalName){ if(warn) warn.textContent='ENTER USERNAME FIRST'; return false; }
    playerName=finalName;
    try{ localStorage.setItem('bbb_mobile_username', playerName); }catch(e){}
    if(input) input.value=playerName;
    var profile=$('profileName'); if(profile) profile.textContent=playerName;
    if(warn) warn.textContent='SAVED';
    setTimeout(function(){ if(warn && warn.textContent==='SAVED') warn.textContent=''; },900);
    return true;
  }
  function requireName(){
    var input=$('usernameInput');
    var candidate=cleanName(input&&input.value) || cleanName(playerName);
    if(candidate && candidate!=='PLAYER'){ playerName=candidate; saveName(); return true; }
    var warn=$('nameWarn'); if(warn) warn.textContent='ENTER USERNAME FIRST';
    show('menuScreen');
    return false;
  }
  function displayName(name){ return cleanName(name)||'PLAYER'; }
  function updateScoreHud(){
    if(!$('scoreHud')||!score) return;
    var left = mode==='online' ? displayName(rivalName) : 'AI';
    var right = displayName(playerName);
    $('scoreHud').textContent=left+' '+score.ai+' ◇ '+score.player+' '+right;
  }
  function setMatchStatus(v){ var el=$('matchStatus'); if(el) el.textContent=v; }
  function show(id){
    ['menuScreen','settingsScreen','modeScreen','arenaScreen','difficultyScreen','joinScreen','howScreen','matchScreen','gameScreen'].forEach(function(s){ $(s).classList.remove('active'); });
    $(id).classList.add('active');
  }
  function bindTap(el, fn){
    if(!el) return;
    var last=0;
    var touched=false;

    function run(e){
      unlockAudio();
      var now=Date.now();
      if(now-last<260) return;
      last=now;
      if(e){ e.preventDefault(); e.stopPropagation(); }
      fn(e);
    }

    // Android ghost-click fix:
    // Do not change screens on touchstart/pointerdown. Wait for touchend,
    // otherwise the released finger can hit a button on the newly opened screen.
    el.addEventListener('touchend', function(e){
      touched=true;
      run(e);
      setTimeout(function(){ touched=false; }, 420);
    }, {passive:false});

    el.addEventListener('click', function(e){
      if(touched){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        return;
      }
      run(e);
    }, false);
  }
  function theme(){
    if(arena==='base') return {main:'#ef4444', glow:'rgba(239,68,68,.95)', label:'BASE', bg:'#031d5a'};
    if(arena==='space') return {main:'#22d3ee', glow:'rgba(34,211,238,.95)', label:'ORBIT', bg:'#02040d'};
    if(arena==='temple') return {main:'#fbbf24', glow:'rgba(251,191,36,.95)', label:'CHAIN', bg:'#201204'};
    return {main:'#0052ff', glow:'rgba(0,82,255,.95)', label:'BASE', bg:'#020204'};
  }

  function unlockAudio(){ audioUnlocked=true; }
  function syncSoundButton(){
    var b=$('soundToggleBtn'); var off=$('soundOffBtn');
    if(b){ b.textContent='ON'; if(soundEnabled) b.classList.add('on'); else b.classList.remove('on'); }
    if(off){ if(soundEnabled) off.classList.remove('on'); else off.classList.add('on'); }
  }
  function toggleSound(){ soundEnabled=!soundEnabled; try{ localStorage.setItem('bbb_mobile_sound', soundEnabled?'on':'off'); }catch(e){} syncSoundButton(); }
  function loadSound(){ var saved=''; try{ saved=localStorage.getItem('bbb_mobile_sound')||''; }catch(e){} soundEnabled = saved==='off' ? false : true; syncSoundButton(); }
  function playSound(type){
    if(!audioUnlocked || !soundEnabled) return;
    try{
      var AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass) return;
      var audioCtx=new AudioContextClass();
      var oscillator=audioCtx.createOscillator();
      var gain=audioCtx.createGain();
      oscillator.connect(gain); gain.connect(audioCtx.destination);
      if(type==='hit'){ oscillator.frequency.value=620; gain.gain.value=.085; try{navigator.vibrate&&navigator.vibrate(18)}catch(e){} }
      if(type==='wall'){ oscillator.frequency.value=260; gain.gain.value=.06; try{navigator.vibrate&&navigator.vibrate(10)}catch(e){} }
      if(type==='goal'){ oscillator.frequency.value=135; gain.gain.value=.12; try{navigator.vibrate&&navigator.vibrate([45,25,45])}catch(e){} }
      oscillator.type='square';
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.24);
      oscillator.stop(audioCtx.currentTime+.25);
      setTimeout(function(){ try{audioCtx.close()}catch(e){} },260);
    }catch(e){}
  }
  function setOverlay(value){
    var text=$('overlayText');
    text.textContent=value;
    text.classList.remove('pop');
    void text.offsetWidth;
    text.classList.add('pop');
  }

  function clearOnlineCountdown(){
    if(onlineCountdownTimer){ clearTimeout(onlineCountdownTimer); onlineCountdownTimer=null; }
    if(onlineBattleTimer){ clearTimeout(onlineBattleTimer); onlineBattleTimer=null; }
  }
  function startOnlineCountdown(roundRaw, serverNowRaw){
    if(!roundRaw) return;
    var key=String(roundRaw);
    if(lastOnlineRoundKey===key) return;
    lastOnlineRoundKey=key;
    clearOnlineCountdown();
    started=false; paused=true;
    var serverStart=typeof roundRaw==='number'?roundRaw:new Date(roundRaw).getTime();
    var serverNow=Number(serverNowRaw);
    var startAtMs=(isFinite(serverStart)&&isFinite(serverNow)) ? Date.now()+Math.max(0, serverStart-serverNow) : serverStart;
    var lastText='';
    function tick(){
      var remaining=startAtMs-Date.now();
      var next='';
      if(remaining>2000) next='3';
      else if(remaining>1000) next='2';
      else if(remaining>0) next='1';
      else next='BATTLE!';
      if(next!==lastText){ setOverlay(next); lastText=next; }
      if(next==='BATTLE!'){
        onlineBattleTimer=setTimeout(function(){ $('overlayText').textContent=''; started=true; paused=false; goalLocked=false; },600);
        return;
      }
      onlineCountdownTimer=setTimeout(tick,80);
    }
    tick();
  }
  function resetBall(dir){
    goalLocked=false;
    ball={x:200,y:dir==='up'?525:175,r:8,vx:dir==='up'?1.25:-1.25,vy:dir==='up'?-1.85:1.85};
    lines=[]; trail=[]; sparks=[]; energy=100; drawing=null;
  }
  function ensureSocket(cb){
    if(window.io){ connectSocket(cb); return; }
    var script=document.createElement('script');
    script.src='https://cdn.socket.io/4.8.1/socket.io.min.js';
    script.onload=function(){ connectSocket(cb); };
    script.onerror=function(){ setMatchStatus('SOCKET LOAD FAILED'); };
    document.head.appendChild(script);
  }
  function connectSocket(cb){
    var url=socketRegion==='US'?SOCKET_US:SOCKET_EU;
    if(socket && socket.io && socket.io.uri===url){ if(cb) cb(); return; }
    if(socket){ try{ socket.disconnect(); }catch(e){} }
    socket=io(url,{transports:['websocket']});
    socket.io.uri=url;
    socket.on('connect',function(){ socketReady=true; setMatchStatus('CONNECTED • SEARCHING...'); if(cb) cb(); });
    socket.on('disconnect',function(){ socketReady=false; });
    socket.on('matchmaking-status',function(data){
      if(data && data.status==='searching') setMatchStatus('SEARCHING OPPONENT...');
      if(data && data.status==='cancelled'){ setMatchStatus('CANCELLED'); show('menuScreen'); }
    });
    socket.on('match-found',function(data){
      data=data||{};
      mode='online';
      roomCode=data.roomCode||data.room_code||roomCode;
      rivalName=cleanName(data.opponentUsername||data.opponent_username||data.rivalUsername)||'RIVAL';

      // IMPORTANT: never let both mobile clients become host.
      // The server sends role: "host" or "guest". Host uses server coordinates,
      // guest renders a mirrored field so each player still plays from the bottom.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      }

      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND');
      setOverlay(isHost?'HOST READY':'GUEST READY');
      setTimeout(function(){ startOnlineMatch(); },900);
    });
    socket.on('room-matched',function(data){
      data=data||{};
      mode='online';
      roomCode=data.roomCode||data.room_code||roomCode;
      rivalName=cleanName(data.opponentUsername||data.opponent_username||data.rivalUsername)||'RIVAL';

      // Older/manual room event. Do not force isHost=true here; that was causing
      // both mobile devices to behave like the same side.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      } else if(typeof data.isHost==='boolean'){
        isHost=data.isHost;
        roleKnown=true;
      }

      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND');
      setTimeout(function(){ startOnlineMatch(); if(data.state) applyOnlineState(data.state); },900);
    });
    socket.on('room-created',function(data){
      data=data||{}; mode='online'; roomCode=data.roomCode||data.room_code||roomCode; isHost=true; roleKnown=true;
      setMatchStatus('ROOM '+(roomCode||'CREATED')+' • WAITING FRIEND'); show('matchScreen');
    });
    socket.on('arena-selected',function(data){ if(data && data.arena){ arena=data.arena; } });
    socket.on('game-state',function(state){ applyOnlineState(state); });
    socket.on('remote-line',function(line){ addRemoteLine(line); });
    socket.on('opponent-left',function(){ opponentLeft(); });
    socket.on('opponent-disconnected',function(){ opponentLeft(); });
    socket.on('play-again-status',function(data){ if(data && data.hostReadyAgain && data.guestReadyAgain){ startOnlineMatch(); } else { setOverlay('WAITING RIVAL'); } });
    socket.on('connect_error',function(){ setMatchStatus('SOCKET CONNECTION FAILED'); });
  }

  function openModeScreen(){ if(!requireName()) return; show('modeScreen'); }
  function chooseMode(m){ pendingMode=m; if(m==='join'){ show('joinScreen'); return; } show('arenaScreen'); }
  function continueAfterArena(){
    if(pendingMode==='ai'){ show('difficultyScreen'); return; }
    if(pendingMode==='online'){ startOnlineSearch(); return; }
    if(pendingMode==='create'){ createRoom(); return; }
  }
  function createRoom(){
    if(!requireName()) return;
    mode='online'; isHost=true; roleKnown=true; roomCode=null; rivalName='RIVAL'; show('matchScreen'); setMatchStatus('CREATING ROOM...');
    ensureSocket(function(){
      try{ socket.emit('create-room',{ address:mobileId, username:displayName(playerName), arena:arena, region:socketRegion }); }
      catch(e){ setMatchStatus('CREATE ROOM FAILED'); }
    });
  }
  function joinRoom(){
    if(!requireName()) return;
    var input=$('roomCodeInput'); var code=cleanName(input&&input.value);
    if(!code){ var w=$('roomWarn'); if(w) w.textContent='ENTER ROOM CODE'; return; }
    mode='online'; roomCode=code; isHost=false; roleKnown=true; rivalName='RIVAL'; show('matchScreen'); setMatchStatus('JOINING ROOM '+code+'...');
    ensureSocket(function(){
      try{ socket.emit('join-room',{ roomCode:code, address:mobileId, username:displayName(playerName), region:socketRegion }); }
      catch(e){ setMatchStatus('JOIN ROOM FAILED'); }
    });
  }

  function startOnlineSearch(){
    if(!requireName()) return;
    mode='online'; isHost=false; roleKnown=false; roomCode=null; rivalName='RIVAL'; show('matchScreen'); setMatchStatus('CONNECTING SOCKET...');
    ensureSocket(function(){
      var name=displayName(playerName);
      try{ socket.emit('find-match',{ address:mobileId, username:name, region:socketRegion, arena:arena }); }catch(e){ setMatchStatus('SEARCH FAILED'); }
    });
  }
  function cancelOnlineSearch(){
    try{ if(socket) socket.emit('cancel-matchmaking',{ address:mobileId }); }catch(e){}
    mode='ai'; roomCode=null; show('menuScreen');
  }
  function startOnlineMatch(){
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d');
    score={player:0,ai:0,msg:'',life:0}; lastOnlineScoreTotal=null; lastOnlineRoundKey=null; clearOnlineCountdown(); resetBall('down');
    updateScoreHud();
    $('resultPanel').classList.remove('active');
    show('gameScreen'); started=false; paused=true; setOverlay('WAITING');
    if(!raf) loop();
  }
  function applyOnlineState(state){
    if(!state) return;
    if(!ball){ resetBall('down'); }
    if(state.arena && (state.arena==='classic'||state.arena==='base'||state.arena==='space'||state.arena==='temple')) arena=state.arena;
    var hostScore=Number(state.host_score!=null?state.host_score:(state.hostScore||0));
    var guestScore=Number(state.guest_score!=null?state.guest_score:(state.guestScore||0));
    if(!score) score={player:0,ai:0,msg:'',life:0};
    var prevPlayer=score.player||0;
    var prevAi=score.ai||0;
    score.player=isHost?hostScore:guestScore;
    score.ai=isHost?guestScore:hostScore;
    updateScoreHud();
    var totalScore=score.player+score.ai;
    if(lastOnlineScoreTotal!==null && totalScore>lastOnlineScoreTotal){
      if(score.player>prevPlayer) setOverlay(displayName(playerName)+' SCORES');
      else if(score.ai>prevAi) setOverlay(displayName(rivalName)+' SCORES');
      flash(); playSound('goal');
    }
    lastOnlineScoreTotal=totalScore;
    var bx=Number(state.ball_x!=null?state.ball_x:(state.ball&&state.ball.x)||ball.x);
    var by=Number(state.ball_y!=null?state.ball_y:(state.ball&&state.ball.y)||ball.y);
    var bvx=Number(state.ball_vx!=null?state.ball_vx:(state.ball&&state.ball.vx)||ball.vx);
    var bvy=Number(state.ball_vy!=null?state.ball_vy:(state.ball&&state.ball.vy)||ball.vy);
    onlineTarget.x=bx; onlineTarget.y=isHost?by:H-by; onlineTarget.vx=bvx; onlineTarget.vy=isHost?bvy:-bvy; onlineStateAt=Date.now();
    var phase=state.phase||'';
    if(phase==='countdown'){
      started=false; paused=true;
      var roundRaw=state.round_start_at||state.roundStartAt;
      var serverNow=state.serverNow||state.server_now;
      if(roundRaw) startOnlineCountdown(roundRaw, serverNow);
      else setOverlay('3');
    }
    if(phase==='playing'){
      if(!onlineCountdownTimer && !onlineBattleTimer){ $('overlayText').textContent=''; }
      started=true; paused=false;
    }
    var winner=state.winner || (hostScore>=7?'host':guestScore>=7?'guest':null);
    if(winner){
      started=false; paused=true;
      var youWin=(winner==='host'&&isHost)||(winner==='guest'&&!isHost);
      $('resultTitle').textContent=youWin?'YOU WIN':'RIVAL WINS';
      $('resultTitle').style.color=youWin?theme().main:'#ef4444';
      $('resultScore').textContent=displayName(rivalName)+' '+score.ai+' ◇ '+score.player+' '+displayName(playerName);
      $('resultPanel').classList.add('active');
    }
  }
  function addRemoteLine(line){
    if(!line) return;
    var owner=line.owner||'';
    if((isHost && owner==='host')||(!isHost && owner==='guest')) return;
    var x1=Number(line.x1), y1=Number(line.y1), x2=Number(line.x2), y2=Number(line.y2);
    lines.push({x1:x1,y1:isHost?y1:H-y1,x2:x2,y2:isHost?y2:H-y2,life:50,owner:'ai'});
  }
  function opponentLeft(){ started=false; paused=true; setOverlay('OPPONENT LEFT'); setTimeout(function(){ show('menuScreen'); },1200); }
  function newMatch(){
    if(!requireName()) return;
    mode='ai'; isHost=false; roleKnown=false; roomCode=null;
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d');
    score={player:0,ai:0,msg:'',life:0}; resetBall('down');
    updateScoreHud();
    $('resultPanel').classList.remove('active');
    show('gameScreen'); started=false; paused=true;
    countdown(3);
    if(!raf) loop();
  }
  function countdown(n){
    var text=$('overlayText');
    if(n>0){ setOverlay(String(n)); setTimeout(function(){countdown(n-1)},650); }
    else { setOverlay('BATTLE!'); setTimeout(function(){text.textContent=''; started=true; paused=false; goalLocked=false;},600); }
  }
  function getPos(e){
    var t=e.touches&&e.touches[0]?e.touches[0]:e;
    var r=canvas.getBoundingClientRect();
    return {x:(t.clientX-r.left)/r.width*W, y:(t.clientY-r.top)/r.height*H};
  }
  function addSparks(x,y,color){
    for(var i=0;i<14;i++){
      sparks.push({x:x,y:y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:22,color:color});
    }
  }
  function addLine(start,end,owner){
    var dx=end.x-start.x, dy=end.y-start.y, len=Math.sqrt(dx*dx+dy*dy)||1;
    var max=160, l=Math.min(max,len), a=Math.atan2(dy,dx);
    var count=0;
    lines=lines.filter(function(line){
      if(line.owner===owner){ count++; return count<2; }
      return true;
    });
    lines.push({x1:start.x,y1:start.y,x2:start.x+Math.cos(a)*l,y2:start.y+Math.sin(a)*l,life:50,owner:owner});
    if(owner==='player') energy=Math.max(0,energy-25);
  }
  function canvasDown(e){ if(!started||paused) return; var p=getPos(e); if(p.y<H/2) return; drawing=p; e.preventDefault(); }
  function canvasMove(e){
    if(!started||paused||!drawing) return;
    var p=getPos(e); if(p.y<H/2) return;
    var d=Math.hypot(p.x-drawing.x,p.y-drawing.y);
    if(d>55 && energy>=25){
      addLine(drawing,p,'player');
      if(mode==='online' && socket && roomCode){
        var end=p; var sx=drawing.x, sy=drawing.y, ex=end.x, ey=end.y;
        socket.emit('draw-line',{ roomCode:roomCode, line:{ owner:isHost?'host':'guest', x1:sx, y1:isHost?sy:H-sy, x2:ex, y2:isHost?ey:H-ey } });
      }
      drawing=null;
    }
    e.preventDefault();
  }
  function canvasUp(e){ drawing=null; if(e) e.preventDefault(); }
  function goal(who){
    if(goalLocked) return;
    goalLocked=true; paused=true; started=false; flash(); playSound('goal');
    if(who==='player') score.player++; else score.ai++;
    updateScoreHud();
    var text=$('overlayText');
    if(score.player>=7 || score.ai>=7){
      text.textContent='';
      $('resultTitle').textContent=score.player>=7?displayName(playerName)+' WINS':'AI WINS';
      $('resultTitle').style.color=score.player>=7?theme().main:'#ef4444';
      $('resultTitle').style.textShadow='0 0 26px '+(score.player>=7?theme().main:'#ef4444');
      $('resultScore').textContent='AI '+score.ai+' ◇ '+score.player+' '+displayName(playerName);
      $('resultPanel').classList.add('active');
      return;
    }
    setOverlay(who==='player'?displayName(playerName)+' SCORES':'AI SCORES');
    setTimeout(function(){ resetBall(who==='player'?'down':'up'); countdown(3); },950);
  }
  function drawBg(){
    var th=theme();
    if(arena==='base'){
      var bg=ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#020716'); bg.addColorStop(.28,'#031d5a'); bg.addColorStop(.52,'#003bbd'); bg.addColorStop(.76,'#031d5a'); bg.addColorStop(1,'#020716');
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      var st=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,H/1.05);
      st.addColorStop(0,'rgba(255,255,255,.10)'); st.addColorStop(.3,'rgba(0,82,255,.18)'); st.addColorStop(.75,'rgba(0,82,255,.04)'); st.addColorStop(1,'rgba(0,0,0,.45)');
      ctx.fillStyle=st; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(255,255,255,.045)'; ctx.lineWidth=1;
      for(var bx=52; bx<W-52; bx+=48){ ctx.beginPath(); ctx.moveTo(bx,24); ctx.lineTo(bx,H-24); ctx.stroke(); }
      for(var by=54; by<H-24; by+=54){ ctx.beginPath(); ctx.moveTo(32,by); ctx.lineTo(W-32,by); ctx.stroke(); }
      for(var lx=38; lx<=W-38; lx+=24){ var blink=.38+Math.sin(frame*.12+lx*.08)*.25; ctx.beginPath(); ctx.arc(lx,15,2.2,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,'+blink+')'; ctx.shadowColor='#0052ff'; ctx.shadowBlur=10; ctx.fill(); ctx.beginPath(); ctx.arc(lx,H-15,2.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    } else if(arena==='space'){
      var sbg=ctx.createLinearGradient(0,0,0,H);
      sbg.addColorStop(0,'#02040d'); sbg.addColorStop(.42,'#061536'); sbg.addColorStop(.72,'#030918'); sbg.addColorStop(1,'#000');
      ctx.fillStyle=sbg; ctx.fillRect(0,0,W,H);
      var og=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,H/1.1); og.addColorStop(0,'rgba(34,211,238,.22)'); og.addColorStop(.35,'rgba(0,82,255,.10)'); og.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=og; ctx.fillRect(0,0,W,H);
      for(var i=0;i<105;i++){ var sx=(i*73+frame*(.08+(i%3)*.035))%W; var sy=(i*47+frame*(.16+(i%5)*.025))%H; var a=.16+((i%7)/13); ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.fillRect(sx,sy,i%5===0?1.8:1,i%5===0?1.8:1); }
      ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(frame*.004); ctx.strokeStyle='rgba(34,211,238,.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(0,0,112,40,0,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0,0,78,26,Math.PI/2.8,0,Math.PI*2); ctx.stroke(); ctx.restore();
    } else if(arena==='temple'){
      var tbg=ctx.createLinearGradient(0,0,0,H);
      tbg.addColorStop(0,'#140b02'); tbg.addColorStop(.5,'#241403'); tbg.addColorStop(1,'#050301'); ctx.fillStyle=tbg; ctx.fillRect(0,0,W,H);
      var gg=ctx.createRadialGradient(W/2,H/2,18,W/2,H/2,H/1.08); gg.addColorStop(0,'rgba(251,191,36,.22)'); gg.addColorStop(.45,'rgba(120,53,15,.14)'); gg.addColorStop(1,'rgba(0,0,0,.25)'); ctx.fillStyle=gg; ctx.fillRect(0,0,W,H);
      for(var py=70; py<H-60; py+=88){ ctx.fillStyle='rgba(251,191,36,.12)'; ctx.fillRect(18,py,16,50); ctx.fillRect(W-34,py,16,50); ctx.fillStyle='rgba(251,191,36,.22)'; ctx.fillRect(14,py-5,24,6); ctx.fillRect(W-38,py-5,24,6); }
      ctx.save(); ctx.translate(W/2,H/2); ctx.strokeStyle='rgba(251,191,36,.30)'; ctx.lineWidth=1.5; for(var r=0;r<6;r++){ ctx.rotate(Math.PI/3); ctx.beginPath(); ctx.moveTo(0,-92); ctx.lineTo(0,-72); ctx.stroke(); } ctx.restore();
    } else {
      ctx.fillStyle='#020204'; ctx.fillRect(0,0,W,H);
      var grd=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,H/1.15); grd.addColorStop(0,'rgba(0,82,255,.22)'); grd.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
    }

    ctx.strokeStyle=arena==='space'?'rgba(34,211,238,.10)':arena==='temple'?'rgba(251,191,36,.09)':'rgba(255,255,255,.06)'; ctx.lineWidth=1;
    for(var x=40;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,18); ctx.lineTo(x,H-18); ctx.stroke(); }
    for(var y=60;y<H;y+=60){ ctx.beginPath(); ctx.moveTo(18,y); ctx.lineTo(W-18,y); ctx.stroke(); }

    var pulse=.55+Math.sin(frame*.045)*.18;
    ctx.save(); ctx.strokeStyle=arena==='temple'?'rgba(251,191,36,'+pulse+')':arena==='space'?'rgba(34,211,238,'+pulse+')':arena==='base'?'rgba(239,68,68,'+pulse+')':'rgba(0,82,255,'+pulse+')';
    ctx.shadowColor=th.main; ctx.shadowBlur=18; ctx.lineWidth=3; ctx.strokeRect(12,12,W-24,H-24); ctx.restore();
    ctx.beginPath(); ctx.moveTo(12,H/2); ctx.lineTo(W-12,H/2); ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.stroke();

    ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillStyle=arena==='temple'?'rgba(251,191,36,.82)':arena==='space'?'rgba(34,211,238,.78)':arena==='base'?'rgba(255,255,255,.62)':'rgba(0,82,255,.62)';
    ctx.fillText(arena==='space'?'◇ SPACE STATION ◇':arena==='temple'?'◇ CRYPTO TEMPLE ◇':arena==='base'?'◇ BASE ARENA ◇':'◇ ONCHAIN ARCADE ◇',W/2,H/2-50);
    ctx.font=arena==='temple'?'900 36px monospace':arena==='space'?'900 40px monospace':'900 46px monospace';
    ctx.fillStyle=arena==='temple'?'rgba(255,230,150,.82)':arena==='space'?'rgba(210,250,255,.82)':arena==='base'?'rgba(255,255,255,.82)':'rgba(0,82,255,.38)';
    ctx.shadowColor=th.main; ctx.shadowBlur=24; ctx.fillText(th.label,W/2,H/2+15); ctx.shadowBlur=0;
  }
  function aiThink(){
    if(ball.y>=H/2-20 || ball.vy>=0) return;
    var rate=difficulty==='easy'?0.018:difficulty==='hard'?0.065:0.038;
    if(Math.random()>rate) return;
    var err=difficulty==='easy'?(Math.random()-.5)*210:difficulty==='hard'?(Math.random()-.5)*25:(Math.random()-.5)*80;
    addLine({x:ball.x-55+err,y:Math.max(42,ball.y-35)}, {x:ball.x+55+err,y:Math.max(42,ball.y-10)}, 'ai');
  }
  function physics(){
    frame++;
    if(energy<100) energy=Math.min(100,energy+0.22);
    if(!started||paused) return;
    if(mode==='online'){
      var elapsed=Math.min(4,(Date.now()-onlineStateAt)/16.67);
      var px=Math.max(22,Math.min(W-22,onlineTarget.x+onlineTarget.vx*elapsed));
      var py=Math.max(22,Math.min(H-22,onlineTarget.y+onlineTarget.vy*elapsed));
      var dxo=px-ball.x, dyo=py-ball.y, disto=Math.hypot(dxo,dyo);
      if(disto>90){ ball.x=px; ball.y=py; } else { ball.x+=dxo*.32; ball.y+=dyo*.32; }
      ball.vx=onlineTarget.vx; ball.vy=onlineTarget.vy;
      return;
    }
    aiThink();

    var steps=Math.max(1,Math.ceil(Math.hypot(ball.vx,ball.vy)/2));
    for(var s=0;s<steps;s++){
      ball.x+=ball.vx/steps; ball.y+=ball.vy/steps;
      for(var i=0;i<lines.length;i++){
        var l=lines[i]; if(l.life<4) continue;
        var dx=l.x2-l.x1,dy=l.y2-l.y1,lenSq=dx*dx+dy*dy;
        if(!lenSq) continue;
        var t=Math.max(0,Math.min(1,((ball.x-l.x1)*dx+(ball.y-l.y1)*dy)/lenSq));
        var px=l.x1+t*dx, py=l.y1+t*dy, dist=Math.hypot(ball.x-px,ball.y-py);
        if(dist<ball.r+6){
          var speed=Math.min(Math.hypot(ball.vx,ball.vy)+0.28,10);
          var nx=-dy, ny=dx, nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
          if(ball.vx*nx+ball.vy*ny>0){nx*=-1;ny*=-1;}
          ball.vx=nx*speed+dx*.006; ball.vy=ny*speed+dy*.006;
          l.life=0; addSparks(ball.x,ball.y,l.owner==='player'?'#0052ff':'#ef4444'); playSound('hit');
          break;
        }
      }
    }
    if(ball.x<22){ ball.x=22; ball.vx=Math.abs(ball.vx); if(Date.now()-lastWallSound>180){playSound('wall'); lastWallSound=Date.now();} }
    if(ball.x>W-22){ ball.x=W-22; ball.vx=-Math.abs(ball.vx); if(Date.now()-lastWallSound>180){playSound('wall'); lastWallSound=Date.now();} }
    if(ball.y<22) goal('player');
    if(ball.y>H-22) goal('ai');
  }
  function render(){
    drawBg(); physics();
    if(score && (score.player===6 || score.ai===6)){
      ctx.save(); ctx.textAlign='center'; ctx.font=(score.player===6&&score.ai===6)?'bold 28px monospace':'bold 24px monospace'; ctx.fillStyle=theme().main; ctx.shadowColor=theme().main; ctx.shadowBlur=24;
      ctx.fillText((score.player===6&&score.ai===6)?'FINAL CLASH':(arena==='space'?'ORBIT POINT':arena==='temple'?'CHAIN POINT':arena==='base'?'BASE POINT':'MATCH POINT'), W/2, H/2-95); ctx.restore();
    }
    trail.push({x:ball.x,y:ball.y}); if(trail.length>20) trail.shift();
    lines=lines.map(function(l){l.life--;return l}).filter(function(l){return l.life>0});
    sparks=sparks.map(function(s){s.x+=s.vx; s.y+=s.vy; s.vx*=.95; s.vy*=.95; s.life--; return s;}).filter(function(s){return s.life>0;});

    lines.forEach(function(l){ var a=Math.max(l.life/42,.08); ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.lineCap='round'; ctx.lineWidth=10; ctx.strokeStyle=l.owner==='player'?'rgba(0,82,255,'+a+')':'rgba(239,68,68,'+a+')'; ctx.shadowColor=l.owner==='player'?'#0052ff':'#ef4444'; ctx.shadowBlur=24; ctx.stroke(); ctx.shadowBlur=0; });
    trail.forEach(function(p,i){ var a=i/trail.length; ctx.beginPath(); ctx.arc(p.x,p.y,ball.r*a*1.5,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,'+(a*.26)+')'; ctx.fill(); });
    sparks.forEach(function(s){ var a=s.life/22; ctx.beginPath(); ctx.arc(s.x,s.y,2+a*3,0,Math.PI*2); ctx.fillStyle=s.color==='#ef4444'?'rgba(239,68,68,'+a+')':'rgba(0,82,255,'+a+')'; ctx.shadowColor=s.color; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0; });

    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r+8,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fillStyle='white'; ctx.shadowColor=theme().main; ctx.shadowBlur=26; ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(120,72,160,8); ctx.fillStyle=theme().main; ctx.fillRect(120,72,160*energy/100,8);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('ENERGY',W/2,96);
  }
  function loop(){ if(ctx) render(); raf=requestAnimationFrame(loop); }

  loadName();
  var nameInput=$('usernameInput'); if(nameInput){ nameInput.addEventListener('input',function(){ this.value=cleanName(this.value); }); }
  var roomInput=$('roomCodeInput'); if(roomInput){ roomInput.addEventListener('input',function(){ this.value=cleanName(this.value); }); }
  bindTap($('saveNameBtn'), saveName);
  bindTap($('editNameBtn'), function(){ var input=$('usernameInput'); if(input){ input.focus(); } });
  loadSound();

  document.querySelectorAll('.region').forEach(function(btn){ bindTap(btn,function(){ socketRegion=btn.getAttribute('data-region')||'EU'; document.querySelectorAll('.region').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('cancelMatchBtn'), cancelOnlineSearch);
  document.querySelectorAll('.arena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-arena')||'classic'; document.querySelectorAll('.arena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  document.querySelectorAll('.difficulty').forEach(function(btn){ bindTap(btn,function(){ difficulty=btn.getAttribute('data-difficulty')||'normal'; document.querySelectorAll('.difficulty').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('playBtn'), openModeScreen);
  bindTap($('settingsBtn'), function(){ show('settingsScreen'); });
  bindTap($('settingsBackBtn'), function(){ show('menuScreen'); });
  bindTap($('soundToggleBtn'), function(){ soundEnabled=true; try{ localStorage.setItem('bbb_mobile_sound','on'); }catch(e){} syncSoundButton(); });
  bindTap($('soundOffBtn'), function(){ soundEnabled=false; try{ localStorage.setItem('bbb_mobile_sound','off'); }catch(e){} syncSoundButton(); });
  bindTap($('modeAiBtn'), function(){ chooseMode('ai'); });
  bindTap($('modeOnlineBtn'), function(){ chooseMode('online'); });
  bindTap($('modeCreateBtn'), function(){ chooseMode('create'); });
  bindTap($('modeJoinBtn'), function(){ chooseMode('join'); });
  bindTap($('modeBackBtn'), function(){ show('menuScreen'); });
  bindTap($('arenaNextBtn'), continueAfterArena);
  bindTap($('arenaBackBtn'), function(){ show('modeScreen'); });
  bindTap($('startAiBtn'), newMatch);
  bindTap($('difficultyBackBtn'), function(){ show('arenaScreen'); });
  bindTap($('joinRoomBtn'), joinRoom);
  bindTap($('joinBackBtn'), function(){ show('modeScreen'); });
  bindTap($('howBtn'), function(){ show('howScreen'); });
  bindTap($('howBtnTop'), function(){ show('howScreen'); });
  bindTap($('backHowBtn'), function(){ show('menuScreen'); });
  bindTap($('menuBtn'), function(){ started=false; paused=true; $('overlayText').textContent=''; $('resultPanel').classList.remove('active'); if(mode==='online'){ try{ if(socket) socket.emit('leave-room',{ roomCode:roomCode }); }catch(e){} } mode='ai'; show('menuScreen'); });
  bindTap($('restartBtn'), function(){ if(mode==='online'){ setOverlay('ONLINE RESTART DISABLED'); } else newMatch(); });
  bindTap($('playAgainBtn'), function(){ if(mode==='online' && socket && roomCode){ $('resultPanel').classList.remove('active'); setOverlay('WAITING RIVAL'); try{ socket.emit('play-again-ready',{ roomCode:roomCode, role:isHost?'host':'guest' }); }catch(e){} } else newMatch(); });
  bindTap($('resultMenuBtn'), function(){ $('resultPanel').classList.remove('active'); mode='ai'; show('menuScreen'); });

  setTimeout(function(){
    canvas=$('gameCanvas');
    if(canvas){
      canvas.addEventListener('touchstart',canvasDown,{passive:false});
      canvas.addEventListener('touchmove',canvasMove,{passive:false});
      canvas.addEventListener('touchend',canvasUp,{passive:false});
      canvas.addEventListener('pointerdown',canvasDown,{passive:false});
      canvas.addEventListener('pointermove',canvasMove,{passive:false});
      canvas.addEventListener('pointerup',canvasUp,{passive:false});
    }
  },0);
})();
</script>
        `,
      }}
    />
  );
}
