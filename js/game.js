// TILTH game state + rules
'use strict';
const SAVE_KEY='tilth-save-v1';
const DAY_START=360, DAY_END=1440; // 6:00 -> 24:00 (1 real sec = 1 game min)
const Game={
  G:null,
  newGame(){
    const g={
      day:1, minutes:DAY_START, coins:120, energy:100,
      grid:makeWorld(), crops:new Map(),
      player:{x:9*TILE, y:9*TILE, dir:'down', moving:false},
      tool:0, // index into TOOLS
      seeds:{cloveroot:5, sunbean:2},
      produce:{},
      shipped:0, pendingSale:0, lifetimeEarned:0, harvested:0,
      clouds:[], butterflies:[], fireflies:[],
      cat:{x:9.5*TILE, y:22.5*TILE, tx:9.5*TILE, ty:22.5*TILE, flip:false},
      mara:{x:15.5*TILE, y:10.8*TILE, tx:15.5*TILE, ty:10.8*TILE, flip:false, pause:0},
      bram:{x:12*TILE, y:23*TILE, tx:12*TILE, ty:23*TILE, flip:false, pause:0},
      fern:{x:20*TILE, y:30*TILE, tx:20*TILE, ty:30*TILE, flip:false, pause:0},
      piet:{x:42.5*TILE, y:6.5*TILE, tx:42.5*TILE, ty:6.5*TILE, flip:false, pause:0},
      forage:new Map(), fishing:null, weather:'sun',
      indoor:false, outdoor:null, interior:makeInterior(),
      cave:makeCave(), inCave:false, nodes:[], caveLevel:1, caveNodes:{},
      letters:[], seenLetters:[],
      friendship:{mara:0,bram:0,fern:0,piet:0}, giftsToday:{},
      stats:{hoed:0, watered:0, planted:0, shipped:0, caught:0, foraged:0},
    };
    const r=mulberry32(1234);
    for(let i=0;i<3;i++) g.clouds.push({x:r()*W*TILE, y:20+r()*120, r:26+r()*30});
    for(let i=0;i<7;i++) g.butterflies.push({x:40+r()*(W*TILE-80), y:60+r()*(H*TILE-120), p:r()*7, c:pick(r,['#e8b7c2','#f0e2b8','#c9d4e8'])});
    for(let i=0;i<10;i++) g.fireflies.push({x:60+r()*(W*TILE-120), y:200+r()*(H*TILE-260), p:r()*7});
    this.G=g;
    this.spawnForage(3);
    this.spawnNodes();
    return g;
  },
  save(){
    const g=this.G; if(!g)return;
    const data={...g, grid:Array.from(g.grid), crops:Array.from(g.crops.entries()),
      forage:Array.from(g.forage.entries()), fishing:null, interior:null, cave:null,
      clouds:[],butterflies:[],fireflies:[], cat:g.cat};
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch(e){}
  },
  load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw)return null;
      const d=JSON.parse(raw);
      d.grid=Uint8Array.from(d.grid); d.crops=new Map(d.crops);
      const r=mulberry32(1234);
      d.clouds=[]; d.butterflies=[]; d.fireflies=[];
      for(let i=0;i<3;i++) d.clouds.push({x:r()*W*TILE, y:20+r()*120, r:26+r()*30});
      for(let i=0;i<7;i++) d.butterflies.push({x:40+r()*(W*TILE-80), y:60+r()*(H*TILE-120), p:r()*7, c:pick(r,['#e8b7c2','#f0e2b8','#c9d4e8'])});
      for(let i=0;i<10;i++) d.fireflies.push({x:60+r()*(W*TILE-120), y:200+r()*(H*TILE-260), p:r()*7});
      if(!d.mara) d.mara={x:15.5*TILE, y:10.8*TILE, tx:15.5*TILE, ty:10.8*TILE, flip:false, pause:0};
      if(!d.bram) d.bram={x:12*TILE, y:23*TILE, tx:12*TILE, ty:23*TILE, flip:false, pause:0};
      if(!d.fern) d.fern={x:20*TILE, y:30*TILE, tx:20*TILE, ty:30*TILE, flip:false, pause:0};
      if(!d.piet) d.piet={x:42.5*TILE, y:6.5*TILE, tx:42.5*TILE, ty:6.5*TILE, flip:false, pause:0};
      if(!d.forage) d.forage=new Map(); else if(Array.isArray(d.forage)) d.forage=new Map(d.forage);
      if(!d.letters) d.letters=[]; if(!d.seenLetters) d.seenLetters=[];
      if(!d.friendship) d.friendship={mara:0,bram:0,fern:0,piet:0}; if(!d.giftsToday) d.giftsToday={};
      d.fishing=null; d.interior=makeInterior(); d.cave=makeCave();
      if(d.indoor===undefined){ d.indoor=false; d.outdoor=null; }
      if(d.inCave===undefined) d.inCave=false;
      if(!d.nodes) d.nodes=[];
      if(d.caveLevel===undefined) d.caveLevel=1;
      if(!d.caveNodes) d.caveNodes={};
      this.G=d; return d;
    }catch(e){ return null; }
  },
  hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } },

  seasonOf(day){ return Math.floor((day-1)/7)%4; },
  season(){ return this.seasonOf(this.G.day); },

  LETTERS:[
    { id:'welcome', from:'Mara', subject:'welcome to the valley',
      body:"The stand's open when you need seeds. Start with cloveroot, keep the soil wet, and the crate by your door sells whatever you fill it with at dawn. Good luck, farmer.",
      cond:(g)=>g.day>=2 },
    { id:'rain1', from:'Old Bram', subject:'a wet morning',
      body:"Saw the rain roll in. Days like this the fields drink on their own - put your back into something else. The pond bites best when the light goes soft, mind.",
      cond:(g)=>g.stats.rainDays>0 },
    { id:'season', from:'Piet', subject:'the turn',
      body:"Season's turning. Anything left in the field won't see the other side - pull what you can before the frost (or the heat) takes it. Fences I can fix; crops I can't.",
      cond:(g)=>g.day>=7 },
    { id:'fish1', from:'Old Bram', subject:'a fine first catch',
      body:"Heard the splash from my bench. First of many, that one. Keep the big ones for the dusk - the carp only show when the light goes soft.",
      cond:(g)=>g.stats.caught>0 },
    { id:'cave', from:'Piet', subject:'the old quarry',
      body:"Heard pick-work echoing off the hill. That cave's been shut since my grandfather's day - mind the low beams, and bring the bright stones by sometime. Ember quartz catches a fair price, and the pale ones... those are luck.",
      cond:(g)=>(g.stats.mined||0)>0 },
    { id:'festival', from:'Mara', subject:'lantern evening',
      body:"Every seventh evening we hang the lane with lanterns and nobody talks shop. Come down to the well after six - Piet tells the one about the frozen pond, Fern eats all the plums. See you there.",
      cond:(g)=>g.day>=6 },
  ],
  checkLetters(){
    const g=this.G;
    for(const L of this.LETTERS){
      if(!g.seenLetters.includes(L.id) && L.cond(g)){
        g.seenLetters.push(L.id);
        g.letters.push({id:L.id, from:L.from, subject:L.subject, body:L.body, read:false});
        setTimeout(()=>toast('a letter waits in the mailbox'), 2000);
      }
    }
  },
  unreadCount(){ return this.G.letters.filter(l=>!l.read).length; },
  openMailbox(){
    const g=this.G;
    if(!g.letters.length){ nudge('empty - just moths'); return; }
    const rows=[...g.letters].reverse().map(L=>({
      label:(L.read?'':'● ')+L.subject, desc:'from '+L.from, price:'', icon:SPR.letterEnv,
      pick:()=>{ L.read=true; closeMenu(); openLetter(L.from, L.subject, L.body); }
    }));
    openMenu('mailbox', rows);
  },

  isFestival(){ return this.G.day%7===0; },
  festivalEvening(){ return this.isFestival() && this.G.minutes>=1080; },

  weatherForDay(day){
    return mulberry32(day*31+7)()<0.25 ? 'rain' : 'sun';
  },

  spawnForage(n){
    const g=this.G, r=mulberry32(g.day*7919+13);
    let placed=0, tries=0;
    while(placed<n&&tries<200){
      tries++;
      const x=2+Math.floor(r()*(W-4)), y=16+Math.floor(r()*(H-18));
      if(g.grid[y*W+x]!==T.GRASS||g.crops.has(y*W+x)||g.forage.has(y*W+x))continue;
      const roll=r(); const id=roll<0.45?'dandelion':(roll<0.8?'wildplum':'morel');
      g.forage.set(y*W+x,{id});
      placed++;
    }
  },

  // ---------- actions ----------
  tileAt(x,y){ return this.G.grid[y*W+x]; },
  cropAt(x,y){ return this.G.crops.get(y*W+x); },
  spendEnergy(n){ const g=this.G; g.energy=Math.max(0,g.energy-n); if(g.energy<=0) toast('exhausted - sleep to recover'); },

  useTool(){
    const g=this.G;
    if(g.indoor){
      const tx=Math.floor(g.player.x/TILE + (g.player.dir==='right'?1:g.player.dir==='left'?-1:0));
      const ty=Math.floor(g.player.y/TILE + (g.player.dir==='down'?1:g.player.dir==='up'?-1:0));
      if(tx<0||ty<0||tx>=IW||ty>=IH) return;
      const it=g.interior[ty*IW+tx];
      if(it===IT.BED){ this.openSleepMenu(); }
      else if(it===IT.DOOR){ this.exitHouse(); }
      else nudge('nothing to do here');
      return;
    }
    if(g.inCave){
      const tx=Math.floor(g.player.x/TILE + (g.player.dir==='right'?1:g.player.dir==='left'?-1:0));
      const ty=Math.floor(g.player.y/TILE + (g.player.dir==='down'?1:g.player.dir==='up'?-1:0));
      if(tx<0||ty<0||tx>=CW||ty>=CH) return;
      if(g.cave[ty*CW+tx]===CT.DOOR){ this.ascendCave(); return; }
      if(g.cave[ty*CW+tx]===CT.STAIRS){ this.descendCave(); return; }
      const n=this.nodeAt(tx,ty), tool=TOOLS[g.tool].id;
      if(n && tool==='pick'){
        n.hp--; this.spendEnergy(2); thud();
        if(n.hp<=0){
          const arr=g.caveNodes[g.caveLevel];
          arr.splice(arr.indexOf(n),1);
          g.produce[n.type]=(g.produce[n.type]||0)+1;
          g.stats.mined=(g.stats.mined||0)+1;
          chime(880); toast(`+1 ${ITEMS[n.type].name}`);
        }
      }
      else if(n){ nudge('needs the pickaxe'); }
      else nudge('nothing to do here');
      return;
    }
    const f=facingTile(g.player); if(!f)return;
    const tool=TOOLS[g.tool].id, t=this.tileAt(f.x,f.y), key=f.y*W+f.x, crop=g.crops.get(key);
    if(tool==='hoe'){
      if(t===T.GRASS&&!crop){ g.grid[f.y*W+f.x]=T.SOIL; g.stats.hoed++; this.spendEnergy(2); thud(); }
      else nudge('needs clear grass');
    } else if(tool==='can'){
      if(crop&&t!==T.SOILWET){ g.grid[f.y*W+f.x]=T.SOILWET; crop.watered=true; g.stats.watered++; this.spendEnergy(1); splash(); }
      else if(t===T.SOIL){ g.grid[f.y*W+f.x]=T.SOILWET; this.spendEnergy(1); splash(); }
      else nudge('nothing to water');
    } else if(tool==='seeds'){
      if((t===T.SOIL||t===T.SOILWET)&&!crop){ this.openPlantMenu(f.x,f.y); }
      else nudge('needs tilled soil');
    } else if(tool==='hand'){
      const fg=g.forage.get(key);
      if(crop&&crop.stage>=3){ this.harvest(f.x,f.y,crop); }
      else if(fg){ g.forage.delete(key); g.produce[fg.id]=(g.produce[fg.id]||0)+1; g.stats.foraged++; this.spendEnergy(1); chime(700); toast(`+1 ${ITEMS[fg.id].name}`); }
      else if(t===T.DOORMAT){ this.enterHouse(); }
      else if(t===T.CAVEENT){ this.enterCave(); }
      else if(t===T.MAILBOX){ this.openMailbox(); }
      else if(t===T.CRATE){ this.openCrateMenu(); }
      else if(t===T.STAND){ this.openShop(); }
      else if(this.nearNpc('mara')){ this.talkTo('mara'); }
      else if(this.nearNpc('bram')){ this.talkTo('bram'); }
      else if(this.nearNpc('fern')){ this.talkTo('fern'); }
      else if(this.nearNpc('piet')){ this.talkTo('piet'); }
      else nudge('nothing to do here');
    } else if(tool==='rod'){
      this.castRod(f);
    } else if(tool==='pick'){
      if(t===T.ROCK){ g.grid[f.y*W+f.x]=T.GRASS; g.produce.pitstone=(g.produce.pitstone||0)+1; g.stats.mined=(g.stats.mined||0)+1; this.spendEnergy(3); thud(); toast('+1 Pit Stone'); }
      else nudge('nothing to break here');
    } else if(tool==='scythe'){
      if(crop){ g.crops.delete(key); if(this.tileAt(f.x,f.y)===T.SOILWET)g.grid[f.y*W+f.x]=T.SOIL; this.spendEnergy(2); swish(); toast('cleared'); }
      else nudge('nothing to clear');
    }
  },
  harvest(x,y,crop){
    const g=this.G, def=CROPS[crop.id];
    g.produce[crop.id]=(g.produce[crop.id]||0)+1;
    g.harvested++; g.stats.shipped++;
    if(def.regrow){ crop.age=crop.days-def.regrow; crop.stage=2; crop.watered=false; }
    else { g.crops.delete(y*W+x); }
    this.spendEnergy(1); chime();
    toast(`+1 ${def.name}`);
  },
  plantSeed(x,y,cropId){
    const g=this.G;
    if((g.seeds[cropId]||0)<=0)return;
    if(!CROPS[cropId].seasons.includes(this.season())){ nudge(`${CROPS[cropId].name} won't take in ${SEASONS[this.season()].toLowerCase()}`); return; }
    g.seeds[cropId]--;
    g.crops.set(y*W+x,{id:cropId, age:0, stage:0, watered:this.tileAt(x,y)===T.SOILWET});
    g.stats.planted++; this.spendEnergy(1); chime(660);
  },

  // ---------- shop / menus ----------
  openShop(){
    const g=this.G;
    const rows=Object.values(CROPS).map(def=>({
      label:`${def.seed}`, desc:`${def.days}d, sells ${def.sell}g`, price:`${def.seedCost}g`, icon:SPR.crop(def,3),
      pick:()=>{ if(g.coins>=def.seedCost){ g.coins-=def.seedCost; g.seeds[def.id]=(g.seeds[def.id]||0)+1; toast(`+1 ${def.seed}`); chime(880); this.refreshMenu(); } else nudge('not enough coin'); }
    }));
    openMenu(`Mara's seeds — you hold ${g.coins}g`, rows);
  },
  openPlantMenu(x,y){
    const g=this.G;
    const owned=Object.entries(g.seeds).filter(([id,n])=>n>0);
    if(!owned.length){ nudge('no seeds - visit Mara'); return; }
    const rows=owned.map(([id,n])=>({
      label:CROPS[id].name, desc:`${CROPS[id].days} days`, price:`x${n}`, icon:SPR.crop(CROPS[id],3),
      pick:()=>{ this.plantSeed(x,y,id); closeMenu(); }
    }));
    openMenu('plant which seed?', rows);
  },
  openCrateMenu(){
    const g=this.G;
    const items=Object.entries(g.produce).filter(([id,n])=>n>0);
    if(!items.length){ nudge('crate is empty - harvest or forage first'); return; }
    const rows=items.map(([id,n])=>({
      label:ITEMS[id].name, desc:`ships for ${ITEMS[id].sell}g each`, price:`x${n}`, icon:SPR.item[id]||SPR.forage[id]||(CROPS[id]?SPR.crop(CROPS[id],3):null),
      pick:()=>{
        const val=ITEMS[id].sell*n;
        g.pendingSale+=val; g.produce[id]=0; g.shipped+=n;
        toast(`${n} ${ITEMS[id].name} in the crate (+${val}g at dawn)`); chime(740);
        closeMenu();
      }
    }));
    openMenu('shipping crate — sells at dawn', rows);
  },
  // node mix per depth: deeper is richer but tougher
  CAVE_MIX:[ [0.55,0.85], [0.40,0.80], [0.25,0.70] ],
  spawnNodes(level){
    const g=this.G, lvl=level||g.caveLevel||1;
    const spots=CAVE_SPOTS.slice();
    const r=mulberry32(g.day*77+13+lvl*1000);
    for(let i=spots.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=spots[i]; spots[i]=spots[j]; spots[j]=t; }
    const mix=this.CAVE_MIX[clamp(lvl-1,0,2)];
    g.caveNodes[lvl]=spots.slice(0, lvl===3?6:5).map(([x,y])=>{
      const roll=r();
      const type= roll<mix[0] ? 'pitstone' : roll<mix[1] ? 'emberquartz' : 'moondrop';
      return {x,y,type,hp:(type==='pitstone'?1:type==='emberquartz'?2:3)+(lvl-1)};
    });
    g.nodes=g.caveNodes[g.caveLevel]||[];
  },
  nodeAt(x,y){ return (this.G.caveNodes[this.G.caveLevel]||[]).find(n=>n.x===x&&n.y===y); },
  descendCave(){
    const g=this.G;
    if(g.caveLevel>=3){ nudge('the cave bottoms out here'); return; }
    g.caveLevel++;
    g.nodes=g.caveNodes[g.caveLevel]||[];
    if(!g.nodes.length) this.spawnNodes();
    g.player.x=6.5*TILE; g.player.y=6.4*TILE; g.player.dir='up';
    fadeSleep(); thud();
    toast(g.caveLevel===2?'deeper — the stone turns cold':'deepest — the rock is warm');
  },
  ascendCave(){
    const g=this.G;
    if(g.caveLevel<=1){ this.exitCave(); return; }
    g.caveLevel--;
    g.nodes=g.caveNodes[g.caveLevel]||[];
    g.player.x=6.5*TILE; g.player.y=6.4*TILE; g.player.dir='up';
    fadeSleep(); chime(460);
  },
  enterCave(){
    const g=this.G; if(g.inCave)return;
    g.outdoor={x:g.player.x, y:g.player.y};
    g.inCave=true; g.caveLevel=1; g.nodes=g.caveNodes[1]||[];
    g.player.x=6.5*TILE; g.player.y=7.4*TILE; g.player.dir='up'; g.player.moving=false;
    fadeSleep(); thud();
  },
  exitCave(){
    const g=this.G; if(!g.inCave)return;
    g.inCave=false;
    g.player.x=(g.outdoor&&g.outdoor.x)||45.5*TILE;
    g.player.y=(g.outdoor&&g.outdoor.y)||13.5*TILE;
    g.player.dir='down'; g.player.moving=false;
    fadeSleep(); chime(460);
  },
  enterHouse(){
    const g=this.G; if(g.indoor)return;
    g.outdoor={x:g.player.x, y:g.player.y};
    g.indoor=true;
    g.player.x=5.5*TILE; g.player.y=6.4*TILE; g.player.dir='up'; g.player.moving=false;
    fadeSleep(); chime(520);
  },
  exitHouse(){
    const g=this.G; if(!g.indoor)return;
    g.indoor=false;
    g.player.x=(g.outdoor&&g.outdoor.x)||8.5*TILE;
    g.player.y=(g.outdoor&&g.outdoor.y)||8.5*TILE;
    g.player.dir='down'; g.player.moving=false;
    fadeSleep(); chime(460);
  },
  openSleepMenu(){
    const g=this.G;
    openMenu('turn in for the night?', [
      {label:'sleep until morning', desc:'crops drink, the crate sells', price:'', pick:()=>{ closeMenu(); this.sleep(); }},
      {label:'not yet', desc:'', price:'', pick:()=>closeMenu()},
    ]);
  },
  refreshMenu(){ closeMenu(); this.openShop(); },

  sleep(){
    const g=this.G;
    // tonight's weather decides whether the fields water themselves
    const nextWeather=this.weatherForDay(g.day+1);
    if(nextWeather==='rain'){
      for(let i=0;i<g.grid.length;i++){ if(g.grid[i]===T.SOIL) g.grid[i]=T.SOILWET; }
      for(const [k,c] of g.crops) c.watered=true;
    }
    // grow
    for(const [key,c] of g.crops){
      if(c.watered){ c.age=Math.min(c.age+1, CROPS[c.id].days); c.stage=c.age===0?0:(c.age>=CROPS[c.id].days?3:(c.age>=CROPS[c.id].days*0.55?2:1)); }
      c.watered=false;
    }
    // soil dries overnight unless it rained
    if(nextWeather!=='rain'){
      for(let i=0;i<g.grid.length;i++){ if(g.grid[i]===T.SOILWET) g.grid[i]=T.SOIL; }
    }
    // sell
    if(g.pendingSale>0){ g.coins+=g.pendingSale; g.lifetimeEarned+=g.pendingSale; toast(`dawn sale: +${g.pendingSale}g`); g.pendingSale=0; }
    g.day++; g.minutes=DAY_START; g.energy=100; g.giftsToday={};
    g.forage.clear(); this.spawnForage(2+Math.floor(Math.random()*3));
    this.checkLetters();
    if(g.weather==='rain') g.stats.rainDays=(g.stats.rainDays||0)+1;
    const prevSeason=this.seasonOf(g.day-1), newSeason=this.seasonOf(g.day);
    g.weather=nextWeather;
    if(newSeason!==prevSeason){
      if(g.crops.size){ g.crops.clear(); setTimeout(()=>toast('the season turns — the field rests'), 1600); }
      else setTimeout(()=>toast(SEASONS[newSeason]+' settles over the valley'), 1600);
    }
    if(g.weather==='rain'){
      setTimeout(()=>toast('rain all morning — the fields water themselves'), 1400);
    }
    if(g.indoor){ g.player.x=3.5*TILE; g.player.y=2.5*TILE; g.player.dir='down'; } // wake beside the bed
    for(let l=1;l<=3;l++) this.spawnNodes(l); // the cave shifts overnight
    this.save();
    fadeSleep();
  },

  NPCS:{
    mara:{ name:'Mara',       fixed:{x:15*TILE,y:11*TILE}, lines:[
      "Morning, farmer. Cloveroot's kind to beginners - three days and it's in the crate.",
      "Water every day, or don't bother planting. Soil won't forgive a dry spell.",
      "Duskberries keep giving once they're up. Pricey seeds, worth every coin.",
    ]},
    bram:{ name:'Old Bram',   wander:{x0:8*TILE,x1:15*TILE,y0:21*TILE,y1:26*TILE}, lines:[
      "That pond's older than the farm. Cast a line, hold still, let it come to you.",
      "Dusk carp only show once the light goes soft. Patient rod, full creel.",
      "Morels pop after a good sleep, down past the fence. Mind the prickers.",
    ]},
    fern:{ name:'Fern',       wander:{x0:18*TILE,x1:34*TILE,y0:27*TILE,y1:33*TILE}, lines:[
      "The south meadow hides morels if you walk it slow. I race the crows to them.",
      "I pressed a duskberry into my book once. Stained the whole chapter purple.",
      "When the frost comes I trade baskets of plums for Mara's seed jars.",
    ]},
    piet:{ name:'Piet',       wander:{x0:39*TILE,x1:45*TILE,y0:5*TILE,y1:9*TILE}, lines:[
      "That cottage roof is slate - outlasts us both. Built it the year the pond froze.",
      "Your fence leans west. It'll hold, but fences remember how you treat them.",
      "Come winter I'm cutting cedar for a proper barn. Mark my words.",
    ]},
  },
  nearNpc(id){
    const g=this.G, n=g[id]; if(!n)return false;
    return Math.hypot(g.player.x-n.x,g.player.y-n.y)<TILE*1.7;
  },
  LOVED:{ mara:'sunbean', bram:'duskcarp', fern:'morel', piet:'embermelon' },
  HEART_LINES:{
    mara:"You know, the stand does better since you came. The valley does too.",
    bram:"You're good company, farmer. The pond says so, and the pond doesn't lie.",
    fern:"I saved you the biggest morel spot. Don't tell the crows.",
    piet:"When that barn goes up, your name goes in the beam. That's how we do it.",
  },
  hearts(id){ return Math.floor((this.G.friendship[id]||0)/2); },
  giftTo(id){
    const g=this.G, loved=this.LOVED[id], def=this.NPCS[id];
    if(g.giftsToday[id]){ nudge('already gave '+def.name+' something today'); return; }
    if((g.produce[loved]||0)<=0){ nudge(`no ${ITEMS[loved].name} to give`); return; }
    g.produce[loved]--;
    g.giftsToday[id]=true;
    g.friendship[id]=Math.min(20,(g.friendship[id]||0)+2);
    chime(920); toast(`${def.name} loved the ${ITEMS[loved].name} (♥${this.hearts(id)})`);
  },

  FESTIVAL_LINES:{
    mara:"No seeds tonight. Tonight the lane is lit and the ledger is shut.",
    bram:"Forty lantern evenings I've sat for. The light on the pond never repeats itself.",
    fern:"I ate so many plums. Don't tell Mara. Actually, tell Mara - she missed out.",
    piet:"Hung every lantern myself. Cedar frames. They'll outlast the season, same as the roof.",
  },
  talkTo(id){
    const def=this.NPCS[id]; if(!def)return;
    const g=this.G, h=this.hearts(id);
    const title=h>0?`${def.name} ${'\u2665'}${h}`:def.name;
    let text;
    if(this.festivalEvening()&&this.FESTIVAL_LINES[id]) text=this.FESTIVAL_LINES[id];
    else if(h>=4&&this.HEART_LINES[id]&&g.day%4===3) text=this.HEART_LINES[id];
    else text=def.lines[g.day%def.lines.length];
    const rows=[];
    const loved=this.LOVED[id];
    if((g.produce[loved]||0)>0&&!g.giftsToday[id]){
      rows.push({label:`give ${ITEMS[loved].name}`, desc:'they would love this', price:'x1', icon:SPR.item[loved]||SPR.forage[loved]||(CROPS[loved]?SPR.crop(CROPS[loved],3):null), pick:()=>{ closeMenu(); this.giftTo(id); }});
    }
    openDialogue(title, text, rows, id);
  },
  // daily routines: hour -> waypoint (everyone gathers at the well 5-8pm)
  SCHEDULES:{
    mara:[[6,13.5,9.5],[9,15.5,10.8],[17,39.5,9.3],[20,13.5,9.5]],
    bram:[[6,12,23],[12,9,22.5],[17,39.5,9.3],[20,12,23]],
    fern:[[6,3.5,18],[10,20,30],[17,38.5,9.8],[20,20,30]],
    piet:[[6,42.5,6.5],[10,40.5,9.8],[14,30,8.5],[17,39.5,9.3],[20,42.5,6.5]],
  },
  npcWaypoint(id){
    const g=this.G, sch=this.SCHEDULES[id], h=g.minutes/60;
    let wp=sch[0];
    for(const s of sch){ if(h>=s[0]) wp=s; }
    return wp;
  },
  findPath(sx,sy,tx,ty){
    // BFS over walkable tiles -> array of [x,y] tiles (start included), or null
    const g=this.G, key=(x,y)=>y*W+x;
    if(sx===tx&&sy===ty) return [[sx,sy]];
    const prev=new Map([[key(sx,sy),null]]), q=[[sx,sy]];
    while(q.length){
      const [cx,cy]=q.shift();
      if(cx===tx&&cy===ty){
        const path=[]; let cur=[tx,ty];
        while(cur){ path.unshift(cur); cur=prev.get(key(cur[0],cur[1])); }
        return path;
      }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=W||ny>=H) continue;
        const k=key(nx,ny);
        if(prev.has(k)) continue;
        if(SOLID.has(g.grid[k])) continue;
        prev.set(k,[cx,cy]); q.push([nx,ny]);
      }
    }
    return null;
  },
  updateNpcs(dt){
    const g=this.G;
    for(const id of ['mara','bram','fern','piet']){
      const n=g[id]; if(!n)continue;
      const wp=this.npcWaypoint(id);
      const gx=wp[1]*TILE, gy=wp[2]*TILE;
      if(Math.hypot(n.x-gx,n.y-gy)>TILE*0.8){
        // en route: BFS path to the waypoint (recomputed when the schedule moves it)
        const goalKey=gx+','+gy;
        if(n.pathGoal!==goalKey){
          n.pathGoal=goalKey;
          n.path=this.findPath(Math.floor(n.x/TILE),Math.floor(n.y/TILE),Math.floor(gx/TILE),Math.floor(gy/TILE));
        }
        let ax=gx, ay=gy;
        if(n.path&&n.path.length){
          const nt=n.path[0];
          ax=nt[0]*TILE+TILE/2; ay=nt[1]*TILE+TILE/2;
          if(Math.hypot(n.x-ax,n.y-ay)<3){ n.path.shift(); if(n.path.length){ ax=n.path[0][0]*TILE+TILE/2; ay=n.path[0][1]*TILE+TILE/2; } }
        }
        const dx=ax-n.x, dy=ay-n.y, m=Math.hypot(dx,dy)||1;
        n.x+=dx/m*26*dt/1000; n.y+=dy/m*26*dt/1000;
        n.tx=gx; n.ty=gy; n.flip=dx<0; n.pause=1;
        n.moving=true; n.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      } else if(Math.hypot(n.tx-n.x,n.ty-n.y)<2){
        // settled: small idle wander near the waypoint
        n.moving=false;
        n.pause-=dt/1000;
        if(n.pause<=0&&Math.random()<dt/1000/7){
          const nx=clamp(gx+(Math.random()*96-48),TILE,(W-2)*TILE), ny=clamp(gy+(Math.random()*64-32),TILE,(H-2)*TILE);
          if(!SOLID.has(this.tileAt(Math.floor(nx/TILE),Math.floor(ny/TILE)))){ n.tx=nx; n.ty=ny; n.flip=n.tx<n.x; n.pause=2+Math.random()*4; }
        }
      } else {
        const dx=n.tx-n.x, dy=n.ty-n.y, m=Math.hypot(dx,dy);
        n.x+=dx/m*10*dt/1000; n.y+=dy/m*10*dt/1000;
        n.moving=true; n.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
      }
    }
  },

  // ---------- fishing ----------
  castRod(f){
    const g=this.G;
    if(g.fishing){ this.reelIn(); return; }
    if(this.tileAt(f.x,f.y)!==T.WATER){ nudge('cast onto water'); return; }
    this.spendEnergy(2);
    g.fishing={x:f.x, y:f.y, state:'waiting', t:2+Math.random()*4, fish:this.rollFish()};
    splash(); toast('cast... wait for the pull');
  },
  rollFish(){
    const g=this.G, night=g.minutes>=1140||g.minutes<330;
    const pool=Object.values(FISH).filter(f=>!f.night||night);
    const w=pool.map(f=>f.zone); let sum=w.reduce((a,b)=>a+b,0), roll=Math.random()*sum;
    for(let i=0;i<pool.length;i++){ roll-=w[i]; if(roll<=0)return pool[i]; }
    return pool[0];
  },
  reelIn(){
    const g=this.G, fsh=g.fishing;
    if(!fsh)return;
    if(fsh.state==='bite'){
      // timing minigame
      openFishingGame(fsh.fish, (landed)=>{
        if(landed){
          g.produce[fsh.fish.id]=(g.produce[fsh.fish.id]||0)+1; g.stats.caught++;
          chime(880); toast(`caught a ${fsh.fish.name}!`);
        } else { toast('it slipped away...'); }
        g.fishing=null;
      });
    } else {
      g.fishing=null; toast('reeled in early');
    }
  },
  updateFishing(dt){
    const g=this.G, fsh=g.fishing;
    if(!fsh)return;
    if(fsh.state==='waiting'){
      fsh.t-=dt/1000;
      if(fsh.t<=0){ fsh.state='bite'; fsh.t=1.3; chime(1040); }
    } else if(fsh.state==='bite'){
      fsh.t-=dt/1000;
      if(fsh.t<=0){ g.fishing=null; toast('got away... too slow'); }
    }
  },

  update(dt, now){
    const g=this.G; if(!g)return;
    if(!menuOpen()){
      // time
      g.minutes+=dt/1000; // 1s = 1 min
      if(g.minutes>=DAY_END){ toast('you collapse from the late hour...'); this.sleep(); }
    }
    // movement
    const mv=readMove();
    const speed=60; // px/s
    if(!menuOpen()&&(mv.x||mv.y)){
      let nx=g.player.x+mv.x*speed*dt/1000, ny=g.player.y+mv.y*speed*dt/1000;
      if(Math.abs(mv.x)>Math.abs(mv.y)) g.player.dir=mv.x>0?'right':'left'; else g.player.dir=mv.y>0?'down':'up';
      if(this.walkable(nx,g.player.y)) g.player.x=nx;
      if(this.walkable(g.player.x,ny)) g.player.y=ny;
      g.player.moving=true;
    } else g.player.moving=false;
    if(g.indoor||g.inCave){
      // stepping into the doorway walks back out
      const ptx=Math.floor(g.player.x/TILE), pty=Math.floor(g.player.y/TILE);
      if(g.indoor){ if(ptx>=0&&pty>=0&&ptx<IW&&pty<IH&&g.interior[pty*IW+ptx]===IT.DOOR) this.exitHouse(); }
      else if(ptx>=0&&pty>=0&&ptx<CW&&pty<CH){
        if(g.cave[pty*CW+ptx]===CT.DOOR) this.ascendCave();
        else if(g.cave[pty*CW+ptx]===CT.STAIRS) this.descendCave();
      }
    } else {
    // clouds drift
    for(const c of g.clouds){ c.x+=dt/1000*6; if(c.x>W*TILE+240)c.x=-240; }
    this.updateFishing(dt);
    if(this.festivalEvening()){
      // lantern evening: everyone drifts to the well (39,8)
      const offs={mara:[-2,0.2],bram:[-1,0.6],fern:[1,1.2],piet:[0.5,0.6]};
      for(const id of Object.keys(offs)){
        const n=g[id];
        const gx=(39+offs[id][0])*TILE, gy=(8+offs[id][1])*TILE;
        if(Math.hypot(n.x-gx,n.y-gy)>4){
          const dx=gx-n.x, dy=gy-n.y, m=Math.hypot(dx,dy);
          n.x+=dx/m*22*dt/1000; n.y+=dy/m*22*dt/1000; n.tx=gx; n.ty=gy;
        }
      }
    } else {
      this.updateNpcs(dt);
    }
    // cat wanders
    const cat=g.cat;
    if(Math.hypot(cat.tx-cat.x,cat.ty-cat.y)<2){
      if(Math.random()<dt/1000/6){
        const nx=clamp(cat.x+(Math.random()*160-80),40,W*TILE-40), ny=clamp(cat.y+(Math.random()*120-60),200,H*TILE-20);
        if(this.tileAt(Math.floor(nx/TILE),Math.floor(ny/TILE))!==T.WATER){ cat.tx=nx; cat.ty=ny; cat.flip=cat.tx<cat.x; }
      }
    } else {
      const dx=cat.tx-cat.x, dy=cat.ty-cat.y, m=Math.hypot(dx,dy);
      cat.x+=dx/m*14*dt/1000; cat.y+=dy/m*14*dt/1000;
    }
    } // end outdoor-only ambient
    // action edges
    if(!menuOpen()&&Input.actEdge){ this.useTool(); }
    if(Input.cycleEdge){
      if(!menuOpen()){ g.tool=(g.tool+1)%TOOLS.length; updateBelt(); chime(520); }
    }
    if(Input.numKey){ const n=Input.numKey-1; if(n>=0&&n<TOOLS.length){ g.tool=n; updateBelt(); } Input.numKey=0; }
    if(Input.menuClose&&menuOpen()) closeMenu();
    Input.actEdge=false; Input.cycleEdge=false; Input.menuClose=false;
  },
  walkable(nx,ny){
    const g=this.G, r=4; // player half-box
    if(g.indoor||g.inCave){
      const map=g.indoor?{gr:g.interior,w:IW,h:IH,solid:ISOLID}:{gr:g.cave,w:CW,h:CH,solid:CSOLID};
      for(const [cx,cy] of [[nx-r,ny-2],[nx+r,ny-2],[nx-r,ny+7],[nx+r,ny+7]]){
        const tx=Math.floor(cx/TILE), ty=Math.floor(cy/TILE);
        if(tx<0||ty<0||tx>=map.w||ty>=map.h)return false;
        if(map.solid.has(map.gr[ty*map.w+tx]))return false;
        if(g.inCave && this.nodeAt(tx,ty))return false;
      }
      return true;
    }
    for(const [cx,cy] of [[nx-r,ny-2],[nx+r,ny-2],[nx-r,ny+7],[nx+r,ny+7]]){
      const tx=Math.floor(cx/TILE), ty=Math.floor(cy/TILE);
      if(tx<0||ty<0||tx>=W||ty>=H)return false;
      if(SOLID.has(g.grid[ty*W+tx]))return false;
    }
    return true;
  },
  clock(){
    const m=Math.floor(this.G.minutes); const h=Math.floor(m/60), mm=m%60;
    return {h, mm, label:`${h}:${mm<10?'0':''}${mm}`};
  },
};
