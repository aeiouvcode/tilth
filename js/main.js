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
function closeMenu(){ MENU_OPEN=false; document.getElementById('menu').classList.add('hidden'); document.getElementById('menu-card').classList.remove('paper'); }

// ---------- letters ----------
function openLetter(from, subject, body){
  MENU_OPEN=true;
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
document.getElementById('menu').addEventListener('click',e=>{ if(e.target.id==='menu')closeMenu(); });

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
    }
    belt.appendChild(s);
  });
}

// ---------- dialogue ----------
function openDialogue(name, text, extraRows, portraitId){
  MENU_OPEN=true;
  const m=document.getElementById('menu');
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
  p.style.cssText='padding:8px 4px;font-size:14px;color:#4a3f2e;line-height:1.5;font-style:italic;';
  p.textContent='\u201C'+text+'\u201D';
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
  btn.innerHTML='<div class="nm">reel! (E / tap)</div>';
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
    const cur=parseFloat(mark.style.left);
    const landed=cur>=zl&&cur<=zl+zw;
    closeMenu(); done(landed);
  }
  btn.addEventListener('click',stop);
  const keyH=(e)=>{ if(e.key==='e'||e.key==='E'||e.key===' '){ stop(); removeEventListener('keydown',keyH); } };
  addEventListener('keydown',(e)=>{ if(e.key==='m'||e.key==='M'){ const mu=Music.toggleMute(); toast(mu?'music off':'music on'); } });
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
    if(qs.get('shot')==='shop'){ setTimeout(()=>Game.openShop(),300); }
    if(qs.get('shot')==='crate'){ g.produce={sunbean:3,duskcarp:1,morel:2,emberquartz:1}; setTimeout(()=>Game.openCrateMenu(),300); }
    if(qs.get('shot')==='pond'){
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
    if(g.coins!==coinsBefore+5*38) throw new Error(`coins ${g.coins} != ${coinsBefore+190}`);
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
    g.day=3; g.minutes=10*60; g.player.x=9*TILE; g.player.y=9*TILE; // not festival, not indoor
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
  step(()=>{ // rendering smoke: draw 30 frames with no errors
    for(let i=0;i<30;i++) Render.draw(Game.G, performance.now()+i*33);
  },'render 30 frames');
  await sleep(300);
  if(fails.length){ console.log('AUTOTEST RESULT: FAIL', JSON.stringify(fails)); }
  else console.log('AUTOTEST RESULT: PASS');
  window.__TEST_DONE=true;
}
boot();
