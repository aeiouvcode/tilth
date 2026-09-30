// TILTH boot, HUD, menus, audio, loop, autotest
'use strict';

// ---------- tiny synth (no assets) ----------
let AC=null;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended')AC.resume(); return AC; }
function tone(f,dur=0.12,type='triangle',vol=0.06){
  const a=ac(); if(!a)return;
  const o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(vol,a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
}
function chime(f=520){ tone(f,0.1); setTimeout(()=>tone(f*1.5,0.12),70); }
function thud(){ tone(90,0.09,'sine',0.09); }
function splash(){ tone(300,0.06,'sine',0.04); setTimeout(()=>tone(420,0.05,'sine',0.03),50); }
function swish(){ tone(700,0.06,'sawtooth',0.02); }
function nudge(msg){ toast(msg); tone(180,0.08,'square',0.03); }

// ---------- toast ----------
function toast(msg){
  const w=document.getElementById('toast-wrap');
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  w.appendChild(d);
  setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),450); }, 2400);
  while(w.children.length>3) w.firstChild.remove();
}

// ---------- menu ----------
let MENU_OPEN=false;
function menuOpen(){ return MENU_OPEN; }
function openMenu(title, rows){
  MENU_OPEN=true;
  document.getElementById('menu').classList.remove('table-visit');
  const m=document.getElementById('menu');
  document.getElementById('menu-title').textContent=title;
  const wrap=document.getElementById('menu-items'); wrap.innerHTML='';
  for(const r of rows){
    const d=document.createElement('div'); d.className='menu-row';
    d.innerHTML=`<div><div class="nm"></div><div class="ds"></div></div><div class="price"></div>`;
    if(r.icon){ const cv2=document.createElement('canvas'); cv2.width=r.icon.width; cv2.height=r.icon.height; cv2.getContext('2d').drawImage(r.icon,0,0); cv2.className='ic'; d.insertBefore(cv2, d.firstChild); }
    d.querySelector('.nm').textContent=r.label;
    d.querySelector('.ds').textContent=r.desc||'';
    d.querySelector('.price').textContent=r.price||'';
    d.addEventListener('click',()=>r.pick());
    wrap.appendChild(d);
  }
  m.classList.remove('hidden');
}
function closeMenu(){ MENU_OPEN=false; document.getElementById('menu').classList.add('hidden'); document.getElementById('menu').classList.remove('table-visit'); document.getElementById('menu-card').classList.remove('paper'); }

// ---------- letters ----------
function openLetter(from, subject, body){
  MENU_OPEN=true;
  document.getElementById('menu').classList.remove('table-visit');
  document.getElementById('menu-card').classList.add('paper');
  const titleEl=document.getElementById('menu-title'); titleEl.textContent='';
  const head=document.createElement('canvas'); head.width=96; head.height=24;
  head.getContext('2d').drawImage(SPR.letterhead,0,0);
  head.className='letterhead';
  titleEl.appendChild(head);
  const wrap=document.getElementById('menu-items'); wrap.innerHTML='';
  const sub=document.createElement('div'); sub.className='letter-sub'; sub.textContent=subject;
  wrap.appendChild(sub);
  const p=document.createElement('div'); p.className='letter-body'; p.textContent=body;
  wrap.appendChild(p);
  const pid=Object.keys(Game.NPCS||{}).find(k=>Game.NPCS[k].name===from);
  const sig=document.createElement('div'); sig.className='letter-sig';
  if(pid&&SPR.portraits[pid]){
    const img=document.createElement('canvas'); img.width=24; img.height=24;
    img.getContext('2d').drawImage(SPR.portraits[pid],0,0);
    sig.appendChild(img);
  }
  const nm=document.createElement('span'); nm.textContent='— '+from;
  sig.appendChild(nm);
  wrap.appendChild(sig);
  document.getElementById('menu').classList.remove('hidden');
}
document.getElementById('menu').addEventListener('click',e=>{ if(e.target.id==='menu'){ if(window.modalAct){ window.modalAct(); } else closeMenu(); } });

// ---------- HUD ----------
function updateHUD(){
  const g=Game.G; if(!g)return;
  document.getElementById('hud-day').textContent=`${SEASONS[Game.season()]} ${((g.day-1)%7)+1}`;
  document.getElementById('hud-clock').textContent=Game.clock().label;
  document.getElementById('hud-coins').textContent=g.coins;
  const ef=document.getElementById('energy-fill');
  ef.style.width=g.energy+'%';
  ef.classList.toggle('low', g.energy<25);
}
document.getElementById('hud-journal').addEventListener('click',()=>{ if(!menuOpen()) Game.openJournal(); });
function updateBelt(){
  const g=Game.G; const belt=document.getElementById('toolbelt'); belt.innerHTML='';
  TOOLS.forEach((t,i)=>{
    const s=document.createElement('div'); s.className='tslot'+(i===g.tool?' active':'');
    const key=document.createElement('div'); key.className='key'; key.textContent=i+1; s.appendChild(key);
    if(t.id==='seeds'){
      const c=SPR.crop(CROPS.cloveroot,1); c.style.width='24px'; c.style.height='24px'; s.appendChild(c);
      const n=Object.values(g.seeds).reduce((a,b)=>a+b,0);
      const cnt=document.createElement('div'); cnt.className='count'; cnt.textContent=n; s.appendChild(cnt);
    } else {
      const c=SPR.icons[t.id]; c.style.width='28px'; c.style.height='28px'; s.appendChild(c);
      const _tier=(Game.G.toolTier||{})[t.id]||0;
      if(_tier>0){ const dot=document.createElement('div'); dot.className='tier'+(_tier>1?' silver':''); s.appendChild(dot); }
    }
    belt.appendChild(s);
  });
}

// ---------- dialogue ----------
function openDialogue(name, text, extraRows, portraitId){
  MENU_OPEN=true;
  const m=document.getElementById('menu');
  m.classList.toggle('table-visit', name==='the village table');
  const titleEl=document.getElementById('menu-title');
  titleEl.textContent='';
  if(portraitId&&SPR.portraits[portraitId]){
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:10px;justify-content:flex-start;';
    const img=document.createElement('canvas'); img.width=24; img.height=24;
    img.getContext('2d').drawImage(SPR.portraits[portraitId],0,0);
    img.style.cssText='width:40px;height:40px;image-rendering:pixelated;border-radius:8px;';
    const nm=document.createElement('span'); nm.textContent=name;
    row.appendChild(img); row.appendChild(nm);
    titleEl.appendChild(row);
  } else {
    titleEl.textContent=name;
  }
  const wrap=document.getElementById('menu-items'); wrap.innerHTML='';
  const p=document.createElement('div');
  if(name==='the village table')p.className='table-passage';
  else p.style.cssText='padding:8px 4px;font-size:14px;color:#4a3f2e;line-height:1.5;font-style:italic;';
  p.textContent='\u201C'+text+'\u201D';
  if(name==='the village table'){
    const voices=document.createElement('div');voices.className='table-voice';
    for(const id of ['mara','fern','bram']){
      const art=document.createElement('img');art.alt=Game.NPCS[id].name;
      art.src=SPR.portraits[id].toDataURL('image/png');voices.appendChild(art);
    }
    wrap.appendChild(voices);
  }
  wrap.appendChild(p);
  for(const r of (extraRows||[])){
    const d=document.createElement('div'); d.className='menu-row';
    d.innerHTML=`<div><div class="nm"></div><div class="ds"></div></div><div class="price"></div>`;
    if(r.icon){ const cv2=document.createElement('canvas'); cv2.width=r.icon.width; cv2.height=r.icon.height; cv2.getContext('2d').drawImage(r.icon,0,0); cv2.className='ic'; d.insertBefore(cv2, d.firstChild); }
    d.querySelector('.nm').textContent=r.label;
    d.querySelector('.ds').textContent=r.desc||'';
    d.querySelector('.price').textContent=r.price||'';
    d.addEventListener('click',()=>r.pick());
    wrap.appendChild(d);
  }
  const ok=document.createElement('div'); ok.className='menu-row';
  ok.innerHTML='<div class="nm">... </div>';
  ok.addEventListener('click',closeMenu);
  wrap.appendChild(ok);
  m.classList.remove('hidden');
}

// ---------- fishing timing game ----------
function openFishingGame(fish, done){
  MENU_OPEN=true;
  const m=document.getElementById('menu');
  document.getElementById('menu-title').textContent='a bite! keep the marker in the reeds';
  const wrap=document.getElementById('menu-items'); wrap.innerHTML='';
  const track=document.createElement('div');
  track.style.cssText='position:relative;height:34px;background:#e4d7bc;border-radius:8px;overflow:hidden;margin:6px 0;';
  const zone=document.createElement('div');
  const zw=Math.max(8, fish.zone*100);
  const zl=8+Math.random()*(84-zw);
  zone.style.cssText=`position:absolute;top:0;bottom:0;left:${zl}%;width:${zw}%;background:#7a9e5f;`;
  const mark=document.createElement('div');
  mark.style.cssText='position:absolute;top:-2px;bottom:-2px;width:3px;background:#4a3f2e;';
  track.appendChild(zone); track.appendChild(mark); wrap.appendChild(track);
  const btn=document.createElement('div'); btn.className='menu-row';
  btn.innerHTML='<div class="nm">reel! (E / tap / A)</div>';
  wrap.appendChild(btn);
  m.classList.remove('hidden');
  let t0=performance.now(), raf, finished=false;
  const period=900+Math.random()*500;
  (function anim(now){
    const t=((now-t0)%period)/period;
    const pos=t<0.5?t*2:2-t*2; // ping-pong 0..1
    mark.style.left=(pos*100)+'%';
    if(!finished) raf=requestAnimationFrame(anim);
  })(t0);
  function stop(){
    if(finished)return; finished=true;
    cancelAnimationFrame(raf);
    window.modalAct=null;
    const cur=parseFloat(mark.style.left);
    const landed=cur>=zl&&cur<=zl+zw;
    closeMenu(); done(landed);
  }
  btn.addEventListener('click',stop);
  track.addEventListener('click',stop); // tapping the bar itself reels on touch
  window.modalAct=stop; // touch A button + tap-outside route here while the game is open
  const keyH=(e)=>{ if(e.key==='e'||e.key==='E'||e.key===' '){ stop(); removeEventListener('keydown',keyH); } };
  addEventListener('keydown',keyH);
  Input.actEdge=false;
}

// ---------- sleep fade ----------
function fadeSleep(){
  if(Music.on) Music.retune(true);
  const cvEl=document.getElementById('game');
  cvEl.style.transition='filter 1.1s'; cvEl.style.filter='brightness(0.15)';
  setTimeout(()=>{ cvEl.style.filter=''; setTimeout(()=>{cvEl.style.transition='';},1200); }, 1150);
  updateHUD();
}

