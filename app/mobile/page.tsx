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

  .nameInput {
    width:100%; min-height:58px; border-radius:24px; outline:none;
    border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.46); color:white;
    text-align:center; font-size:18px; font-weight:1000; letter-spacing:.18em; text-transform:uppercase;
    box-shadow:inset 0 0 24px rgba(0,82,255,.14), 0 0 24px rgba(0,82,255,.10);
  }
  .nameInput::placeholder { color:rgba(255,255,255,.34); }
  .nameWarning { display:none; margin-top:9px; text-align:center; color:#f87171; font-size:10px; font-weight:1000; letter-spacing:.16em; }
  .nameWarning.active { display:block; }
  .premiumRegionGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .region {
    position:relative; min-height:70px; overflow:hidden; border-radius:24px;
    background:linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.025));
    box-shadow:inset 0 0 24px rgba(255,255,255,.03);
  }
  .region:before { content:""; position:absolute; inset:-40px; opacity:0; background:conic-gradient(from 120deg, transparent, rgba(34,211,238,.32), transparent); transition:opacity .22s ease; }
  .region.selected:before { opacity:1; animation:spin 8s linear infinite; }
  .region span { position:relative; z-index:1; display:block; font-size:17px; letter-spacing:.18em; }
  .region small { position:relative; z-index:1; display:block; margin-top:5px; font-size:8px; letter-spacing:.14em; opacity:.60; }
  .region.selected { border-color:#22d3ee; color:white; box-shadow:0 0 28px rgba(34,211,238,.32), inset 0 0 30px rgba(34,211,238,.10); background:linear-gradient(145deg, rgba(34,211,238,.18), rgba(0,82,255,.10)); }
  .duelCard { margin-top:10px; display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; }
  .duelName { border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.055); border-radius:18px; padding:10px 6px; text-align:center; font-size:11px; font-weight:1000; letter-spacing:.13em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .duelVs { color:#9dc0ff; font-size:11px; font-weight:1000; letter-spacing:.16em; }


  /* CLEAN PREMIUM INTRO / MENU VISUAL */
  .cleanSplashFrame {
    position:relative; width:min(86vw,380px); min-height:430px; border-radius:44px; overflow:hidden;
    border:1px solid rgba(255,255,255,.14);
    background:
      radial-gradient(circle at 50% 22%, rgba(0,82,255,.34), transparent 32%),
      linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.025));
    box-shadow:0 0 90px rgba(0,82,255,.38), inset 0 0 60px rgba(255,255,255,.025);
  }
  .cleanSplashFrame:before {
    content:""; position:absolute; inset:18px; border-radius:34px;
    border:1px solid rgba(255,255,255,.08); box-shadow:inset 0 0 35px rgba(0,82,255,.12);
  }
  .cleanSplashInner { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px; }
  .brandMark { position:relative; width:146px; height:146px; margin-bottom:22px; }
  .brandMark .field {
    position:absolute; inset:12px 34px; border-radius:24px;
    border:2px solid rgba(255,255,255,.24);
    background:linear-gradient(180deg, rgba(0,82,255,.20), rgba(0,0,0,.34));
    box-shadow:0 0 38px rgba(0,82,255,.32), inset 0 0 24px rgba(0,82,255,.20);
  }
  .brandMark .field:before { content:""; position:absolute; left:0; right:0; top:50%; height:1px; background:rgba(255,255,255,.22); }
  .brandMark .field:after { content:"BASE"; position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); text-align:center; color:rgba(255,255,255,.26); font-size:13px; font-weight:1000; letter-spacing:.20em; }
  .brandMark .ball { position:absolute; width:22px; height:22px; border-radius:999px; left:62px; top:62px; background:white; box-shadow:0 0 22px rgba(0,82,255,.95); }
  .brandMark .lineA, .brandMark .lineB { position:absolute; height:5px; width:82px; border-radius:999px; background:#0052ff; box-shadow:0 0 20px rgba(0,82,255,.75); transform:rotate(-21deg); left:31px; top:43px; }
  .brandMark .lineB { background:#ef4444; box-shadow:0 0 20px rgba(239,68,68,.65); transform:rotate(21deg); top:98px; }
  .cleanSplashTitle { text-align:center; font-size:34px; line-height:.91; font-weight:1000; letter-spacing:.105em; text-shadow:0 0 32px rgba(0,82,255,.95); }
  .cleanSplashSub { margin-top:16px; color:rgba(255,255,255,.58); font-size:10px; letter-spacing:.28em; font-weight:1000; }

  .cleanHero {
    position:relative; border-radius:34px; padding:16px; overflow:hidden;
    border:1px solid rgba(255,255,255,.14);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    box-shadow:0 0 52px rgba(0,82,255,.18);
  }
  .cleanHero:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 0%, rgba(0,82,255,.28), transparent 44%); pointer-events:none; }
  .cleanHeroInner { position:relative; z-index:1; border-radius:26px; padding:17px 12px 14px; background:rgba(0,0,0,.50); border:1px solid rgba(255,255,255,.075); }
  .heroTopline { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .heroBadge { padding:7px 10px; border-radius:999px; background:rgba(0,82,255,.14); border:1px solid rgba(0,82,255,.28); color:#a9c5ff; font-size:9px; letter-spacing:.20em; font-weight:1000; }
  .heroLive { padding:7px 10px; border-radius:999px; background:rgba(34,211,238,.10); border:1px solid rgba(34,211,238,.22); color:#bdf5ff; font-size:9px; letter-spacing:.18em; font-weight:1000; }
  .heroTitle { font-size:31px; line-height:.92; letter-spacing:.08em; text-align:left; font-weight:1000; text-shadow:0 0 24px rgba(0,82,255,.75); }
  .heroSubtitle { margin-top:8px; color:rgba(255,255,255,.56); font-size:10px; letter-spacing:.22em; font-weight:1000; }
  .courtVisual {
    position:relative; margin-top:16px; height:154px; border-radius:26px; overflow:hidden;
    border:1px solid rgba(255,255,255,.12);
    background:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px),
      radial-gradient(circle at 50% 50%, rgba(0,82,255,.20), rgba(0,0,0,.12) 55%, rgba(0,0,0,.55));
    background-size:28px 28px,28px 28px,100% 100%;
    box-shadow:inset 0 0 36px rgba(0,82,255,.16);
  }
  .courtVisual:before { content:""; position:absolute; left:14px; right:14px; top:14px; bottom:14px; border:1px solid rgba(255,255,255,.18); border-radius:18px; }
  .courtVisual:after { content:""; position:absolute; left:14px; right:14px; top:50%; height:1px; background:rgba(255,255,255,.15); }
  .cvBase { position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); text-align:center; color:rgba(255,255,255,.14); font-size:38px; font-weight:1000; letter-spacing:.16em; }
  .cvBall { position:absolute; width:18px; height:18px; border-radius:999px; left:calc(50% - 9px); top:calc(50% - 9px); background:white; box-shadow:0 0 22px rgba(0,82,255,.95); }
  .cvLine1, .cvLine2 { position:absolute; height:7px; border-radius:999px; width:118px; transform:rotate(-16deg); left:34px; bottom:34px; background:#0052ff; box-shadow:0 0 20px rgba(0,82,255,.75); }
  .cvLine2 { transform:rotate(16deg); right:34px; left:auto; top:34px; bottom:auto; background:#ef4444; box-shadow:0 0 20px rgba(239,68,68,.62); }
  .heroStats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:10px; }
  .heroStat { border:1px solid rgba(255,255,255,.10); border-radius:16px; padding:9px 5px; background:rgba(255,255,255,.045); text-align:center; }
  .heroStat strong { display:block; font-size:11px; letter-spacing:.14em; }
  .heroStat span { display:block; margin-top:4px; color:rgba(255,255,255,.48); font-size:8px; font-weight:1000; letter-spacing:.14em; }

</style>
<div id="app">
  <div id="splashScreen"><div class="cleanSplashFrame"><div class="cleanSplashInner"><div class="brandMark"><div class="field"></div><div class="lineA"></div><div class="lineB"></div><div class="ball"></div></div><div class="cleanSplashTitle">BASE<br/>BOING<br/>BATTLE</div><div class="cleanSplashSub">MOBILE ARENA</div></div></div></div>
  <div id="noise"></div>
  <section id="menuScreen" class="screen active">
    <div class="center">
      <div class="cleanHero">
        <div class="cleanHeroInner">
          <div class="heroTopline">
            <div class="heroBadge">BUILT ON BASE</div>
            <div class="heroLive">MOBILE</div>
          </div>
          <div class="heroTitle">BASE<br/>BOING<br/>BATTLE</div>
          <div class="heroSubtitle">DRAW LINES • DEFLECT • SCORE</div>
          <div class="courtVisual">
            <div class="cvBase">BASE</div>
            <div class="cvLine1"></div>
            <div class="cvLine2"></div>
            <div class="cvBall"></div>
          </div>
          <div class="heroStats">
            <div class="heroStat"><strong>AI</strong><span>SOLO</span></div>
            <div class="heroStat"><strong>1V1</strong><span>ONLINE</span></div>
            <div class="heroStat"><strong>7</strong><span>WINS</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="sectionLabel">PLAYER NAME</div>
        <input id="usernameInput" class="nameInput" maxlength="10" placeholder="USERNAME" autocomplete="off" autocapitalize="characters" />
        <div id="nameWarning" class="nameWarning">ENTER USERNAME FIRST</div>
      </div>

      <div class="card">
        <div class="sectionLabel">DIFFICULTY</div>
        <div class="row">
          <button class="difficulty" data-difficulty="easy">EASY</button>
          <button class="difficulty selected" data-difficulty="normal">NORMAL</button>
          <button class="difficulty" data-difficulty="hard">HARD</button>
        </div>
      </div>

      <div class="card">
        <div class="menuActionGrid">
          <button id="playBtn" class="btn">PLAY VS AI</button>
          <button id="howBtnTop" class="miniBtn">HOW TO<br/>PLAY</button>
        </div>
      </div>

      <div class="card">
        <div class="sectionLabel">REGION</div>
        <div class="premiumRegionGrid">
          <button class="region selected" data-region="EU"><span>EU</span><small>FRANKFURT</small></button>
          <button class="region" data-region="US"><span>US</span><small>AMERICA</small></button>
        </div>
        <div style="height:10px"></div>
        <button id="onlineBtn" class="btn secondary">ONLINE 1V1</button>
      </div>

      <div class="card">
        <div class="sectionLabel">SELECT ARENA</div>
        <div class="grid">
          <button class="arena selected" data-arena="classic">CLASSIC<small>RETRO GRID</small></button>
          <button class="arena" data-arena="base">BASE<small>NEON STADIUM</small></button>
          <button class="arena" data-arena="space">ORBIT<small>SPACE MODE</small></button>
          <button class="arena" data-arena="temple">TEMPLE<small>CHAIN RUNES</small></button>
        </div>
      </div>

      <button id="howBtn" class="btn secondary">HOW TO PLAY</button>
      <div class="sub">REACT-FREE iOS BUILD</div>
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
        <div class="duelCard">
          <div id="matchYou" class="duelName">YOU</div>
          <div class="duelVs">VS</div>
          <div id="matchRival" class="duelName">RIVAL</div>
        </div>
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
  var arena='classic', difficulty='normal', socketRegion='EU', mode='ai', playerName='YOU', rivalName='RIVAL';
  var canvas, ctx, raf=0;
  var ball, lines, trail, sparks, score, energy, started=false, paused=false, drawing=null, goalLocked=false;
  var frame=0, audioUnlocked=false, lastWallSound=0, lastOnlineScoreTotal=null, lastOnlineRoundKey=null, onlineCountdownTimer=null, onlineBattleTimer=null;
  var socket=null, socketReady=false, isHost=false, roleKnown=false, roomCode=null, mobileId='mobile_'+Math.random().toString(16).slice(2,10), onlineTarget={x:200,y:350,vx:1.2,vy:1.8}, onlineStateAt=Date.now();
  var SOCKET_EU='https://base-boing-battle-1.onrender.com';
  var SOCKET_US='https://base-boing-battle-usa.onrender.com';
  function flash(){ var f=$('goalFlash'); var gw=$('gameWrap'); if(f){ f.classList.add('active'); setTimeout(function(){f.classList.remove('active')},220); } if(gw){ gw.classList.add('shake'); setTimeout(function(){gw.classList.remove('shake')},330); } }

  function $(id){ return document.getElementById(id); }
  function cleanName(v){ return String(v||'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,10).toUpperCase(); }
  function getPlayerName(){
    var input=$('usernameInput');
    var finalName=cleanName(input?input.value:playerName);
    if(!finalName){
      var warn=$('nameWarning'); if(warn) warn.classList.add('active');
      setOverlay('ENTER NAME');
      try{ navigator.vibrate&&navigator.vibrate(25); }catch(e){}
      return null;
    }
    playerName=finalName;
    if(input) input.value=finalName;
    var warn=$('nameWarning'); if(warn) warn.classList.remove('active');
    try{ localStorage.setItem('base_boing_mobile_username', finalName); }catch(e){}
    return finalName;
  }
  function shortName(v){ v=cleanName(v)||'PLAYER'; return v.length>10?v.slice(0,10):v; }
  function updateScoreHud(){
    if(!$('scoreHud')||!score) return;
    var left = mode==='online' ? shortName(rivalName) : 'AI';
    var right = shortName(playerName||'YOU');
    $('scoreHud').textContent = left+' '+score.ai+' ◇ '+score.player+' '+right;
  }
  function loadSavedName(){
    try{ var saved=localStorage.getItem('base_boing_mobile_username'); if(saved){ playerName=cleanName(saved); var input=$('usernameInput'); if(input) input.value=playerName; } }catch(e){}
  }
  function setMatchStatus(v){ var el=$('matchStatus'); if(el) el.textContent=v; }
  function show(id){
    ['menuScreen','howScreen','matchScreen','gameScreen'].forEach(function(s){ $(s).classList.remove('active'); });
    $(id).classList.add('active');
  }
  function bindTap(el, fn){
    if(!el) return;
    var last=0;
    function run(e){
      unlockAudio();
      var now=Date.now();
      if(now-last<120) return;
      last=now;
      if(e){ e.preventDefault(); e.stopPropagation(); }
      fn(e);
    }
    el.addEventListener('touchstart', run, {passive:false});
    el.addEventListener('pointerdown', run, {passive:false});
    el.addEventListener('click', run, false);
  }
  function theme(){
    if(arena==='base') return {main:'#ef4444', glow:'rgba(239,68,68,.95)', label:'BASE', bg:'#031d5a'};
    if(arena==='space') return {main:'#22d3ee', glow:'rgba(34,211,238,.95)', label:'ORBIT', bg:'#02040d'};
    if(arena==='temple') return {main:'#fbbf24', glow:'rgba(251,191,36,.95)', label:'CHAIN', bg:'#201204'};
    return {main:'#0052ff', glow:'rgba(0,82,255,.95)', label:'BASE', bg:'#020204'};
  }

  function unlockAudio(){ audioUnlocked=true; }
  function playSound(type){
    if(!audioUnlocked) return;
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

      // IMPORTANT: never let both mobile clients become host.
      // The server sends role: "host" or "guest". Host uses server coordinates,
      // guest renders a mirrored field so each player still plays from the bottom.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      }
      rivalName=cleanName(data.opponentUsername || data.opponent_username || data.rivalUsername || data.rival_username || 'RIVAL');
      var my=$('matchYou'), rv=$('matchRival'); if(my) my.textContent=shortName(playerName); if(rv) rv.textContent=shortName(rivalName);

      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND');
      setOverlay(isHost?'HOST READY':'GUEST READY');
      setTimeout(function(){ startOnlineMatch(); },900);
    });
    socket.on('room-matched',function(data){
      data=data||{};
      mode='online';
      roomCode=data.roomCode||data.room_code||roomCode;

      // Older/manual room event. Do not force isHost=true here; that was causing
      // both mobile devices to behave like the same side.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      } else if(typeof data.isHost==='boolean'){
        isHost=data.isHost;
        roleKnown=true;
      }
      rivalName=cleanName(data.opponentUsername || data.opponent_username || data.rivalUsername || data.rival_username || 'RIVAL');
      var my=$('matchYou'), rv=$('matchRival'); if(my) my.textContent=shortName(playerName); if(rv) rv.textContent=shortName(rivalName);

      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND');
      setTimeout(function(){ startOnlineMatch(); if(data.state) applyOnlineState(data.state); },900);
    });
    socket.on('arena-selected',function(data){ if(data && data.arena){ arena=data.arena; } });
    socket.on('game-state',function(state){ applyOnlineState(state); });
    socket.on('remote-line',function(line){ addRemoteLine(line); });
    socket.on('opponent-left',function(){ opponentLeft(); });
    socket.on('opponent-disconnected',function(){ opponentLeft(); });
    socket.on('play-again-status',function(data){ if(data && data.hostReadyAgain && data.guestReadyAgain){ startOnlineMatch(); } else { setOverlay('WAITING RIVAL'); } });
    socket.on('connect_error',function(){ setMatchStatus('SOCKET CONNECTION FAILED'); });
  }
  function startOnlineSearch(){
    var readyName=getPlayerName();
    if(!readyName) return;
    mode='online'; isHost=false; roleKnown=false; roomCode=null; rivalName='RIVAL'; show('matchScreen'); setMatchStatus('CONNECTING SOCKET...');
    var my=$('matchYou'), rv=$('matchRival'); if(my) my.textContent=readyName; if(rv) rv.textContent='RIVAL';
    ensureSocket(function(){
      try{ socket.emit('find-match',{ address:mobileId, username:readyName, region:socketRegion }); }catch(e){ setMatchStatus('SEARCH FAILED'); }
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
      if(score.player>prevPlayer) setOverlay(shortName(playerName)+' SCORES');
      else if(score.ai>prevAi) setOverlay(shortName(rivalName)+' SCORES');
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
      $('resultScore').textContent=shortName(rivalName)+' '+score.ai+' ◇ '+score.player+' '+shortName(playerName);
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
    var readyName=getPlayerName();
    if(!readyName) return;
    mode='ai'; isHost=false; roleKnown=false; roomCode=null; rivalName='AI';
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
      $('resultTitle').textContent=score.player>=7?shortName(playerName)+' WINS':'AI WINS';
      $('resultTitle').style.color=score.player>=7?theme().main:'#ef4444';
      $('resultTitle').style.textShadow='0 0 26px '+(score.player>=7?theme().main:'#ef4444');
      $('resultScore').textContent='AI '+score.ai+' ◇ '+score.player+' '+shortName(playerName);
      $('resultPanel').classList.add('active');
      return;
    }
    setOverlay(who==='player'?shortName(playerName)+' SCORES':'AI SCORES');
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

  loadSavedName();
  var nameInput=$('usernameInput');
  if(nameInput){
    nameInput.addEventListener('input',function(){ nameInput.value=cleanName(nameInput.value); playerName=nameInput.value||'YOU'; var warn=$('nameWarning'); if(playerName&&warn) warn.classList.remove('active'); });
    nameInput.addEventListener('blur',function(){ var n=cleanName(nameInput.value); if(n){ playerName=n; try{localStorage.setItem('base_boing_mobile_username', n)}catch(e){} } });
  }
  setTimeout(function(){ var sp=$('splashScreen'); if(sp) sp.classList.add('hide'); }, 1200);

  document.querySelectorAll('.region').forEach(function(btn){ bindTap(btn,function(){ socketRegion=btn.getAttribute('data-region')||'EU'; document.querySelectorAll('.region').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('onlineBtn'), startOnlineSearch);
  bindTap($('cancelMatchBtn'), cancelOnlineSearch);
  document.querySelectorAll('.arena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-arena')||'classic'; document.querySelectorAll('.arena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  document.querySelectorAll('.difficulty').forEach(function(btn){ bindTap(btn,function(){ difficulty=btn.getAttribute('data-difficulty')||'normal'; document.querySelectorAll('.difficulty').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('playBtn'), newMatch);
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
