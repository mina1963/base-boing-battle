/* Shared by the web bundle, mobile HTML and packaged store game. */
(function (root) {
  function rankRegion(samples) {
    var good = samples.filter(function (n) { return Number.isFinite(n) && n >= 0; }).sort(function (a,b) { return a-b; });
    if (good.length < 2) return { score: Infinity, medianMs: null, jitterMs: null, failedProbes: samples.length-good.length };
    var median = good[Math.floor(good.length/2)];
    var jitter = good[good.length-1]-good[0];
    return { score: median+jitter*.5+(samples.length-good.length)*250, medianMs: median, jitterMs: jitter, failedProbes: samples.length-good.length };
  }
  function probe(url, io) {
    return new Promise(function (resolve) {
      var socket, finished=false, samples=[];
      var deadline=setTimeout(done,5000);
      function done() {
        if(finished) return;
        finished=true; clearTimeout(deadline);
        if(socket) { socket.removeAllListeners(); socket.disconnect(); }
        while(samples.length<3) samples.push(null);
        resolve(rankRegion(samples));
      }
      try {
        socket=io(url,{forceNew:true,autoConnect:false,reconnection:false,timeout:2200,transports:['websocket','polling']});
        socket.on('connect_error',done);
        socket.on('connect',function next(){
          if(finished) return;
          var start=performance.now();
          socket.timeout(700).emit('region-ping',function(error,data){
            if(finished) return;
            samples.push(!error&&data&&Number.isFinite(data.serverNow)?performance.now()-start:null);
            if(samples.length===3) done(); else setTimeout(next,80);
          });
        });
        socket.connect();
      } catch (_) { done(); }
    });
  }
  async function selectRegion(regions,fallback,io) {
    var ids=Object.keys(regions).filter(function(id){return !!regions[id];});
    if(!ids.length) return {region:fallback,measurements:{},measured:false};
    var results=await Promise.all(ids.map(function(id){return probe(regions[id],io);}));
    var measurements={}; ids.forEach(function(id,i){measurements[id]=results[i];});
    var best=ids.reduce(function(a,b){return measurements[a].score<=measurements[b].score?a:b;});
    if(!Number.isFinite(measurements[best].score)) return {region:fallback,measurements:measurements,measured:false};
    var previous=fallback;
    try { var saved=JSON.parse(localStorage.getItem('bbb_region_choice')||'null'); if(saved&&Date.now()-saved.at<3600000&&regions[saved.region]) previous=saved.region; } catch(_) {}
    if(measurements[previous]&&measurements[previous].score<=measurements[best].score+25) best=previous;
    try {localStorage.setItem('bbb_region_choice',JSON.stringify({region:best,at:Date.now()}));}catch(_){}
    return {region:best,measurements:measurements,measured:true};
  }
  var api={selectRegion:selectRegion,rankRegion:rankRegion};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.BoingRegions=api;
})(typeof window!=='undefined'?window:null);
