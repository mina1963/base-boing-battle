export const dynamic = "force-static";

export default function MobilePage() {
  return (
    <main
      dangerouslySetInnerHTML={{
        __html: `
<style>
  html, body { margin:0; padding:0; background:#020204; color:white; overflow:hidden; font-family:Arial, Helvetica, sans-serif; -webkit-user-select:none; user-select:none; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  #app { position:fixed; inset:0; width:100vw; height:100dvh; background:radial-gradient(circle at 50% 35%, rgba(0,82,255,.22), #020204 55%, #000 100%); overflow:hidden; }
  .screen { position:absolute; inset:0; display:none; padding:22px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .screen.active { display:block; }
  .center { min-height:100%; display:flex; flex-direction:column; justify-content:center; gap:16px; }
  h1 { margin:0; font-size:32px; line-height:.95; letter-spacing:.08em; font-weight:1000; text-align:center; text-shadow:0 0 24px rgba(0,82,255,.75); }
  .sub { text-align:center; color:rgba(255,255,255,.62); font-size:12px; font-weight:800; letter-spacing:.22em; margin-bottom:12px; }
  .card { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.055); border-radius:26px; padding:14px; box-shadow:0 0 30px rgba(0,82,255,.16); }
  .btn { width:100%; min-height:62px; border:0; border-radius:26px; color:white; background:#0052ff; font-size:15px; font-weight:1000; letter-spacing:.2em; box-shadow:0 0 32px rgba(0,82,255,.42); touch-action:manipulation; }
  .btn:active { transform:scale(.98); }
  .btn.secondary { background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.16); box-shadow:none; }
  .btn.red { background:#ef4444; box-shadow:0 0 32px rgba(239,68,68,.35); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .arena { min-height:92px; border:1px solid rgba(255,255,255,.13); border-radius:22px; background:linear-gradient(160deg, rgba(0,82,255,.22), rgba(255,255,255,.04)); color:white; font-weight:1000; letter-spacing:.12em; font-size:12px; }
  .arena.selected { border-color:#0052ff; box-shadow:0 0 24px rgba(0,82,255,.45); }
  #gameScreen { padding:0; overflow:hidden; touch-action:none; }
  #gameWrap { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; touch-action:none; }
  #gameCanvas { width:min(100vw, calc(100dvh * 0.5714)); height:min(100dvh, calc(100vw * 1.75)); touch-action:none; display:block; }
  #hudTop { position:absolute; top:calc(env(safe-area-inset-top) + 10px); left:12px; right:12px; display:flex; justify-content:space-between; align-items:center; pointer-events:none; }
  #hudTop button { pointer-events:auto; }
  .pill { border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.45); color:white; border-radius:999px; padding:10px 14px; font-weight:1000; font-size:12px; letter-spacing:.14em; }
  #overlayText { position:absolute; left:0; right:0; top:42%; text-align:center; font-size:42px; font-weight:1000; letter-spacing:.08em; text-shadow:0 0 28px rgba(0,82,255,.95); pointer-events:none; }
</style>
<div id="app">
  <section id="menuScreen" class="screen active">
    <div class="center">
      <div>
        <h1>BASE<br/>BOING<br/>BATTLE</h1>
        <div class="sub">MOBILE ARCADE MODE</div>
      </div>
      <div class="card">
        <button id="playBtn" class="btn">PLAY VS AI</button>
      </div>
      <div class="card">
        <div class="sub" style="margin-bottom:10px">SELECT ARENA</div>
        <div class="grid">
          <button class="arena selected" data-arena="classic">CLASSIC</button>
          <button class="arena" data-arena="base">BASE</button>
          <button class="arena" data-arena="space">ORBIT</button>
          <button class="arena" data-arena="temple">TEMPLE</button>
        </div>
      </div>
      <button id="howBtn" class="btn secondary">HOW TO PLAY</button>
      <div class="sub">REACT-FREE iOS BUILD</div>
    </div>
  </section>

  <section id="howScreen" class="screen">
    <div class="center">
      <h1>HOW TO PLAY</h1>
      <div class="card" style="line-height:1.7;color:rgba(255,255,255,.78);font-weight:800">
        Draw lines on your half of the arena. Deflect the ball past the AI. First to 7 wins.
      </div>
      <button id="backHowBtn" class="btn">GOT IT</button>
    </div>
  </section>

  <section id="gameScreen" class="screen">
    <div id="gameWrap">
      <canvas id="gameCanvas" width="400" height="700"></canvas>
      <div id="hudTop">
        <button id="menuBtn" class="pill">MENU</button>
        <div id="scoreHud" class="pill">AI 0 ◇ 0 YOU</div>
      </div>
      <div id="overlayText"></div>
    </div>
  </section>
</div>
<script>
(function(){
  var W=400,H=700;
  var screen='menu';
  var arena='classic';
  var canvas, ctx, raf=0;
  var ball, lines, trail, sparks, score, energy, started=false, paused=false, drawing=null, overlayTimer=0;

  function $(id){ return document.getElementById(id); }
  function show(id){
    ['menuScreen','howScreen','gameScreen'].forEach(function(s){ $(s).classList.remove('active'); });
    $(id).classList.add('active');
    screen=id;
  }
  function bindTap(el, fn){
    if(!el) return;
    var last=0;
    function run(e){
      var now=Date.now();
      if(now-last<120) return;
      last=now;
      if(e){ e.preventDefault(); e.stopPropagation(); }
      fn();
    }
    el.addEventListener('touchstart', run, {passive:false});
    el.addEventListener('pointerdown', run, {passive:false});
    el.addEventListener('click', run, false);
  }
  function resetState(dir){
    ball={x:200,y:dir==='up'?525:175,r:8,vx:dir==='up'?1.2:-1.2,vy:dir==='up'?-1.8:1.8};
    lines=[]; trail=[]; sparks=[]; energy=100; drawing=null;
  }
  function startGame(){
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d');
    score={player:0,ai:0,msg:'',life:0}; resetState('down');
    show('gameScreen'); started=false; paused=true;
    countdown(3);
    if(!raf) loop();
  }
  function countdown(n){
    var text=$('overlayText');
    if(n>0){ text.textContent=String(n); setTimeout(function(){countdown(n-1)},700); }
    else { text.textContent='BATTLE!'; setTimeout(function(){text.textContent=''; started=true; paused=false;},650); }
  }
  function getPos(e){
    var t=e.touches&&e.touches[0]?e.touches[0]:e;
    var r=canvas.getBoundingClientRect();
    return {x:(t.clientX-r.left)/r.width*W, y:(t.clientY-r.top)/r.height*H};
  }
  function addLine(start,end,owner){
    var dx=end.x-start.x, dy=end.y-start.y, len=Math.sqrt(dx*dx+dy*dy)||1;
    var max=160, l=Math.min(max,len), a=Math.atan2(dy,dx);
    lines=lines.filter(function(l){return l.owner!==owner || l.life>8});
    lines.push({x1:start.x,y1:start.y,x2:start.x+Math.cos(a)*l,y2:start.y+Math.sin(a)*l,life:48,owner:owner});
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
    paused=true; started=false;
    if(who==='player') score.player++; else score.ai++;
    $('scoreHud').textContent='AI '+score.ai+' ◇ '+score.player+' YOU';
    var text=$('overlayText');
    if(score.player>=7 || score.ai>=7){ text.textContent=score.player>=7?'YOU WIN':'AI WINS'; return; }
    text.textContent=who==='player'?'YOU SCORES':'AI SCORES';
    setTimeout(function(){ resetState(who==='player'?'down':'up'); countdown(3); },1000);
  }
  function drawBg(){
    if(arena==='base') { ctx.fillStyle='#031d5a'; ctx.fillRect(0,0,W,H); }
    else if(arena==='space') { ctx.fillStyle='#02040d'; ctx.fillRect(0,0,W,H); }
    else if(arena==='temple') { ctx.fillStyle='#201204'; ctx.fillRect(0,0,W,H); }
    else { ctx.fillStyle='#020204'; ctx.fillRect(0,0,W,H); }
    var grd=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,H/1.2);
    grd.addColorStop(0, arena==='temple'?'rgba(251,191,36,.18)':arena==='space'?'rgba(34,211,238,.18)':'rgba(0,82,255,.20)');
    grd.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=2; ctx.strokeRect(12,12,W-24,H-24);
    ctx.beginPath(); ctx.moveTo(12,H/2); ctx.lineTo(W-12,H/2); ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.stroke();
    ctx.font='900 44px monospace'; ctx.textAlign='center'; ctx.fillStyle='rgba(0,82,255,.35)'; ctx.fillText(arena==='space'?'ORBIT':arena==='temple'?'CHAIN':'BASE',W/2,H/2+14);
  }
  function physics(){
    if(energy<100) energy+=0.2;
    if(!started||paused) return;
    if(ball.y<H/2-20 && ball.vy<0 && Math.random()<0.035){
      addLine({x:ball.x-55+(Math.random()-.5)*80,y:Math.max(40,ball.y-35)}, {x:ball.x+55+(Math.random()-.5)*80,y:Math.max(40,ball.y-10)}, 'ai');
    }
    var steps=Math.max(1,Math.ceil(Math.hypot(ball.vx,ball.vy)/2));
    for(var s=0;s<steps;s++){
      ball.x+=ball.vx/steps; ball.y+=ball.vy/steps;
      for(var i=0;i<lines.length;i++){
        var l=lines[i]; if(l.life<4) continue;
        var dx=l.x2-l.x1,dy=l.y2-l.y1,lenSq=dx*dx+dy*dy;
        var t=Math.max(0,Math.min(1,((ball.x-l.x1)*dx+(ball.y-l.y1)*dy)/lenSq));
        var px=l.x1+t*dx, py=l.y1+t*dy, dist=Math.hypot(ball.x-px,ball.y-py);
        if(dist<ball.r+6){
          var speed=Math.min(Math.hypot(ball.vx,ball.vy)+0.25,10);
          var nx=-dy, ny=dx, nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
          if(ball.vx*nx+ball.vy*ny>0){nx*=-1;ny*=-1;}
          ball.vx=nx*speed+dx*.006; ball.vy=ny*speed+dy*.006; l.life=0; break;
        }
      }
    }
    if(ball.x<22||ball.x>W-22) ball.vx*=-1;
    if(ball.y<22) goal('player');
    if(ball.y>H-22) goal('ai');
  }
  function render(){
    drawBg(); physics();
    trail.push({x:ball.x,y:ball.y}); if(trail.length>18) trail.shift();
    lines=lines.map(function(l){l.life--;return l}).filter(function(l){return l.life>0});
    lines.forEach(function(l){ ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.lineCap='round'; ctx.lineWidth=10; ctx.strokeStyle=l.owner==='player'?'rgba(0,82,255,.9)':'rgba(239,68,68,.85)'; ctx.shadowColor=l.owner==='player'?'#0052ff':'#ef4444'; ctx.shadowBlur=22; ctx.stroke(); ctx.shadowBlur=0; });
    trail.forEach(function(p,i){ var a=i/trail.length; ctx.beginPath(); ctx.arc(p.x,p.y,ball.r*a*1.5,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,'+(a*.28)+')'; ctx.fill(); });
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r+8,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fillStyle='white'; ctx.shadowColor='#0052ff'; ctx.shadowBlur=24; ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(120,72,160,8); ctx.fillStyle='rgba(0,82,255,.9)'; ctx.fillRect(120,72,160*energy/100,8);
  }
  function loop(){ if(ctx) render(); raf=requestAnimationFrame(loop); }

  document.querySelectorAll('.arena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-arena')||'classic'; document.querySelectorAll('.arena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('playBtn'), startGame);
  bindTap($('howBtn'), function(){ show('howScreen'); });
  bindTap($('backHowBtn'), function(){ show('menuScreen'); });
  bindTap($('menuBtn'), function(){ started=false; paused=true; $('overlayText').textContent=''; show('menuScreen'); });
  setTimeout(function(){ canvas=$('gameCanvas'); if(canvas){ canvas.addEventListener('touchstart',canvasDown,{passive:false}); canvas.addEventListener('touchmove',canvasMove,{passive:false}); canvas.addEventListener('touchend',canvasUp,{passive:false}); canvas.addEventListener('pointerdown',canvasDown,{passive:false}); canvas.addEventListener('pointermove',canvasMove,{passive:false}); canvas.addEventListener('pointerup',canvasUp,{passive:false}); } },0);
})();
</script>
        `,
      }}
    />
  );
}
