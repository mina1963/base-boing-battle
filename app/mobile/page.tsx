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
  .difficulty { min-height:58px; }
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
  #toast { position:absolute; left:18px; right:18px; bottom:calc(env(safe-area-inset-bottom) + 14px); text-align:center; color:rgba(255,255,255,.72); font-size:11px; font-weight:900; letter-spacing:.12em; pointer-events:none; }

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
</style>
<div id="app">
  <div id="splashScreen"><div id="splashLogo">BASE<br/>BOING</div></div>
  <div id="noise"></div>
  <section id="menuScreen" class="screen active">
    <div class="center">
      <div>
        <div class="titleBadge">BUILT ON BASE</div>
        <h1>BASE<br/>BOING<br/>BATTLE</h1>
        <div class="sub">ONCHAIN ARCADE MODE</div>
      </div>
      <div class="menuHero"><div class="menuHeroInner"><div style="font-size:24px;font-weight:1000;letter-spacing:.18em">1V1 PHYSICS</div><div class="sub" style="margin:8px 0 0">DRAW • DEFLECT • SCORE</div></div></div>

      <div class="card">
        <div class="sub">DIFFICULTY</div>
        <div class="row">
          <button class="difficulty" data-difficulty="easy">EASY</button>
          <button class="difficulty selected" data-difficulty="normal">NORMAL</button>
          <button class="difficulty" data-difficulty="hard">HARD</button>
        </div>
      </div>

      <div class="card">
        <button id="playBtn" class="btn">PLAY VS AI</button>
      </div>

      <div class="card">
        <div class="sub">SELECT ARENA</div>
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
      <div id="toast">DRAW IN YOUR HALF</div>
    </div>
  </section>