// ---------- boot ----------
const qs=new URLSearchParams(location.search);
function boot(){
  Render.init();
  makeSprites();
  initInput();
  const hasSave=Game.hasSave();
  if(hasSave) document.getElementById('btn-continue').classList.remove('hidden');
  if(matchMedia('(pointer:coarse)').matches) document.getElementById('title-hint').textContent='left thumb walks · A uses the tool · ↻ swaps it';
  if(qs.get('touch')) document.getElementById('touch-ui').style.display='block';
  document.getElementById('btn-new').addEventListener('click',()=>start(false));
  document.getElementById('btn-continue').addEventListener('click',()=>start(true));
  drawTitleArt();
  if(qs.get('autotest')){ start(false); runAutotest(); return; }
  if(!qs.get('shot')&&!qs.get('fps')) drawTitleArt();
  if(qs.get('fps')){
    start(false);
    // synchronous render-cost benchmark: avg ms per full frame over 300 frames
    const t0=performance.now();
    for(let i=0;i<300;i++) Render.draw(Game.G, i*16);
    const ms=(performance.now()-t0)/300;
    console.log('[FPS] draw-cost-ms', ms.toFixed(2), '=> headroom', (16.7/ms).toFixed(1)+'x at 60fps');
    window.__TEST_DONE=true;
  }
  if(qs.get('shot')){
    start(false);
    const g=Game.G;
    // demo scene: varied crops near the lane, some mature, morning light
    const layout=[['cloveroot',3],['sunbean',2],['duskberry',3],['embermelon',3],['cloveroot',1],['sunbean',3],
                  ['sunbean',1],['cloveroot',2],['embermelon',1],['duskberry',2],['cloveroot',3],['sunbean',2]];
    let i=0;
    for(const [id,stage] of layout){
      const x=20+(i%6), y=13+Math.floor(i/6); i++;
      g.grid[y*W+x]=i<6?T.SOILWET:T.SOIL;
      const days=CROPS[id].days;
      g.crops.set(y*W+x,{id, age:stage>=3?days:Math.max(0,Math.floor(days*stage/3)), stage, watered:i<6});
    }
    g.player.x=19*TILE; g.player.y=16.5*TILE; g.player.dir='right';
    g.minutes=qs.get('shot')==='night'?1250:(qs.get('shot')==='dusk'?1120:560);
    if(qs.get('shot')==='rain'){ g.weather='rain'; }
    if(qs.get('shot')==='trees'){ g.player.x=6*TILE; g.player.y=4.5*TILE; }
    if(qs.get('shot')==='village'){ g.player.x=40*TILE; g.player.y=8.5*TILE; g.player.dir='up'; }
    if(qs.get('shot')==='festival'){ g.day=7; g.minutes=1200; g.seasonCached=Game.season(); g.player.x=37*TILE; g.player.y=9.5*TILE; g.player.dir='right'; }
    if(qs.get('shot')==='cave'){
      g.player.x=45.5*TILE; g.player.y=13.5*TILE; g.player.dir='right';
      g.tool=TOOLS.findIndex(t=>t.id==='pick');
      Game.enterCave();
      const lvl=parseInt(qs.get('level')||'1',10);
      for(let l=1;l<lvl;l++) Game.descendCave();
      g.player.x=6.5*TILE; g.player.y=5.5*TILE; g.player.dir='up';
    }
    if(['notegate','notegatemenu','latefern','latefernmenu'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=15;g.minutes=690;g.seasonCached=Game.season();g.meadowLesson='';g.fieldPlan='';
      g.crops.clear();g.grid=makeWorld();g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(shot.startsWith('notegate')){g.player.x=21.5*TILE;g.player.y=10.5*TILE;g.player.dir='down';}
      else {g.player.x=11.5*TILE;g.player.y=17.5*TILE;g.player.dir='right';g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;}
      if(shot.endsWith('menu'))setTimeout(()=>Game.useTool(),300);
    }
    if(qs.get('shot')==='routefirst'){
      g.day=1; g.minutes=600; g.seasonCached=Game.season();
      g.player.x=9*TILE; g.player.y=9*TILE; g.player.dir='right';
      // Use the actual new-game crops, not the showcase fixture.
      g.crops.clear(); g.grid=makeWorld();
    }
    if(qs.get('shot')==='routehome'){
      g.day=3; g.minutes=640; g.seasonCached=Game.season();
      g.player.x=15.5*TILE; g.player.y=9*TILE; g.player.dir='right';
    }
    if(qs.get('shot')==='routefield'){
      g.day=3; g.minutes=755; g.seasonCached=Game.season();
      g.player.x=21*TILE; g.player.y=10*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.friendship.mara=0;g.seenEvents={};
      g.mara.x=20.5*TILE;g.mara.y=9.5*TILE;g.mara.tx=g.mara.x;g.mara.ty=g.mara.y;
    }
    if(qs.get('shot')==='routetalk'){
      g.day=3;g.minutes=755;g.seasonCached=Game.season();g.friendship.mara=0;g.seenEvents={};
      g.player.x=19.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.mara.x=20.5*TILE;g.mara.y=9.5*TILE;g.mara.tx=g.mara.x;g.mara.ty=g.mara.y;
      setTimeout(()=>Game.useTool(),300);
    }
    if(['roadchoice','roadflowers','roadwild','roadflowerswinter','roadflowersdialog'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='roadflowerswinter'?24:6;
      g.minutes=930;g.seasonCached=Game.season();g.gateWelcomeDay=3;
      g.roadChoice=shot==='roadwild'?'wild':shot==='roadchoice'?'':'flowers';
      g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(shot==='roadflowerswinter'){g.crops.clear();g.grid=makeWorld();}
      if(shot==='roadchoice'||shot==='roadflowersdialog')setTimeout(()=>Game.useTool(),300);
    }
    if(['pondlook','pondchoice','pondreeds','pondopen','pondwinter','pondafter','pondopenafter'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='pondwinter'?24:['pondafter','pondopenafter','pondreeds'].includes(shot)?7:6;g.minutes=930;g.seasonCached=Game.season();
      g.player.x=11.5*TILE;g.player.y=21.5*TILE;g.player.dir='down';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.bram.x=12*TILE;g.bram.y=23*TILE;g.bram.tx=g.bram.x;g.bram.ty=g.bram.y;
      g.stats.caught=shot==='pondlook'?0:1;g.pondChoice=['pondreeds','pondwinter','pondafter','pondopenafter'].includes(shot)?'reeds':shot==='pondopen'?'open':'';
      g.pondChoiceDay=g.pondChoice?(shot==='pondreeds'?6:['pondopenafter','pondafter','pondwinter'].includes(shot)?3:g.day):0;
      if(shot==='pondwinter'){g.crops.clear();g.grid=makeWorld();}
      if(shot==='pondchoice'||shot==='pondafter')setTimeout(()=>Game.readPondLookout(),300);
    }
    if(qs.get('shot')==='routecupmenu'){
      g.day=4;g.minutes=930;g.seasonCached=Game.season();g.gateWelcomeDay=3;
      g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      setTimeout(()=>Game.useTool(),300);
    }
    if(qs.get('shot')==='routecupwinter'){
      g.day=24;g.minutes=930;g.seasonCached=Game.season();g.gateWelcomeDay=3;
      g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.crops.clear();g.grid=makeWorld();
    }
    if(qs.get('shot')==='routefern'||qs.get('shot')==='routecup'){
      g.day=4;g.minutes=930;g.seasonCached=Game.season();g.gateWelcomeDay=3;
      g.player.x=qs.get('shot')==='routecup'?27.5*TILE:26.5*TILE;
      g.player.y=9.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.fern.x=27.5*TILE;g.fern.y=9.5*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;
      if(qs.get('shot')==='routefern')setTimeout(()=>Game.talkTo('fern'),300);
    }
    if(qs.get('shot')==='routewinter'){
      g.day=24; g.minutes=690; g.seasonCached=Game.season();
      g.player.x=21*TILE; g.player.y=10*TILE; g.player.dir='up';
      g.crops.clear();g.grid=makeWorld();
    }
    if(qs.get('shot')==='cedarwalk'||qs.get('shot')==='cedarwalkmenu'){
      g.day=3; g.minutes=690; g.seasonCached=Game.season();
      g.player.x=27.5*TILE; g.player.y=8.5*TILE; g.player.dir='right'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(qs.get('shot')==='cedarwalkmenu') setTimeout(()=>Game.useTool(),300);
    }
    if(['lessonstart','lessonshade','lessonsky','lessonshadeafter','lessonskyafter','lessontalk','lessonreturn'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='lessonreturn'||shot.includes('after')?4:2;
      g.minutes=690;g.seasonCached=Game.season();g.meadowLesson=shot.includes('shade')?'shade':shot.includes('sky')||shot==='lessonreturn'?'sky':'';
      g.meadowLessonDay=g.meadowLesson?2:0;g.meadowLessonHeard=false;
      g.player.x=11.5*TILE;g.player.y=17.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;g.fern.path=[];g.fern.pathGoal='';
      if(shot==='lessontalk'||shot==='lessonreturn')setTimeout(()=>Game.useTool(),300);
    }
    if(['planmenu','planwalk','plannest','planwalkafter','plannestafter','planwinter','planreturn'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='planwinter'?24:shot.includes('after')||shot==='planreturn'?5:4;
      g.minutes=690;g.seasonCached=Game.season();g.meadowLesson='sky';g.meadowLessonDay=2;g.meadowLessonHeard=true;
      g.fieldPlan=shot.includes('walk')?'walk':shot.includes('nest')||shot==='planwinter'||shot==='planreturn'?'nest':'';
      g.fieldPlanDay=g.fieldPlan?4:0;g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.fern.x=20*TILE;g.fern.y=30*TILE;
      if(shot==='planwinter'){g.crops.clear();g.grid=makeWorld();}
      if(shot==='planmenu'||shot==='planreturn')setTimeout(()=>Game.useTool(),300);
    }
    if(['gathersummer','gatherautumn','gatherwinter','gathernest','gathermenu'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='gatherautumn'?17:shot==='gatherwinter'?23:9;
      g.minutes=690;g.seasonCached=Game.season();g.meadowLesson='sky';g.meadowLessonDay=2;g.meadowLessonHeard=true;
      g.fieldPlan=shot==='gathernest'?'nest':'walk';g.fieldPlanDay=4;g.fieldPlanHeard=true;
      g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.fern.x=11.5*TILE;g.fern.y=17.5*TILE;g.mara.x=14.5*TILE;g.mara.y=17.5*TILE;
      if(shot==='gatherwinter'){g.crops.clear();g.grid=makeWorld();}
      if(shot==='gathermenu')setTimeout(()=>Game.useTool(),300);
    }
    if(['seasonwalk','seasonnest','seasonmenu','seasonautumn','seasonwinter'].includes(qs.get('shot'))){
      const shot=qs.get('shot');g.day=shot==='seasonautumn'?19:shot==='seasonwinter'?26:12;
      g.minutes=720;g.seasonCached=Game.season();g.fieldPlan=shot==='seasonnest'?'nest':'walk';g.fieldPlanDay=4;
      g.meadowLesson='sky';g.meadowLessonDay=2;g.meadowLessonHeard=true;g.fieldPlanHeard=true;
      g.player.x=15.5*TILE;g.player.y=19.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.mara.x=16.5*TILE;g.mara.y=19.5*TILE;g.mara.tx=g.mara.x;g.mara.ty=g.mara.y;
      g.fern.x=13.5*TILE;g.fern.y=19.5*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;
      if(shot==='seasonwinter'){g.crops.clear();g.grid=makeWorld();}
      if(shot==='seasonmenu')setTimeout(()=>Game.useTool(),300);
    }
    if(qs.get('shot')==='wellhour'){
      g.day=3; g.minutes=18.6*60; // evening social hour, not festival
      g.mara.x=39.5*TILE; g.mara.y=9.3*TILE;
      g.bram.x=38.6*TILE; g.bram.y=9.8*TILE;
      g.fern.x=40.2*TILE; g.fern.y=10.1*TILE;
      g.piet.x=39.9*TILE; g.piet.y=8.9*TILE;
      g.player.x=37.5*TILE; g.player.y=10.5*TILE; g.player.dir='right';
    }
    if(qs.get('shot')==='caveent'){
      g.player.x=44.5*TILE; g.player.y=13.5*TILE; g.player.dir='right';
    }
    if(qs.get('shot')==='interior'){
      g.player.x=8.5*TILE; g.player.y=8.5*TILE; g.player.dir='up';
      g.minutes=qs.get('night')?1240:690;
      Game.enterHouse();
    }
    if(qs.get('shot')==='dialog'){
      g.player.x=14.5*TILE; g.player.y=10*TILE; g.player.dir='right';
      g.produce.sunbean=1; g.friendship.mara=6;
      setTimeout(()=>Game.talkTo('mara'), 600);
    }
    if(qs.get('shot')==='mail'){ g.player.x=9.5*TILE; g.player.y=8.5*TILE; g.player.dir='right';
      const wl=Game.LETTERS.find(L=>L.id==='welcome'); g.letters.push({id:'welcome',from:wl.from,subject:wl.subject,body:wl.body,read:false});
      setTimeout(()=>openLetter(wl.from,wl.subject,wl.body),300); }
    const sp=qs.get('season'); if(sp!==null&&sp!==''){ g.day=+sp*7+1; g.seasonCached=Game.season(); }
    if(qs.get('shot')==='villagers'){
      g.player.x=24.5*TILE; g.player.y=17.5*TILE; g.player.dir='up';
      Game.updateNpcs=()=>{};
      const V=[['mara',21,13,'down'],['bram',24,13,'up'],['fern',27,13,'left'],['piet',30,13,'right']];
      for(const [id,vx,vy,vd] of V){ const n=g[id]; n.x=vx*TILE; n.y=vy*TILE; n.dir=vd; n.moving=true; n.flip=vd==='left'; }
    }
    if(qs.get('shot')==='stand'){ g.player.x=14.5*TILE; g.player.y=14.5*TILE; g.player.dir='up'; }
    if(qs.get('shot')==='shop'){ setTimeout(()=>Game.openShop(),300); }
    if(qs.get('copper')){ g.toolTier={can:1,hoe:1,pick:1}; setTimeout(()=>updateBelt(),200); }
    if(qs.get('iron')){ g.toolTier={can:2,hoe:2,pick:2}; setTimeout(()=>updateBelt(),200); }
    if(qs.get('shot')==='heart'){ g.player.x=9.5*TILE; g.player.y=8.5*TILE; g.player.dir='right';
      g.friendship.bram=10; setTimeout(()=>Game.talkTo('bram'),300); }
    if(qs.get('shot')==='crate'){ g.produce={sunbean:3,duskcarp:1,morel:2,emberquartz:1}; setTimeout(()=>Game.openCrateMenu(),300); }
    if(qs.get('shot')==='bed'){ g.player.x=8.5*TILE; g.player.y=8.5*TILE; Game.enterHouse(); g.player.x=2.5*TILE; g.player.y=2.5*TILE; g.player.dir='up'; }
    if(qs.get('shot')==='coop'){ Game.placeCoop(); g.eggs[6*W+14]=true; g.eggs[7*W+15]=true;
      g.player.x=14.5*TILE; g.player.y=8.2*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand'); }
    if(qs.get('shot')==='care'||qs.get('shot')==='ledger'){ Game.placeCoop(); Game.placeBarn(); g.animalCare={hen0:6,hen1:6,cow:6};
      g.hens[0].pettedDay=g.day; g.hens[1].pettedDay=g.day; g.cow.pettedDay=g.day;
      g.eggs[6*W+14]='sunegg'; g.eggs[7*W+15]='sunegg'; g.produce.creammilk=1; g.produce.sunegg=1;
      g.player.x=16.5*TILE; g.player.y=8.8*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(qs.get('shot')==='ledger') setTimeout(()=>Game.openPenLedger(),300);
      else if(qs.get('caremenu')!=='0') setTimeout(()=>Game.openCrateMenu(),300); }
    if(qs.get('shot')==='feed'){ Game.placeCoop(); Game.placeBarn(); g.animalCare={hen0:2,hen1:1,cow:3};
      g.hens[0].pettedDay=g.day; g.hens[1].pettedDay=0; g.seeds.cloveroot=3;
      g.player.x=14.5*TILE; g.player.y=7*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      setTimeout(()=>Game.openPenLedger(),300); }
    if(qs.get('shot')==='barn'){ Game.placeCoop(); Game.placeBarn(); g.eggs[6*W+14]=true;
      g.player.x=17.5*TILE; g.player.y=8.4*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand'); }
    if(qs.get('shot')==='cave5'){ g.maxCave=5; Game.enterCave(); closeMenu(); Game.goToCaveLevel(5);
      g.player.x=6.5*TILE; g.player.y=5.5*TILE; }
    if(qs.get('shot')==='winterpond'){ g.day=24; g.minutes=600; g.seasonCached=Game.season();
      g.player.x=10.5*TILE; g.player.y=20.5*TILE; g.player.dir='down'; }
    if(qs.get('shot')==='winter'){ g.day=24; g.minutes=600; g.seasonCached=Game.season();
      g.forage.clear(); Game.spawnForage(8); g.seeds={frostroot:3};
      g.player.x=25*TILE; g.player.y=20*TILE; g.player.dir='down'; }
    if(qs.get('shot')==='solstice'){ g.day=28; g.minutes=1190; g.seasonCached=Game.season(); g.weather='sun';
      g.player.x=36.5*TILE; g.player.y=15*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      const offs={mara:[-2,-0.4],bram:[1.9,-0.3],fern:[-1.6,1.1],piet:[1.5,1.2]};
      for(const [id,[ox,oy]] of Object.entries(offs)){ g[id].x=(36.5+ox)*TILE; g[id].y=(10+oy)*TILE; g[id].tx=g[id].x; g[id].ty=g[id].y; }
    }
    if(qs.get('shot')==='solsticemenu'||qs.get('shot')==='solsticechoice'){ g.day=28; g.minutes=1190; g.seasonCached=Game.season(); g.weather='sun';
      g.player.x=36.5*TILE; g.player.y=12*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(qs.get('shot')==='solsticechoice') g.produce={wintermint:1,moondrop:1};
      setTimeout(()=>Game.openBonfire(),300); }
    if(qs.get('shot')==='fair'){ g.day=21; g.minutes=720; g.seasonCached=Game.season();
      g.produce={sunbean:2,duskberry:1,embermelon:1};
      g.player.x=37.5*TILE; g.player.y=10.3*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand'); }
    if(qs.get('shot')==='fairmenu'){ g.day=21; g.minutes=720; g.seasonCached=Game.season();
      g.produce={sunbean:2,duskberry:1,embermelon:1,egg:1};
      g.player.x=37.5*TILE; g.player.y=10.3*TILE; g.player.dir='up';
      setTimeout(()=>Game.openFairMenu(),300); }
    if(qs.get('shot')==='keepsakemint'||qs.get('shot')==='keepsakemoon'||qs.get('shot')==='keepsakeview'||qs.get('shot')==='keepsakeviewmint'){
      g.day=29; g.minutes=600; g.seasonCached=Game.season();
      g.solsticeKeepsakes=[{day:28,id:['keepsakemint','keepsakeviewmint'].includes(qs.get('shot'))?'wintermint':'moondrop'}];
      Game.enterHouse(); g.player.x=9.5*TILE; g.player.y=3.5*TILE; g.player.dir='up';
      if(!qs.get('shot').startsWith('keepsakeview')) setTimeout(()=>Game.useTool(),300);
    }
    if(qs.get('shot')==='kitchen'){ g.produce={egg:2,milk:1,cloveroot:1,sunbean:1,dace:1,morel:1,duskberry:1};
      Game.enterHouse(); g.player.x=7.5*TILE; g.player.y=2.5*TILE; g.player.dir='up';
      setTimeout(()=>Game.openKitchen(),300); }
    if(qs.get('shot')==='journal'){ g.skillXp={farm:14,fish:26,mine:6,forage:3};
      g.discovered={cloveroot:true,sunbean:true,minnow:true,duskcarp:true,morel:true,dandelion:true,emberquartz:true};
      setTimeout(()=>Game.openJournal(),300); }
    if(qs.get('shot')==='hintcrate'){ g.player.x=11.5*TILE; g.player.y=7.5*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand'); }
    if(qs.get('shot')==='pond'){
      g.tool=TOOLS.findIndex(t=>t.id==='rod');
      g.player.x=10.5*TILE; g.player.y=23.5*TILE; g.player.dir='down';
      Game.castRod({x:10,y:24});
      g.fishing.state='bite'; g.fishing.t=99;
      g.bram.x=12.5*TILE; g.bram.y=22.5*TILE; g.bram.tx=g.bram.x; g.bram.ty=g.bram.y;
    }
    updateHUD();
  }
  // idle title backdrop: render a fresh world behind the title
  if(!qs.get('shot')) Game.newGame();
  requestAnimationFrame(loop);
}
function drawTitleArt(){
  const cv=document.getElementById('title-art'); if(!cv)return;
  const x=cv.getContext('2d'), W2=120, H2=68;
  // dawn sky bands
  const bands=['#f6d9b0','#f2cba0','#e8bd9a','#d8b394','#c8ae90'];
  bands.forEach((b,i)=>{ x.fillStyle=b; x.fillRect(0,i*8,W2,8); });
  // low sun + glow
  x.fillStyle='#f4e2b8'; x.beginPath(); x.arc(88,26,7,0,7); x.fill();
  x.fillStyle='rgba(244,226,184,0.35)'; x.beginPath(); x.arc(88,26,11,0,7); x.fill();
  // clouds
  x.fillStyle='rgba(247,239,224,0.85)';
  x.beginPath(); x.ellipse(28,14,9,3.5,0,0,7); x.fill();
  x.beginPath(); x.ellipse(58,9,7,2.8,0,0,7); x.fill();
  // far tree line
  x.fillStyle='#7a9a68';
  for(let i=0;i<14;i++){ const bx=i*9+(i%2)*3; x.beginPath(); x.arc(bx,40,6+(i%3),0,7); x.fill(); }
  // ground
  x.fillStyle='#8fb36b'; x.fillRect(0,42,W2,H2-42);
  x.fillStyle='#87a863'; x.fillRect(0,42,W2,3);
  // pond bottom-left with glint
  x.fillStyle='#7fb6c9'; x.beginPath(); x.ellipse(14,60,13,7,0,0,7); x.fill();
  x.fillStyle='#9ccfda'; x.fillRect(6,58,4,1); x.fillRect(14,62,5,1);
  // field rows bottom-right with crops
  for(let r2=0;r2<3;r2++){
    x.fillStyle='#9c7454'; x.fillRect(74+r2*2,50+r2*6,38,4);
    for(let c2=0;c2<6;c2++){
      x.fillStyle='#5f7a4a'; x.fillRect(78+r2*2+c2*6,48+r2*6,2,4);
      x.fillStyle='#e0d389'; x.fillRect(78+r2*2+c2*6,47+r2*6,2,2);
    }
  }
  // farmhouse from the game's own sprite
  if(SPR.house) x.drawImage(SPR.house, 26, 26, 64, 48);
  // blossom tree right
  if(SPR.treesB&&SPR.treesB[0]) x.drawImage(SPR.treesB[0], 96, 22, 40, 44);
  // cat on the lane
  if(SPR.cat) x.drawImage(SPR.cat, 58, 50, 12, 12);
  // dirt lane
  x.fillStyle='#c9b184'; x.fillRect(0,52,30,5);
}

function start(useSave){
  if(useSave){ if(!Game.load()) Game.newGame(); } else Game.newGame();
  document.getElementById('title-screen').classList.add('hidden');
  updateHUD(); updateBelt();
  ac();
  toast(useSave?'welcome back to the valley':'day one. the valley is yours.');
}
let last=0;
function loop(now){
  const dt=Math.min(100, now-last||16); last=now;
  if(!document.getElementById('title-screen').classList.contains('hidden')){
    // title idle: slow clock, no input
    Render.draw(Game.G, now);
  } else {
    Game.update(dt, now);
    Game.G.seasonCached=Game.season();
    Render.draw(Game.G, now);
    if((now|0)%3===0){ updateHUD(); }
  }
  requestAnimationFrame(loop);
}
addEventListener('pagehide',()=>{ if(Game.G && document.getElementById('title-screen').classList.contains('hidden')) Game.save(); });

// ---------- autotest: deterministic scripted run ----------
async function runAutotest(){
  let g=Game.G; const log=(...a)=>console.log('[AUTOTEST]',...a);
  const fails=[];
  const step=(fn,name)=>{ try{ fn(); log('ok:',name); }catch(e){ fails.push(name+': '+e.message); console.error('[AUTOTEST-FAIL]',name,e); } };
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  // place player next to starter soil patch (20..25, 13..16)
  g.player.x=19.5*TILE; g.player.y=13.5*TILE; g.player.dir='right';
  step(()=>{
    for(const [w,h,want] of [[390,844,3],[360,640,3],[520,900,3],[320,568,2],[844,390,2],[390,600,2]]){
      if(Render.scaleForViewport(w,h)!==want)throw new Error('camera scale '+w+'x'+h);
    }
    if(Render.scaleForViewport(390,844,false)!==2)throw new Error('room camera fallback');
    if(Render.canvas.width!==Math.ceil(innerWidth/Render.scale)||Render.canvas.height!==Math.ceil(innerHeight/Render.scale))throw new Error('camera buffer mismatch');
  },'portrait camera scale and short-screen fallback');
  step(()=>{
    for(const id of ['mara','bram','fern','piet']) if(!SPR.portraits[id]) throw new Error('missing portrait '+id);
    if(!document.getElementById('title-art')) throw new Error('no title-art canvas');
    if(!SPR.letterhead||!SPR.letterEnv) throw new Error('letter art missing');
    if(!SPR.grassBySeason||SPR.grassBySeason.length!==4) throw new Error('seasonal grass missing');
    // character craft (v2.14): player sprite carries multiple skin/shade tones (brim shadow + form shading)
    { const c=SPR.player.down[0], x=c.getContext('2d');
      const d=x.getImageData(0,0,c.width,c.height).data; const tones=new Set();
      for(let o=0;o<d.length;o+=4){ if(d[o+3]>40) tones.add((d[o]>>4)+','+(d[o+1]>>4)+','+(d[o+2]>>4)); }
      if(tones.size<12) throw new Error('character shading flat: '+tones.size+' tones'); }
    for(const id of ['mara','bram','fern','piet']){
      const vs=SPR.villagers[id];
      if(!vs||!vs.down||!vs.up||!vs.side) throw new Error('villager views missing '+id);
      for(const v of ['down','up','side']) if(vs[v].length!==2||vs[v][0].width!==18) throw new Error('villager frames bad '+id+'.'+v);
    }
    for(const gs of SPR.grassBySeason) if(gs.length!==5) throw new Error('grass set size '+gs.length);
    const w=SPR.grassBySeason[3][0].getContext('2d').getImageData(8,8,1,1).data;
    const s0=SPR.grassBySeason[0][0].getContext('2d').getImageData(8,8,1,1).data;
    if(w[0]===s0[0]&&w[1]===s0[1]&&w[2]===s0[2]) throw new Error('winter grass identical to spring');
  },'art assets (portraits + title + seasonal grass)');
  step(()=>{ // hoe new soil at (26,13)
    g.player.dir='right';
    const before=Game.tileAt(26,13);
    if(before!==T.GRASS) throw new Error('expected grass, got '+before);
    // face tile manually: emulate tool on that tile
    Game.G.grid[13*W+26]=T.GRASS;
  },'sanity grass');
  // direct API-level test of the loop
  step(()=>{
    for(let i=0;i<5;i++){ Game.G.grid[(13)*W+(20+i)]=T.SOIL; }
    for(let i=0;i<5;i++){ Game.plantSeed(20+i,13,'cloveroot'); }
    if(g.crops.size!==5) throw new Error('planted '+g.crops.size);
  },'plant 5 cloveroot');
  step(()=>{
    for(const [k,c] of g.crops){ c.watered=true; g.grid[k]=T.SOILWET; }
    Game.sleep();
    let grown=0; for(const [k,c] of g.crops) if(c.age===1) grown++;
    if(grown!==5) throw new Error('grown '+grown);
    if(g.day!==2) throw new Error('day '+g.day);
  },'sleep grows watered crops');
  step(()=>{
    for(let d=0;d<2;d++){ for(const [k,c] of g.crops){ c.watered=true; } Game.sleep(); }
    let mature=0; for(const [k,c] of g.crops) if(c.stage>=3) mature++;
    if(mature!==5) throw new Error('mature '+mature);
  },'matures in 3 days');
  step(()=>{
    const c0=Game.G.crops;
    const keys=[...c0.keys()];
    for(const k of keys){ const x=k%W,y=Math.floor(k/W); Game.harvest(x,y,c0.get(k)); }
    if(g.produce.cloveroot!==5) throw new Error('produce '+g.produce.cloveroot);
  },'harvest 6');
  step(()=>{
    const coinsBefore=g.coins;
    // ship all
    for(const [id,n] of Object.entries(g.produce)){ if(n>0){ g.pendingSale+=CROPS[id].sell*n; g.produce[id]=0; } }
    Game.sleep();
    if(g.coins!==coinsBefore+5*CROPS.cloveroot.sell) throw new Error(`coins ${g.coins} != ${coinsBefore+5*CROPS.cloveroot.sell}`);
    log('economy: +190g across the night sale');
  },'shipping pays at dawn');
  step(()=>{
    Game.save(); if(!Game.hasSave()) throw new Error('no save');
    Game.load(); if(!Game.G||Game.G.day<1) throw new Error('load broken');
  },'save/load roundtrip');
  step(()=>{ // collision sanity
    if(Game.walkable(10.5*TILE, 27.5*TILE)) throw new Error('walked into pond');
    if(!Game.walkable(9*TILE, 9*TILE)) throw new Error('blocked on open grass');
  },'collision');
  step(()=>{ // forage: spawns at dawn, pickup pays via crate math
    g=Game.G; // refresh after save/load roundtrip
    Game.sleep();
    if(g.forage.size<2) throw new Error('forage '+g.forage.size);
    const [k,fg]=[...g.forage.entries()][0];
    g.produce[fg.id]=1;
    g.pendingSale+=ITEMS[fg.id].sell; g.produce[fg.id]=0;
    const c0=g.coins; Game.sleep();
    if(g.coins!==c0+ITEMS[fg.id].sell) throw new Error('forage sale failed');
  },'forage spawn + sale');
  step(()=>{ // fishing: cast on water, bite timeout escapes
    g.player.x=10.5*TILE; g.player.y=23.5*TILE; g.player.dir='down';
    Game.castRod({x:10,y:24});
    if(!g.fishing) throw new Error('no cast');
    if(!FISH[g.fishing.fish.id]) throw new Error('bad fish roll');
    g.fishing.state='bite'; g.fishing.t=0.01;
    Game.updateFishing(2000);
    if(g.fishing) throw new Error('should have escaped');
  },'fishing state machine');
  step(()=>{ // v2.15 regression: minigame freezes the backend timer; modal resolves via modalAct
    g=Game.G;
    g.fishing={x:10,y:24,state:'bite',t:2.6,fish:FISH.minnow};
    Game.reelIn();
    if(!menuOpen()) throw new Error('minigame did not open');
    if(g.fishing.state!=='minigame') throw new Error('state not frozen: '+g.fishing.state);
    Game.updateFishing(9000); // must NOT time out while the modal is open
    if(!g.fishing) throw new Error('backend timer killed the fish during the minigame');
    if(!window.modalAct) throw new Error('modalAct not registered');
    window.modalAct(); // touch A / tap-outside path
    if(g.fishing) throw new Error('fishing not cleared after stop');
    if(menuOpen()) throw new Error('menu stuck open after stop');
  },'fishing minigame freeze + resolve');
  step(()=>{ // v2.15 regression: crate row DOM click ships produce, dawn sale pays
    g=Game.G;
    g.produce={cloveroot:2}; g.pendingSale=0;
    const c0=g.coins;
    Game.openCrateMenu();
    const rows=document.querySelectorAll('#menu-items .menu-row');
    if(!rows.length) throw new Error('crate rows missing');
    rows[0].dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const sp=Game.sellPrice('cloveroot');
    if(g.pendingSale!==sp*2) throw new Error('crate pick: '+g.pendingSale+' vs '+sp*2);
    Game.sleep();
    if(g.coins!==c0+sp*2) throw new Error('dawn sale after crate: '+g.coins);
  },'crate DOM sell flow');
  step(()=>{ // v2.16: skills xp, level thresholds, sell-price perk, discovery, journal UI
    g=Game.G;
    if(Game.skillLevel('farm')!==1) throw new Error('farm level after 5 harvests: '+Game.skillLevel('farm')); // 5 harvests x 2xp = 10
    if(!g.discovered.cloveroot) throw new Error('harvest did not journal cloveroot');
    const lv0=Game.skillLevel('fish');
    if(Game.sellPrice('minnow')!==Math.round(FISH.minnow.sell*(1+0.05*lv0))) throw new Error('sellPrice math');
    Game.addXP('fish',3); Game.addXP('fish',3); Game.addXP('fish',4);
    if(Game.skillLevel('fish')!==lv0+1) throw new Error('fish level did not rise: '+Game.skillLevel('fish'));
    if(Game.sellPrice('minnow')!==Math.round(FISH.minnow.sell*(1+0.05*(lv0+1)))) throw new Error('fish perk');
    if(Game.sellPrice('cloveroot')!==Math.round(CROPS.cloveroot.sell*(1+0.05*Game.skillLevel('farm')))) throw new Error('cross-category leak');
    Game.discover('moondrop');
    if(!g.discovered.moondrop) throw new Error('discover flag');
    const n0=Object.keys(g.discovered).length; Game.discover('moondrop');
    if(Object.keys(g.discovered).length!==n0) throw new Error('double discover fired');
    Game.openJournal();
    if(!menuOpen()) throw new Error('journal did not open');
    const jr=document.querySelectorAll('#menu-items .menu-row').length;
    if(jr!==30) throw new Error('journal rows '+jr+' != 30');
    closeMenu(); if(menuOpen()) throw new Error('journal stuck open');
  },'skills + valley journal');
  step(()=>{ // v2.17: copper tools - purchase, wide-row watering, pick damage, persistence
    g=Game.G;
    g.coins=2000;
    Game.openShop();
    const rows=document.querySelectorAll('#menu-items .menu-row');
    const canRow=[...rows].find(r=>r.textContent.includes('Copper watering can'));
    if(!canRow) throw new Error('no copper can row');
    canRow.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(g.toolTier.can!==1) throw new Error('can tier '+g.toolTier.can);
    if(g.coins!==1400) throw new Error('coins '+g.coins);
    closeMenu();
    // wide-row watering: three crops in a horizontal row, player faces down at the middle
    for(let dx=-1;dx<=1;dx++){ const k=(14+0)*W+(20+dx); g.grid[k]=T.SOIL; g.crops.set(k,{id:'cloveroot',age:1,stage:1,watered:false}); }
    g.player.x=20*TILE+8; g.player.y=13*TILE+8; g.player.dir='down';
    g.tool=TOOLS.findIndex(t=>t.id==='can');
    const e0=g.energy;
    Game.useTool();
    for(let dx=-1;dx<=1;dx++){ const c=g.crops.get(14*W+20+dx); if(!c||!c.watered) throw new Error('row tile '+(20+dx)+' not watered'); }
    if(e0-g.energy!==2) throw new Error('wide water energy '+(e0-g.energy));
    // copper pick: 2 damage per swing
    g.toolTier.pick=1;
    g.caveNodes[3]=[{x:2,y:2,type:'moondrop',hp:3}]; g.caveLevel=3; g.inCave=true;
    const n=g.caveNodes[3][0];
    g.player.x=2*TILE+8; g.player.y=3*TILE+8; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='pick');
    Game.useTool();
    if(n.hp!==1) throw new Error('copper pick damage, hp '+n.hp);
    g.inCave=false; g.caveLevel=1; g.tool=0;
    // persistence
    Game.save(); Game.load(); g=Game.G;
    if(g.toolTier.can!==1||g.toolTier.pick!==1) throw new Error('toolTier not persisted');
    // restore shared state so later steps see a clean game
    g.toolTier={can:0,hoe:0,pick:0};
    for(let dx=-1;dx<=1;dx++){ const k=14*W+20+dx; g.crops.delete(k); g.grid[k]=T.GRASS; }
    delete g.caveNodes[3]; g.coins=120;
  },'copper tools');
  step(()=>{ // v2.18: iron tiers + heart events
    g=Game.G; g.coins=3000; g.toolTier.can=1; // copper owned -> iron is next
    Game.openShop();
    const rows=[...document.querySelectorAll('#menu-items .menu-row')];
    const ironCan=rows.find(r=>r.textContent.includes('Iron watering can'));
    if(!ironCan) throw new Error('no iron can row (copper should be owned from prior step?)');
    ironCan.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(g.toolTier.can!==2) throw new Error('can tier '+g.toolTier.can);
    if(g.coins!==1500) throw new Error('coins '+g.coins);
    closeMenu();
    // iron can waters a row of 5 for 3 energy
    for(let dx=-2;dx<=2;dx++){ const k=14*W+20+dx; g.grid[k]=T.SOIL; g.crops.set(k,{id:'cloveroot',age:1,stage:1,watered:false}); }
    g.player.x=20*TILE+8; g.player.y=13*TILE+8; g.player.dir='down';
    g.tool=TOOLS.findIndex(t=>t.id==='can');
    const e1=g.energy;
    Game.useTool();
    for(let dx=-2;dx<=2;dx++){ const c=g.crops.get(14*W+20+dx); if(!c||!c.watered) throw new Error('iron row tile '+(20+dx)); }
    if(e1-g.energy!==3) throw new Error('iron water energy '+(e1-g.energy));
    g.toolTier.pick=2; g.inCave=true; g.caveLevel=3;
    g.caveNodes[3]=[{x:2,y:2,type:'moondrop',hp:3}];
    g.player.x=2*TILE+8; g.player.y=3*TILE+8; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='pick');
    Game.useTool();
    if(g.caveNodes[3].length!==0) throw new Error('iron pick did not one-shot a 3hp node');
    g.inCave=false; g.caveLevel=1; g.tool=0;
    // heart events: bram 5-heart scene grants the lure, then normal dialogue returns
    g.friendship.bram=10; // 5 hearts -> both scenes due in order
    const walkScene=()=>{ for(let i=0;i<8&&menuOpen();i++){ const r=document.querySelector('#menu-items .menu-row'); if(r) r.dispatchEvent(new MouseEvent('click',{bubbles:true})); else break; } };
    Game.talkTo('bram'); // 2-heart scene first
    if(!menuOpen()) throw new Error('2-heart scene did not open');
    walkScene();
    if(menuOpen()) throw new Error('2-heart scene stuck open');
    if(!g.seenEvents['bram:2']) throw new Error('2-heart scene not marked seen');
    Game.talkTo('bram'); // 5-heart scene
    if(!menuOpen()) throw new Error('5-heart scene did not open');
    walkScene();
    if(menuOpen()) throw new Error('5-heart scene stuck open');
    if(!g.perks.lure) throw new Error('lure not granted');
    if(!g.seenEvents['bram:5']) throw new Error('scene not marked seen');
    // lure lengthens the bite window
    g.fishing={x:10,y:24,state:'waiting',t:0.01,fish:FISH.minnow};
    Game.updateFishing(2000);
    if(!g.fishing||Math.abs(g.fishing.t-3.0)>0.01) throw new Error('lure bite window '+(g.fishing&&g.fishing.t));
    g.fishing=null;
    // piet 5-heart scene grants the sturdy crate (+5% dawn sales)
    const before=Game.sellPrice('cloveroot');
    g.friendship.piet=10;
    Game.talkTo('piet'); walkScene(); // 2-heart scene
    Game.talkTo('piet'); walkScene(); // 5-heart scene
    if(!g.perks.sturdyCrate) throw new Error('sturdy crate not granted');
    const after=Game.sellPrice('cloveroot');
    if(after!==Math.round(48*(1+0.05*Game.skillLevel('farm'))*1.05)) throw new Error('sturdy price '+before+' -> '+after);
    // bram talks normally again
    Game.talkTo('bram');
    if(!menuOpen()) throw new Error('normal talk did not open');
    closeMenu();
    // persistence
    Game.save(); Game.load(); g=Game.G;
    if(!g.perks.lure||!g.perks.sturdyCrate||!g.seenEvents['bram:5']) throw new Error('heart state not persisted');
    // restore shared state
    g.toolTier={can:0,hoe:0,pick:0}; g.perks={lure:false,sturdyCrate:false};
    g.friendship.bram=0; g.friendship.piet=0; g.seenEvents={};
    for(let dx=-2;dx<=2;dx++){ g.crops.delete(14*W+20+dx); g.grid[14*W+20+dx]=T.GRASS; }
    delete g.caveNodes[3]; g.coins=120;
  },'iron tools + heart events');
  step(()=>{ // v2.19: coop - commission, dawn eggs, pickup, persistence
    g=Game.G; g.coins=2500;
    Game.talkTo('piet');
    const rows=[...document.querySelectorAll('#menu-items .menu-row')];
    const crow=rows.find(r=>r.textContent.includes('commission a coop'));
    if(!crow) throw new Error('no commission row');
    crow.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(!g.coop) throw new Error('coop not placed');
    if(g.coins!==500) throw new Error('coins '+g.coins);
    if(g.grid[4*W+13]!==T.COOP) throw new Error('coop tiles not set');
    if(g.hens.length!==2) throw new Error('hens '+g.hens.length);
    if(Game.walkable(13.5*TILE,4.5*TILE)) throw new Error('coop not solid');
    Game.sleep(); g=Game.G;
    if(Object.keys(g.eggs).length<1) throw new Error('no eggs at dawn');
    // pickup: face an egg tile
    const ek=+Object.keys(g.eggs)[0], ex=ek%W, ey=Math.floor(ek/W);
    g.player.x=ex*TILE+8; g.player.y=(ey+1)*TILE+8; g.player.dir='up';
    g.tool=TOOLS.findIndex(t=>t.id==='hand');
    const hint=Game.interactHint();
    if(hint!=='gather egg') throw new Error('egg hint: '+hint);
    Game.useTool();
    if((g.produce.egg||0)!==1) throw new Error('egg not gathered');
    if(ITEMS.egg.sell!==25) throw new Error('egg price');
    // persistence incl. tiles
    Game.save(); Game.load(); g=Game.G;
    if(!g.coop||g.grid[4*W+13]!==T.COOP) throw new Error('coop not persisted');
    // restore shared state
    g.coop=false; g.eggs={}; g.hens=[];
    g.grid[4*W+13]=T.GRASS; g.grid[4*W+14]=T.GRASS; g.grid[5*W+13]=T.GRASS; g.grid[5*W+14]=T.GRASS;
    delete g.produce.egg; g.coins=120;
  },'coop + hens');
  step(()=>{ // v2.20: barn - commission, cow, milk once a day, persistence
    g=Game.G; g.coins=5000;
    Game.talkTo('piet');
    const rows=[...document.querySelectorAll('#menu-items .menu-row')];
    const brow=rows.find(r=>r.textContent.includes('commission a barn'));
    if(!brow) throw new Error('no barn row');
    brow.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(!g.barn) throw new Error('barn not placed');
    if(g.coins!==1000) throw new Error('coins '+g.coins);
    if(g.grid[4*W+16]!==T.BARN||g.grid[5*W+18]!==T.BARN) throw new Error('barn tiles not set');
    if(!g.cow) throw new Error('no cow');
    if(Game.walkable(17.5*TILE,4.5*TILE)) throw new Error('barn not solid');
    // milk: stand beside the cow
    g.player.x=g.cow.x+TILE; g.player.y=g.cow.y; g.player.dir='left';
    g.tool=TOOLS.findIndex(t=>t.id==='hand');
    if(Game.interactHint()!=='milk the cow') throw new Error('milk hint: '+Game.interactHint());
    Game.useTool();
    const milkRow=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('milk the cow'));
    if(!milkRow) throw new Error('cow milking row missing'); milkRow.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if((g.produce.milk||0)!==1||!g.cow.milked) throw new Error('milk not collected');
    if(ITEMS.milk.sell!==60) throw new Error('milk price');
    Game.useTool(); // second pull: no duplicate
    if([...document.querySelectorAll('#menu-items .menu-row')].some(r=>r.textContent.includes('milk the cow'))) throw new Error('milking twice in menu');
    closeMenu();
    if((g.produce.milk||0)!==1) throw new Error('milk duplicated');
    Game.sleep(); g=Game.G;
    if(g.cow.milked) throw new Error('milked flag not reset at dawn');
    Game.save(); Game.load(); g=Game.G;
    if(!g.barn||!g.cow||g.grid[4*W+16]!==T.BARN) throw new Error('barn not persisted');
    // restore shared state
    g.barn=false; g.cow=null; delete g.produce.milk;
    for(let by=4;by<=5;by++) for(let bx=16;bx<=18;bx++) g.grid[by*W+bx]=T.GRASS;
    g.coins=120;
  },'barn + cow');
  step(()=>{ // v2.25: care each animal, quality products, save/load, shipping, once-daily gate
    g=Game.G;
    const keep={day:g.day,minutes:g.minutes,grid:g.grid.slice(),produce:{...g.produce},eggs:{...g.eggs},
      hens:g.hens.map(h=>({...h})),cow:g.cow?{...g.cow}:null,coop:g.coop,barn:g.barn,
      care:{...g.animalCare},player:{...g.player},tool:g.tool,coins:g.coins,pendingSale:g.pendingSale,
      discovered:{...g.discovered},skillXp:{...g.skillXp},forage:new Map(g.forage),letters:g.letters.slice(),seen:g.seenLetters.slice()};
    try {
      g.day=4; g.minutes=600; g.coins=9999;
      Game.placeCoop(); Game.placeBarn();
      if(ITEMS.sunegg.sell!==55||ITEMS.creammilk.sell!==110) throw new Error('quality price definitions');
      if(!SPR.item.sunegg||!SPR.item.creammilk) throw new Error('quality item art missing');
      g.hens[0].x=13.5*TILE; g.hens[0].y=7*TILE;
      g.hens[1].x=15.5*TILE; g.hens[1].y=7*TILE;
      g.player.x=13.5*TILE; g.player.y=8*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='pet a hen') throw new Error('hen pet hint: '+Game.interactHint());
      Game.useTool(); if(g.animalCare.hen0!==1||g.hens[0].pettedDay!==4) throw new Error('hen care failed');
      Game.useTool(); if(g.animalCare.hen0!==1) throw new Error('hen duplicate pet');
      g.player.x=g.cow.x+TILE; g.player.y=g.cow.y; g.player.dir='left';
      if(Game.interactHint()!=='milk the cow') throw new Error('cow care hint: '+Game.interactHint());
      Game.useTool();
      let pet=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('pet the cow'));
      if(!pet) throw new Error('no cow pet row'); pet.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.animalCare.cow!==1) throw new Error('cow pet failed');
      if(Game.interactHint()!=='milk the cow') throw new Error('milk not available after pet');
      Game.useTool();
      let milk=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('milk the cow'));
      if(!milk) throw new Error('no milk row'); milk.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if((g.produce.milk||0)!==1||g.cow.milked!==true) throw new Error('milk after pet failed');
      // six distinct days of care unlock quality. Normal goods on first day remain normal.
      for(let d=5;d<=9;d++){
        g.day=d; Game.petAnimal('hen0'); Game.petAnimal('hen1'); Game.petAnimal('cow');
      }
      if(g.animalCare.hen0!==6||g.animalCare.hen1!==5||g.animalCare.cow!==6) throw new Error('care progression');
      g.hens[1].pettedDay=8;
      g.player.x=13.5*TILE; g.player.y=6*TILE; g.player.dir='up';
      if(Game.interactHint()!=='pen ledger') throw new Error('pen ledger hint: '+Game.interactHint());
      Game.useTool();
      if(!menuOpen()) throw new Error('pen ledger did not open via hand tool');
      const ledger=document.getElementById('menu').textContent;
      if(!ledger.includes('Pip')||!ledger.includes('Peep')||!ledger.includes('Dusk')||
         !ledger.includes('Sun Egg at dawn')||!ledger.includes('needs care today')||!ledger.includes('cared for today')) throw new Error('pen ledger details');
      closeMenu();
      g.day=10; g.eggs={}; Game.layEggs();
      const vals=Object.values(g.eggs);
      if(!vals.includes('sunegg')) throw new Error('no quality egg at dawn');
      const ek=+Object.keys(g.eggs).find(k=>g.eggs[k]==='sunegg');
      g.player.x=(ek%W+.5)*TILE; g.player.y=(Math.floor(ek/W)+1.5)*TILE; g.player.dir='up';
      Game.useTool(); if((g.produce.sunegg||0)!==1) throw new Error('quality egg pickup failed');
      const occupied={...g.eggs}; Game.layEggs();
      if(Object.keys(g.eggs).length<=Object.keys(occupied).length) throw new Error('uncollected egg blocks open nest');
      for(const [k,v] of Object.entries(occupied)) if(g.eggs[k]!==v) throw new Error('old egg overwritten');
      g.cow.milked=false; g.player.x=g.cow.x+TILE; g.player.y=g.cow.y; g.player.dir='left';
      Game.useTool();
      milk=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('milk the cow'));
      if(!milk) throw new Error('quality milk row missing'); milk.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if((g.produce.creammilk||0)!==1) throw new Error('quality milk failed');
      const old=Game.sellPrice('sunegg');
      Game.openCrateMenu();
      const row=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('Sun Egg'));
      if(!row) throw new Error('quality product cannot ship');
      const before=g.pendingSale; row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.pendingSale-before!==old) throw new Error('quality sale wrong');
      Game.save(); Game.load(); g=Game.G;
      if(g.hens.some(h=>Object.hasOwn(h,'careFx'))||Object.hasOwn(g.cow,'careFx')) throw new Error('visual pulse leaked into save');
      if(g.animalCare.cow!==6||g.animalCare.hen0!==6||g.hens[0].pettedDay!==9||g.cow.pettedDay!==9) throw new Error('animal care not persisted');
      if((g.produce.creammilk||0)!==1) throw new Error('quality milk not persisted');
    } finally {
      g=Game.G; Object.assign(g,{day:keep.day,minutes:keep.minutes,grid:keep.grid,produce:keep.produce,
        eggs:keep.eggs,hens:keep.hens,cow:keep.cow,coop:keep.coop,barn:keep.barn,animalCare:keep.care,
        player:keep.player,tool:keep.tool,coins:keep.coins,pendingSale:keep.pendingSale,
        discovered:keep.discovered,skillXp:keep.skillXp,forage:keep.forage,
        letters:keep.letters,seenLetters:keep.seen});
      if(menuOpen()) closeMenu();
    }
  },'animal care and quality');
  step(()=>{ // v2.27: seed gift trades planting capacity for one sunrise; both hens matter
    g=Game.G;
    const keep={day:g.day,coop:g.coop,barn:g.barn,hens:g.hens.map(h=>({...h})),cow:g.cow?{...g.cow}:null,
      eggs:{...g.eggs},care:{...g.animalCare},seeds:{...g.seeds},feedDay:g.penFeedDay,feedHen:g.penFeedHen,
      grid:g.grid.slice(),player:{...g.player},tool:g.tool,produce:{...g.produce},discovered:{...g.discovered}};
    try {
      g.day=4; Game.placeCoop(); g.animalCare={hen0:1,hen1:1,cow:0}; g.seeds.cloveroot=2; g.eggs={};
      g.hens[0].x=13.5*TILE; g.hens[0].y=7*TILE;
      g.hens[1].x=15.5*TILE; g.hens[1].y=7*TILE;
      g.player.x=13.5*TILE; g.player.y=6*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      Game.useTool();
      const first=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('share cloveroot with Peep'));
      if(!first) throw new Error('feed choice absent'); first.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.seeds.cloveroot!==1||g.penFeedDay!==4||g.penFeedHen!==1) throw new Error('feed did not spend seed and choose Peep');
      Game.openPenLedger();
      if(!document.getElementById('menu').textContent.includes('Sun Egg from Peep at dawn')) throw new Error('choice not visible');
      if(document.getElementById('menu').textContent.includes('share cloveroot with Pip')) throw new Error('second gift allowed');
      closeMenu(); Game.save(); Game.load(); g=Game.G;
      if(g.penFeedDay!==4||g.penFeedHen!==1||g.seeds.cloveroot!==1) throw new Error('feed not persisted');
      g.day=5; Game.layEggs();
      const nearPeep=Object.entries(g.eggs).some(([k,v])=>v==='sunegg'&&Math.abs((+k)%W-15)<=1);
      if(!nearPeep||Object.values(g.eggs).filter(v=>v==='sunegg').length!==1) throw new Error('chosen hen did not lay one Sun Egg');
      if(g.penFeedDay!==0||g.penFeedHen!==-1) throw new Error('feed did not expire at dawn');
      g.eggs={}; g.day=6; Game.layEggs();
      if(Object.values(g.eggs).some(v=>v==='sunegg')) throw new Error('seed gift lasted more than one dawn');
      // Full nests must not take payment.
      g.day=7; g.eggs={}; for(let y=6;y<=7;y++)for(let x=13;x<=16;x++)g.eggs[y*W+x]=true;
      Game.openPenLedger();
      if(document.getElementById('menu').textContent.includes('share cloveroot')) throw new Error('full nest shows misleading gift');
      closeMenu(); Game.feedHen(0);
      if(g.seeds.cloveroot!==1||g.penFeedDay!==0) throw new Error('full nest charged seed');
    } finally {
      g=Game.G; Object.assign(g,{day:keep.day,coop:keep.coop,barn:keep.barn,hens:keep.hens,cow:keep.cow,
        eggs:keep.eggs,animalCare:keep.care,seeds:keep.seeds,penFeedDay:keep.feedDay,penFeedHen:keep.feedHen,
        grid:keep.grid,player:keep.player,tool:keep.tool,produce:keep.produce,discovered:keep.discovered});
      if(menuOpen()) closeMenu();
    }
  },'seed gift and one dawn');
  step(()=>{ // v2.20: mine levels 4-5 + lift
    g=Game.G;
    g.caveLevel=3; g.inCave=true; Game.spawnNodes(3);
    Game.descendCave(); // 3 -> 4 must work now
    if(g.caveLevel!==4) throw new Error('level 4 blocked');
    Game.descendCave();
    if(g.caveLevel!==5) throw new Error('level 5 blocked');
    if((g.maxCave||0)!==5) throw new Error('maxCave not tracked: '+g.maxCave);
    Game.descendCave(); // bottom
    if(g.caveLevel!==5) throw new Error('descended past the core');
    // mix: level 4 can yield sunstone, level 5 deepopal (sample seeds)
    let sawSun=false, sawOpal=false;
    for(let d=1;d<=40&&!sawOpal;d++){
      const keep=Game.G.day; Game.G.day=d;
      Game.spawnNodes(4); if(Game.G.caveNodes[4].some(n=>n.type==='sunstone')) sawSun=true;
      Game.spawnNodes(5); if(Game.G.caveNodes[5].some(n=>n.type==='deepopal')) sawOpal=true;
      Game.G.day=keep;
    }
    if(!sawSun) throw new Error('sunstone never spawns on L4');
    if(!sawOpal) throw new Error('deepopal never spawns on L5');
    // hp: deepopal is the toughest rock
    Game.spawnNodes(5);
    const opal=(g.caveNodes[5]||[]).find(n=>n.type==='deepopal')||(g.caveNodes[4]||[])[0];
    // lift: entering with maxCave>=3 opens the lift menu
    g.inCave=false; Game.exitCave && (g.inCave=false);
    Game.enterCave();
    if(!menuOpen()) throw new Error('lift menu did not open');
    const lrows=[...document.querySelectorAll('#menu-items .menu-row')];
    if(!lrows.some(r=>r.textContent.includes('level 5'))) throw new Error('lift missing level 5');
    lrows.find(r=>r.textContent.includes('level 5')).dispatchEvent(new MouseEvent('click',{bubbles:true}));
    if(g.caveLevel!==5||!g.inCave) throw new Error('lift did not ride to 5');
    if(ITEMS.sunstone.sell!==45||ITEMS.deepopal.sell!==90) throw new Error('ore prices');
    Game.save(); Game.load(); g=Game.G;
    if((g.maxCave||0)!==5) throw new Error('maxCave not persisted');
    // restore shared state
    if(g.inCave) Game.exitCave();
    g.caveLevel=1; g.maxCave=1; delete g.caveNodes[4]; delete g.caveNodes[5]; g.nodes=g.caveNodes[1]||[];
    g.coins=120;
  },'mine 4-5 + lift');
  step(()=>{ // v2.22: harvest fair - flags, showcase, tiers, once-a-day, persistence
    g=Game.G;
    try {
    g.day=21; g.minutes=720; g.seasonCached=Game.season();
    if(!Game.isFair()||!Game.isFairActive()) throw new Error('fair flags off');
    g.produce={sunbean:2, duskberry:1, embermelon:1}; // 115+180+330 = 625 -> grand
    g.player.x=37.5*TILE; g.player.y=10.3*TILE; g.player.dir='up';
    g.tool=TOOLS.findIndex(t=>t.id==='hand');
    if(Game.interactHint()!=='enter the showcase') throw new Error('fair hint: '+Game.interactHint());
    const c0=g.coins;
    Game.useTool();
    if(!menuOpen()) throw new Error('fair menu did not open');
    const clickRow2=(txt)=>{
      const row=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes(txt));
      if(!row) throw new Error('no row: '+txt);
      row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    };
    clickRow2('Sunbean'); clickRow2('Duskberry'); clickRow2('Ember Melon');
    clickRow2('present the display (3/3)');
    if(g.coins!==c0+500) throw new Error('grand prize coins '+(g.coins-c0));
    if((g.produce.ribbon||0)!==1) throw new Error('no ribbon awarded');
    if(g.friendship.mara!==2) throw new Error('fair friendship not given');
    if(g.fairEnteredDay!==21) throw new Error('entered day not marked');
    Game.useTool(); // second entry same day
    if(![...document.querySelectorAll('#menu-items .menu-row')].some(r=>r.textContent.includes('judges have your display'))) throw new Error('re-entry not blocked');
    closeMenu();
    if(ITEMS.ribbon.sell!==100) throw new Error('ribbon price');
    Game.save(); Game.load(); g=Game.G;
    if(g.fairEnteredDay!==21) throw new Error('fair state not persisted');
    // low tier: participation
    g.fairEnteredDay=0; g.produce={pitstone:1, dandelion:1, minnow:1}; // 3+10+15=28
    const c1=g.coins;
    Game.openFairMenu();
    clickRow2('Pit Stone'); clickRow2('Dandelion'); clickRow2('Pond Minnow');
    clickRow2('present the display (3/3)');
    if(g.coins!==c1+100) throw new Error('participation prize '+(g.coins-c1));
    if((g.produce.ribbon||0)!==0) throw new Error('participation must not ribbon');
    // fair dialogue
    g.minutes=720;
    Game.talkTo('bram');
    if(!document.getElementById('menu').textContent.includes('fifty-seven')) throw new Error('no fair line');
    closeMenu();
    } finally {
      // restore shared state, assertions or not
      g=Game.G;
      g.day=3; g.minutes=DAY_START; g.produce={}; g.coins=120; g.fairEnteredDay=0;
      g.friendship={mara:0,bram:0,fern:0,piet:0}; g.chattedToday={}; g.giftsToday={};
      if(menuOpen()) closeMenu();
    }
  },'harvest fair');
  step(()=>{ // v2.24: solstice fire must be reachable, once-only, and persist
    g=Game.G;
    const saved={day:g.day,minutes:g.minutes,energy:g.energy,toast:g.solsticeToastDay,keepsakeDay:g.solsticeKeepsakeDay,
      keepsakes:(g.solsticeKeepsakes||[]).map(n=>({...n})),produce:{...g.produce},player:{...g.player},tool:g.tool,seen:g.seenLetters.slice(),letters:g.letters.slice(),
      friendship:{...g.friendship},seenEvents:{...g.seenEvents}};
    try{
      g.day=28; g.minutes=900; g.seasonCached=Game.season();
      if(!Game.isSolstice()||Game.solsticeEvening()) throw new Error('solstice daytime flag');
      if(Music.moodOf(g)!==0) throw new Error('premature solstice music');
      g.minutes=1190; if(!Game.solsticeEvening()) throw new Error('solstice evening flag');
      if(Music.moodOf(g)!==4) throw new Error('solstice music masked by weekly festival');
      g.player.x=36.5*TILE; g.player.y=12*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='join the fire') throw new Error('bonfire hint '+Game.interactHint());
      g.energy=62; Game.useTool();
      if(!document.getElementById('menu').textContent.includes('wintermint brew')) throw new Error('bonfire scene missing');
      const row=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('raise a wintermint cup'));
      if(!row) throw new Error('toast choice missing');
      row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.energy!==82||g.solsticeToastDay!==28) throw new Error('toast benefit or marker wrong');
      Game.useTool();
      if([...document.querySelectorAll('#menu-items .menu-row')].some(r=>r.textContent.includes('raise a wintermint cup'))) throw new Error('repeat toast allowed');
      closeMenu(); Game.save(); Game.load(); g=Game.G;
      if(g.solsticeToastDay!==28||g.energy!==82) throw new Error('toast not persisted');
      g.player.x=10*TILE; g.player.y=10*TILE;
      Game.talkTo('piet');
      if(!document.getElementById('menu').textContent.includes('Cedar burns slow')) throw new Error('solstice dialogue missing');
      closeMenu();
      g.day=27; g.minutes=1190;
      if(Game.solsticeEvening()) throw new Error('ordinary winter night became solstice');
      Game.checkLetters(); if(!g.letters.find(l=>l.id==='solstice')) throw new Error('solstice invitation absent');
    } finally {
      g=Game.G; Object.assign(g,{day:saved.day,minutes:saved.minutes,energy:saved.energy,solsticeToastDay:saved.toast,
        solsticeKeepsakeDay:saved.keepsakeDay,solsticeKeepsakes:saved.keepsakes,produce:saved.produce,
        player:saved.player,tool:saved.tool,seenLetters:saved.seen,letters:saved.letters,
        friendship:saved.friendship,seenEvents:saved.seenEvents});
      g.seasonCached=Game.season(); if(menuOpen()) closeMenu();
    }
  },'solstice fire');
  step(()=>{ // v2.28: solstice choice changes a persistent personal journal, not a sale multiplier
    g=Game.G;
    const keep={day:g.day,minutes:g.minutes,produce:{...g.produce},keepsakes:(g.solsticeKeepsakes||[]).map(x=>({...x})),
      marker:g.solsticeKeepsakeDay,energy:g.energy,player:{...g.player},tool:g.tool};
    try {
      g.day=28; g.minutes=1190; g.seasonCached=Game.season(); g.produce={wintermint:1,moondrop:1};
      g.solsticeKeepsakeDay=0; g.solsticeKeepsakes=[];
      g.player.x=36.5*TILE; g.player.y=12*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      Game.useTool();
      let moon=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('Moon Drop by the fire'));
      if(!moon) throw new Error('Moon Drop choice absent'); moon.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.produce.moondrop!==0||g.produce.wintermint!==1||g.solsticeKeepsakeDay!==28||g.solsticeKeepsakes.length!==1||g.solsticeKeepsakes[0].id!=='moondrop') throw new Error('keepsake choice did not land');
      Game.useTool();
      if([...document.querySelectorAll('#menu-items .menu-row')].some(r=>r.textContent.includes('press a wintermint'))) throw new Error('repeat keepsake allowed');
      closeMenu(); Game.save(); Game.load(); g=Game.G;
      if(g.solsticeKeepsakeDay!==28||g.solsticeKeepsakes[0].id!=='moondrop') throw new Error('keepsake not persisted');
      Game.openJournal();
      if(!document.getElementById('menu').textContent.includes('Moon Drop by the fire')) throw new Error('chosen memory absent from journal');
      if(document.getElementById('menu').textContent.includes('pressed wintermint')) throw new Error('other choice recorded');
      closeMenu();
      // Next winter permits the other memory; neither prize changes coins or XP.
      g.day=56; g.solsticeToastDay=56; g.produce.wintermint=1; g.minutes=1190;
      const c=g.coins, xp=JSON.stringify(g.skillXp);
      Game.openBonfire();
      const sprig=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('press a wintermint'));
      if(!sprig) throw new Error('next-winter choice absent'); sprig.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.solsticeKeepsakes.length!==2||g.solsticeKeepsakes[1].id!=='wintermint'||g.coins!==c||JSON.stringify(g.skillXp)!==xp) throw new Error('second winter choice or unwanted perk');
      // An unavailable offering must not mark the year as done.
      g.day=84; g.produce.wintermint=0; Game.openBonfire();
      const unavailable=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('press a wintermint'));
      if(!unavailable||!unavailable.textContent.includes('need x1')) throw new Error('missing-resource signal');
      unavailable.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      if(g.solsticeKeepsakeDay===84||g.solsticeKeepsakes.length!==2) throw new Error('unavailable keepsake consumed');
      closeMenu();
    } finally {
      g=Game.G; Object.assign(g,{day:keep.day,minutes:keep.minutes,produce:keep.produce,solsticeKeepsakes:keep.keepsakes,
        solsticeKeepsakeDay:keep.marker,energy:keep.energy,player:keep.player,tool:keep.tool});
      g.seasonCached=Game.season(); if(menuOpen()) closeMenu();
    }
  },'solstice keepsake choice');
  step(()=>{ // v2.29: a remembered winter changes the actual house encounter and Piet's spring line
    g=Game.G;
    const keep={day:g.day,minutes:g.minutes,indoor:g.indoor,player:{...g.player},keepsakes:g.solsticeKeepsakes,
      friendship:{...g.friendship},seenEvents:{...g.seenEvents}};
    try {
      g.day=29; g.minutes=600; g.seasonCached=Game.season(); g.friendship.piet=0;
      g.solsticeKeepsakes=[]; Game.enterHouse();
      g.player.x=9.5*TILE; g.player.y=3.5*TILE; g.player.dir='up'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='') throw new Error('unearned shelf hint');
      for(const [id,fragment,dialogue] of [
        ['moondrop','stone you left by the cedar','Moon Drop itself stayed by the coals'],
        ['wintermint','wintermint sprig dried green','pressed sprig lies between two pages']]){
        g.solsticeKeepsakes=[{day:28,id}];
        if(Game.interactHint()!=='look at the keepsake') throw new Error('shelf hint not reachable');
        Game.useTool();
        if(!document.getElementById('menu').textContent.includes(dialogue)) throw new Error(id+' shelf text missing');
        closeMenu(); Game.exitHouse(); Game.talkTo('piet');
        if(!document.getElementById('menu').textContent.includes(fragment)) throw new Error(id+' spring follow-through missing');
        closeMenu(); Game.enterHouse(); g.player.x=9.5*TILE; g.player.y=3.5*TILE; g.player.dir='up';
        Game.save(); Game.load(); g=Game.G;
        if(g.solsticeKeepsakes[0]?.id!==id||Game.interactHint()!=='look at the keepsake') throw new Error(id+' follow-through not persisted');
      }
    } finally {
      g=Game.G; Object.assign(g,{day:keep.day,minutes:keep.minutes,indoor:keep.indoor,player:keep.player,
        solsticeKeepsakes:keep.keepsakes,friendship:keep.friendship,seenEvents:keep.seenEvents});
      g.seasonCached=Game.season(); if(menuOpen()) closeMenu();
    }
  },'keepsake follow-through');
  step(()=>{ // v2.23: winter content - crop gate, forage set, icefin gate, winter lines, journal, persistence
    const keep={ day:g.day, minutes:g.minutes, produce:g.produce, seeds:g.seeds,
      forage:new Map(g.forage), crops:new Map(g.crops), grid:g.grid.slice(),
      friendship:{...g.friendship}, chatted:{...g.chattedToday}, gifts:{...g.giftsToday}, cached:g.seasonCached };
    try{
      g.day=23; g.minutes=720; g.seasonCached=Game.season();
      if(Game.season()!==3) throw new Error('winter season math');
      // frostroot takes in winter, cloveroot refuses
      const k=14*W+20; g.grid[k]=T.SOIL; g.crops.delete(k);
      g.seeds={frostroot:1, cloveroot:1};
      Game.plantSeed(20,14,'cloveroot');
      if(g.crops.has(k)||g.seeds.cloveroot!==1) throw new Error('cloveroot took in winter');
      Game.plantSeed(20,14,'frostroot');
      if(!g.crops.has(k)||g.crops.get(k).id!=='frostroot') throw new Error('frostroot refused in winter');
      g.crops.delete(k);
      // winter forage set
      g.forage.clear(); Game.spawnForage(8);
      if(g.forage.size<4) throw new Error('winter forage thin: '+g.forage.size);
      for(const f of g.forage.values()) if(!['wintermint','snowberry','frostcap'].includes(f.id)) throw new Error('out-of-season forage: '+f.id);
      // icefin only in winter
      let saw=false; for(let i=0;i<400&&!saw;i++){ if(Game.rollFish().id==='icefin') saw=true; }
      if(!saw) throw new Error('icefin never rolled in winter');
      g.day=2; g.seasonCached=Game.season();
      for(let i=0;i<200;i++){ if(Game.rollFish().id==='icefin') throw new Error('icefin out of season'); }
      g.day=23; g.seasonCached=Game.season();
      // winter dialogue line (body text lives in #menu)
      Game.talkTo('fern');
      if(!document.getElementById('menu').textContent.includes('Gerald')) throw new Error('no winter line');
      closeMenu();
      // journal counts the winter set
      Game.openJournal();
      const jr=document.querySelectorAll('#menu .menu-row').length;
      closeMenu();
      if(jr!==30) throw new Error('journal rows after winter '+jr+' != 30');
      // winter forage survives save/load
      Game.save(); g.forage.clear(); Game.load(); g=Game.G;
      let ok=g.forage.size>0;
      for(const f of g.forage.values()) if(!['wintermint','snowberry','frostcap'].includes(f.id)) ok=false;
      if(!ok) throw new Error('winter forage not persisted');
    } finally {
      g.day=keep.day; g.minutes=keep.minutes; g.produce=keep.produce; g.seeds=keep.seeds;
      g.forage=keep.forage; g.crops=keep.crops; g.grid=keep.grid;
      g.friendship=keep.friendship; g.chattedToday=keep.chatted; g.giftsToday=keep.gifts;
      g.seasonCached=keep.cached; closeMenu();
    }
  },'winter content');

  step(()=>{ // v2.21: hearth cooking - cook, gate, eat, price, journal untouched
    g=Game.G;
    g.produce={egg:2, milk:1, cloveroot:1, sunbean:1};
    Game.enterHouse(); g=Game.G;
    g.player.x=7.5*TILE; g.player.y=2.5*TILE; g.player.dir='up';
    if(Game.interactHint()!=='cook a meal') throw new Error('hearth hint: '+Game.interactHint());
    Game.useTool();
    if(!menuOpen()) throw new Error('kitchen did not open');
    const clickRow=(txt)=>{
      const row=[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes(txt));
      if(!row) throw new Error('no row: '+txt);
      row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    };
    clickRow('Fried Egg');
    if((g.produce.friedegg||0)!==1||g.produce.egg!==1) throw new Error('cook failed: '+JSON.stringify(g.produce));
    clickRow('Garden Hash');
    if((g.produce.gardenhash||0)!==1||g.produce.cloveroot!==0) throw new Error('hash failed');
    clickRow('Garden Hash'); // out of cloveroot now: must nudge, not consume
    if((g.produce.gardenhash||0)!==1) throw new Error('cook gate failed');
    g.energy=40;
    clickRow('eat Fried Egg');
    if(g.energy!==65) throw new Error('eat energy '+g.energy);
    if((g.produce.friedegg||0)!==0) throw new Error('meal not consumed');
    if(Game.sellPrice('friedegg')!==55) throw new Error('dish price');
    closeMenu();
    Game.openJournal();
    const jr2=document.querySelectorAll('#menu-items .menu-row').length;
    if(jr2!==30) throw new Error('journal rows after cooking '+jr2+' != 30');
    closeMenu();
    if(g.discovered.friedegg) throw new Error('meals must not join the journal');
    // restore shared state
    g.produce={}; g.energy=100;
    Game.exitHouse();
  },'hearth cooking');
  step(()=>{ // v2.15 economy: farming out-earns mining
    if(CROPS.cloveroot.sell!==48||ITEMS.moondrop.sell!==28||ITEMS.pitstone.sell!==3) throw new Error('economy constants');
    const mineDay=5*(0.55*ITEMS.pitstone.sell+0.30*ITEMS.emberquartz.sell+0.15*ITEMS.moondrop.sell);
    const farmDay=(CROPS.cloveroot.sell-20)/3*6; // six starter plots
    if(mineDay>=farmDay) throw new Error('mining still out-earns farming: '+mineDay+' vs '+farmDay);
  },'economy rebalance');
  step(()=>{ // v2.15: interact hints resolve for key tiles
    g=Game.G;
    g.indoor=false; g.inCave=false;
    let crateAt=-1;
    for(let i=0;i<g.grid.length;i++){ if(g.grid[i]===T.CRATE){ crateAt=i; break; } }
    if(crateAt<0) throw new Error('no crate in world');
    const cx=crateAt%W, cy=Math.floor(crateAt/W);
    g.player.x=cx*TILE+8; g.player.y=(cy+1)*TILE+8; g.player.dir='up'; g.tool=2; // hand
    const h1=Game.interactHint();
    if(h1!=='ship produce (pays at dawn)') throw new Error('crate hint: '+h1);
    g.player.x=8.5*TILE; g.player.y=8.5*TILE; g.player.dir='up';
    Game.enterHouse();
    g.player.x=2.5*TILE; g.player.y=2.5*TILE; g.player.dir='up';
    const h2=Game.interactHint();
    if(h2!=='sleep until morning') throw new Error('bed hint: '+h2);
    Game.exitHouse();
  },'interact hints');
  step(()=>{ // weather: deterministic roll exists; rain waters crops overnight
    let rainy=0; for(let d=1;d<=30;d++) if(Game.weatherForDay(d)==='rain') rainy++;
    if(rainy<2||rainy>14) throw new Error('rain days in 30: '+rainy);
    // plant in spring, leave unwatered, jump to a spring day whose night is rain
    g=Game.G;
    let d=1; while(!(Game.seasonOf(d)===0 && Game.seasonOf(d+1)===0 && Game.weatherForDay(d+1)==='rain')) d++;
    g.day=d;
    Game.G.grid[14*W+20]=T.SOIL; g.seeds.cloveroot=5; Game.plantSeed(20,14,'cloveroot');
    if(!g.crops.get(14*W+20)) throw new Error('plant failed (seeds '+g.seeds.cloveroot+', season '+Game.season()+')');
    const key=14*W+20;
    Game.sleep(); g=Game.G; // the rainy night
    const c=g.crops.get(key);
    if(!c||c.age<1) throw new Error('rain did not water');
  },'weather rain waters crops');
  step(()=>{ // cat never paths onto water across many wander decisions
    g=Game.G;
    const cat=g.cat;
    cat.x=10*TILE; cat.y=23.5*TILE; cat.tx=cat.x; cat.ty=cat.y; // start on the sand bank
    let picks=0;
    for(let i=0;i<1200;i++){
      cat.tx=cat.x; cat.ty=cat.y; // force retarget check
      const ox=cat.x, oy=cat.y;
      Game.update(100, 1000+i*100);
      if(cat.tx!==ox||cat.ty!==oy){ // a new target was accepted
        picks++;
        const t=Game.tileAt(Math.floor(cat.tx/TILE),Math.floor(cat.ty/TILE));
        if(t===T.WATER) throw new Error('cat targeted water at '+cat.tx+','+cat.ty);
      }
    }
    if(picks<3) throw new Error('wander too passive: '+picks);
    const spawnTile=Game.tileAt(Math.floor(g.cat.x/TILE),Math.floor(g.cat.y/TILE));
    if(spawnTile===T.WATER) throw new Error('cat spawns on water');
    log('cat wander picks', picks, '- none on water');
  },'cat avoids water');
  step(()=>{ // seasons: progression, out-of-season refusal, turn clears crops
    g=Game.G;
    if(Game.seasonOf(1)!==0||Game.seasonOf(8)!==1||Game.seasonOf(15)!==2||Game.seasonOf(22)!==3) throw new Error('season math');
    // spring: cloveroot ok, sunbean refused
    while(g.day%7!==1||Game.season()!==0){ Game.sleep(); g=Game.G; }
    Game.G.grid[15*W+20]=T.SOIL; g.seeds.sunbean=3;
    Game.plantSeed(20,15,'sunbean');
    if(g.crops.get(15*W+20)) throw new Error('sunbean planted in spring');
    // sleep into summer: crops cleared on the turn
    g.seeds.cloveroot=5; Game.G.grid[15*W+21]=T.SOIL; Game.plantSeed(21,15,'cloveroot');
    while(Game.season()===0){ Game.sleep(); g=Game.G; }
    if(g.crops.size!==0) throw new Error('crops survived the turn');
  },'seasons');
  step(()=>{ // villagers: 4 npcs, all with lines; wander respects solids
    g=Game.G;
    for(const id of ['mara','bram','fern','piet']){
      if(!Game.NPCS[id]||Game.NPCS[id].lines.length<3) throw new Error('npc '+id+' missing lines');
    }
    for(let i=0;i<300;i++){ g.piet.tx=g.piet.x; g.piet.ty=g.piet.y; Game.updateNpcs(100);
      if(SOLID.has(Game.tileAt(Math.floor(g.piet.tx/TILE),Math.floor(g.piet.ty/TILE)))) throw new Error('piet targeted solid'); }
    for(let i=0;i<300;i++){ g.fern.tx=g.fern.x; g.fern.ty=g.fern.y; Game.updateNpcs(100);
      if(SOLID.has(Game.tileAt(Math.floor(g.fern.tx/TILE),Math.floor(g.fern.ty/TILE)))) throw new Error('fern targeted solid'); }
  },'villagers');
  step(()=>{ // pathfinding: fence detour, all-walkable, smoke test on a villager
    const path=Game.findPath(10,20,30,20);
    if(!path) throw new Error('no path across farm');
    for(const [px2,py2] of path) if(SOLID.has(g.grid[py2*W+px2])) throw new Error('path crosses solid '+px2+','+py2);
    if(path.length<=20) throw new Error('path did not detour the fence');
    g.bram.x=30*TILE; g.bram.y=30*TILE; g.bram.pathGoal=null;
    Game.updateNpcs(50);
    if(!Array.isArray(g.bram.path)) throw new Error('villager path not set');
  },'pathfinding');
  step(()=>{ // letters arrive on schedule; mailbox opens
    g=Game.G;
    Game.sleep(); g=Game.G; // -> day>=2 welcome letter
    if(!g.letters.find(l=>l.id==='welcome')) throw new Error('no welcome letter');
    if(Game.unreadCount()<1) throw new Error('unread count');
    g.stats.caught=1; Game.sleep(); g=Game.G;
    if(!g.letters.find(l=>l.id==='fish1')) throw new Error('no fish letter');
  },'letters');
  step(()=>{ // festival detection
    g=Game.G; g.day=7;
    if(!Game.isFestival()) throw new Error('day 7 not festival');
    g.minutes=1200; if(!Game.festivalEvening()) throw new Error('evening not festival');
    g.minutes=900; if(Game.festivalEvening()) throw new Error('3pm is not lantern evening');
    g.day=8; if(Game.isFestival()) throw new Error('day 8 festival?');
  },'festival flags');
  step(()=>{ // friendship: gifts raise hearts, one per day, heart lines unlock
    g=Game.G;
    g.produce.sunbean=3;
    Game.giftTo('mara');
    if(Game.hearts('mara')!==1) throw new Error('hearts '+Game.hearts('mara'));
    if(g.produce.sunbean!==2) throw new Error('produce not consumed');
    Game.giftTo('mara'); // same day -> refused
    if(Game.hearts('mara')!==1) throw new Error('double gift same day');
    Game.sleep(); g=Game.G; Game.giftTo('mara');
    if(Game.hearts('mara')!==2) throw new Error('day 2 gift');
    g.friendship.mara=8;
    if(Game.hearts('mara')!==4) throw new Error('heart math');
  },'friendship gifts');
  step(()=>{ // house interior: enter, collide, sleep in bed, wake by bed, exit restores
    g=Game.G;
    g.player.x=8.5*TILE; g.player.y=8.5*TILE; g.player.dir='up';
    Game.enterHouse();
    if(!g.indoor) throw new Error('not indoors');
    if(Game.walkable(0.2*TILE, 2*TILE)) throw new Error('walked through west wall');
    if(Game.walkable(1.5*TILE, 1.5*TILE)) throw new Error('walked into bed');
    if(!Game.walkable(5.5*TILE, 5*TILE)) throw new Error('floor blocked');
    if(ISOLID.has(IT.DOOR)) throw new Error('door is solid');
    const d0=g.day;
    Game.sleep(); g=Game.G;
    if(g.day!==d0+1) throw new Error('day did not advance indoors');
    if(!g.indoor) throw new Error('should wake indoors');
    if(Math.floor(g.player.x/TILE)!==3) throw new Error('wake pos x '+Math.floor(g.player.x/TILE));
    Game.exitHouse();
    if(g.indoor) throw new Error('still indoors');
    if(Math.floor(g.player.x/TILE)!==8) throw new Error('exit x '+Math.floor(g.player.x/TILE));
  },'house interior');
  step(()=>{ // quarry cave: enter, mine, respawn daily, exit; farm rocks break
    g=Game.G;
    g.player.x=45.5*TILE; g.player.y=13.5*TILE; g.player.dir='right';
    Game.enterCave();
    if(!g.inCave) throw new Error('not in cave');
    if(g.nodes.length!==5) throw new Error('nodes '+g.nodes.length);
    const n0=g.nodes[0];
    g=Game.G;
    g.player.x=(n0.x+0.5)*TILE; g.player.y=(n0.y+1.2)*TILE; g.player.dir='up';
    g.tool=TOOLS.findIndex(t=>t.id==='pick');
    const e0=g.energy, p0=(g.produce[n0.type]||0), hp0=n0.hp;
    for(let i=0;i<hp0;i++) Game.useTool();
    g=Game.G;
    if((g.produce[n0.type]||0)!==p0+1) throw new Error('ore not gained');
    if(g.nodes.includes(n0)) throw new Error('node not removed');
    if(g.energy!==e0-2*hp0) throw new Error('energy '+g.energy+' exp '+(e0-2*hp0));
    if(!Game.walkable((n0.x+0.5)*TILE,(n0.y+0.5)*TILE)) throw new Error('mined tile still solid');
    Game.sleep(); g=Game.G;
    if(g.nodes.length!==5) throw new Error('nodes did not respawn: '+g.nodes.length);
    Game.exitCave();
    if(g.inCave) throw new Error('still in cave');
    if(Math.floor(g.player.x/TILE)!==45) throw new Error('exit pos '+Math.floor(g.player.x/TILE));
    // depth: descend twice, mix shifts, ascend returns, door exits from L1
    Game.descendCave();
    if(g.caveLevel!==2) throw new Error('descend to 2');
    if(!g.nodes.length) throw new Error('L2 nodes empty');
    const l2hp=g.nodes.reduce((a,n)=>a+n.hp,0);
    Game.descendCave();
    if(g.caveLevel!==3) throw new Error('descend to 3');
    if(g.nodes.length!==6) throw new Error('L3 node count '+g.nodes.length);
    const l3hp=g.nodes.reduce((a,n)=>a+n.hp,0);
    if(l3hp<=l2hp) throw new Error('deeper should be tougher');
    Game.ascendCave();
    if(g.caveLevel!==2) throw new Error('ascend to 2');
    Game.ascendCave(); Game.ascendCave(); // L1 door exits
    if(g.inCave) throw new Error('L1 door should exit');
    // re-enter starts at level 1
    Game.enterCave();
    if(g.caveLevel!==1) throw new Error('re-enter not L1');
    Game.exitCave();
    // farm rock breaks with the pick
    g.player.x=29.5*TILE; g.player.y=18.5*TILE; g.player.dir='right';
    g.tool=TOOLS.findIndex(t=>t.id==='pick');
    const ps0=g.produce.pitstone||0;
    Game.useTool();
    if(Game.tileAt(30,18)!==T.GRASS) throw new Error('rock not cleared');
    if((g.produce.pitstone||0)!==ps0+1) throw new Error('rock yield');
  },'quarry cave');
  step(()=>{ // generative music: deterministic, in-scale, day varies, night modal
    const a=phraseFor(3,0,0), b=phraseFor(3,0,0), c=phraseFor(4,0,0);
    if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error('not deterministic');
    if(JSON.stringify(a)===JSON.stringify(c)) throw new Error('days identical');
    const sc=[0,2,4,7,9];
    if(!a.every(n=>sc.includes(n.midi))) throw new Error('note out of scale');
    if(a.length<10||a.length>40) throw new Error('density '+a.length);
    const n=phraseFor(3,0,2);
    if(!n.every(x=>[0,3,5,7,10].includes(x.midi))) throw new Error('night scale');
    const f=phraseFor(7,0,3);
    if(f.length<=n.length) throw new Error('festival should be denser than night');
    // scheduling path runs clean against a real (here suspended) AudioContext
    const a2=ac();
    if(a2){ Music.phrase=a; Music.mood=0; for(let s=0;s<32;s++) Music.scheduleStep(s, a2.currentTime+0.1+s*0.1, 0.79, Game.G); }
  },'generative music');
  step(()=>{ // npc schedules: villagers travel to hourly waypoints, gather at well 5-8pm
    g=Game.G;
    g.day=1; g.minutes=10*60; g.player.x=9*TILE; g.player.y=9*TILE; // not festival, not indoor
    for(let i=0;i<600;i++) Game.update(100, 1000+i*100);
    const near=(id,x,y)=>Math.hypot(g[id].x-x*TILE,g[id].y-y*TILE)<TILE*3;
    if(!near('mara',15.5,10.8)) throw new Error('mara '+Math.round(g.mara.x/TILE)+','+Math.round(g.mara.y/TILE));
    if(!near('bram',12,23)) throw new Error('bram '+Math.round(g.bram.x/TILE)+','+Math.round(g.bram.y/TILE));
    if(!near('fern',20,30)) throw new Error('fern '+Math.round(g.fern.x/TILE)+','+Math.round(g.fern.y/TILE));
    if(!near('piet',40.5,9.8)) throw new Error('piet '+Math.round(g.piet.x/TILE)+','+Math.round(g.piet.y/TILE));
    g.minutes=17.5*60;
    for(let i=0;i<800;i++) Game.update(100, 2000+i*100);
    for(const id of ['mara','bram','fern','piet']){
      if(!near(id,39.5,9.3)) throw new Error(id+' missed evening well at '+Math.round(g[id].x/TILE)+','+Math.round(g[id].y/TILE));
    }
    // mara remains talkable wherever she is
    g.player.x=g.mara.x+TILE; g.player.y=g.mara.y;
    if(!Game.nearNpc('mara')) throw new Error('mara not near');
  },'npc schedules');
  step(()=>{ // v2.30: the field-to-village route has a visible, reachable pause
    g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},tool:g.tool,indoor:g.indoor,inCave:g.inCave};
    try {
      g.day=3; g.minutes=690; g.indoor=false; g.inCave=false; g.seasonCached=Game.season();
      for(let y=9;y<=11;y++) if(g.grid[y*W+21]!==T.PATH) throw new Error('field branch missing');
      if(g.grid[11*W+21]!==T.PATH||g.grid[8*W+21]!==T.PATH) throw new Error('branch disconnect');
      for(const x of [24,31,36]) if(g.grid[5*W+x]!==T.TREE) throw new Error('planted cedars absent');
      const route=Game.findPath(21,10,28,8);
      if(!route||route.length>14||route.some(([x,y])=>SOLID.has(g.grid[y*W+x]))) throw new Error('cedarwalk unreachable');
      g.player.x=27.5*TILE; g.player.y=8.5*TILE; g.player.dir='right'; g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='read the cedarwalk') throw new Error('waymark hint missing');
      Game.useTool();
      if(!document.getElementById('menu').textContent.includes('the cedarwalk')||!document.getElementById('menu').textContent.includes('first cedar')) throw new Error('waymark action missing');
      closeMenu();
      g.day=24; g.seasonCached=Game.season(); Game.useTool();
      if(!document.getElementById('menu').textContent.includes('Snow fills the wheel ruts')) throw new Error('seasonal passage missing');
      closeMenu();
      g.player.x=12*TILE; g.player.y=14*TILE;
      if(Game.nearWaymark()) throw new Error('waymark range too large');
      // Loading an older map adds only empty road/cedar tiles, never overwrites farm work.
      const road0=g.grid[9*W+21], tree0=g.grid[5*W+24];
      g.grid[9*W+21]=T.GRASS; g.grid[5*W+24]=T.GRASS;
      const worked=10*W+21; g.grid[worked]=T.SOIL; g.crops.set(worked,{id:'cloveroot',stage:1,watered:true,age:1});
      Game.save(); Game.load(); g=Game.G;
      if(g.grid[9*W+21]!==T.PATH||g.grid[5*W+24]!==T.TREE) throw new Error('old map not migrated');
      if(g.grid[worked]!==T.SOIL||!g.crops.has(worked)) throw new Error('migration erased worked tile');
      g.crops.delete(worked); g.grid[worked]=T.PATH; g.grid[9*W+21]=road0; g.grid[5*W+24]=tree0;
    } finally {
      Object.assign(g,{day:keep.day,minutes:keep.minutes,player:keep.player,tool:keep.tool,indoor:keep.indoor,inCave:keep.inCave});
      g.seasonCached=Game.season(); if(menuOpen()) closeMenu();
    }
  },'cedarwalk route');
  step(()=>{ // v2.31: lived-in crossing from the actual home/field approach
    const g=Game.G, keep={day:g.day,minutes:g.minutes,player:{...g.player},mara:{...g.mara},friendship:{...g.friendship},seenEvents:{...g.seenEvents},tool:g.tool,indoor:g.indoor,inCave:g.inCave};
    try {
      g.day=3;g.minutes=755;g.indoor=false;g.inCave=false;g.friendship.mara=0;g.seenEvents={};g.seasonCached=Game.season();
      const wp=Game.npcWaypoint('mara');
      if(wp[0]!==12||wp[1]!==20.5||wp[2]!==9.5) throw new Error('midday gate visit missing');
      const fromStand=Game.findPath(15,10,20,9), toRoad=Game.findPath(21,10,28,8);
      if(!fromStand||!toRoad||fromStand.length>12||toRoad.length>14) throw new Error('farm-village route disconnected');
      g.mara.x=15.5*TILE;g.mara.y=10.8*TILE;g.mara.tx=g.mara.x;g.mara.ty=g.mara.y;delete g.mara.pathGoal;g.mara.path=[];
      let nearest=Infinity;
      for(let i=0;i<500;i++){
        Game.updateNpcs(80);
        const tile=g.grid[Math.floor(g.mara.y/TILE)*W+Math.floor(g.mara.x/TILE)];
        if(SOLID.has(tile)) throw new Error('Mara crosses solid tile on way to gate');
        nearest=Math.min(nearest,Math.hypot(g.mara.x-20.5*TILE,g.mara.y-9.5*TILE));
      }
      if(nearest>TILE*.8) throw new Error('Mara never visits gate');
      g.mara.x=20.5*TILE;g.mara.y=9.5*TILE;g.mara.tx=g.mara.x;g.mara.ty=g.mara.y;
      g.player.x=19.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='talk') throw new Error('gate meeting hint missing');
      Game.useTool();
      if(!document.getElementById('menu').textContent.includes('gate stays open')) throw new Error('gate dialogue missing: '+document.getElementById('menu').textContent.slice(0,130));
      closeMenu();
      g.day=4;Game.useTool();
      if(document.getElementById('menu').textContent.includes('gate stays open')) throw new Error('gate line overrides every day');
      closeMenu();
      const grow=10*W+24, before=g.grid[grow];g.grid[grow]=T.SOIL;g.crops.set(grow,{id:'cloveroot',stage:2,age:2,watered:false});
      Game.save();Game.load();
      if(Game.G.grid[grow]!==T.SOIL||!Game.G.crops.has(grow)) throw new Error('verge migration overwrote crop');
      Game.G.crops.delete(grow);Game.G.grid[grow]=before;
      // Emulated default day-one scene: no explicit shot setup or missing guide.
      const p=Game.findPath(9,9,21,10);
      if(!p||p.length>23) throw new Error('default spawn cannot reach field gate');
    } finally {
      Object.assign(Game.G,{day:keep.day,minutes:keep.minutes,player:keep.player,mara:keep.mara,friendship:keep.friendship,seenEvents:keep.seenEvents,tool:keep.tool,indoor:keep.indoor,inCave:keep.inCave});
      Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();
    }
  },'lived-in crossing');
  step(()=>{ // v2.32: the next day carries the field meeting toward the village
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},mara:{...g.mara},fern:{...g.fern},tool:g.tool,friendship:{...g.friendship},seenEvents:{...g.seenEvents},gateWelcomeDay:g.gateWelcomeDay,fernRoadHeard:g.fernRoadHeard,indoor:g.indoor,inCave:g.inCave};
    try {
      g.day=3;g.minutes=755;g.friendship.mara=0;g.friendship.fern=0;g.seenEvents={};g.gateWelcomeDay=0;g.fernRoadHeard=false;
      g.indoor=false;g.inCave=false;g.seasonCached=Game.season();g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.mara.x=20.5*TILE;g.mara.y=9.5*TILE;g.player.x=19.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';
      Game.useTool();
      if(!document.getElementById('menu').textContent.includes('gate stays open')||g.gateWelcomeDay!==3) throw new Error('gate meeting not remembered');
      closeMenu();Game.save();Game.load();g=Game.G;
      if(g.gateWelcomeDay!==3) throw new Error('gate memory not persisted');
      g.day=4;g.minutes=930;g.seasonCached=Game.season();
      const wp=Game.npcWaypoint('fern');
      if(wp[0]!==15||wp[1]!==27.5||wp[2]!==9.5) throw new Error('Fern road stop absent');
      const path=Game.findPath(20,30,27,9);
      if(!path||path.some(([x,y])=>SOLID.has(g.grid[y*W+x]))) throw new Error('Fern road stop unreachable');
      g.fern.x=20*TILE;g.fern.y=30*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;delete g.fern.pathGoal;g.fern.path=[];
      let nearest=Infinity;
      for(let i=0;i<800;i++){
        Game.updateNpcs(80);
        if(SOLID.has(g.grid[Math.floor(g.fern.y/TILE)*W+Math.floor(g.fern.x/TILE)])) throw new Error('Fern crossed solid tile');
        nearest=Math.min(nearest,Math.hypot(g.fern.x-27.5*TILE,g.fern.y-9.5*TILE));
      }
      if(nearest>TILE) throw new Error('Fern failed to reach road stop');
      g.fern.x=27.5*TILE;g.fern.y=9.5*TILE;g.player.x=26.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';
      Game.useTool();
      if(!document.getElementById('menu').textContent.includes('water cup at the cedarwalk')||!g.fernRoadHeard) throw new Error('Fern follow-through absent');
      closeMenu();Game.save();Game.load();g=Game.G;
      if(!g.fernRoadHeard) throw new Error('Fern memory not persisted');
      g.fern.x=27.5*TILE;g.fern.y=9.5*TILE;g.player.x=26.5*TILE;g.player.y=9.5*TILE;Game.useTool();
      if(document.getElementById('menu').textContent.includes('water cup at the cedarwalk')) throw new Error('Fern repeats once-only response');
      closeMenu();
      g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';Game.useTool();
      if(!document.getElementById('menu').textContent.includes('Fern has left a cup')) throw new Error('road dialogue unchanged');
      closeMenu();
      if(!(g.gateWelcomeDay<g.day)) throw new Error('cup trigger state');
      g.day=24;g.seasonCached=Game.season();g.player.x=27.5*TILE;g.player.y=8.5*TILE;Game.useTool();
      if(!document.getElementById('menu').textContent.includes('turned down against the frost')) throw new Error('winter cup state');
      closeMenu();
      g.day=4;g.gateWelcomeDay=0;g.fern.x=27.5*TILE;g.fern.y=9.5*TILE;g.player.x=26.5*TILE;g.player.y=9.5*TILE;Game.useTool();
      if(document.getElementById('menu').textContent.includes('water cup at the cedarwalk')) throw new Error('unearned Fern line');
      closeMenu();
    } finally {
      Object.assign(Game.G,{day:keep.day,minutes:keep.minutes,player:keep.player,mara:keep.mara,fern:keep.fern,tool:keep.tool,friendship:keep.friendship,seenEvents:keep.seenEvents,gateWelcomeDay:keep.gateWelcomeDay,fernRoadHeard:keep.fernRoadHeard,indoor:keep.indoor,inCave:keep.inCave});
      Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();
    }
  },'the road remembers');
  step(()=>{ // v2.33: choice is earned, saved, distinct in pixels and social response
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},mara:{...g.mara},fern:{...g.fern},tool:g.tool,friendship:{...g.friendship},seenEvents:{...g.seenEvents},gateWelcomeDay:g.gateWelcomeDay,fernRoadHeard:g.fernRoadHeard,roadChoice:g.roadChoice,coins:g.coins,seeds:{...g.seeds},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=6;g.minutes=930;g.seasonCached=Game.season();g.gateWelcomeDay=0;g.fernRoadHeard=false;g.roadChoice='';
      g.indoor=false;g.inCave=false;g.tool=TOOLS.findIndex(t=>t.id==='hand');g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';
      Game.useTool();
      if(document.getElementById('menu').textContent.includes('plant a flower border')) throw new Error('unearned road choice');
      closeMenu();g.gateWelcomeDay=3;Game.useTool();
      const card=document.getElementById('menu').textContent;
      if(!card.includes('plant a flower border')||!card.includes('leave the verge wild')) throw new Error('both road paths absent');
      closeMenu();
      const coin=g.coins,seed=JSON.stringify(g.seeds);
      Game.useTool();
      [...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('plant a flower border')).click();
      if(g.roadChoice!=='flowers'||g.coins!==coin||JSON.stringify(g.seeds)!==seed) throw new Error('flower choice cost or commit');
      Game.save();Game.load();g=Game.G;
      if(g.roadChoice!=='flowers') throw new Error('flower choice lost on reload');
      const cv=Render.canvas;
      g.player.x=28*TILE;g.player.y=9*TILE;g.seasonCached=Game.season();
      g.roadChoice='flowers';Render.draw(g,100);const flowers=Render.ctx.getImageData(0,0,cv.width,cv.height).data;
      g.roadChoice='wild';Render.draw(g,100);const wild=Render.ctx.getImageData(0,0,cv.width,cv.height).data;
      if(flowers.filter((v,i)=>v!==wild[i]).length<120) throw new Error('road variants visually indistinct '+flowers.filter((v,i)=>v!==wild[i]).length);
      g.roadChoice='flowers';g.fernRoadHeard=true;g.fern.x=27.5*TILE;g.fern.y=9.5*TILE;g.player.x=26.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';g.friendship.fern=0;g.seenEvents={};
      Game.useTool();if(!document.getElementById('menu').textContent.includes('new border')) throw new Error('Fern misses flower choice');closeMenu();
      g.roadChoice='wild';Game.useTool();if(!document.getElementById('menu').textContent.includes('meadow is already leaning')) throw new Error('Fern misses wild choice');closeMenu();
      g.mara.x=20.5*TILE;g.mara.y=9.5*TILE;g.player.x=19.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';g.day=6;g.friendship.mara=0;g.seenEvents={};
      Game.useTool();if(!document.getElementById('menu').textContent.includes('let the verge stay wild')) throw new Error('Mara misses choice');closeMenu();
      g.roadChoice='flowers';g.player.x=27.5*TILE;g.player.y=8.5*TILE;g.player.dir='right';Game.useTool();
      if(!document.getElementById('menu').textContent.includes('planted a low row')||document.getElementById('menu').textContent.includes('leave the verge wild')) throw new Error('flower road does not persist');closeMenu();
      g.roadChoice='';g.day=g.gateWelcomeDay;Game.chooseRoad('wild');if(g.roadChoice) throw new Error('same-day choice allowed');g.day=6;Game.chooseRoad('wild');if(g.roadChoice!=='wild') throw new Error('wild choice failed');
      Game.chooseRoad('flowers');if(g.roadChoice!=='wild') throw new Error('second choice overwrote first');
    }finally{
      Object.assign(Game.G,{day:keep.day,minutes:keep.minutes,player:keep.player,mara:keep.mara,fern:keep.fern,tool:keep.tool,friendship:keep.friendship,seenEvents:keep.seenEvents,gateWelcomeDay:keep.gateWelcomeDay,fernRoadHeard:keep.fernRoadHeard,roadChoice:keep.roadChoice,coins:keep.coins,seeds:keep.seeds,indoor:keep.indoor,inCave:keep.inCave});
      Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();
    }
  },'roadside choice');
  step(()=>{ // v2.34: pond place, earned choice, real callbacks and a later Bram response
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},bram:{...g.bram},tool:g.tool,stats:{...g.stats},pondChoice:g.pondChoice,pondChoiceDay:g.pondChoiceDay,friendship:{...g.friendship},seenEvents:{...g.seenEvents},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=6;g.minutes=930;g.seasonCached=Game.season();g.indoor=false;g.inCave=false;
      g.player.x=11.5*TILE;g.player.y=21.5*TILE;g.player.dir='down';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.stats.caught=0;g.pondChoice='';g.pondChoiceDay=0;
      if(!Game.nearPondLookout()||Game.interactHint()!=='look across the pond')throw new Error('lookout discovery');
      Game.useTool();if(!document.getElementById('menu').textContent.includes('wet boards')||document.getElementById('menu').textContent.includes('give the reeds room'))throw new Error('unearned lookout');closeMenu();
      const farmRoute=Game.findPath(8,9,11,21);
      if(!farmRoute||farmRoute.length>50||farmRoute.some(([x,y])=>SOLID.has(g.grid[y*W+x])))throw new Error('lookout inaccessible from home');
      const shoreKey=22*W+9;
      const priorTile=g.grid[shoreKey],priorCrop=g.crops.get(shoreKey);
      g.grid[shoreKey]=T.SOIL;g.crops.set(shoreKey,{id:'cloveroot',age:1,stage:1,watered:false});
      Render.draw(g,100);Game.save();Game.load();g=Game.G;
      if(g.grid[shoreKey]!==T.SOIL||!g.crops.has(shoreKey))throw new Error('old shore cultivation lost');
      g.grid[shoreKey]=priorTile;if(priorCrop)g.crops.set(shoreKey,priorCrop);else g.crops.delete(shoreKey);
      g.stats.caught=1;Game.useTool();
      if(!document.getElementById('menu').textContent.includes('give the reeds room')||!document.getElementById('menu').textContent.includes('keep the lookout open'))throw new Error('earned lookout menu');
      const coin=g.coins,seed=JSON.stringify(g.seeds),xp=JSON.stringify(g.skillXp);
      [...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('give the reeds room')).click();
      if(g.pondChoice!=='reeds'||g.pondChoiceDay!==6||g.coins!==coin||JSON.stringify(g.seeds)!==seed||JSON.stringify(g.skillXp)!==xp)throw new Error('reeds cost/commit');
      Game.save();Game.load();g=Game.G;if(g.pondChoice!=='reeds'||g.pondChoiceDay!==6)throw new Error('pond choice reload');
      const draw=(choice,day)=>{g.pondChoice=choice;g.day=day;g.seasonCached=Game.season();Render.draw(g,100);return new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);};
      const reeds=draw('reeds',7),open=draw('open',7);
      if(reeds.filter((v,i)=>v!==open[i]).length<120)throw new Error('lookout variants too subtle');
      g.pondChoice='reeds';g.day=7;g.seasonCached=Game.season();Game.readPondLookout();
      if(!document.getElementById('menu').textContent.includes('birds settle there at dusk')||document.getElementById('menu').textContent.includes('keep the lookout open'))throw new Error('later reed response');closeMenu();
      g.pondChoice='open';Game.readPondLookout();if(!document.getElementById('menu').textContent.includes('open bank still catches'))throw new Error('later open response');closeMenu();
      g.day=6;g.pondChoice='reeds';Game.choosePond('open');if(g.pondChoice!=='reeds')throw new Error('choice overwritten');
      g.pondChoice='';g.player.x=30*TILE;Game.choosePond('open');if(g.pondChoice)throw new Error('distant choice');
      g.player.x=11.5*TILE;Game.readPondLookout();[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('keep the lookout open')).click();if(g.pondChoice!=='open')throw new Error('open choice click');
      g.day=7;g.minutes=600;g.bram.x=12*TILE;g.bram.y=23*TILE;g.friendship.bram=0;g.seenEvents={};Game.talkTo('bram');if(!document.getElementById('menu').textContent.includes('low light right across'))throw new Error('Bram open follow-through');closeMenu();
      g.pondChoice='reeds';Game.talkTo('bram');if(!document.getElementById('menu').textContent.includes('little birds are back'))throw new Error('Bram reed follow-through');closeMenu();
      g.day=6;Game.talkTo('bram');if(document.getElementById('menu').textContent.includes('little birds are back'))throw new Error('Bram response too early');closeMenu();
      const legacy=JSON.parse(localStorage.getItem(SAVE_KEY));delete legacy.pondChoice;delete legacy.pondChoiceDay;localStorage.setItem(SAVE_KEY,JSON.stringify(legacy));Game.load();g=Game.G;
      if(g.pondChoice!==''||g.pondChoiceDay!==0)throw new Error('old pond save default');
    }finally{
      Object.assign(Game.G,{day:keep.day,minutes:keep.minutes,player:keep.player,bram:keep.bram,tool:keep.tool,stats:keep.stats,pondChoice:keep.pondChoice,pondChoiceDay:keep.pondChoiceDay,friendship:keep.friendship,seenEvents:keep.seenEvents,indoor:keep.indoor,inCave:keep.inCave});
      Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();
    }
  },'pond lookout');
  step(()=>{ // v2.35: visible second-day lesson with a player answer and a later gathering
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},fern:{...g.fern},mara:{...g.mara},tool:g.tool,meadowLesson:g.meadowLesson,meadowLessonDay:g.meadowLessonDay,meadowLessonHeard:g.meadowLessonHeard,friendship:{...g.friendship},seenEvents:{...g.seenEvents},coins:g.coins,seeds:{...g.seeds},produce:{...g.produce},skillXp:{...g.skillXp},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=1;g.minutes=690;g.indoor=false;g.inCave=false;g.meadowLesson='';g.meadowLessonDay=0;g.meadowLessonHeard=false;g.friendship.fern=0;g.friendship.mara=0;g.seenEvents={};g.seasonCached=Game.season();
      if(Game.meadowVisit())throw new Error('day-one scene arrived too early');
      g.day=2;g.minutes=690;
      if(!Game.LETTERS.some(L=>L.id==='lesson'&&L.cond(g)))throw new Error('day-two letter absent');
      const route=Game.findPath(9,9,12,17);
      if(!route||route.length>30||route.some(([x,y])=>SOLID.has(g.grid[y*W+x])))throw new Error('lesson disconnected from new-game house');
      if(!Game.meadowVisit()||Game.npcWaypoint('fern')[1]!==12.5)throw new Error('day-two visit not scheduled');
      g.fern.x=3.5*TILE;g.fern.y=18*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;delete g.fern.pathGoal;g.fern.path=[];
      let nearest=Infinity;
      for(let i=0;i<520;i++){
        Game.updateNpcs(80);const tile=g.grid[Math.floor(g.fern.y/TILE)*W+Math.floor(g.fern.x/TILE)];
        if(SOLID.has(tile))throw new Error('Fern crosses solid tile to lesson');
        nearest=Math.min(nearest,Math.hypot(g.fern.x-12.5*TILE,g.fern.y-17.5*TILE));
      }
      if(nearest>TILE*.8)throw new Error('Fern never arrives at the lesson');
      g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;
      g.player.x=11.5*TILE;g.player.y=17.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.interactHint()!=='talk')throw new Error('lesson not discoverable by hand');
      Game.useTool();
      const menu=document.getElementById('menu');
      if(!menu.textContent.includes('canvas roof')||!menu.textContent.includes('leave the circle open'))throw new Error('lesson question/options missing');
      const before={coins:g.coins,seeds:JSON.stringify(g.seeds),produce:JSON.stringify(g.produce),xp:JSON.stringify(g.skillXp)};
      [...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('set a canvas shade')).click();
      if(g.meadowLesson!=='shade'||g.meadowLessonDay!==2||menuOpen())throw new Error('shade callback failed');
      if(g.coins!==before.coins||JSON.stringify(g.seeds)!==before.seeds||JSON.stringify(g.produce)!==before.produce||JSON.stringify(g.skillXp)!==before.xp)throw new Error('choice changed resources');
      Game.chooseMeadowLesson('sky');if(g.meadowLesson!=='shade')throw new Error('second choice overwrote first');
      g.day=4;g.meadowLesson='';g.meadowLessonDay=0;g.minutes=690;Game.talkTo('fern');if(!menu.textContent.includes('set a canvas shade'))throw new Error('day-four catch-up absent');
      [...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('set a canvas shade')).click();
      if(g.meadowLesson!=='shade'||g.meadowLessonDay!==4)throw new Error('late-arriving choice failed');
      g.day=2;g.meadowLessonDay=2;Game.save();
      Game.save();Game.load();g=Game.G;if(g.meadowLesson!=='shade'||g.meadowLessonDay!==2)throw new Error('lesson save lost');
      g.day=4;g.minutes=690;g.seasonCached=Game.season();g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.player.x=11.5*TILE;g.player.y=17.5*TILE;
      g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';
      if(Game.interactHint()!=='visit the field lesson')throw new Error('return hint missing');
      Game.useTool();if(!menu.textContent.includes('stitched canvas roof'))throw new Error('return scene missing');closeMenu();
      g.player.x=11.5*TILE;g.player.dir='right';
      if(Game.interactHint()!=='talk')throw new Error('return Fern talk not reachable');
      Game.useTool();if(!menu.textContent.includes('sat in the shade')||!g.meadowLessonHeard)throw new Error('Fern later payoff missing');closeMenu();
      Game.save();Game.load();g=Game.G;if(!g.meadowLessonHeard)throw new Error('later talk not saved');
      g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;Game.talkTo('fern');if(menu.textContent.includes('sat in the shade'))throw new Error('later talk repeats');closeMenu();
      g.day=4;g.minutes=780;g.mara.x=15.5*TILE;g.mara.y=10.8*TILE;
      if(Game.npcWaypoint('mara')[1]!==14.5)throw new Error('Mara did not visit lesson');
      delete g.mara.pathGoal;g.mara.path=[];let maraNear=Infinity;
      for(let i=0;i<520;i++){Game.updateNpcs(80);if(SOLID.has(g.grid[Math.floor(g.mara.y/TILE)*W+Math.floor(g.mara.x/TILE)]))throw new Error('Mara crosses solid tile');maraNear=Math.min(maraNear,Math.hypot(g.mara.x-14.5*TILE,g.mara.y-17.5*TILE));}
      if(maraNear>TILE*.8)throw new Error('Mara missed the lesson');
      g.day=8;g.mara.x=15.5*TILE;g.mara.y=10.8*TILE;Game.talkTo('mara');if(!menu.textContent.includes('kept the ink dry'))throw new Error('Mara misses scene');closeMenu();
      g.day=2;g.meadowLesson='';g.meadowLessonDay=0;g.meadowLessonHeard=false;g.minutes=690;g.player.x=11.5*TILE;g.player.y=17.5*TILE;g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;
      Game.talkTo('fern');[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('leave the circle open')).click();
      if(g.meadowLesson!=='sky')throw new Error('sky callback failed');
      g.day=4;Game.talkTo('fern');if(!menu.textContent.includes('sat out in the open'))throw new Error('sky payoff absent');closeMenu();
      const pixels=(choice)=>{g.meadowLesson=choice;Render.draw(g,100);return new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);};
      const shade=pixels('shade'),sky=pixels('sky');if(shade.filter((v,i)=>v!==sky[i]).length<400)throw new Error('choice art too slight');
      const patch=16*W+11, oldTile=g.grid[patch], oldCrop=g.crops.get(patch);g.meadowLesson='shade';g.grid[patch]=T.SOIL;g.crops.set(patch,{id:'cloveroot',stage:3,age:3,watered:false});
      Render.draw(g,100);if(g.grid[patch]!==T.SOIL||g.crops.get(patch)?.id!=='cloveroot')throw new Error('worked lesson ground altered');
      const cleared=pixels('shade');if(cleared.filter((v,i)=>v!==shade[i]).length<200)throw new Error('crop did not suspend canvas roof');
      g.grid[patch]=oldTile;if(oldCrop)g.crops.set(patch,oldCrop);else g.crops.delete(patch);
      g.day=2;g.meadowLesson='';g.player.x=30*TILE;Game.chooseMeadowLesson('shade');if(g.meadowLesson)throw new Error('distant choice allowed');
      const old=JSON.parse(localStorage.getItem(SAVE_KEY));delete old.meadowLesson;delete old.meadowLessonDay;delete old.meadowLessonHeard;localStorage.setItem(SAVE_KEY,JSON.stringify(old));Game.load();g=Game.G;
      if(g.meadowLesson||g.meadowLessonDay||g.meadowLessonHeard)throw new Error('older save migrated badly');
    } finally {
      Object.assign(Game.G,keep);Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();
    }
  },'field lesson scene');
  step(()=>{ // v2.36: player-led field plan beyond Fern's opening question
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},fern:{...g.fern},mara:{...g.mara},tool:g.tool,meadowLesson:g.meadowLesson,meadowLessonDay:g.meadowLessonDay,meadowLessonHeard:g.meadowLessonHeard,fernRoadHeard:g.fernRoadHeard,fieldPlan:g.fieldPlan,fieldPlanDay:g.fieldPlanDay,fieldPlanHeard:g.fieldPlanHeard,friendship:{...g.friendship},seenEvents:{...g.seenEvents},gateWelcomeDay:g.gateWelcomeDay,roadChoice:g.roadChoice,coins:g.coins,seeds:{...g.seeds},produce:{...g.produce},skillXp:{...g.skillXp},indoor:g.indoor,inCave:g.inCave};
    const menu=document.getElementById('menu');
    try{
      g.day=4;g.minutes=690;g.indoor=false;g.inCave=false;g.meadowLesson='';g.meadowLessonDay=0;g.fieldPlan='';g.fieldPlanDay=0;g.fieldPlanHeard=false;g.fernRoadHeard=false;g.seasonCached=Game.season();
      g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      Game.chooseFieldPlan('walk');if(g.fieldPlan)throw new Error('unearned field plan');
      g.meadowLesson='shade';g.meadowLessonDay=4;Game.chooseFieldPlan('walk');if(g.fieldPlan)throw new Error('same-day field plan');
      g.meadowLessonDay=2;g.gateWelcomeDay=0;g.fern.x=20*TILE;g.fern.y=30*TILE;Game.useTool();
      if(!menu.textContent.includes('mark a walking way')||!menu.textContent.includes('leave a nesting strip'))throw new Error('field plan menu absent '+JSON.stringify({menu:menu.textContent.slice(0,250),hint:Game.interactHint(),near:Game.nearMeadowLesson(),fern:Game.nearNpc('fern'),gather:Game.fieldGathering(),day:g.day,plan:g.fieldPlan,lesson:g.meadowLesson,player:g.player,tool:g.tool,indoor:g.indoor}));
      const before={coins:g.coins,seeds:JSON.stringify(g.seeds),produce:JSON.stringify(g.produce),xp:JSON.stringify(g.skillXp)};
      [...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('mark a walking way')).click();
      if(g.fieldPlan!=='walk'||g.fieldPlanDay!==4||menuOpen())throw new Error('walk menu callback');
      if(g.coins!==before.coins||JSON.stringify(g.seeds)!==before.seeds||JSON.stringify(g.produce)!==before.produce||JSON.stringify(g.skillXp)!==before.xp)throw new Error('field plan resource change');
      Game.chooseFieldPlan('nest');if(g.fieldPlan!=='walk')throw new Error('overwrote chosen field plan');
      Game.save();Game.load();g=Game.G;if(g.fieldPlan!=='walk'||g.fieldPlanDay!==4)throw new Error('plan not saved');
      const workedBefore=g.grid[20*W+16];g.grid[20*W+16]=T.SOIL;g.crops.set(20*W+16,{id:'cloveroot',stage:2,age:2,watered:false});Game.save();Game.load();g=Game.G;
      if(g.grid[20*W+16]!==T.SOIL||g.crops.get(20*W+16)?.id!=='cloveroot')throw new Error('field plan erased farm work after reload');
      g.crops.delete(20*W+16);g.grid[20*W+16]=workedBefore;
      g.day=5;g.minutes=690;g.seasonCached=Game.season();g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.meadowLessonHeard=true;
      Game.useTool();if(!menu.textContent.includes('broad way')||menu.textContent.includes('nesting strip'))throw new Error('walking passage');closeMenu();
      g.player.x=11.5*TILE;g.player.dir='right';g.friendship.fern=0;g.seenEvents={};Game.useTool();
      if(!menu.textContent.includes('walking way this morning')||!g.fieldPlanHeard)throw new Error('Fern walking payoff');closeMenu();
      Game.save();Game.load();g=Game.G;if(!g.fieldPlanHeard)throw new Error('heard plan lost on save');
      g.fern.x=12.5*TILE;g.player.x=11.5*TILE;g.player.dir='right';Game.talkTo('fern');if(menu.textContent.includes('walking way this morning'))throw new Error('Fern repeats payoff');closeMenu();
      g.day=6;g.minutes=690;g.friendship.mara=0;g.seenEvents={};Game.talkTo('mara');if(!menu.textContent.includes('carry baskets'))throw new Error('Mara walking line');closeMenu();
      g.day=4;g.fieldPlan='';g.fieldPlanDay=0;g.fieldPlanHeard=false;g.fernRoadHeard=true;g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.fern.x=20*TILE;g.fern.y=30*TILE;
      Game.useTool();[...document.querySelectorAll('#menu-items .menu-row')].find(r=>r.textContent.includes('leave a nesting strip')).click();
      if(g.fieldPlan!=='nest'||g.fieldPlanDay!==4)throw new Error('nest menu callback');
      g.day=5;g.meadowLessonHeard=true;g.fern.x=12.5*TILE;g.fern.y=17.5*TILE;g.player.x=11.5*TILE;g.player.dir='right';g.friendship.fern=0;g.seenEvents={};Game.talkTo('fern');
      if(!menu.textContent.includes('bird slip into the strip'))throw new Error('Fern nesting payoff: '+JSON.stringify({day:g.day,plan:g.fieldPlan,planDay:g.fieldPlanDay,heard:g.fieldPlanHeard,lessonHeard:g.meadowLessonHeard,fernRoad:g.fernRoadHeard,near:Game.nearMeadowLesson(),nearFern:Game.nearNpc('fern'),text:menu.textContent.slice(0,220)}));closeMenu();
      const capture=(plan,day)=>{g.fieldPlan=plan;g.day=day;g.seasonCached=Game.season();Render.draw(g,100);return new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);};
      const walk=capture('walk',5),nest=capture('nest',5);if(walk.filter((v,i)=>v!==nest[i]).length<300)throw new Error('plan art indistinct');
      const key=20*W+16, oldTile=g.grid[key],oldCrop=g.crops.get(key);g.grid[key]=T.SOIL;g.crops.set(key,{id:'cloveroot',stage:2,age:2,watered:false});
      Render.draw(g,100);if(g.grid[key]!==T.SOIL||g.crops.get(key)?.id!=='cloveroot')throw new Error('field plan overwrote crop');
      g.grid[key]=oldTile;if(oldCrop)g.crops.set(key,oldCrop);else g.crops.delete(key);
      g.day=7;g.fieldPlan='';g.player.x=30*TILE;Game.chooseFieldPlan('walk');if(g.fieldPlan)throw new Error('distant plan allowed');
      g.player.x=14.4*TILE;Game.chooseFieldPlan('walk');if(g.fieldPlan!=='walk')throw new Error('late return after fair missed');
      const legacy=JSON.parse(localStorage.getItem(SAVE_KEY));delete legacy.fieldPlan;delete legacy.fieldPlanDay;delete legacy.fieldPlanHeard;localStorage.setItem(SAVE_KEY,JSON.stringify(legacy));Game.load();g=Game.G;
      if(g.fieldPlan||g.fieldPlanDay||g.fieldPlanHeard)throw new Error('old save plan migration');
    }finally{Object.assign(Game.G,keep);Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();}
  },'field plan follow-through');
  step(()=>{ // v2.37: seasonal returns to the field, live NPCs and hand interaction
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},fern:{...g.fern},mara:{...g.mara},tool:g.tool,fieldPlan:g.fieldPlan,fieldPlanDay:g.fieldPlanDay,fieldGathered:[...(g.fieldGathered||[])],coins:g.coins,produce:{...g.produce},skillXp:{...g.skillXp},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=9;g.minutes=690;g.indoor=false;g.inCave=false;g.fieldPlan='walk';g.fieldPlanDay=4;g.fieldGathered=[];g.seasonCached=Game.season();
      g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      Game.checkLetters();if(!g.letters.some(l=>l.id==='gather'))throw new Error('season invitation missing');
      if(Game.npcWaypoint('fern')[1]!==11.5||Game.npcWaypoint('mara')[1]!==14.5)throw new Error('field NPC schedule absent');
      for(const id of ['fern','mara']){const n=g[id],wp=Game.npcWaypoint(id);n.x=wp[1]*TILE;n.y=wp[2]*TILE;n.tx=n.x;n.ty=n.y;n.path=[];n.pathGoal='';Game.updateNpcs(100);if(SOLID.has(Game.tileAt(Math.floor(n.x/TILE),Math.floor(n.y/TILE))))throw new Error(id+' standing in solid field tile');}
      if(!Game.nearNpc('mara'))throw new Error('Mara absent from field');
      if(!Game.fieldGathering()||Game.interactHint()!=='join the field gathering')throw new Error('field gathering hand hint');
      Game.useTool();if(!menu.textContent.includes('sit and look with them')||!menu.textContent.includes('walking way'))throw new Error('summer gathering menu');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('sit and look')).click();
      if(menuOpen()||g.fieldGathered.join()!=='1'||g.coins!==keep.coins||JSON.stringify(g.produce)!==JSON.stringify(keep.produce))throw new Error('gathering callback/resources');
      Game.save();Game.load();g=Game.G;if(g.fieldGathered.join()!=='1')throw new Error('season memory not saved');
      g.day=10;g.minutes=690;g.seasonCached=Game.season();g.player.x=14.4*TILE;g.player.y=17.5*TILE;
      Game.useTool();if(menu.textContent.includes('sit and look with them'))throw new Error('repeat season reward');closeMenu();
      g.day=17;g.seasonCached=Game.season();Game.useTool();if(!menu.textContent.includes('Leaves gather'))throw new Error('autumn follow-through');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('sit and look')).click();
      g.day=23;g.seasonCached=Game.season();Game.useTool();if(!menu.textContent.includes('Snow has nearly hidden'))throw new Error('winter follow-through');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('sit and look')).click();
      if(g.fieldGathered.join()!=='1,2,3')throw new Error('season sequence missing');
      g.day=9;g.seasonCached=Game.season();g.fieldPlan='walk';g.grid[17*W+10]=T.SOIL;g.crops.set(17*W+10,{id:'cloveroot',stage:2,age:2,watered:false});Render.draw(g,100);if(g.grid[17*W+10]!==T.SOIL||g.crops.get(17*W+10)?.id!=='cloveroot')throw new Error('field folio masked farm work');g.crops.delete(17*W+10);g.grid[17*W+10]=T.GRASS;
      Game.openJournal();if(!menu.textContent.includes('Summer at the field')||!menu.textContent.includes('Autumn at the field')||!menu.textContent.includes('Winter at the field'))throw new Error('journal misses seasons');closeMenu();
      g.day=28;if(Game.fieldGathering()||Game.npcWaypoint('fern')[1]===11.5)throw new Error('festival routine overridden');
      g.day=9;g.fieldPlan='nest';g.fieldGathered=[];g.seasonCached=Game.season();Game.useTool();if(!menu.textContent.includes('Summer insects hum'))throw new Error('nest path missing');closeMenu();
      g.player.x=35*TILE;Game.rememberFieldGathering(1);if(g.fieldGathered.length)throw new Error('distant gathering allowed');
      const old=JSON.parse(localStorage.getItem(SAVE_KEY));delete old.fieldGathered;localStorage.setItem(SAVE_KEY,JSON.stringify(old));Game.load();g=Game.G;
      if(g.fieldGathered.length)throw new Error('older save gathering migration');
    }finally{Object.assign(Game.G,keep);Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();}
  },'seasonal field gathering');
  step(()=>{ // once-per-season field day is reachable after ordinary farm work
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},tool:g.tool,fieldPlan:g.fieldPlan,fieldPlanDay:g.fieldPlanDay,fieldSeasons:[...(g.fieldSeasons||[])],fieldSeasonPending:g.fieldSeasonPending,coins:g.coins,produce:{...g.produce},skillXp:{...g.skillXp},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=12;g.minutes=720;g.indoor=false;g.inCave=false;g.fieldPlan='walk';g.fieldPlanDay=4;g.fieldSeasons=[];g.fieldSeasonPending=-1;g.seasonCached=Game.season();
      Game.checkLetters();if(!g.letters.some(l=>l.id==='seasonField'))throw new Error('field-day invitation absent');
      g.player.x=9*TILE;g.player.y=9*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      if(Game.npcWaypoint('fern')[1]!==13.5||Game.npcWaypoint('mara')[1]!==16.5)throw new Error('field day NPC schedule missing');
      const route=Game.findPath(9,9,15,19);if(!route||route.length<12)throw new Error('home-to-field route lost');
      const cropKey=13*W+20;const priorCrop=g.crops.get(cropKey),priorTile=g.grid[cropKey];g.crops.set(cropKey,{id:'sunbean',age:2,stage:1,watered:false});g.grid[cropKey]=T.SOIL;
      for(const [x,y] of route.slice(1)){if(!Game.walkable((x+.5)*TILE,(y+.5)*TILE))throw new Error('route blocked');g.player.x=(x+.5)*TILE;g.player.y=(y+.5)*TILE;g.minutes+=2;}
      if(!Game.nearFieldSeasonDay()||Game.interactHint()!=='spend the field day')throw new Error('season hand hint');
      Game.useTool();const menu=document.getElementById('menu');if(!menu.textContent.includes('carry a basket together'))throw new Error('walk scene missing');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('carry a basket')).click();
      if(g.fieldSeasons.length||g.fieldSeasonPending!==1||menuOpen())throw new Error('season day callback');
      if(g.coins!==keep.coins||JSON.stringify(g.produce)!==JSON.stringify(keep.produce)||JSON.stringify(g.skillXp)!==JSON.stringify(keep.skillXp))throw new Error('season day changed resources');
      if(g.grid[cropKey]!==T.SOIL||g.crops.get(cropKey)?.id!=='sunbean')throw new Error('season day changed crop');
      Game.save();Game.load();g=Game.G;if(g.fieldSeasonPending!==1||g.fieldSeasons.length)throw new Error('season pending save lost');
      Game.sleep();g=Game.G;if(g.fieldSeasons.join()!=='1'||g.fieldSeasonPending!==-1)throw new Error('field day dawn memory missing');
      g.day=19;g.minutes=720;g.seasonCached=Game.season();g.player.x=15.5*TILE;g.player.y=19.5*TILE;Game.useTool();if(!menu.textContent.includes('sweep the stones'))throw new Error('autumn scene');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('sweep the turning')).click();Game.sleep();g=Game.G;
      g.day=26;g.minutes=720;g.seasonCached=Game.season();Game.useTool();if(!menu.textContent.includes('brush a narrow line'))throw new Error('winter scene');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('brush a way')).click();Game.sleep();g=Game.G;
      if(g.fieldSeasons.join()!=='1,2,3')throw new Error('season arc missing');
      Game.openJournal();if(!menu.textContent.includes('Summer field day')||!menu.textContent.includes('Winter field day'))throw new Error('journal arc absent');closeMenu();
      g.day=12;g.fieldPlan='nest';g.fieldSeasons=[];g.fieldSeasonPending=-1;g.minutes=720;g.seasonCached=Game.season();Game.useTool();if(!menu.textContent.includes('count the small birds'))throw new Error('nest branch missing');closeMenu();
      g.day=13;if(!Game.nearFieldSeasonDay())throw new Error('second catch-up day absent');g.day=14;if(Game.nearFieldSeasonDay()||Game.npcWaypoint('mara')[1]===16.5)throw new Error('festival window leaked');
      g.day=12;g.player.x=35*TILE;Game.keepFieldSeasonDay(1);if(g.fieldSeasons.length)throw new Error('distant season claim');
      g.player.x=15.5*TILE;g.player.y=19.5*TILE;g.crops.set(19*W+15,{id:'sunbean',age:2,stage:1,watered:false});g.grid[19*W+15]=T.SOIL;Render.draw(g,100);
      if(g.grid[19*W+15]!==T.SOIL||g.crops.get(19*W+15)?.id!=='sunbean')throw new Error('season art covered crop');
      g.crops.delete(19*W+15);g.grid[19*W+15]=T.GRASS;
      g.crops.delete(cropKey);if(priorCrop)g.crops.set(cropKey,priorCrop);g.grid[cropKey]=priorTile;
      const old=JSON.parse(localStorage.getItem(SAVE_KEY));delete old.fieldSeasons;delete old.fieldSeasonPending;localStorage.setItem(SAVE_KEY,JSON.stringify(old));Game.load();g=Game.G;
      if(g.fieldSeasons.length||g.fieldSeasonPending!==-1)throw new Error('legacy season migration');
    }finally{Object.assign(Game.G,keep);Game.G.grid=makeWorld();Game.G.crops.clear();Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();}
  },'field season day');
  step(()=>{ // A routine farm route finds a marker, then a late first meeting can still happen.
    let g=Game.G;
    const keep={day:g.day,minutes:g.minutes,player:{...g.player},fern:{...g.fern},tool:g.tool,meadowLesson:g.meadowLesson,meadowLessonDay:g.meadowLessonDay,fieldPlan:g.fieldPlan,fieldPlanDay:g.fieldPlanDay,fieldSeasons:[...(g.fieldSeasons||[])],fieldSeasonPending:g.fieldSeasonPending,seenEvents:{...g.seenEvents},friendship:{...g.friendship},indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=15;g.minutes=690;g.indoor=false;g.inCave=false;g.meadowLesson='';g.meadowLessonDay=0;g.fieldPlan='';g.fieldPlanDay=0;g.fieldSeasons=[];g.fieldSeasonPending=-1;g.seasonCached=Game.season();g.tool=TOOLS.findIndex(t=>t.id==='hand');g.friendship.fern=0;g.seenEvents={};
      g.player.x=9.5*TILE;g.player.y=9.5*TILE;g.player.dir='right';
      const toCrop=Game.findPath(9,9,19,13);if(!toCrop||!toCrop.some(([x,y])=>x===21&&y===10))throw new Error('ordinary farm route misses gate');
      for(const [x,y] of toCrop.slice(1)){
        if(!Game.walkable((x+.5)*TILE,(y+.5)*TILE))throw new Error('crop route blocked');
        g.player.x=(x+.5)*TILE;g.player.y=(y+.5)*TILE;
        if(x===21&&y===10){
          if(Game.interactHint()!=="read Fern's field note")throw new Error('gate note hint missing');
          Game.useTool();const note=document.getElementById('menu').textContent;
          if(!note.includes('west field')||!note.includes('After ten')||g.meadowLesson)throw new Error('gate note preempted choice');
          closeMenu();
        }
      }
      if(!Game.meadowVisit()||Game.npcWaypoint('fern')[1]!==12.5)throw new Error('late invitation did not bring Fern');
      // Walk from the worked rows to Fern's physical table, not a staging fixture.
      const toFern=Game.findPath(19,13,11,17);if(!toFern)throw new Error('field table cut off');
      for(const [x,y] of toFern.slice(1)){if(!Game.walkable((x+.5)*TILE,(y+.5)*TILE))throw new Error('table route blocked');g.player.x=(x+.5)*TILE;g.player.y=(y+.5)*TILE;}
      g.player.dir='right';g.fern.x=20*TILE;g.fern.y=30*TILE;g.fern.pathGoal='';g.fern.path=[];g.fern.tx=g.fern.x;g.fern.ty=g.fern.y;
      let arrived=false;
      for(let i=0;i<1250;i++){
        Game.updateNpcs(80);
        if(SOLID.has(Game.tileAt(Math.floor(g.fern.x/TILE),Math.floor(g.fern.y/TILE))))throw new Error('Fern crossed a solid tile on catch-up visit');
        arrived=arrived||Math.hypot(g.fern.x-12.5*TILE,g.fern.y-17.5*TILE)<TILE*.8;
        if(arrived&&Game.nearNpc('fern'))break;
      }
      if(!arrived||!Game.nearNpc('fern'))throw new Error('Fern never arrived at the table');
      Game.useTool();let menu=document.getElementById('menu');
      if(!menu.textContent.includes('canvas roof')||!menu.textContent.includes('open to the sky'))throw new Error('late table choice absent');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('leave the circle open')).click();
      if(g.meadowLesson!=='sky'||g.meadowLessonDay!==15)throw new Error('late lesson callback');
      g.day=16;g.minutes=690;g.seasonCached=Game.season();g.player.x=14.4*TILE;g.player.y=17.5*TILE;g.player.dir='left';
      Game.useTool();menu=document.getElementById('menu');if(!menu.textContent.includes('mark a walking way'))throw new Error('next-day plan absent');
      [...menu.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('mark a walking way')).click();
      if(g.fieldPlan!=='walk'||g.fieldPlanDay!==16)throw new Error('late field plan callback');
      g.day=19;g.minutes=690;g.seasonCached=Game.season();g.player.x=15.5*TILE;g.player.y=19.5*TILE;g.player.dir='right';
      if(!Game.nearFieldSeasonDay())throw new Error('late-start seasonal day absent');
      // Festival, night and winter pause the first meeting without erasing it.
      g.meadowLesson='';g.fieldPlan='';g.day=21;g.minutes=750;g.seasonCached=Game.season();if(Game.meadowVisit())throw new Error('festival table opened');
      g.day=22;g.minutes=1000;if(Game.meadowVisit())throw new Error('night meeting opened');
      g.day=20;g.minutes=690;if(!Game.meadowVisit())throw new Error('pre-festival catch-up missing');
      g.day=26;g.meadowLesson='sky';g.meadowLessonDay=15;g.fieldPlan='';g.seasonCached=Game.season();g.player.x=21.5*TILE;g.player.y=10.5*TILE;
      if(Game.nearFieldNotice())throw new Error('note remained after lesson');
      g.day=27;g.meadowLesson='';g.seasonCached=Game.season();if(!Game.nearFieldNotice()||Game.meadowVisit())throw new Error('winter note/meeting mismatch');
      Game.save();Game.load();g=Game.G;if(!Game.nearFieldNotice())throw new Error('winter note lost on save');
    }finally{Object.assign(Game.G,keep);Game.G.seasonCached=Game.season();if(menuOpen())closeMenu();}
  },'late field invitation on ordinary farm route');
  step(()=>{ // normal farm-to-road route, live hand callback and weekly social continuity
    const keep=Game.G, oldSave=localStorage.getItem(SAVE_KEY);
    try{
      Game.newGame();let g=Game.G;
      // Normal farm work, then sleep to the first midgame morning. No field-plan staging.
      g.player.x=19.5*TILE;g.player.y=13.5*TILE;g.player.dir='right';g.tool=TOOLS.findIndex(t=>t.id==='can');
      Game.useTool();if(!g.stats.watered)throw new Error('crop routine not exercised');
      for(let d=1;d<8;d++)Game.sleep();
      if(g.day!==8||g.fieldPlan||g.meadowLesson)throw new Error('route prerequisites changed');
      if(!g.letters.some(l=>l.id==='table'&&l.body.includes('first or sixth morning')))throw new Error('midgame invitation missing');
      g.minutes=600;g.seasonCached=Game.season();
      const path=Game.findPath(Math.floor(g.player.x/TILE),Math.floor(g.player.y/TILE),18,8);
      if(!path||path.length<4||path.some(([x,y])=>SOLID.has(g.grid[y*W+x])))throw new Error('road table unreachable from crop row');
      for(const [x,y] of path){g.player.x=(x+.5)*TILE;g.player.y=(y+.5)*TILE;}
      if(g.player.x!==18.5*TILE||g.player.y!==8.5*TILE)throw new Error('route did not reach board');
      g.tool=TOOLS.findIndex(t=>t.id==='hand');g.player.dir='up';
      if(!Game.nearCommonTable()||!Game.interactHint().includes('table'))throw new Error('table not discovered on road');
      const coins=g.coins,energy=g.energy,produce=JSON.stringify(g.produce),xp=JSON.stringify(g.skillXp);
      Game.useTool();let m=document.getElementById('menu');
      if(!m.textContent.includes('draw the valley')||!m.textContent.includes('write what we remember'))throw new Error('first choice absent');
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('draw the valley')).click();
      if(g.commonTable!=='sketches'||g.tableWeeks.join()!=='1'||g.minutes<660||menuOpen())throw new Error('first live callback failed');
      if(g.coins!==coins||g.energy!==energy||JSON.stringify(g.produce)!==produce||JSON.stringify(g.skillXp)!==xp)throw new Error('table gave an economy reward');
      Game.useTool();if(m.textContent.includes('add another page'))throw new Error('repeat week allowed');closeMenu();
      g.day=15;g.minutes=600;g.seasonCached=Game.season();
      if(!Game.tableDay()||Game.npcWaypoint('mara')[1]!==17.5||Game.npcWaypoint('fern')[1]!==12.5)throw new Error('table displaced active field lesson or Mara absent '+JSON.stringify({mara:Game.npcWaypoint('mara'),fern:Game.npcWaypoint('fern'),day:g.day,minutes:g.minutes,tableDay:Game.tableDay(),meadow:Game.meadowVisit(),field:Game.fieldSeasonDay(),gather:Game.fieldGathering()}));
      Game.useTool();[...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('add another page')).click();
      if(g.tableWeeks.join()!=='1,2')throw new Error('second week missing');
      g.day=22;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('add another page')).click();
      if(g.tableWeeks.join()!=='1,2,3')throw new Error('third page missing');
      Game.openJournal();if(!m.textContent.includes('three pages now face the road'))throw new Error('journal continuity missing');closeMenu();
      Game.save();Game.load();g=Game.G;
      if(g.commonTable!=='sketches'||g.tableWeeks.join()!=='1,2,3')throw new Error('table save lost');
      g.day=16;g.minutes=800;g.seasonCached=Game.season();if(Game.tableDay())throw new Error('wrong weekday allowed');
      g.day=21;g.minutes=750;g.seasonCached=Game.season();if(Game.tableDay())throw new Error('festival allowed');
      g.day=13;g.minutes=600;g.fieldPlan='walk';g.fieldPlanDay=4;g.fieldSeasons=[];g.fieldSeasonPending=-1;g.seasonCached=Game.season();
      if(!Game.fieldSeasonDay()||Game.tableDay())throw new Error('south field conflict not honored');g.fieldPlan='';
      g.day=22;g.minutes=520;if(Game.tableDay())throw new Error('before nine allowed');
      g.day=8;g.minutes=600;g.seasonCached=Game.season();g.commonTable='';g.tableWeeks=[];
      Game.useTool();[...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('write what we remember')).click();
      if(g.commonTable!=='stories'||g.tableWeeks.join()!=='1')throw new Error('stories callback failed');
      Game.save();let old=JSON.parse(localStorage.getItem(SAVE_KEY));delete old.commonTable;delete old.tableWeeks;
      localStorage.setItem(SAVE_KEY,JSON.stringify(old));Game.load();g=Game.G;
      if(g.commonTable||g.tableWeeks.length)throw new Error('older save defaults');
      g.tableWeeks=['bad',-1,1,1,1001,2.5];Game.save();Game.load();g=Game.G;
      if(g.tableWeeks.join()!=='1')throw new Error('malformed weeks accepted');
      // Branches and crop-safe hide must change the actual rendered pixels.
      g.day=22;g.minutes=600;g.seasonCached=Game.season();g.player.x=18.5*TILE;g.player.y=8.5*TILE;
      g.commonTable='sketches';g.tableWeeks=[1,2,3];Render.draw(g,100);
      const sketch=new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);
      g.commonTable='stories';Render.draw(g,100);
      const story=new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);
      let changed=0;for(let i=0;i<sketch.length;i+=4)if(sketch[i]!==story[i]||sketch[i+1]!==story[i+1])changed++;
      if(changed<12)throw new Error('branch display not visually distinct '+changed);
      // Weekly drawings must change the board itself, not only the journal.
      const pagePixels=[];
      for(const weeks of [[1],[1,2],[1,2,3]]){
        g.commonTable='sketches';g.tableWeeks=weeks;Render.draw(g,100);
        pagePixels.push(new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data));
      }
      for(let n=1;n<3;n++){
        let pixels=0;for(let i=0;i<pagePixels[n].length;i+=4)
          if(pagePixels[n][i]!==pagePixels[n-1][i]||pagePixels[n][i+1]!==pagePixels[n-1][i+1])pixels++;
        if(pixels<12)throw new Error('weekly page '+(n+1)+' not visible on board '+pixels);
      }
      // Structure yields to cultivated ground without deleting a player crop.
      const k=7*W+19;g.grid[k]=T.SOIL;g.crops.set(k,{id:'cloveroot',stage:1,age:1,watered:false});Render.draw(g,100);
      if(g.grid[k]!==T.SOIL||g.crops.get(k)?.id!=='cloveroot')throw new Error('table overwrote crop');
      g.commonTable='';g.tableWeeks=[];g.player.x=4*TILE;Game.joinCommonTable('sketches');if(g.commonTable)throw new Error('remote join accepted');
    }finally{Game.G=keep;if(oldSave===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,oldSave);if(menuOpen())closeMenu();}
  },'village table normal-route three-week arc');
  step(()=>{ // after three pages, ordinary weekly return gains a distinct seasonal margin
    const keep=Game.G, oldSave=localStorage.getItem(SAVE_KEY);
    try{
      Game.newGame();let g=Game.G;
      g.day=22;g.minutes=600;g.seasonCached=Game.season();g.player.x=18.5*TILE;g.player.y=8.5*TILE;
      g.tool=TOOLS.findIndex(t=>t.id==='hand');g.player.dir='up';g.commonTable='sketches';g.tableWeeks=[0,1,2];g.fieldPlan='';g.fieldPlanDay=0;g.fieldSeasonPending=-1;
      const coins=g.coins,energy=g.energy,produce=JSON.stringify(g.produce),xp=JSON.stringify(g.skillXp);
      Game.useTool();let m=document.getElementById('menu');
      if(!m.textContent.includes('white margin')||!m.textContent.includes('leave a seasonal margin'))throw new Error('first winter return absent');
      if(!m.classList.contains('table-visit')||m.querySelectorAll('.table-voice img').length!==3)throw new Error('table visit composition absent');
      const card=m.querySelector('#menu-card').getBoundingClientRect();
      if(card.bottom>innerHeight-10||(innerWidth<=430&&innerHeight>=700&&card.top<innerHeight*.58))throw new Error('table sheet obscures board or exits viewport');
      const pre=new Uint8ClampedArray(Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data);
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('leave a seasonal margin')).click();
      if(g.tableSeasons.join()!=='3'||g.tableWeeks.join()!=='0,1,2,3'||g.minutes!==660)throw new Error('winter margin did not land');
      if(g.coins!==coins||g.energy!==energy||JSON.stringify(g.produce)!==produce||JSON.stringify(g.skillXp)!==xp)throw new Error('season margin rewarded resources');
      Render.draw(g,100);const post=Render.ctx.getImageData(0,0,Render.canvas.width,Render.canvas.height).data;
      let changed=0;for(let i=0;i<pre.length;i+=4)if(pre[i]!==post[i]||pre[i+1]!==post[i+1])changed++;
      if(changed<8)throw new Error('winter mark not rendered '+changed);
      Game.useTool();if(m.textContent.includes('leave a seasonal margin'))throw new Error('same-week margin repeat');closeMenu();
      if(m.classList.contains('table-visit'))throw new Error('table layout leaked after close');
      Game.openJournal();if(m.classList.contains('table-visit'))throw new Error('table layout leaked to journal');closeMenu();
      g.day=27;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      if(m.textContent.includes('leave a seasonal margin')||m.textContent.includes('sit with them again'))throw new Error('same-week repeat');closeMenu();
      g.day=29;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      if(!m.textContent.includes('thaw')||!m.textContent.includes('leave a seasonal margin'))throw new Error('spring return indistinct');
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('leave a seasonal margin')).click();
      if(g.tableSeasons.join()!=='3,0')throw new Error('spring mark failed');
      g.day=34;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      if(m.textContent.includes('leave a seasonal margin')||m.textContent.includes('sit with them again'))throw new Error('same-week return exposed');closeMenu();
      g.day=36;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      if(!m.textContent.includes('summer light')||!m.textContent.includes('leave a seasonal margin'))throw new Error('summer return missing');
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('leave a seasonal margin')).click();
      if(g.tableSeasons.join()!=='3,0,1'||g.tableWeeks.join()!=='0,1,2,3,4,5')throw new Error('summer return failed');
      Game.openJournal();if(!m.textContent.includes('Winter on the road')||!m.textContent.includes('Spring on the road'))throw new Error('season journal missing');closeMenu();
      Game.save();Game.load();g=Game.G;if(g.tableSeasons.join()!=='3,0,1')throw new Error('season margins not saved');
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY));delete saved.tableSeasons;
      localStorage.setItem(SAVE_KEY,JSON.stringify(saved));Game.load();g=Game.G;
      if(g.tableSeasons.length)throw new Error('older save season default');
      g.tableSeasons=['bad',-1,0,0,4,2.5];Game.save();Game.load();g=Game.G;
      if(g.tableSeasons.join()!=='0')throw new Error('malformed season marks accepted');
      // The stories path gets its own return scene and a visible seasonal tab.
      Game.newGame();g=Game.G;g.day=22;g.minutes=600;g.seasonCached=Game.season();
      g.player.x=18.5*TILE;g.player.y=8.5*TILE;g.player.dir='up';g.tool=TOOLS.findIndex(t=>t.id==='hand');
      g.commonTable='stories';g.tableWeeks=[0,1,2];Game.useTool();
      if(!m.textContent.includes('sound of boots')||!m.textContent.includes('leave a seasonal margin'))throw new Error('story winter scene missing');
      [...m.querySelectorAll('.menu-row')].find(r=>r.textContent.includes('leave a seasonal margin')).click();
      if(g.tableSeasons.join()!=='3')throw new Error('story winter mark missing');
      g.day=29;g.minutes=600;g.seasonCached=Game.season();Game.useTool();
      if(!m.textContent.includes('first grass name')||!m.textContent.includes('leave a seasonal margin'))throw new Error('story spring scene missing');closeMenu();
      g.day=29;g.minutes=600;g.tableSeasons=[];g.player.x=4*TILE;Game.joinCommonTable('stories');
      if(g.tableSeasons.length)throw new Error('remote margin accepted');
      g.player.x=18.5*TILE;g.day=30;Game.joinCommonTable('sketches');
      if(g.tableSeasons.length)throw new Error('wrong-day margin accepted');
    }finally{Game.G=keep;if(oldSave===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,oldSave);if(menuOpen())closeMenu();}
  },'seasonal table follow-through without a fourth page');
  step(()=>{
    updateHUD();updateBelt();
    for(const el of [...document.querySelectorAll('#hud .chip, #toolbelt .tslot')]){
      const r=el.getBoundingClientRect();if(r.left<0||r.right>innerWidth+.5)throw new Error('clipped HUD or tool '+el.className);
    }
    const g=Game.G,keep={day:g.day,minutes:g.minutes,player:{...g.player},tool:g.tool,indoor:g.indoor,inCave:g.inCave};
    try{
      g.day=8;g.minutes=600;g.indoor=false;g.inCave=false;g.player.x=18.5*TILE;g.player.y=8.5*TILE;g.tool=TOOLS.findIndex(t=>t.id==='hand');Game.openCommonTable();
      const m=document.getElementById('menu');
      if(getComputedStyle(m).backgroundColor!=='rgba(46, 38, 32, 0.2)')throw new Error('table scrim too dark');
      closeMenu();Game.openJournal();
      if(m.classList.contains('table-visit'))throw new Error('table scrim leaks into journal');
    }finally{Object.assign(g,keep);if(menuOpen())closeMenu();}
  },'responsive HUD and table-only light scrim');
  step(()=>{ // rendering smoke: draw 30 frames with no errors
    for(let i=0;i<30;i++) Render.draw(Game.G, performance.now()+i*33);
  },'render 30 frames');
  await sleep(300);
  if(fails.length){ console.log('AUTOTEST RESULT: FAIL', JSON.stringify(fails)); }
  else console.log('AUTOTEST RESULT: PASS');
  window.__TEST_DONE=true;
}
boot();
