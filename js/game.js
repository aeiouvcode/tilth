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
      skillXp:{farm:0, fish:0, mine:0, forage:0}, discovered:{},
      toolTier:{can:0, hoe:0, pick:0},
      seenEvents:{}, perks:{lure:false, sturdyCrate:false},
      coop:false, eggs:{}, hens:[], barn:false, cow:null, animalCare:{hen0:0,hen1:0,cow:0}, penFeedDay:0, penFeedHen:-1, maxCave:1, fairEnteredDay:0, solsticeToastDay:0, solsticeKeepsakeDay:0, solsticeKeepsakes:[], gateWelcomeDay:0, fernRoadHeard:false, roadChoice:'', pondChoice:'', pondChoiceDay:0, meadowLesson:'', meadowLessonDay:0, meadowLessonHeard:false, fieldPlan:'', fieldPlanDay:0, fieldPlanHeard:false, fieldGathered:[], fieldSeasons:[], fieldSeasonPending:-1, commonTable:'', tableWeeks:[], tableSeasons:[],
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
      hens:g.hens.map(({careFx,...hen})=>hen), cow:g.cow?(({careFx,...cow})=>cow)(g.cow):null,
      clouds:[],butterflies:[],fireflies:[], cat:g.cat};
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch(e){}
  },
  load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw)return null;
      const d=JSON.parse(raw);
      d.grid=Uint8Array.from(d.grid); d.crops=new Map(d.crops);
      // Older saves keep their farm and crops; only unused grass becomes the new road.
      for(let y=9;y<=10;y++) if(d.grid[y*W+21]===T.GRASS&&!d.crops.has(y*W+21)) d.grid[y*W+21]=T.PATH;
      for(const x of [24,31,36]) if(d.grid[5*W+x]===T.GRASS) d.grid[5*W+x]=T.TREE;
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
      if(!d.skillXp) d.skillXp={farm:0, fish:0, mine:0, forage:0};
      if(!d.discovered) d.discovered={};
      if(!d.toolTier) d.toolTier={can:0, hoe:0, pick:0};
      if(!d.seenEvents) d.seenEvents={}; if(!d.perks) d.perks={lure:false, sturdyCrate:false};
      if(d.coop===undefined) d.coop=false; if(!d.eggs) d.eggs={}; if(!d.hens) d.hens=[];
      if(d.coop){ d.grid[4*W+13]=T.COOP; d.grid[4*W+14]=T.COOP; d.grid[5*W+13]=T.COOP; d.grid[5*W+14]=T.COOP; }
      if(d.barn===undefined) d.barn=false; if(d.cow===undefined) d.cow=null;
      if(!d.animalCare) d.animalCare={hen0:0,hen1:0,cow:0};
      for(const id of ['hen0','hen1','cow']) d.animalCare[id]=Math.max(0,Math.min(10,Number(d.animalCare[id])||0));
      if(d.penFeedDay===undefined) d.penFeedDay=0;
      if(d.penFeedHen===undefined) d.penFeedHen=-1;
      if(d.hens) for(const h of d.hens) h.pettedDay=Number(h.pettedDay)||0;
      if(d.cow) d.cow.pettedDay=Number(d.cow.pettedDay)||0;
      if(!Number.isFinite(d.gateWelcomeDay)) d.gateWelcomeDay=0;
      if(typeof d.fernRoadHeard!=='boolean') d.fernRoadHeard=false;
      if(!['flowers','wild'].includes(d.roadChoice)) d.roadChoice='';
      if(!['reeds','open'].includes(d.pondChoice)) d.pondChoice='';
      if(!Number.isFinite(d.pondChoiceDay)) d.pondChoiceDay=0;
      if(!['shade','sky'].includes(d.meadowLesson)) d.meadowLesson='';
      if(!Number.isFinite(d.meadowLessonDay)) d.meadowLessonDay=0;
      if(typeof d.meadowLessonHeard!=='boolean') d.meadowLessonHeard=false;
      if(!['walk','nest'].includes(d.fieldPlan)) { d.fieldPlan=''; d.fieldPlanDay=0; d.fieldPlanHeard=false; }
      if(!Number.isFinite(d.fieldPlanDay)) d.fieldPlanDay=0;
      if(typeof d.fieldPlanHeard!=='boolean') d.fieldPlanHeard=false;
      if(!Array.isArray(d.fieldGathered)) d.fieldGathered=[];
      d.fieldGathered=[...new Set(d.fieldGathered.filter(n=>Number.isInteger(n)&&n>=0&&n<4))];
      if(!Array.isArray(d.fieldSeasons)) d.fieldSeasons=[];
      d.fieldSeasons=[...new Set(d.fieldSeasons.filter(n=>Number.isInteger(n)&&n>=1&&n<=3))];
      if(!Number.isInteger(d.fieldSeasonPending)||d.fieldSeasonPending<0||d.fieldSeasonPending>3)d.fieldSeasonPending=-1;
      if(d.fieldSeasons.includes(d.fieldSeasonPending))d.fieldSeasonPending=-1;
      if(!['sketches','stories'].includes(d.commonTable))d.commonTable='';
      if(!Array.isArray(d.tableWeeks))d.tableWeeks=[];
      d.tableWeeks=[...new Set(d.tableWeeks.filter(n=>Number.isInteger(n)&&n>=0&&n<=1000))].slice(0,1000);
      if(!Array.isArray(d.tableSeasons))d.tableSeasons=[];
      d.tableSeasons=[...new Set(d.tableSeasons.filter(n=>Number.isInteger(n)&&n>=0&&n<4))];
      if(!d.maxCave) d.maxCave=1; if(!d.fairEnteredDay) d.fairEnteredDay=0; if(!d.solsticeToastDay) d.solsticeToastDay=0; if(!d.solsticeKeepsakeDay) d.solsticeKeepsakeDay=0; if(!Array.isArray(d.solsticeKeepsakes)) d.solsticeKeepsakes=[];
      if(d.barn){ for(let by=4;by<=5;by++) for(let bx=16;bx<=18;bx++) d.grid[by*W+bx]=T.BARN; }
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
    { id:'lesson', from:'Fern', subject:'the west-field table',
      body:"I laid my sketchbook out by the west field. Mara says the grasses beside the fence are weeds, so I'm drawing them while they're still there. Come by after ten if you want to help me make a place for looking.",
      cond:(g)=>g.day>=2 },
    { id:'gather', from:'Mara', subject:'a season at the field',
      body:"Fern kept the sketches from spring. I'll bring my mother's old plant notes to the west-field table when the seasons turn. If you have time after the morning work, come see how the place has changed.",
      cond:(g)=>g.day>=9&&!!g.fieldPlan },
    { id:'seasonField', from:'Fern', subject:'come to the south field',
      body:"Mara and I are spending a little time at the open edge of the field this season. We will be there after ten on the fifth and sixth days. You can still finish the morning rows first. Come if you want to see what your plan made room for.",
      cond:(g)=>g.day>=9&&!!g.fieldPlan },
    { id:'table', from:'Mara', subject:'a table on the road',
      body:"Fern and I put a board beside the farm road. Come by on the first or sixth morning of the week, between nine and four, unless the south field needs us. We can draw what changed or write down what we remember. No need to bring anything.",
      cond:(g)=>g.day>=8 },
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
    { id:'winter', from:'Mara', subject:'the cold months',
      body:"First frost this morning. The stand has frostroot seeds - the one crop that doesn't mind the cold - and Bram swears the icefin bite all winter. The field rests otherwise. Keep warm.",
      cond:(g)=>g.day>=22 },
    { id:'fair', from:'Fern', subject:'the fair comes round',
      body:"The last day of autumn, the lane fills with tables and everybody pretends they didn't practice their displays. Bring three of your best to the judging table by the well - I want to see your name on a ribbon before the lanterns go up.",
      cond:(g)=>g.day>=19 },
    { id:'solstice', from:'Piet', subject:'one last winter fire',
      body:"On winter's last night we're making a fire beside the well. I'll bring cedar cuttings; Mara's steeping wintermint. Come after six and we'll raise a cup to what held through the cold.",
      cond:(g)=>g.day>=26 },
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
  // v2.24 solstice: once each winter, last evening of the year
  isSolstice(){ return this.G.day%28===0; },
  solsticeEvening(){ return this.isSolstice() && this.G.minutes>=1080; },
  nearBonfire(){ const g=this.G; return this.solsticeEvening() && Math.hypot(36.5*TILE-g.player.x,10.5*TILE-g.player.y)<TILE*1.8; },
  openBonfire(){
    const g=this.G, already=g.solsticeToastDay===g.day;
    const rows=[];
    if(!already){
      rows.push({label:'raise a wintermint cup',desc:'a warm drink - restores 20 energy',price:'free',pick:()=>{
        if(g.solsticeToastDay===g.day){ closeMenu(); return; }
        g.solsticeToastDay=g.day; g.energy=Math.min(100,g.energy+20);
        closeMenu(); chime(660); toast('to another spring - +20 energy'); this.save();
      }});
    }
    if(g.solsticeKeepsakeDay!==g.day){
      rows.push({label:'press a wintermint sprig',desc:'keep this winter in the journal; uses 1 Wintermint',price:(g.produce.wintermint||0)>0?'x1':'need x1',icon:SPR.forage.wintermint,
        pick:()=>this.keepSolsticeMoment('wintermint')});
      rows.push({label:'set a Moon Drop by the fire',desc:'a quiet memorial in the journal; uses 1 Moon Drop',price:(g.produce.moondrop||0)>0?'x1':'need x1',icon:SPR.item.moondrop,
        pick:()=>this.keepSolsticeMoment('moondrop')});
    } else {
      rows.push({label:'the page is kept',desc:'read the winter keepsake in your journal',price:'',pick:()=>{ closeMenu(); this.openJournal(); }});
    }
    rows.push({label:'step away',desc:'',price:'',pick:()=>closeMenu()});
    openDialogue('the solstice fire',
      "Piet keeps the cedar burning. Mara pours a wintermint brew. Fern says the first seeds are already waiting under the snow. Bram holds his cup toward the pond.", rows);
  },
  keepSolsticeMoment(id){
    const g=this.G;
    if(!this.solsticeEvening()||g.solsticeKeepsakeDay===g.day){ closeMenu(); return; }
    if((g.produce[id]||0)<1){ nudge('bring one '+ITEMS[id].name+' first'); return; }
    g.produce[id]--; g.solsticeKeepsakeDay=g.day;
    g.solsticeKeepsakes=g.solsticeKeepsakes||[];
    g.solsticeKeepsakes.push({day:g.day,id});
    closeMenu(); chime(id==='wintermint'?740:540);
    toast(id==='wintermint'?'a green trace between the pages':'a pale stone by the coals');
    this.save();
  },
  // v2.22 harvest fair: once a year, the last day of autumn, judged by day
  isFair(){ return this.G.day%28===21; },
  isFairActive(){ return this.isFair() && this.G.minutes>=600 && this.G.minutes<1080; },
  nearFairTable(){
    const g=this.G;
    return this.isFair() && Math.hypot(37.5*TILE-g.player.x, 9.5*TILE-g.player.y)<TILE*1.8;
  },
  openFairMenu(sel){
    const g=this.G;
    sel=sel||[];
    if(g.fairEnteredDay===g.day){
      openMenu('the harvest fair', [
        {label:'the judges have your display', desc:'prizes are settled - enjoy the fair', price:'', icon:SPR.item.ribbon, pick:()=>closeMenu()},
        {label:'step away', desc:'', price:'', pick:()=>closeMenu()},
      ]);
      return;
    }
    const rows=[{label:`present the display (${sel.length}/3)`, desc:'three of your finest, judged on worth', price:'', icon:null,
      pick:()=>{
        if(sel.length<3){ nudge('choose three first'); return; }
        const score=sel.reduce((s,id)=>s+this.sellPrice(id),0);
        g.fairEnteredDay=g.day;
        let prize, tier;
        if(score>=350){ prize=500; tier='grand prize'; }
        else if(score>=180){ prize=250; tier='blue ribbon'; }
        else { prize=100; tier='a fair showing'; }
        g.coins+=prize;
        if(score>=180) g.produce.ribbon=(g.produce.ribbon||0)+1;
        if(score>=350){ for(const id of ['mara','bram','fern','piet']) g.friendship[id]=Math.min(20,(g.friendship[id]||0)+2); }
        closeMenu();
        chime(880); setTimeout(()=>chime(1100),160); setTimeout(()=>chime(1320),340);
        toast(`${tier} - the judges award ${prize}g${score>=180?' and a prize ribbon':''} (${score}g of produce)`);
        this.save();
      }}];
    for(const id of Object.keys(g.produce)){
      if(!g.produce[id]||id==='ribbon') continue;
      const inSel=sel.includes(id);
      rows.push({ label:ITEMS[id].name, desc:`worth ${this.sellPrice(id)}g · have ${g.produce[id]}`, price:inSel?'in the display ✓':'', icon:SPR.item[id]||SPR.forage[id]||(CROPS[id]?SPR.crop(CROPS[id],3):null),
        pick:()=>{
          const i=sel.indexOf(id);
          if(i>=0) sel.splice(i,1);
          else if(sel.length<3) sel.push(id);
          else { nudge('three is plenty'); return; }
          closeMenu(); this.openFairMenu(sel);
        }});
    }
    rows.push({label:'step away', desc:'', price:'', pick:()=>closeMenu()});
    openMenu('the harvest fair - show your harvest', rows);
  },

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
      const roll=r();
      const id=this.season()===3
        ? (roll<0.45?'wintermint':(roll<0.8?'snowberry':'frostcap'))
        : (roll<0.45?'dandelion':(roll<0.8?'wildplum':'morel'));
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
      else if(it===IT.HEARTH){ this.openKitchen(); }
      else if(it===IT.SHELF&&(g.solsticeKeepsakes||[]).length){ this.openKeepsake(); }
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
        n.hp-=1+this.G.toolTier.pick; this.spendEnergy(2); thud();
        if(n.hp<=0){
          const arr=g.caveNodes[g.caveLevel];
          arr.splice(arr.indexOf(n),1);
          g.produce[n.type]=(g.produce[n.type]||0)+1;
          g.stats.mined=(g.stats.mined||0)+1;
          this.addXP('mine',2); this.discover(n.type);
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
      const tiles=g.toolTier.hoe>0?this.wideRow(f,g.toolTier.hoe):[f];
      let tilled=0;
      for(const p of tiles){
        if(p.x<0||p.y<0||p.x>=W||p.y>=H) continue;
        if(this.tileAt(p.x,p.y)===T.GRASS&&!g.crops.has(p.y*W+p.x)){ g.grid[p.y*W+p.x]=T.SOIL; tilled++; }
      }
      if(tilled){ g.stats.hoed+=tilled; this.spendEnergy([2,3,4][g.toolTier.hoe]); thud(); }
      else nudge('needs clear grass');
    } else if(tool==='can'){
      const tiles=g.toolTier.can>0?this.wideRow(f,g.toolTier.can):[f];
      let wet=0;
      for(const p of tiles){
        if(p.x<0||p.y<0||p.x>=W||p.y>=H) continue;
        const tt=this.tileAt(p.x,p.y), cc=g.crops.get(p.y*W+p.x);
        if(cc&&tt!==T.SOILWET){ g.grid[p.y*W+p.x]=T.SOILWET; cc.watered=true; wet++; }
        else if(tt===T.SOIL){ g.grid[p.y*W+p.x]=T.SOILWET; wet++; }
      }
      if(wet){ g.stats.watered+=wet; this.spendEnergy([1,2,3][g.toolTier.can]); splash(); }
      else nudge('nothing to water');
    } else if(tool==='seeds'){
      if((t===T.SOIL||t===T.SOILWET)&&!crop){ this.openPlantMenu(f.x,f.y); }
      else nudge('needs tilled soil');
    } else if(tool==='hand'){
      const fg=g.forage.get(key);
      if(crop&&crop.stage>=3){ this.harvest(f.x,f.y,crop); }
      else if(fg){ g.forage.delete(key); g.produce[fg.id]=(g.produce[fg.id]||0)+1; g.stats.foraged++; this.addXP('forage',1); this.discover(fg.id); this.spendEnergy(1); chime(700); toast(`+1 ${ITEMS[fg.id].name}`); }
      else if(g.eggs[key]){ const egg=g.eggs[key]==='sunegg'?'sunegg':'egg'; delete g.eggs[key]; g.produce[egg]=(g.produce[egg]||0)+1; this.addXP('forage',1); this.discover(egg); this.spendEnergy(1); chime(700); toast('+1 '+ITEMS[egg].name); }
      else if(t===T.COOP||t===T.BARN){ this.openPenLedger(); }
      else if(this.nearCow()){ this.openCowCare(); }
      else if(this.nearHen()!==-1){ this.petAnimal('hen'+this.nearHen()); }
      else if(this.nearFairTable()){ this.openFairMenu(); }
      else if(this.nearBonfire()){ this.openBonfire(); }
      else if(this.nearFieldNotice()){ this.readFieldNotice(); }
      else if(this.nearCommonTable()){ this.openCommonTable(); }
      else if(this.nearFieldSeasonDay()){ this.openFieldSeasonDay(); }
      else if(this.nearMeadowLesson()&&this.fieldGathering()){ this.openFieldGathering(); }
      else if(this.nearMeadowLesson()&&g.meadowLesson&&g.day>g.meadowLessonDay&&!this.nearNpc('fern')){ this.readMeadowLesson(); }
      else if(this.nearWaymark()){ this.readWaymark(); }
      else if(this.nearPondLookout()){ this.readPondLookout(); }
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
      if(t===T.ROCK){ g.grid[f.y*W+f.x]=T.GRASS; g.produce.pitstone=(g.produce.pitstone||0)+1; g.stats.mined=(g.stats.mined||0)+1; this.spendEnergy([3,2,1][g.toolTier.pick]); thud(); toast('+1 Pit Stone'); }
      else nudge('nothing to break here');
    } else if(tool==='scythe'){
      if(crop){ g.crops.delete(key); if(this.tileAt(f.x,f.y)===T.SOILWET)g.grid[f.y*W+f.x]=T.SOIL; this.spendEnergy(2); swish(); toast('cleared'); }
      else nudge('nothing to clear');
    }
  },
  // facing tile plus perpendicular neighbours: half=1 -> row of 3, half=2 -> row of 5
  wideRow(f,half){
    const g=this.G, vert=(g.player.dir==='up'||g.player.dir==='down'), out=[f];
    for(let i=1;i<=(half||1);i++) vert? out.push({x:f.x-i,y:f.y},{x:f.x+i,y:f.y}) : out.push({x:f.x,y:f.y-i},{x:f.x,y:f.y+i});
    return out;
  },
  // short label for what the current tool would do on the facing tile - drives the on-screen hint
  interactHint(){
    const g=this.G;
    if(g.indoor){
      const tx=Math.floor(g.player.x/TILE+(g.player.dir==='right'?1:g.player.dir==='left'?-1:0));
      const ty=Math.floor(g.player.y/TILE+(g.player.dir==='down'?1:g.player.dir==='up'?-1:0));
      if(tx<0||ty<0||tx>=IW||ty>=IH) return '';
      const it=g.interior[ty*IW+tx];
      return it===IT.BED?'sleep until morning':(it===IT.DOOR?'step outside':(it===IT.HEARTH?'cook a meal':(it===IT.SHELF&&(g.solsticeKeepsakes||[]).length?'look at the keepsake':'')));
    }
    if(g.inCave){
      const tx=Math.floor(g.player.x/TILE+(g.player.dir==='right'?1:g.player.dir==='left'?-1:0));
      const ty=Math.floor(g.player.y/TILE+(g.player.dir==='down'?1:g.player.dir==='up'?-1:0));
      if(tx<0||ty<0||tx>=CW||ty>=CH) return '';
      if(g.cave[ty*CW+tx]===CT.DOOR) return 'go up';
      if(g.cave[ty*CW+tx]===CT.STAIRS) return 'deeper';
      if(this.nodeAt(tx,ty)) return TOOLS[g.tool].id==='pick'?'mine':'needs pickaxe';
      return '';
    }
    const f=facingTile(g.player); if(!f)return '';
    const tool=TOOLS[g.tool].id, t=this.tileAt(f.x,f.y), key=f.y*W+f.x, crop=g.crops.get(key);
    if(tool==='rod'&&t===T.WATER) return 'fish';
    if(tool==='hoe'&&t===T.GRASS&&!crop) return 'till';
    if(tool==='can'&&(crop||t===T.SOIL)) return 'water';
    if(tool==='seeds'&&(t===T.SOIL||t===T.SOILWET)&&!crop) return 'plant';
    if(tool==='scythe'&&crop) return 'clear';
    if(tool==='pick'&&t===T.ROCK) return 'break';
    if(tool==='hand'){
      if(crop&&crop.stage>=3) return 'harvest';
      if(g.forage.get(key)) return 'pick';
      if(g.eggs[key]) return 'gather egg';
      if(t===T.COOP||t===T.BARN) return 'pen ledger';
      if(this.nearCow()&&g.cow&&!g.cow.milked) return 'milk the cow';
      if(this.nearCow()&&g.cow&&g.cow.pettedDay!==g.day) return 'pet the cow';
      if(this.nearHen()!==-1 && g.hens[this.nearHen()].pettedDay!==g.day) return 'pet a hen';
      if(this.nearFairTable()) return 'enter the showcase';
      if(this.nearBonfire()) return 'join the fire';
      if(this.nearFieldNotice()) return "read Fern's field note";
      if(this.nearCommonTable()) return this.tableDay()?'join table':'read table';
      if(this.nearFieldSeasonDay()) return 'spend the field day';
      if(this.nearMeadowLesson()&&this.fieldGathering()) return 'join the field gathering';
      if(this.nearMeadowLesson()&&g.meadowLesson&&g.day>g.meadowLessonDay&&!this.nearNpc('fern')) return 'visit the field lesson';
      if(this.nearWaymark()) return 'read the cedarwalk';
      if(this.nearPondLookout()) return 'look across the pond';
      if(t===T.DOORMAT) return 'enter house';
      if(t===T.CAVEENT) return 'enter the quarry';
      if(t===T.MAILBOX) return 'read mail';
      if(t===T.CRATE) return 'ship produce (pays at dawn)';
      if(t===T.STAND) return 'seed shop';
      for(const id of ['mara','bram','fern','piet']){ if(this.nearNpc(id)) return 'talk'; }
    }
    return '';
  },
  // ---------- v2.16 progression: skills + valley journal ----------
  SKILLS:{ farm:'Farming', fish:'Fishing', mine:'Mining', forage:'Foraging' },
  SKILL_T:[10,25,50],
  skillLevel(cat){ const xp=(this.G.skillXp||{})[cat]||0; return (xp>=50?3:xp>=25?2:xp>=10?1:0); },
  addXP(cat,n){
    const g=this.G, before=this.skillLevel(cat);
    g.skillXp[cat]=(g.skillXp[cat]||0)+n;
    const after=this.skillLevel(cat);
    if(after>before){ const what=cat==='farm'?'crop':cat==='fish'?'fish':cat==='mine'?'ore':'forage';
      chime(660); setTimeout(()=>chime(880),140);
      toast(`${this.SKILLS[cat]} level ${after} - ${what} sales +5%`); }
  },
  skillCatOf(id){ return CROPS[id]?'farm':(FISH[id]?'fish':(ORES[id]?'mine':(RECIPES.some(r=>r.id===id)?'kitchen':(KEEPSAKE[id]?'fair':'forage')))); },
  sellPrice(id){ return Math.round(ITEMS[id].sell*(1+0.05*this.skillLevel(this.skillCatOf(id)))*((this.G.perks&&this.G.perks.sturdyCrate)?1.05:1)); },
  discover(id){
    const g=this.G; if(g.discovered[id])return;
    g.discovered[id]=true;
    setTimeout(()=>{ toast(`new for the journal: ${ITEMS[id].name}`); chime(760); },900);
  },
  openJournal(){
    const g=this.G, rows=[];
    for(const cat of ['farm','fish','mine','forage']){
      const xp=g.skillXp[cat]||0, lv=this.skillLevel(cat), next=lv<3?this.SKILL_T[lv]:null;
      rows.push({ label:`${this.SKILLS[cat]} - level ${lv}`,
        desc:`${xp} xp, +${lv*5}% sale prices${next?`, next at ${next} xp`:', maxed'}`,
        price:'', icon:null, pick:()=>{} });
    }
    if(g.commonTable){
      rows.push({label:'the village table',desc:g.commonTable==='sketches'?'neighbors have left drawings from the valley':'neighbors have left words from the valley',price:'',icon:null,pick:()=>{}});
      for(let i=0;i<Math.min(3,g.tableWeeks.length);i++)rows.push({label:`table visit ${i+1}`,desc:['a first page shared with Mara and Fern','a neighbor came back with a different view','three pages now face the road'][i],price:'',icon:null,pick:()=>{}});
      for(const season of (g.tableSeasons||[]))rows.push({label:SEASONS[season]+' on the road',desc:['the gate page stays open to the first thaw','Mara names the field path beside its drawing','Bram remembers the pond before the leaves fell','Fern leaves a pale margin for the next hand'][season],price:'',icon:null,pick:()=>{}});
    }
    for(const s of (g.fieldSeasons||[])){
      const copy=g.fieldPlan==='nest'?{1:'we watched the birds from the quiet edge',2:'we left the autumn stems standing',3:'we tied one winter stem above the snow'}:{1:'we carried a basket along the summer way',2:'we swept the turning stones in autumn',3:'we brushed a narrow way through the snow'};
      rows.push({label:SEASONS[s]+' field day',desc:copy[s],price:'',icon:null,pick:()=>{}});
    }
    for(const s of (g.fieldGathered||[])){
      const scenes=g.fieldPlan==='walk'?["","Fern drew the tall summer grasses beside her spring sketch.","Mara swept autumn leaves from the walking way.","The stones of the walking way still showed through the snow."]:["","Fern drew the birds above the summer grasses.","Mara pressed autumn leaves beside the old drawings.","The nesting strip held a fringe of winter snow."];
      rows.push({label:SEASONS[s]+' at the field',desc:scenes[s],price:'',icon:null,pick:()=>{}});
    }
    for(const note of (g.solsticeKeepsakes||[])){
      rows.push({label:note.id==='wintermint'?'pressed wintermint':'Moon Drop by the fire',
        desc:note.id==='wintermint'?'a green trace from the last night of winter':'a quiet stone left beside the cedar coals',
        price:`winter ${Math.floor((note.day-1)/28)+1}`,icon:note.id==='wintermint'?SPR.forage.wintermint:SPR.item.moondrop,pick:()=>{}});
    }
    const ids=[...Object.keys(CROPS),...Object.keys(FORAGE),...Object.keys(FISH),...Object.keys(ORES),...Object.keys(ANIMAL)]; let found=0;
    for(const id of ids) if(g.discovered[id]) found++;
    rows.push({ label:`collection - ${found} of ${ids.length}`,
      desc:'one of everything the valley grows, swims, and digs up', price:'', icon:null, pick:()=>{} });
    for(const id of ids){
      const got=!!g.discovered[id];
      rows.push({ label:got?ITEMS[id].name:'? ? ?',
        desc:got?`${this.SKILLS[this.skillCatOf(id)].toLowerCase()}, sells ${this.sellPrice(id)}g`:'not yet found',
        price:'', icon:got?(SPR.item[id]||SPR.forage[id]||(CROPS[id]?SPR.crop(CROPS[id],3):null)):null, pick:()=>{} });
    }
    rows.push({ label:'close', desc:'', price:'', pick:()=>closeMenu() });
    openMenu('valley journal', rows);
  },
  harvest(x,y,crop){
    const g=this.G, def=CROPS[crop.id];
    g.produce[crop.id]=(g.produce[crop.id]||0)+1;
    g.harvested++; g.stats.shipped++;
    this.addXP('farm',2); this.discover(crop.id);
    if(g.harvested===1) setTimeout(()=>toast('the crate by your door ships produce at dawn'), 1400);
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
      label:`${def.seed}`, desc:`${def.days}d, sells ${this.sellPrice(def.id)}g`, price:`${def.seedCost}g`, icon:SPR.crop(def,3),
      pick:()=>{ if(g.coins>=def.seedCost){ g.coins-=def.seedCost; g.seeds[def.id]=(g.seeds[def.id]||0)+1; toast(`+1 ${def.seed}`); chime(880); this.refreshMenu(); } else nudge('not enough coin'); }
    }));
    for(const up of [{id:'can',tiers:[{name:'Copper watering can',cost:600,desc:'waters a row of 3 for 2 energy'},{name:'Iron watering can',cost:1500,desc:'waters a row of 5 for 3 energy'}]},
                     {id:'pick',tiers:[{name:'Copper pickaxe',cost:500,desc:'cave rock breaks twice as fast'},{name:'Iron pickaxe',cost:1200,desc:'3 damage a swing, rocks cost 1 energy'}]},
                     {id:'hoe',tiers:[{name:'Copper hoe',cost:400,desc:'tills a row of 3 at once'},{name:'Iron hoe',cost:1000,desc:'tills a row of 5 at once'}]}]){
      const tier=g.toolTier[up.id];
      if(tier>=2) rows.push({label:up.tiers[1].name, desc:'yours - in the toolbelt', price:'', icon:SPR.icons[up.id], pick:()=>nudge('already yours')});
      else { const nx=up.tiers[tier];
        rows.push({label:nx.name, desc:nx.desc, price:`${nx.cost}g`, icon:SPR.icons[up.id],
          pick:()=>{ if(g.coins>=nx.cost){ g.coins-=nx.cost; g.toolTier[up.id]++; toast(`${nx.name} - yours`); chime(980); updateBelt(); this.refreshMenu(); } else nudge('not enough coin'); }}); }
    }
    if(Object.values(g.produce).some(n=>n>0)){
      rows.unshift({label:'selling produce?', desc:'the crate by your house ships at dawn', price:'', icon:null,
        pick:()=>{ closeMenu(); nudge('the crate by your house ships at dawn'); }});
    }
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
      label:ITEMS[id].name, desc:`ships for ${this.sellPrice(id)}g each`, price:`x${n}`, icon:SPR.item[id]||SPR.forage[id]||(CROPS[id]?SPR.crop(CROPS[id],3):null),
      pick:()=>{
        const val=this.sellPrice(id)*n;
        g.pendingSale+=val; g.produce[id]=0; g.shipped+=n;
        toast(`${n} ${ITEMS[id].name} in the crate (+${val}g at dawn)`); chime(740);
        closeMenu();
      }
    }));
    openMenu('shipping crate — sells at dawn', rows);
  },
  // node mix per depth: deeper is richer but tougher; [threshold, type] pairs
  CAVE_MIX:[
    [[0.55,'pitstone'],[0.85,'emberquartz'],[1,'moondrop']],
    [[0.40,'pitstone'],[0.80,'emberquartz'],[1,'moondrop']],
    [[0.25,'pitstone'],[0.70,'emberquartz'],[1,'moondrop']],
    [[0.20,'pitstone'],[0.45,'emberquartz'],[0.75,'moondrop'],[1,'sunstone']],
    [[0.12,'pitstone'],[0.32,'emberquartz'],[0.55,'moondrop'],[0.80,'sunstone'],[1,'deepopal']],
  ],
  CAVE_TOAST:{2:'deeper — the stone turns cold', 3:'deepest — the rock is warm', 4:'the gloam — violet seams glint', 5:'the core — the air shimmers gold'},
  spawnNodes(level){
    const g=this.G, lvl=level||g.caveLevel||1;
    const spots=CAVE_SPOTS.slice();
    const r=mulberry32(g.day*77+13+lvl*1000);
    for(let i=spots.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=spots[i]; spots[i]=spots[j]; spots[j]=t; }
    const mix=this.CAVE_MIX[clamp(lvl-1,0,this.CAVE_MIX.length-1)];
    g.caveNodes[lvl]=spots.slice(0, lvl>=3?6:5).map(([x,y])=>{
      const roll=r();
      let type='moondrop'; for(const [th,ty] of mix){ if(roll<th){ type=ty; break; } }
      const baseHp={pitstone:1, emberquartz:2, moondrop:3, sunstone:3, deepopal:4}[type];
      return {x,y,type,hp:baseHp+(lvl-1)};
    });
    g.nodes=g.caveNodes[g.caveLevel]||[];
  },
  nodeAt(x,y){ return (this.G.caveNodes[this.G.caveLevel]||[]).find(n=>n.x===x&&n.y===y); },
  descendCave(){
    const g=this.G;
    if(g.caveLevel>=5){ nudge('the cave bottoms out here — the core hums'); return; }
    g.caveLevel++;
    g.maxCave=Math.max(g.maxCave||1, g.caveLevel);
    g.nodes=g.caveNodes[g.caveLevel]||[];
    if(!g.nodes.length) this.spawnNodes();
    g.player.x=6.5*TILE; g.player.y=6.4*TILE; g.player.dir='up';
    fadeSleep(); thud();
    toast(this.CAVE_TOAST[g.caveLevel]||'deeper');
  },
  goToCaveLevel(n){
    const g=this.G;
    g.caveLevel=n; g.nodes=g.caveNodes[n]||[];
    if(!g.nodes.length) this.spawnNodes();
    g.player.x=6.5*TILE; g.player.y=6.4*TILE; g.player.dir='up';
    fadeSleep(); thud();
  },
  openLiftMenu(){
    const g=this.G;
    const rows=[1,3,5].filter(l=>l<=g.maxCave).map(l=>({
      label:`level ${l}`, desc:l===1?'the upper gallery':l===3?'the warm deep':'the molten core', price:'', icon:null,
      pick:()=>{ closeMenu(); this.goToCaveLevel(l); }}));
    rows.push({label:'step off', desc:'', price:'', icon:null, pick:()=>closeMenu()});
    openMenu('the mine lift — cables hum', rows);
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
    if(!g.nodes.length) this.spawnNodes();
    g.player.x=6.5*TILE; g.player.y=7.4*TILE; g.player.dir='up'; g.player.moving=false;
    fadeSleep(); thud();
    if(g.maxCave>=3) this.openLiftMenu();
  },
  exitCave(){
    const g=this.G; if(!g.inCave)return;
    g.inCave=false;
    g.player.x=(g.outdoor&&g.outdoor.x)||45.5*TILE;
    g.player.y=(g.outdoor&&g.outdoor.y)||13.5*TILE;
    g.player.dir='down'; g.player.moving=false;
    fadeSleep(); chime(460);
  },
  // A choice comes home. The shelf is an encounter, not another collection counter.
  openKeepsake(){
    const notes=this.G.solsticeKeepsakes||[], last=notes[notes.length-1];
    if(!last){ nudge('the shelf holds only jars'); return; }
    const mint=last.id==='wintermint', winter=Math.floor((last.day-1)/28)+1;
    openDialogue('the winter shelf', mint
      ? `A pressed sprig lies between two pages. The green has faded, but the room still smells faintly of wintermint. Winter ${winter} left something that stayed.`
      : `A charcoal sketch of the cedar fire rests by the lamp. The Moon Drop itself stayed by the coals. Winter ${winter} left its mark there.`,
      []);
  },
  // ---------- v2.21 hearth cooking ----------
  openKitchen(){
    const g=this.G;
    const rows=[];
    for(const r of RECIPES){
      const needs=Object.entries(r.needs).map(([id,n])=>`${ITEMS[id].name} x${n}`).join(' + ');
      const can=Object.entries(r.needs).every(([id,n])=>(g.produce[id]||0)>=n);
      rows.push({ label:r.name, desc:needs, price:`${r.sell}g · +${r.energy} energy`, icon:SPR.item[r.id],
        pick:()=>{
          if(!can){ nudge('missing ingredients'); return; }
          for(const [id,n] of Object.entries(r.needs)) g.produce[id]-=n;
          g.produce[r.id]=(g.produce[r.id]||0)+1;
          chime(760); setTimeout(()=>chime(980),150);
          toast(`cooked ${r.name}`);
          closeMenu(); this.openKitchen();
        }});
    }
    const meals=RECIPES.filter(r=>(g.produce[r.id]||0)>0);
    for(const r of meals){
      rows.push({ label:`eat ${r.name}`, desc:`restores ${r.energy} energy`, price:`x${g.produce[r.id]}`, icon:SPR.item[r.id],
        pick:()=>{ g.produce[r.id]--; g.energy=Math.min(100, g.energy+r.energy); chime(520); toast(`+${r.energy} energy`); closeMenu(); this.openKitchen(); }});
    }
    rows.push({ label:'step away', desc:'', price:'', pick:()=>closeMenu() });
    openMenu('the hearth - cook a meal', rows);
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
    if(g.fieldSeasonPending>=0){ if(this.seasonOf(g.day-1)===g.fieldSeasonPending&&!g.fieldSeasons.includes(g.fieldSeasonPending))g.fieldSeasons.push(g.fieldSeasonPending);g.fieldSeasonPending=-1; }
    g.forage.clear(); this.spawnForage(2+Math.floor(Math.random()*3));
    this.layEggs();
    if(g.cow) g.cow.milked=false;
    this.checkLetters();
    if(g.day===2)setTimeout(()=>toast('Fern is setting out a table by the west field'),1200);
    if(this.isFair()) setTimeout(()=>toast('the harvest fair sets up by the well today - bring your finest'), 1200);
    if(this.isSolstice()) setTimeout(()=>toast('the solstice fire starts by the well after six'), 1200);
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
  // The old road has a place to stop between work and the village.
  nearWaymark(){
    const g=this.G;
    return !g.indoor&&!g.inCave&&Math.hypot(g.player.x-28.5*TILE,g.player.y-8.5*TILE)<TILE*1.8;
  },
  readWaymark(){
    const g=this.G, season=this.season();
    const lines=[
      'Mara planted the first cedar when the road was only wheel ruts. Its roots have found the stones now. The village is just ahead.',
      'The cedar shade reaches the whole road at noon. Fern leaves a water cup here for anyone walking back from the field.',
      'A red leaf rests in the old notch. Piet cut it to mark the distance home, back when the cottage was still a stack of timber.',
      'Snow fills the wheel ruts, but the old stones keep the way. Someone has brushed the bench clear for the next traveler.'
    ];
    const follow=g.gateWelcomeDay>0&&g.day>g.gateWelcomeDay;
    const ending=follow?(season===3?' The cup is empty and turned down against the frost.':season===1?' The cup is full again today.':' Fern has left a cup of water on the bench for the walk back.'):'';
    const chosen=g.roadChoice==='flowers'?' You planted a low row of flowers beside the stones.':g.roadChoice==='wild'?' You left the verge open for the meadow to come through.':'';
    const rows=follow&&!g.roadChoice?[
      {label:'plant a flower border',desc:'a low flower row beside the road; no seed cost',price:'',pick:()=>this.chooseRoad('flowers')},
      {label:'leave the verge wild',desc:'keep the open meadow beside the road',price:'',pick:()=>this.chooseRoad('wild')}
    ]:[];
    openDialogue('the cedarwalk',lines[season]+ending+chosen,rows);
  },
  chooseRoad(choice){
    const g=this.G;
    if(!['flowers','wild'].includes(choice)||g.roadChoice||!g.gateWelcomeDay||g.day<=g.gateWelcomeDay||!this.nearWaymark())return;
    g.roadChoice=choice;this.save();closeMenu();
    toast(choice==='flowers'?'a flower border takes root beside the road':'the meadow keeps its place beside the road');
  },
  // Independent midgame place on the ordinary farm-to-village road. One quiet
  // hour a week, without an inventory cost or a hidden field-plan prerequisite.
  tableWeek(){return Math.floor((this.G.day-1)/7);},
  tableDay(){
    const g=this.G, d=(g.day-1)%7;
    return g.day>=8&&(d===0||d===5)&&g.minutes>=540&&g.minutes<960&&
      !g.indoor&&!g.inCave&&!this.isFestival()&&!this.fieldSeasonDay();
  },
  nearCommonTable(){
    const g=this.G;
    return !g.indoor&&!g.inCave&&g.day>=8&&
      Math.hypot(g.player.x-18.5*TILE,g.player.y-8.5*TILE)<TILE*1.8;
  },
  tableSeasonScene(){
    const g=this.G, s=this.season(), sketches=g.commonTable==='sketches';
    return (sketches?[
      'Mara lifts the gate drawing where the thaw has left a stain. Fern traces the narrow path without closing the empty space beside it.',
      'The summer light reaches the first page. Mara points to the field way she uses now; Fern draws the shade where they stop.',
      'Bram follows the pond line with one finger. The reeds he remembers have changed, but his old bank is still there.',
      'Fern leaves a broad white margin around the cedar. No one has to fill it before the snow melts.'
    ]:[
      'Mara reads the first grass name again after the thaw. Fern adds the one she heard from a child walking past.',
      'The summer page holds two names for the same field path. Mara says both aloud before she folds the sheet.',
      'Bram tells the pond story differently this time. Fern keeps both versions and leaves the ending untied.',
      'Fern writes down the sound of boots crossing the frozen road. Mara leaves the next line empty for spring.'
    ])[s];
  },
  openCommonTable(){
    if(!this.nearCommonTable())return;
    const g=this.G, visits=g.tableWeeks.length, available=this.tableDay()&&!g.tableWeeks.includes(this.tableWeek());
    if(!g.commonTable){
      const intro='An empty board faces the farm road. Mara sets down a spare pencil. Fern has hung three blank sheets for anyone passing. Mara asks what this place should hold when people stop.';
      const rows=this.tableDay()?[
        {label:'draw the valley together',desc:'sketches of familiar places; one quiet hour',price:'',pick:()=>this.joinCommonTable('sketches')},
        {label:'write what we remember',desc:'stories heard on the road; one quiet hour',price:'',pick:()=>this.joinCommonTable('stories')}
      ]:[];
      openDialogue('the village table',intro+(rows.length?'':' Mara keeps the table open on the first and sixth mornings of each week, from nine until four, unless the south field needs us.'),rows);return;
    }
    const scenes=g.commonTable==='sketches'?[
      'Mara has drawn the field gate crooked. Fern does not straighten it; she draws the path people actually take.',
      'Bram adds the north bank without asking. His pencil rests there a moment before he draws the pond.',
      'The three sheets hold the farm road, pond and field together. No one drew the same valley, and none of them has to.'
    ]:[
      'Mara writes down the name her mother used for the grass beside the field. Fern leaves space for another name.',
      'Bram remembers the winter when the pond held every footprint. Fern writes it beneath Mara\'s line.',
      'The three sheets hold a season of voices. Mara reads the first line aloud, then asks you to leave the last one open.'
    ];
    const returnSeason=visits>=3&&!g.tableSeasons.includes(this.season());
    const rows=available?[{label:visits===0?'begin a page together':visits>=3?(returnSeason?'leave a seasonal margin':'sit with them again'):'add another page',
      desc:visits>=3&&returnSeason?'one quiet hour; a small season mark, no coin, item or XP':'spend one hour this week; no coin, item or XP',price:'',pick:()=>this.joinCommonTable(g.commonTable)}]:[];
    const passage=visits>=3?this.tableSeasonScene():scenes[Math.max(0,visits-1)];
    openDialogue('the village table',passage+(available?'':g.tableWeeks.includes(this.tableWeek())?' You have already spent time here this week.':' Mara sets out the pages again on the first and sixth mornings, unless the south field needs us.'),rows);
  },
  joinCommonTable(theme){
    const g=this.G;
    if(!this.nearCommonTable()||!this.tableDay()||g.tableWeeks.includes(this.tableWeek())||
      !['sketches','stories'].includes(theme)||(g.commonTable&&g.commonTable!==theme))return;
    g.commonTable=theme;
    const seasonMargin=g.tableWeeks.length>=3&&!g.tableSeasons.includes(this.season());
    g.tableWeeks.push(this.tableWeek());
    if(seasonMargin)g.tableSeasons.push(this.season());
    g.minutes=Math.min(DAY_END-1,g.minutes+60);this.save();closeMenu();
    toast(seasonMargin?'a season settles at the edge of the page':g.tableWeeks.length>=3?'the road has three shared pages':'a page faces the road');
  },
  // Fern lays out a teaching place by the west field on the second morning.
  // The player decides how people will gather; neither option pays or changes crops.
  meadowVisit(){
    const g=this.G, h=g.minutes/60;
    return this.season()!==3 && !this.isFestival() && h>=10 && h<16 &&
      ((g.day>=2 && !g.meadowLesson) || (g.meadowLesson && g.day>g.meadowLessonDay && g.day<=g.meadowLessonDay+2));
  },
  // The ordinary route into the crop rows passes this gate. This is a signpost,
  // not an automatic unlock: reading it never chooses for the player.
  nearFieldNotice(){
    const g=this.G;
    return !g.indoor&&!g.inCave&&g.day>=2&&!g.meadowLesson&&
      Math.hypot(g.player.x-21.5*TILE,g.player.y-10.5*TILE)<TILE*1.65;
  },
  readFieldNotice(){
    if(!this.nearFieldNotice())return;
    const note=this.season()===3?
      "Fern has tucked her field sketches away for winter. She will bring them back when spring returns. The path from this gate runs west, past Mara's stand, to the drawing table.":
      "Fern is drawing the grasses beside the west field. After ten on a non-festival day, follow the lane west past Mara's stand, then walk south to her table. The rows can wait an hour.";
    openDialogue('at the field gate',note,[{label:'leave it for later',desc:'the table stays until you visit; no cost',price:'',pick:()=>closeMenu()}]);
  },
  nearMeadowLesson(){
    const g=this.G;
    return !g.indoor&&!g.inCave&&Math.hypot(g.player.x-12.5*TILE,g.player.y-17.5*TILE)<TILE*2;
  },
  chooseMeadowLesson(choice){
    const g=this.G;
    if(!['shade','sky'].includes(choice)||g.meadowLesson||g.day<2||this.season()===3||this.isFestival()||g.minutes<600||g.minutes>=960||!this.nearNpc('fern')||!this.nearMeadowLesson())return;
    g.meadowLesson=choice;g.meadowLessonDay=g.day;this.save();closeMenu();
    toast(choice==='shade'?'Fern marks a place for the canvas roof':'Fern marks out a circle under the sky');
  },
  readMeadowLesson(){
    const g=this.G;
    if(!g.meadowLesson||g.day<=g.meadowLessonDay||!this.nearMeadowLesson())return;
    const text=g.meadowLesson==='shade'?"A stitched canvas roof throws a cool square over the table. Fern's sketches are spread beneath it; there is room for one more hand to draw.":"The benches face one another under the open sky. Fern's sketches weigh down the table, and the meadow runs right up to everyone's feet.";
    const after=g.fieldPlan==='walk'?' Mara kept a broad way through the grass for the farm hands.':g.fieldPlan==='nest'?' Fern left the field edge quiet for nesting birds.':'';
    const rows=!g.fieldPlan?[
      {label:'mark a walking way',desc:'keep a clear way for the farm hands; no cost',price:'',pick:()=>this.chooseFieldPlan('walk')},
      {label:'leave a nesting strip',desc:'let the edge grow tall for birds; no cost',price:'',pick:()=>this.chooseFieldPlan('nest')}]:[];
    openDialogue('the field lesson',text+after,rows);
  },
  chooseFieldPlan(choice){
    const g=this.G;
    if(!['walk','nest'].includes(choice)||g.fieldPlan||!g.meadowLesson||g.day<=g.meadowLessonDay||!this.nearMeadowLesson())return;
    g.fieldPlan=choice;g.fieldPlanDay=g.day;this.save();closeMenu();
    toast(choice==='walk'?'a walking way takes shape beyond the table':'the field edge is left for the birds');
  },
  // Two mid-morning windows per season, one scene to remember.
  fieldSeasonDay(){
    const g=this.G,s=this.season();
    return !!g.fieldPlan&&s>0&&s<4&&((g.day-1)%7)>=4&&((g.day-1)%7)<=5&&g.minutes>=600&&g.minutes<960&&
      !g.indoor&&!g.inCave&&!this.isFestival()&&!(g.fieldSeasons||[]).includes(s)&&g.fieldSeasonPending!==s;
  },
  nearFieldSeasonDay(){
    const g=this.G;
    return this.fieldSeasonDay()&&Math.hypot(g.player.x-15.5*TILE,g.player.y-19.5*TILE)<TILE*2;
  },
  openFieldSeasonDay(){
    if(!this.nearFieldSeasonDay())return;
    const g=this.G,s=this.season(),nest=g.fieldPlan==='nest';
    const text=s===1?(nest?'Fern asks you to count the small birds from the edge, where the nesting strip stays quiet. Mara brings water and sits beside you.':'Mara invites you to carry a basket along the walking way. Fern has kept the open edge clear so neither of you tramples the grass.'):
      s===2?(nest?'The birds are gone. Fern asks you to leave the tall stems for winter, and Mara agrees to set her scythe down.':'Autumn leaves hide the turn in the walking way. Mara shows you where to sweep the stones; Fern keeps the leaves she likes for drawing.'):
      (nest?'The nesting strip bends under snow. You and Fern tie one loose stem back; Mara leaves the rest untouched.':'Snow covers the walking stones. Mara and Fern brush a narrow line to the table with you, leaving the rest white.');
    const label=s===1?(nest?'watch from the edge':'carry a basket together'):s===2?(nest?'leave the stems standing':'sweep the turning stones'):(nest?'tie one loose stem':'brush a way to the table');
    openDialogue('the field this season',text,[{label,desc:'spend a quiet hour; no coin, item or XP',price:'',pick:()=>this.keepFieldSeasonDay(s)}]);
  },
  keepFieldSeasonDay(s){
    const g=this.G;
    if(!this.nearFieldSeasonDay()||s!==this.season())return;
    g.fieldSeasonPending=s;g.minutes=Math.min(DAY_END-1,g.minutes+60);
    this.save();closeMenu();toast('the field keeps your hour today');
  },
  // A repeat gathering is a lived-in seasonal scene, not a reward meter.
  fieldGathering(){
    const g=this.G, s=this.season();
    return !!g.fieldPlan&&s>0&&s<4&&((g.day-1)%7)>=1&&((g.day-1)%7)<=3&&g.minutes>=600&&g.minutes<900&&!this.isFestival();
  },
  openFieldGathering(){
    const g=this.G,s=this.season();
    if(!this.nearMeadowLesson()||!this.fieldGathering())return;
    const first=!(g.fieldGathered||[]).includes(s),way=g.fieldPlan==='walk';
    const text=s===1?(way?"The walking way has widened under summer feet. Mara carries seed jars to the field. Fern lays open her old spring sketches and draws the new, tall grasses beside them.":"Summer insects hum above the nesting strip. Mara brings her mother's notes, and Fern draws a small bird beside each grass she names."):
      s===2?(way?"Leaves gather along the walking way. Mara sweeps just enough space for everyone to sit; Fern's pages show the same field in two seasons.":"The birds have gone, but Fern keeps the nesting strip uncut. Mara brings autumn leaves to press beside the summer drawings."):
      (way?"Snow has nearly hidden the walking way. Fern follows its stones to the table while Mara holds the spring sketch beside the winter field.":"The nesting strip holds a fringe of snow. Fern and Mara lay the old drawings on the table and find where the birds will come back.");
    const rows=first?[{label:'sit and look with them',desc:'keep the visit in the field journal; no item or perk',price:'',pick:()=>this.rememberFieldGathering(s)}]:[];
    openDialogue(SEASONS[s].toLowerCase()+' at the field',text+(first?'':' The three of you have seen this season here before.'),rows);
  },
  rememberFieldGathering(s){
    const g=this.G;
    if(!this.fieldGathering()||!this.nearMeadowLesson()||s!==this.season()||(g.fieldGathered||[]).includes(s))return;
    g.fieldGathered.push(s);this.save();closeMenu();toast('a new season in the field journal');
  },
  // A visible place at the north shore, reachable before and after a first catch.
  nearPondLookout(){
    const g=this.G;
    return !g.indoor&&!g.inCave&&Math.hypot(g.player.x-11.5*TILE,g.player.y-22.5*TILE)<TILE*1.8;
  },
  readPondLookout(){
    const g=this.G;
    const mature=g.pondChoiceDay>0&&g.day>g.pondChoiceDay;
    const intro=this.season()===3?'The pond is quiet under the frost. Old Bram has swept the lookout clear.':'The lookout smells of wet boards. Old Bram has kept a seat here for anyone willing to watch the water.';
    const ending=g.pondChoice==='reeds'?(mature?' The reeds have taken the north bank. Small birds settle there at dusk.':' You left the reeds to root along the north bank.'):
      g.pondChoice==='open'?(mature?' The open bank still catches the evening light. Bram sits there when the sun goes low.':' You kept a clear place to see across the water.'):'';
    const rows=g.stats.caught>0&&!g.pondChoice?[
      {label:'give the reeds room',desc:'let the north bank grow in; no cost',price:'',pick:()=>this.choosePond('reeds')},
      {label:'keep the lookout open',desc:'leave a clear view over the water; no cost',price:'',pick:()=>this.choosePond('open')}
    ]:[];
    openDialogue('the pond lookout',intro+ending,rows);
  },
  choosePond(choice){
    const g=this.G;
    if(!['reeds','open'].includes(choice)||g.pondChoice||!g.stats.caught||!this.nearPondLookout())return;
    g.pondChoice=choice;g.pondChoiceDay=g.day;this.save();closeMenu();
    toast(choice==='reeds'?'the reeds can find their way back':'a clear bank for watching the water');
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

  FAIR_LINES:{
    mara:"Judged preserves for thirty years. Weight, shine, and whether it smells like the field. Yours smell like the field.",
    bram:"Entered a carp in fifty-seven. They said fish aren't produce. Fish are produce enough for me.",
    fern:"The plum jam took blue in sixty-one. I still mention it. I'm mentioning it now.",
    piet:"Built the judging table from the old barn door. Fair legs on it. Level, too.",
  },
  FESTIVAL_LINES:{
    mara:"No seeds tonight. Tonight the lane is lit and the ledger is shut.",
    bram:"Forty lantern evenings I've sat for. The light on the pond never repeats itself.",
    fern:"I ate so many plums. Don't tell Mara. Actually, tell Mara - she missed out.",
    piet:"Hung every lantern myself. Cedar frames. They'll outlast the season, same as the roof.",
  },
  SOLSTICE_LINES:{
    mara:"I saved the last wintermint for tonight. Let the new year start warm.",
    bram:"The ice kept its fish and the pond kept its silence. I think we did all right.",
    fern:"I buried a seed under the snow this morning. Don't ask what kind. Let it surprise us.",
    piet:"Cedar burns slow. Good way to see the old year out without rushing the new one.",
  },
  WINTER_LINES:{
    mara:"Winter's for mending nets and counting jars. Frostroot still takes, if you keep it watered - stubborn little thing.",
    bram:"The pond skin thickens, but the icefin run under it. Cold hands, full creel.",
    fern:"I found a frostcap under the cedar. It glows a little. I named him Gerald.",
    piet:"Snow's coming down soft. Good building weather - the wood's dry and the days are short.",
  },
  // ---------- v2.18 heart events: scenes at 2 and 5 hearts, real rewards ----------
  HEART_EVENTS:{
    mara:[
      {hearts:2, fx:'seeds:sunbean:3', beats:[
        "You're keeping the rows straighter than my last three tenants. Don't let it go to your head.",
        "My mother kept this stand before me. She used to say seeds are just promises you can hold.",
        "Here - a few promises on the house. Plant them well."]},
      {hearts:5, fx:'xp:farm:15', beats:[
        "This was hers. Her planting notebook - every season she ever grew, in her own hand.",
        "I can't bring myself to write in it. But you... you should have it.",
        "Read the margins. She knew things about soil the almanacs never will."]}],
    bram:[
      {hearts:2, fx:'xp:fish:10', beats:[
        "See those notches on the pond post? Depth marks. Sixty years of them.",
        "The carp keep to the deep notch when the light's low. Remember that.",
        "You're quiet. The pond likes quiet. Come back when the light goes soft."]},
      {hearts:5, fx:'perk:lure', beats:[
        "This lure was my father's. Cedar, like the roof. It's outlived three rods.",
        "My hands shake too much to tie it on anymore. Yours don't.",
        "Take it. Fish linger a little longer for cedar - that's not superstition, that's sixty years."]}],
    fern:[
      {hearts:2, fx:'item:morel:2', beats:[
        "Psst. I found where the morels hide when the crows get greedy. Behind the big cedar.",
        "I picked these before the crows woke up. You can have them - you never step on my frog spots.",
        "Don't tell Mara I was up before the rooster. She worries."]},
      {hearts:5, fx:'xp:forage:15', beats:[
        "Okay, you're officially my best foraging partner. Better than the dog. The dog eats the evidence.",
        "I'm teaching you the secret handshake of the meadow. It's not a handshake. It's a way of walking slow.",
        "Walk slow, look low. Now you know everything I know."]}],
    piet:[
      {hearts:2, fx:'xp:mine:10', beats:[
        "That quarry stone fights you because you're swinging at it, not through it.",
        "Here - weight in your hips, let the pick fall. Better.",
        "You remind me of me, thirty years back. Take the advice, skip the backache."]},
      {hearts:5, fx:'perk:sturdyCrate', beats:[
        "Your shipping crate rattles. I heard it from my porch and it offended me professionally.",
        "I reinforced the corners this morning. Cedar cleats. It'll hold twice the weight and seal tighter.",
        "Tighter seal, better dawn prices. That's just craftsmanship - no charge, don't make it weird."]}],
  },
  nextHeartEvent(id){
    const g=this.G, h=this.hearts(id);
    for(const ev of (this.HEART_EVENTS[id]||[])){
      if(h>=ev.hearts && !g.seenEvents[id+':'+ev.hearts]) return ev;
    }
    return null;
  },
  applyHeartFx(fx){
    const g=this.G, [kind,a,b]=fx.split(':');
    if(kind==='xp'){ this.addXP(a,+b); }
    else if(kind==='seeds'){ g.seeds[a]=(g.seeds[a]||0)+ +b; toast(`+${b} ${CROPS[a].seed}`); chime(920); }
    else if(kind==='item'){ g.produce[a]=(g.produce[a]||0)+ +b; this.discover(a); toast(`+${b} ${ITEMS[a].name}`); chime(920); }
    else if(kind==='perk'){ g.perks[a]=true;
      toast(a==='lure'?"Bram's lure: fish linger a little longer":"sturdy crate: dawn sales +5%"); chime(980); setTimeout(()=>chime(1180),140); }
    this.save();
  },
  // ---------- v2.19 coop: commission from piet, hens lay at dawn ----------
  placeCoop(){
    const g=this.G;
    g.coop=true;
    g.grid[4*W+13]=T.COOP; g.grid[4*W+14]=T.COOP; g.grid[5*W+13]=T.COOP; g.grid[5*W+14]=T.COOP;
    g.hens=[
      {x:13.5*TILE, y:6.5*TILE, tx:13.5*TILE, ty:6.5*TILE, flip:false, pause:1, pettedDay:0},
      {x:15.5*TILE, y:6.8*TILE, tx:15.5*TILE, ty:6.8*TILE, flip:true, pause:2.5, pettedDay:0},
    ];
    toast('Two hens settle in - pet each daily; with trust, their eggs turn golden');
    chime(880); setTimeout(()=>chime(1100),160);
    this.save();
  },
  layEggs(){
    const g=this.G; if(!g.coop)return;
    // A one-dawn seed gift is paid for up front. Preserve a nest for the chosen hen.
    const fed=(g.penFeedDay===g.day-1)?g.penFeedHen:-1;
    const order=[...g.hens.keys()].sort((a,b)=>(a===fed?-1:b===fed?1:0));
    for(const i of order){
      const h=g.hens[i], originX=Math.floor(h.x/TILE), originY=Math.floor(h.y/TILE);
      for(let r=0;r<=3;r++){
        const slots=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]];
        let placed=false;
        for(const [dx,dy] of slots){
          if(Math.abs(dx)+Math.abs(dy)>r) continue;
          const x=originX+dx,y=originY+dy,k=y*W+x;
          if(x<13||x>16||y<6||y>7||g.grid[k]!==T.GRASS||g.eggs[k]||g.crops.has(k)) continue;
          g.eggs[k]=((g.animalCare['hen'+i]||0)>=6||(g.penFeedDay===g.day-1&&g.penFeedHen===i))?'sunegg':true;
          placed=true; break;
        }
        if(placed) break;
      }
    }
    // Feeding is for one sunrise only; the next day needs a fresh decision.
    g.penFeedDay=0; g.penFeedHen=-1;
  },
  // ---------- v2.20 barn: commission from piet, a cow, milk each day ----------
  placeBarn(){
    const g=this.G;
    g.barn=true;
    for(let by=4;by<=5;by++) for(let bx=16;bx<=18;bx++) g.grid[by*W+bx]=T.BARN;
    g.cow={x:17.5*TILE, y:6.6*TILE, tx:17.5*TILE, ty:6.6*TILE, flip:false, pause:1.5, milked:false, pettedDay:0};
    toast('A dusk-patched cow settles in - pet her daily for cream milk');
    chime(880); setTimeout(()=>chime(1100),160); setTimeout(()=>chime(1320),340);
    this.save();
  },
  nearCow(){
    const g=this.G; if(!g.cow)return false;
    return Math.hypot(g.cow.x-g.player.x, g.cow.y-g.player.y)<TILE*1.35;
  },
  nearHen(){
    const g=this.G; for(let i=0;i<g.hens.length;i++){ const h=g.hens[i]; if(Math.hypot(h.x-g.player.x,h.y-g.player.y)<TILE*1.15) return i; } return -1;
  },
  petAnimal(id){
    const g=this.G, a=id==='cow'?g.cow:g.hens[Number(id.slice(3))];
    if(!a||a.pettedDay===g.day){ nudge('already cared for today'); return; }
    a.pettedDay=g.day; g.animalCare[id]=Math.min(10,(g.animalCare[id]||0)+1);
    a.careFx=performance.now(); // brief visual response, never saved
    const trust=g.animalCare[id], hearts=Math.floor(trust/2), quality=trust>=6;
    const lines={hen0:['Pip rustles her feathers.','Pip steps closer.','Pip waits for your hand.'],
      hen1:['Peep gives a curious peck.','Peep circles your boots.','Peep settles at your feet.'],
      cow:['Dusk leans into your hand.','Dusk gives a slow, warm sigh.','Dusk follows you to the gate.']};
    const line=lines[id][Math.min(2,Math.floor((trust-1)/3))];
    toast(`${line} ♥${hearts}${trust===6?' - quality produce at dawn':''}`);
    chime(760); this.save();
  },
  feedHen(i){
    const g=this.G, names=['Pip','Peep'];
    if(!g.coop||!g.hens[i]) return;
    if(g.penFeedDay===g.day){ nudge('already shared a seed today'); return; }
    if(!g.seeds.cloveroot){ nudge('no cloveroot seed to share'); return; }
    if(!this.openHenNests(i)){ nudge('the nests are full - gather eggs first'); return; }
    g.seeds.cloveroot--; g.penFeedDay=g.day; g.penFeedHen=i;
    toast(`${names[i]} takes the seed from your palm. A Sun Egg tomorrow.`);
    chime(720); updateBelt(); this.save(); closeMenu();
  },
  openHenNests(i){
    const g=this.G, h=g.hens[i], ox=Math.floor(h.x/TILE), oy=Math.floor(h.y/TILE);
    for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]]){
      const x=ox+dx,y=oy+dy,k=y*W+x;
      if(x>=13&&x<=16&&y>=6&&y<=7&&g.grid[k]===T.GRASS&&!g.eggs[k]&&!g.crops.has(k)) return true;
    }
    return false;
  },
  openPenLedger(){
    const g=this.G, rows=[], names={hen0:'Pip',hen1:'Peep',cow:'Dusk'};
    const add=(id,animal,icon,good)=>{
      const trust=g.animalCare[id]||0, ready=animal.pettedDay===g.day;
      rows.push({label:`${names[id]}  ♥${Math.floor(trust/2)}`,
        desc:`${ready?'cared for today':'needs care today'} · ${trust>=6?good+' at dawn':`quality goods at ♥3`}`,
        price:'',icon,pick:()=>{}});
    };
    if(g.coop) g.hens.forEach((hen,i)=>add('hen'+i,hen,SPR.hen,'Sun Egg'));
    if(g.cow) add('cow',g.cow,SPR.cow,'Cream Milk');
    if(g.coop){
      if(g.penFeedDay===g.day) rows.push({label:'seed shared today',desc:'Sun Egg from '+names['hen'+g.penFeedHen]+' at dawn',price:'',pick:()=>{}});
      else if(g.seeds.cloveroot>0){
        g.hens.forEach((hen,i)=>{ if((g.animalCare['hen'+i]||0)<6&&this.openHenNests(i))
          rows.push({label:'share cloveroot with '+names['hen'+i],desc:'1 seed now for a Sun Egg tomorrow · keep it to plant instead',price:'1 seed',icon:SPR.hen,pick:()=>this.feedHen(i)}); });
      }
    }
    rows.push({label:'close',desc:'visit each animal with the hand tool',price:'',pick:()=>closeMenu()});
    openMenu('pen ledger',rows);
  },
  openCowCare(){
    const g=this.G, rows=[];
    if(!g.cow.milked) rows.push({label:'milk the cow',desc:'collect a bottle today',price:'',pick:()=>{ closeMenu(); this.milkCow(); }});
    if(g.cow.pettedDay!==g.day) rows.push({label:'pet the cow',desc:`trust ♥${Math.floor((g.animalCare.cow||0)/2)} - cream milk at ♥3`,price:'',pick:()=>{ closeMenu(); this.petAnimal('cow'); }});
    rows.push({label:'step away',desc:'',price:'',pick:()=>closeMenu()});
    openMenu('the cow',rows);
  },
  milkCow(){
    const g=this.G;
    if(g.cow.milked){ nudge('already milked today'); return; }
    g.cow.milked=true;
    const id=(g.animalCare.cow||0)>=6?'creammilk':'milk';
    g.produce[id]=(g.produce[id]||0)+1; this.addXP('forage',2); this.discover(id); this.spendEnergy(2);
    chime(660); setTimeout(()=>chime(880),120); toast('+1 '+ITEMS[id].name);
    this.save();
  },
  playHeartEvent(id, ev){
    const def=this.NPCS[id], g=this.G;
    let i=0;
    const show=()=>{
      const last=(i===ev.beats.length-1);
      openDialogue(`${def.name} \u2665${this.hearts(id)}`, ev.beats[i], [{label:last?'...':'go on', desc:'', price:'', icon:null, pick:()=>{
        i++;
        if(i<ev.beats.length) show();
        else { g.seenEvents[id+':'+ev.hearts]=true; closeMenu(); this.applyHeartFx(ev.fx); }
      }}], id);
    };
    show();
  },
  talkTo(id){
    const def=this.NPCS[id]; if(!def)return;
    const g=this.G, h=this.hearts(id);
    const ev=this.nextHeartEvent(id);
    if(ev){ this.playHeartEvent(id, ev); return; }
    const title=h>0?`${def.name} ${'\u2665'}${h}`:def.name;
    const atGate=id==='mara'&&g.minutes>=720&&g.minutes<840&&g.day%2===1&&Math.hypot(g.mara.x-21*TILE,g.mara.y-9.5*TILE)<TILE*2;
    if(atGate && !g.gateWelcomeDay){ g.gateWelcomeDay=g.day; this.save(); }
    let text;
    if(this.solsticeEvening()&&this.SOLSTICE_LINES[id]) text=this.SOLSTICE_LINES[id];
    else if(id==='piet'&&this.season()===0&&g.solsticeKeepsakes?.length&&g.day%4===1){
      const last=g.solsticeKeepsakes[g.solsticeKeepsakes.length-1];
      text=last.id==='wintermint'?'Mara says your wintermint sprig dried green on the page. Even after the snow went.':'The stone you left by the cedar is still there. I walked past it this morning. Some things ought to stay put.';
    }
    else if(atGate){
      text='The gate stays open now. My mother made us shut it each evening, but a field ought to feel like part of the road.';
    }
    else if(id==='fern'&&this.meadowVisit()&&this.nearMeadowLesson()&&this.nearNpc('fern')&&!g.meadowLesson){
      text="I'm making a place to show Mara which plants belong here. She calls half of them weeds. Would you put the table under a canvas roof, or leave the whole circle open to the sky?";
    }
    else if(id==='fern'&&g.meadowLesson&&g.day>g.meadowLessonDay&&!g.meadowLessonHeard&&this.nearMeadowLesson()&&this.nearNpc('fern')){
      text=g.meadowLesson==='shade'?"Mara sat in the shade long enough to draw the grass heads herself. She didn't call a single one a weed. Come sit - I kept the other pencil.":"Mara sat out in the open until the wind turned her page. She caught it and drew the grass anyway. Come sit - I kept the other pencil.";
      g.meadowLessonHeard=true;this.save();
    }
    else if(id==='fern'&&g.fieldPlan&&g.day>g.fieldPlanDay&&!g.fieldPlanHeard&&this.nearMeadowLesson()&&this.nearNpc('fern')){
      text=g.fieldPlan==='walk'?"I followed your walking way this morning. Mara can reach the rows without flattening the whole meadow. Look - the little white flowers made it through.":"I watched a bird slip into the strip you left. Mara saw it too. She put down the scythe and we sat very still until it came out.";
      g.fieldPlanHeard=true;this.save();
    }
    else if(this.tableDay()&&this.nearCommonTable()&&this.nearNpc(id)&&['fern','mara'].includes(id)){
      text=id==='fern'?'A page can hold more than one way of seeing a place. Come sit with us.':'I used to walk past this stretch without stopping. Now I look for what changed.';
    }
    else if(this.fieldSeasonDay()&&this.nearFieldSeasonDay()&&this.nearNpc(id)&&['fern','mara'].includes(id)){
      text=id==='fern'?'I did not know the field could hold so many different mornings.':'A full basket can wait. We have time to see the field together.';
    }
    else if(this.fieldGathering()&&this.nearMeadowLesson()&&this.nearNpc(id)&&['fern','mara'].includes(id)){
      text=id==='fern'?"I drew the field as it is, not as it ought to be. Look how much changed since spring.":"Mother would have named every one of these grasses. Fern is teaching me the ones she missed.";
    }
    else if(id==='fern'&&!g.fernRoadHeard&&g.gateWelcomeDay>0&&g.day>g.gateWelcomeDay&&g.minutes>=900&&g.minutes<1020&&Math.hypot(g.fern.x-27.5*TILE,g.fern.y-9.5*TILE)<TILE*2){
      text='Mara says you found the open gate. I left a water cup at the cedarwalk. It is a long way to carry a full basket back.';
      g.fernRoadHeard=true;this.save();
    }
    else if(id==='fern'&&g.roadChoice&&g.day>g.gateWelcomeDay&&g.minutes>=900&&g.minutes<1020&&Math.hypot(g.fern.x-27.5*TILE,g.fern.y-9.5*TILE)<TILE*2){
      text=g.roadChoice==='flowers'?'I passed the new border this morning. The little flowers have made it through the wind.':'The meadow is already leaning into the stones again. Good. I would miss it if we boxed in the whole road.';
    }
    else if(id==='bram'&&g.pondChoice&&g.pondChoiceDay>0&&g.day>g.pondChoiceDay&&Math.hypot(g.bram.x-12*TILE,g.bram.y-23*TILE)<TILE*3){
      text=g.pondChoice==='reeds'?'The little birds are back in the north reeds. I heard them before I saw them.':'You can see the low light right across the pond now. I stayed until the first stars.';
    }
    else if(id==='mara'&&g.fieldPlanHeard&&g.day>g.fieldPlanDay&&g.day%4===2){
      text=g.fieldPlan==='walk'?"Your walking way gives us room to carry baskets without cutting the whole field. I'll keep it open when the grasses rise.":"Fern showed me the bird in that tall strip. I was going to cut it. I think I'll leave that edge alone.";
    }
    else if(id==='mara'&&g.meadowLessonHeard&&g.day>g.meadowLessonDay&&g.day%4===0){
      text=g.meadowLesson==='shade'?"Fern's canvas kept the ink dry while I drew. I know the names of those grasses now. I'll leave them be.":"I sat in Fern's open circle and tried to draw the grass before the wind took my page. I'll leave that patch be.";
    }
    else if(id==='mara'&&g.roadChoice&&g.day>g.gateWelcomeDay&&g.day%4===2){
      text=g.roadChoice==='flowers'?'Fern showed me the border you planted. Keep the flowers low and we can still see one another across the lane.':'Fern told me you let the verge stay wild. Mother would grumble. I think she would sit there anyway.';
    }
    else if(this.isFairActive()&&this.FAIR_LINES[id]) text=this.FAIR_LINES[id];
    else if(this.festivalEvening()&&this.FESTIVAL_LINES[id]) text=this.FESTIVAL_LINES[id];
    else if(this.season()===3&&this.WINTER_LINES[id]) text=this.WINTER_LINES[id];
    else if(h>=4&&this.HEART_LINES[id]&&g.day%4===3) text=this.HEART_LINES[id];
    else text=def.lines[g.day%def.lines.length];
    const rows=[];
    const loved=this.LOVED[id];
    if(id==='fern'&&this.meadowVisit()&&this.nearMeadowLesson()&&this.nearNpc('fern')&&!g.meadowLesson){
      rows.push({label:'set a canvas shade',desc:'a roof for the drawings; no cost',price:'',pick:()=>this.chooseMeadowLesson('shade')});
      rows.push({label:'leave the circle open',desc:'benches under the sky; no cost',price:'',pick:()=>this.chooseMeadowLesson('sky')});
    }
    if((g.produce[loved]||0)>0&&!g.giftsToday[id]){
      rows.push({label:`give ${ITEMS[loved].name}`, desc:'they would love this', price:'x1', icon:SPR.item[loved]||SPR.forage[loved]||(CROPS[loved]?SPR.crop(CROPS[loved],3):null), pick:()=>{ closeMenu(); this.giftTo(id); }});
    }
    if(id==='piet'&&!g.coop){
      rows.push({label:'commission a coop', desc:'two hens, eggs at dawn - I build it by your house', price:'2000g', icon:null,
        pick:()=>{ if(g.coins>=2000){ g.coins-=2000; closeMenu(); this.placeCoop(); } else nudge('not enough coin'); }});
    }
    if(id==='piet'&&!g.barn){
      rows.push({label:'commission a barn', desc:'a cow, fresh milk each morning - a bigger build', price:'4000g', icon:null,
        pick:()=>{ if(g.coins>=4000){ g.coins-=4000; closeMenu(); this.placeBarn(); } else nudge('not enough coin'); }});
    }
    openDialogue(title, text, rows, id);
  },
  // daily routines: hour -> waypoint (everyone gathers at the well 5-8pm)
  SCHEDULES:{
    mara:[[6,13.5,9.5],[9,15.5,10.8],[12,20.5,9.5],[14,15.5,10.8],[17,39.5,9.3],[20,13.5,9.5]],
    bram:[[6,12,23],[12,9,22.5],[17,39.5,9.3],[20,12,23]],
    fern:[[6,3.5,18],[10,20,30],[15,27.5,9.5],[17,38.5,9.8],[20,20,30]],
    piet:[[6,42.5,6.5],[10,40.5,9.8],[14,30,8.5],[17,39.5,9.3],[20,42.5,6.5]],
  },
  npcWaypoint(id){
    const g=this.G, sch=this.SCHEDULES[id], h=g.minutes/60;
    if(id==='mara'&&this.tableDay()&&!this.fieldGathering()&&!(g.meadowLesson&&g.day>g.meadowLessonDay&&g.day<=g.meadowLessonDay+2&&h>=12&&h<16&&g.day%2===0))return [9,17.5,8.5];
    if(id==='fern'&&this.tableDay()&&!this.meadowVisit()&&!this.fieldSeasonDay()&&!this.fieldGathering()&&!(g.fieldPlan&&g.day>g.fieldPlanDay&&h>=10&&h<15))return [9,19.5,8.5];
    if(id==='fern'&&this.fieldSeasonDay())return [10,13.5,19.5];
    if(id==='mara'&&this.fieldSeasonDay())return [10,16.5,19.5];
    if(id==='fern'&&this.fieldGathering())return [10,11.5,17.5];
    if(id==='mara'&&this.fieldGathering())return [10,14.5,17.5];
    if(id==='fern'&&(this.meadowVisit()||g.fieldPlan&&g.day>g.fieldPlanDay&&h>=10&&h<15)&&!(g.gateWelcomeDay>0&&g.day>g.gateWelcomeDay&&h>=15))return [10,12.5,17.5];
    if(id==='mara'&&g.meadowLesson&&g.day>g.meadowLessonDay&&g.day<=g.meadowLessonDay+2&&h>=12&&h<16&&g.day%2===0)return [12,14.5,17.5];
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
    const pool=Object.values(FISH).filter(f=>(!f.night||night)&&(!f.winter||this.season()===3));
    const w=pool.map(f=>f.zone); let sum=w.reduce((a,b)=>a+b,0), roll=Math.random()*sum;
    for(let i=0;i<pool.length;i++){ roll-=w[i]; if(roll<=0)return pool[i]; }
    return pool[0];
  },
  reelIn(){
    const g=this.G, fsh=g.fishing;
    if(!fsh)return;
    if(fsh.state==='bite'){
      fsh.state='minigame'; // backend timer must not tick while the modal is open
      openFishingGame(fsh.fish, (landed)=>{
        if(landed){
          g.produce[fsh.fish.id]=(g.produce[fsh.fish.id]||0)+1; g.stats.caught++;
          this.addXP('fish',3); this.discover(fsh.fish.id);
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
      if(fsh.t<=0){ fsh.state='bite'; fsh.t=2.6+((this.G.perks&&this.G.perks.lure)?0.4:0); chime(1040); }
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
      if(!g.hintedRest&&g.minutes>=1060){ g.hintedRest=true; toast('evening - rest in your bed at home to end the day'); }
      if(!g.hintedTired&&g.energy>0&&g.energy<=25){ g.hintedTired=true; toast('running low - sleep at home restores you'); }
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
      if(!menuOpen()&&g.indoor){ if(ptx>=0&&pty>=0&&ptx<IW&&pty<IH&&g.interior[pty*IW+ptx]===IT.DOOR) this.exitHouse(); }
      else if(!menuOpen()&&g.inCave&&ptx>=0&&pty>=0&&ptx<CW&&pty<CH){
        if(g.cave[pty*CW+ptx]===CT.DOOR) this.ascendCave();
        else if(g.cave[pty*CW+ptx]===CT.STAIRS) this.descendCave();
      }
    } else {
    // clouds drift
    for(const c of g.clouds){ c.x+=dt/1000*6; if(c.x>W*TILE+240)c.x=-240; }
    this.updateFishing(dt);
    if(this.isFairActive()){
      // harvest fair: everyone mills around the judging table by the well
      const offs={mara:[-2.4,0.2],bram:[-0.9,0.9],fern:[1.1,1.4],piet:[0.4,0.5]};
      for(const id of Object.keys(offs)){
        const n=g[id];
        const gx=(39+offs[id][0])*TILE, gy=(8+offs[id][1])*TILE;
        if(Math.hypot(n.x-gx,n.y-gy)>4){
          const dx=gx-n.x, dy=gy-n.y, m=Math.hypot(dx,dy);
          n.x+=dx/m*22*dt/1000; n.y+=dy/m*22*dt/1000; n.tx=gx; n.ty=gy;
        }
      }
    }
    else if(this.solsticeEvening()){
      // gather around the bonfire, leaving a clear approach from the south
      const offs={mara:[-2.0,-0.4],bram:[1.9,-0.3],fern:[-1.6,1.1],piet:[1.5,1.2]};
      for(const id of Object.keys(offs)){
        const n=g[id], gx=(36.5+offs[id][0])*TILE, gy=(10+offs[id][1])*TILE;
        if(Math.hypot(n.x-gx,n.y-gy)>4){
          const dx=gx-n.x, dy=gy-n.y, m=Math.hypot(dx,dy);
          n.x+=dx/m*22*dt/1000; n.y+=dy/m*22*dt/1000; n.tx=gx; n.ty=gy;
        }
      }
    }
    else if(this.festivalEvening()){
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
    // the cow ambles the pen, slower than the hens
    if(g.cow){
      const cw3=g.cow;
      if(cw3.pause>0){ cw3.pause-=dt/1000; }
      else if(Math.hypot(cw3.tx-cw3.x,cw3.ty-cw3.y)<1){
        if(Math.random()<dt/1000/4){
          const nx=clamp(cw3.x+(Math.random()*72-36),12.4*TILE,18.6*TILE), ny=clamp(cw3.y+(Math.random()*48-24),5.6*TILE,7.4*TILE);
          if(this.tileAt(Math.floor(nx/TILE),Math.floor(ny/TILE))===T.GRASS){ cw3.tx=nx; cw3.ty=ny; cw3.flip=cw3.tx<cw3.x; }
          cw3.pause=1.5+Math.random()*3.5;
        }
      } else {
        const dx=cw3.tx-cw3.x, dy=cw3.ty-cw3.y, m=Math.hypot(dx,dy);
        cw3.x+=dx/m*7*dt/1000; cw3.y+=dy/m*7*dt/1000;
      }
    }
    // hens peck around the pen
    for(const hn of g.hens){
      if(hn.pause>0){ hn.pause-=dt/1000; continue; }
      if(Math.hypot(hn.tx-hn.x,hn.ty-hn.y)<1){
        if(Math.random()<dt/1000/3){
          const nx=clamp(hn.x+(Math.random()*64-32),12.4*TILE,16.6*TILE), ny=clamp(hn.y+(Math.random()*48-24),5.6*TILE,7.4*TILE);
          if(this.tileAt(Math.floor(nx/TILE),Math.floor(ny/TILE))===T.GRASS){ hn.tx=nx; hn.ty=ny; hn.flip=hn.tx<hn.x; }
          hn.pause=0.8+Math.random()*2.4;
        }
      } else {
        const dx=hn.tx-hn.x, dy=hn.ty-hn.y, m=Math.hypot(dx,dy);
        hn.x+=dx/m*10*dt/1000; hn.y+=dy/m*10*dt/1000;
      }
    }
    } // end outdoor-only ambient
    // action edges
    if(!menuOpen()&&Input.actEdge){ this.useTool(); }
    if(Input.cycleEdge){
      if(!menuOpen()){ g.tool=(g.tool+1)%TOOLS.length; updateBelt(); chime(520); }
    }
    if(Input.numKey){ const n=Input.numKey-1; if(n>=0&&n<TOOLS.length){ g.tool=n; updateBelt(); } Input.numKey=0; }
    if(Input.menuClose&&menuOpen()) closeMenu();
    if(Input.journalEdge&&!menuOpen()) this.openJournal();
    Input.actEdge=false; Input.cycleEdge=false; Input.menuClose=false; Input.journalEdge=false;
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