</div>
<script>
(function(){
  var W=400,H=700;
  var arena='classic', difficulty='normal';
  var canvas, ctx, raf=0;
  var ball, lines, trail, sparks, score, energy, started=false, paused=false, drawing=null, goalLocked=false;
  var frame=0;
  function flash(){ var f=$('goalFlash'); var gw=$('gameWrap'); if(f){ f.classList.add('active'); setTimeout(function(){f.classList.remove('active')},220); } if(gw){ gw.classList.add('shake'); setTimeout(function(){gw.classList.remove('shake')},330); } }

  function $(id){ return document.getElementById(id); }
  function show(id){
    ['menuScreen','howScreen','gameScreen'].forEach(function(s){ $(s).classList.remove('active'); });
    $(id).classList.add('active');
  }
  function bindTap(el, fn){
    if(!el) return;
    var last=0;
    function run(e){
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
  function resetBall(dir){
    goalLocked=false;
    ball={x:200,y:dir==='up'?525:175,r:8,vx:dir==='up'?1.25:-1.25,vy:dir==='up'?-1.85:1.85};
    lines=[]; trail=[]; sparks=[]; energy=100; drawing=null;
  }
  function newMatch(){
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d');
    score={player:0,ai:0,msg:'',life:0}; resetBall('down');
    $('scoreHud').textContent='AI 0 ◇ 0 YOU';
    $('resultPanel').classList.remove('active');
    show('gameScreen'); started=false; paused=true;
    countdown(3);
    if(!raf) loop();
  }
  function countdown(n){
    var text=$('overlayText');
    if(n>0){ text.textContent=String(n); setTimeout(function(){countdown(n-1)},650); }
    else { text.textContent='BATTLE!'; setTimeout(function(){text.textContent=''; started=true; paused=false; goalLocked=false;},600); }
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
    energy=Math.max(0,energy-25);
  }
  function canvasDown(e){ if(!started||paused) return; var p=getPos(e); if(p.y<H/2) return; drawing=p; e.preventDefault(); }
  function canvasMove(e){
    if(!started||paused||!drawing) return;
    var p=getPos(e); if(p.y<H/2) return;
    var d=Math.hypot(p.x-drawing.x,p.y-drawing.y);
    if(d>55 && energy>=25){ addLine(drawing,p,'player'); drawing=null; }
    e.preventDefault();
  }
  function canvasUp(e){ drawing=null; if(e) e.preventDefault(); }
  function goal(who){
    if(goalLocked) return;
    goalLocked=true; paused=true; started=false; flash();
    if(who==='player') score.player++; else score.ai++;
    $('scoreHud').textContent='AI '+score.ai+' ◇ '+score.player+' YOU';
    var text=$('overlayText');
    if(score.player>=7 || score.ai>=7){
      text.textContent='';
      $('resultTitle').textContent=score.player>=7?'YOU WIN':'AI WINS';
      $('resultScore').textContent='AI '+score.ai+' ◇ '+score.player+' YOU';
      $('resultPanel').classList.add('active');
      return;
    }
    text.textContent=who==='player'?'YOU SCORES':'AI SCORES';
    setTimeout(function(){ resetBall(who==='player'?'down':'up'); countdown(3); },950);
  }
  function drawBg(){
    var th=theme();
    ctx.fillStyle=th.bg; ctx.fillRect(0,0,W,H);
    var grd=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,H/1.15);
    grd.addColorStop(0, arena==='temple'?'rgba(251,191,36,.20)':arena==='space'?'rgba(34,211,238,.20)':arena==='base'?'rgba(239,68,68,.15)':'rgba(0,82,255,.22)');
    grd.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);

    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
    for(var x=40;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,18); ctx.lineTo(x,H-18); ctx.stroke(); }
    for(var y=60;y<H;y+=60){ ctx.beginPath(); ctx.moveTo(18,y); ctx.lineTo(W-18,y); ctx.stroke(); }

    ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=2; ctx.strokeRect(12,12,W-24,H-24);
    ctx.beginPath(); ctx.moveTo(12,H/2); ctx.lineTo(W-12,H/2); ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.stroke();

    ctx.font='900 44px monospace'; ctx.textAlign='center'; ctx.fillStyle=arena==='temple'?'rgba(251,191,36,.28)':arena==='space'?'rgba(34,211,238,.28)':arena==='base'?'rgba(239,68,68,.25)':'rgba(0,82,255,.35)';
    ctx.shadowColor=th.main; ctx.shadowBlur=18; ctx.fillText(th.label,W/2,H/2+14); ctx.shadowBlur=0;
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
          l.life=0; addSparks(ball.x,ball.y,l.owner==='player'?'#0052ff':'#ef4444');
          break;
        }
      }
    }
    if(ball.x<22){ ball.x=22; ball.vx=Math.abs(ball.vx); }
    if(ball.x>W-22){ ball.x=W-22; ball.vx=-Math.abs(ball.vx); }
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

  setTimeout(function(){ var sp=$('splashScreen'); if(sp) sp.classList.add('hide'); }, 1200);

  document.querySelectorAll('.arena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-arena')||'classic'; setTimeout(function(){ var sp=$('splashScreen'); if(sp) sp.classList.add('hide'); }, 1200);

  document.querySelectorAll('.arena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  document.querySelectorAll('.difficulty').forEach(function(btn){ bindTap(btn,function(){ difficulty=btn.getAttribute('data-difficulty')||'normal'; document.querySelectorAll('.difficulty').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('playBtn'), newMatch);
  bindTap($('howBtn'), function(){ show('howScreen'); });
  bindTap($('backHowBtn'), function(){ show('menuScreen'); });
  bindTap($('menuBtn'), function(){ started=false; paused=true; $('overlayText').textContent=''; $('resultPanel').classList.remove('active'); show('menuScreen'); });
  bindTap($('restartBtn'), newMatch);
  bindTap($('playAgainBtn'), newMatch);
  bindTap($('resultMenuBtn'), function(){ $('resultPanel').classList.remove('active'); show('menuScreen'); });

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
