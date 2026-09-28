// TILTH sprites — everything generated, no external art.
'use strict';
const TILE=16;
const SPR={};
function makeSprites(){
  const rng=mulberry32(20260927);

  // ---------- palette ----------
  const P={
    grass:'#8fb36b', grass2:'#85a961', grassD:'#7b9c58', grassFl:'#f0e2b8', grassFl2:'#e8b7c2',
    soil:'#8a6547', soilD:'#775639', soilT:'#9c7454', wet:'#6e4f38', wetD:'#5f442f',
    path:'#c9b184', pathD:'#b89f72', stone:'#a8a29a', stoneD:'#8d877f',
    water:'#7fb6c9', waterD:'#6aa4b8', waterL:'#9ccfda', sand:'#dcc794',
    trunk:'#6e4f38', trunkD:'#5b4130',
    leaf:'#5f7a4a', leaf2:'#6d8c54', leafD:'#4e683d', leafL:'#87a863',
    blossom:'#eec9d4', blossomD:'#dda9ba',
    wood:'#a87c52', woodD:'#8c6540', woodL:'#c09468',
    roof:'#c96f4a', roofD:'#a8563a', wall:'#efe0c2', wallD:'#d9c9a8',
    cream:'#f7efe0', ink:'#4a3f2e',
  };

  // ---------- grass ----------
  function grassTile(seed){
    const r=mulberry32(seed); const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,0,0,16,16, r()<0.5?P.grass:P.grass2);
    // large soft tonal patches first
    for(let k=0;k<2;k++){
      x.fillStyle=r()<0.5?'rgba(110,140,84,0.35)':'rgba(157,192,122,0.30)';
      const bx=Math.floor(r()*11), by=Math.floor(r()*11);
      x.fillRect(bx,by,5,3); x.fillRect(bx+1,by-1,3,5);
    }
    dither(x,16,16,P.grassD,0.05,r);
    dither(x,16,16,'#9dc07a',0.04,r);
    if(r()<0.35){ px(x,2+Math.floor(r()*11),2+Math.floor(r()*11),1,1, r()<0.5?P.grassFl:P.grassFl2); }
    if(r()<0.25){ const gx=2+Math.floor(r()*10), gy=4+Math.floor(r()*8); px(x,gx,gy,1,2,P.grassD); px(x,gx+1,gy+1,1,1,P.grassD); }
    return c;
  }
  SPR.grass=[grassTile(11),grassTile(22),grassTile(33),grassTile(44),grassTile(55)];

  // ---------- soil ----------
  function soilTile(wet){
    const r=mulberry32(wet?777:333); const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,0,0,16,16, wet?P.wet:P.soilT);
    // furrows
    for(let j=4;j<16;j+=7){ px(x,0,j,16,1, wet?P.wetD:P.soil); }
    dither(x,16,16, wet?P.wetD:'#b08a62', 0.10, r);
    dither(x,16,16, wet?'#7d5c42':'#8a6547', 0.06, r);
    return c;
  }
  SPR.soil=soilTile(false); SPR.soilWet=soilTile(true);

  // ---------- path ----------
  (function(){
    const r=mulberry32(99); const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,0,0,16,16,P.path); dither(x,16,16,P.pathD,0.08,r); dither(x,16,16,'#d8c49c',0.06,r);
    px(x,11,9,2,1,P.stone);
    SPR.path=c;
  })();

  // ---------- water (2 anim frames) + shore ----------
  function waterTile(frame){
    const r=mulberry32(frame?4242:4141); const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,0,0,16,16,P.water); dither(x,16,16,P.waterD,0.10,r);
    x.fillStyle=P.waterL;
    for(let j=2+frame;j<16;j+=5){ const off=(j*3+frame*2)%5; x.fillRect(off,j,4,1); x.fillRect(off+8,j+1,3,1); }
    return c;
  }
  SPR.water=[waterTile(0),waterTile(1)];
  (function(){ // sand edge
    const r=mulberry32(64); const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,0,0,16,16,P.sand); dither(x,16,16,'#cbb27e',0.12,r); SPR.sand=c;
  })();

  // ---------- tree (parametric canopy) — 32x40 drawn over 2x3 tiles ----------
  // canopy palettes per season: [main, dark, light]
  const TREE_PALETTES={
    leaf:{
      spring:[P.leaf,P.leafD,P.leafL],
      summer:['#557040','#465c35','#6d8c54'],
      autumn:['#c98a3e','#a86a2e','#e0a858'],
      winter:null, // bare
    },
    blossom:{
      spring:[P.blossom,P.blossomD,'#f6dce4'],
      summer:['#5f7a4a','#4e683d','#87a863'],
      autumn:['#b86a4a','#96543a','#d08a60'],
      winter:null,
    },
  };
  function tree(kind,seasonName){
    const c=cv(40,44), x=c.getContext('2d');
    const r=mulberry32(kind==='blossom'?909:808);
    const pal=TREE_PALETTES[kind][seasonName];
    px(x,17,32,6,11,P.trunk); px(x,17,32,2,11,P.trunkD);
    if(!pal){ // winter: bare branches
      x.fillStyle=P.trunk;
      const branches=[[17,32,10,22],[22,32,28,20],[18,32,8,14],[21,32,32,15],[19,24,14,12],[20,22,26,10]];
      for(const [x0,y0,x1,y1] of branches){
        // simple 2px line
        const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
        for(let k=0;k<=steps;k++){
          const ix=Math.round(lerp(x0,x1,k/steps)), iy=Math.round(lerp(y0,y1,k/steps));
          x.fillRect(ix,iy,2,2);
        }
      }
      // snow flecks on branch tips
      x.fillStyle='rgba(240,246,252,0.9)';
      for(const [x0,y0,x1,y1] of branches){ x.fillRect(x1-1,y1-1,3,2); }
      return c;
    }
    const [L1,L2,L3]=pal;
    const blobs=[[20,16,13],[11,22,9],[29,22,9],[20,27,10],[7,17,6],[33,17,6]];
    for(const [bx,by,br] of blobs){
      for(let j=-br;j<=br;j++)for(let i=-br;i<=br;i++){
        const d=i*i+j*j;
        const edge=br*br*(0.82+hash2(bx+i,by+j,kind==='blossom'?71:31)*0.35);
        if(d>edge)continue;
        const h=hash2(bx+i,by+j,kind==='blossom'?7:3);
        x.fillStyle=h<0.55?L1:(h<0.85?L2:L3);
        x.fillRect(bx+i,by+j,1,1);
      }
    }
    x.fillStyle=L3;
    for(let k=0;k<40;k++){const ix=Math.floor(r()*26)+4, iy=Math.floor(r()*14)+4; if(r()<0.6)x.fillRect(ix,iy,1,1);}
    return c;
  }
  const SNames=['spring','summer','autumn','winter'];
  SPR.trees={}; SPR.treesB={};
  for(let si=0;si<4;si++){ SPR.trees[si]=tree('leaf',SNames[si]); SPR.treesB[si]=tree('blossom',SNames[si]); }
  SPR.tree=SPR.trees[0]; SPR.treeBlossom=SPR.treesB[0];

  // ---------- house (64x48 over 4x3 tiles) ----------
  (function(){
    const c=cv(64,48), x=c.getContext('2d');
    // walls
    px(x,4,20,56,26,P.wall); px(x,4,44,56,2,P.wallD);
    // timber frame
    px(x,4,20,56,2,P.woodD); px(x,4,20,2,26,P.woodD); px(x,58,20,2,26,P.woodD);
    px(x,20,22,2,24,P.wood); px(x,42,22,2,24,P.wood);
    // roof
    x.fillStyle=P.roof;
    x.beginPath(); x.moveTo(0,20); x.lineTo(32,2); x.lineTo(64,20); x.closePath(); x.fill();
    x.fillStyle=P.roofD;
    for(let j=8;j<20;j+=6){ const w=64-(j-2)*3.2; x.fillRect((64-w)/2+0,j,w,1); }
    // door
    px(x,28,32,9,14,P.woodD); px(x,29,33,7,12,P.wood); px(x,34,39,1,1,P.cream);
    // windows
    px(x,9,28,8,7,P.cream); px(x,10,29,6,5,'#a9c6cf'); px(x,47,28,8,7,P.cream); px(x,48,29,6,5,'#a9c6cf');
    px(x,12,29,1,5,P.cream); px(x,50,29,1,5,P.cream);
    SPR.house=c;
  })();

  // ---------- shipping crate ----------
  SPR.crate=drawMap([
    '................',
    '..###########...',
    '..#lllllllll#...',
    '..#lWWWWWWWl#...',
    '..#lWwwwwwWl#...',
    '..#lWwwwwwWl#...',
    '..#lWWWWWWWl#...',
    '..#lllllllll#...',
    '..###########...',
    '..#ddd#ddd#d#...',
    '..#ddd#ddd#d#...',
    '..###########...',
    '................',
    '................',
    '................',
    '................',
  ], {'#':P.woodD,'l':P.woodL,'W':P.wood,'w':'#b5ff9e','d':'#6e4f38'});
  // 'w' glow slot -> pale gold instead
  SPR.crate=drawMap([
    '................',
    '..###########...',
    '..#lllllllll#...',
    '..#lWWWWWWWl#...',
    '..#lWgggggWl#...',
    '..#lWgggggWl#...',
    '..#lWWWWWWWl#...',
    '..#lllllllll#...',
    '..###########...',
    '..#ddd#ddd#d#...',
    '..#ddd#ddd#d#...',
    '..###########...',
    '..bbbbb...bb....',
    '................',
    '................',
    '................',
  ], {'#':P.woodD,'l':P.woodL,'W':P.wood,'g':'#e9c46a','d':'#6e4f38','b':'#d9c9a8'});

  // ---------- shop stand ----------
  (function(){
    const c=cv(32,32), x=c.getContext('2d');
    // counter
    px(x,2,18,28,12,P.wood); px(x,2,18,28,2,P.woodD); px(x,4,30,2,2,P.woodD); px(x,26,30,2,2,P.woodD);
    // awning stripes
    for(let i=0;i<7;i++){ px(x,i*5,2,4,8, i%2?P.cream:P.roof); }
    px(x,0,10,32,2,P.roofD);
    px(x,2,0,2,4,P.woodD); px(x,28,0,2,4,P.woodD);
    // produce on counter
    px(x,5,14,4,3,'#d9a441'); px(x,12,13,4,4,'#c96f4a'); px(x,20,14,5,3,'#7a9e5f');
    SPR.stand=c;
  })();

  // ---------- fence + stones + flowers ----------
  SPR.fence=drawMap([
    '................',
    '................',
    '................',
    '....P...........',
    '....P...........',
    '.DDDDDDDDDDDDDD.',
    '....P...........',
    '....P...........',
    '.DDDDDDDDDDDDDD.',
    '....P...........',
    '....P...........',
    '................',
    '................',
    '................',
    '................',
    '................',
  ], {'P':'#6e5638','D':'#8c6a44'});
  SPR.rock=drawMap([
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....SSSS.......',
    '....SSSSSS......',
    '...SSlSSSSD.....',
    '...SSSSSSDD.....',
    '....SSSSDD......',
    '.....DDDD.......',
    '................',
    '................',
    '................',
    '................',
  ], {'S':P.stone,'l':'#c4bfb7','D':P.stoneD});

  // ---------- crops: parametric 4-stage ----------
  // crop def gives colors; stage: 0 seed-sprout,1 sprout,2 bush,3 mature
  function cropSprite(def,stage){
    const c=cv(TILE,TILE), x=c.getContext('2d');
    const stem='#5f7a4a', leaf='#6d8c54', leafL='#87a863';
    if(stage===0){ px(x,7,12,2,3,stem); px(x,6,11,1,1,leaf); px(x,9,11,1,1,leaf); return c; }
    if(stage===1){
      px(x,7,9,2,6,stem); px(x,5,9,2,2,leaf); px(x,9,9,2,2,leaf); px(x,6,7,1,2,leafL); px(x,9,7,1,2,leafL);
      return c;
    }
    if(stage===2){
      px(x,7,7,2,8,stem);
      px(x,4,7,3,4,leaf); px(x,9,7,3,4,leaf); px(x,5,4,2,4,leafL); px(x,9,4,2,4,leafL); px(x,6,3,4,2,leaf);
      return c;
    }
    // mature: bush + fruit in crop color
    px(x,7,6,2,9,stem);
    px(x,3,6,4,6,leaf); px(x,9,6,4,6,leaf); px(x,4,3,3,4,leafL); px(x,9,3,3,4,leafL); px(x,6,2,4,3,leaf);
    const fr=def.color, frD=def.dark;
    px(x,4,8,2,2,fr); px(x,10,8,2,2,fr); px(x,7,4,2,2,fr); px(x,7,11,2,2,frD);
    if(def.tall){ px(x,7,1,2,2,fr); }
    if(def.vine){ px(x,2,12,3,2,leaf); px(x,11,12,3,2,leaf); px(x,5,13,6,2,fr); }
    return c;
  }
  SPR.crop=(def,stage)=>cropSprite(def,stage);
  SPR.cropReady=(def)=>{ const c=SPR.crop(def,3); return c; };

  // ---------- player: straw-hat farmer, 4 dirs x 2 walk frames ----------
  const skin='#eec39a', hair='#5b4130', shirt='#7a9e5f',
        pants='#6b5b45', boots='#4a3f2e', hat='#e0bd6b', hatBand='#b35a3e', hatBrim='#c9a44e';
  function farmer(dir,frame){
    const HAT=[
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....RRRRRRRR....',
      '..DDDDDDDDDDDD..',
    ];
    const HEADS={
      down:['....SSSSSSSS....','....SESSSSES....','....SSSSSSSS....','.....SSSSSS.....'],
      up:['....KKKKKKKK....','....KKKKKKKK....','....SSSSSSSS....','.....SSSSSS.....'],
      left:['....SSSSSSSS....','....ESSSSSSS....','....ESSSSSSS....','.....SSSSSS.....'],
      right:['....SSSSSSSS....','....SSSSSSSE....','....SSSSSSSE....','.....SSSSSS.....'],
    };
    const BODY=[
      '....TTTTTTTT....',
      '...TTTTTTTTTT...',
      '...ATTTTTTTTA...',
      '....TTTTTTTT....',
      '....PPPPPPPP....',
    ];
    const LEGS= frame? ['.....PP..PP.....','.....B....B.....'] : ['....PP....PP....','....BB....BB....'];
    return drawMap([...HAT, ...HEADS[dir], ...BODY, ...LEGS],
      {H:hat, R:hatBand, D:hatBrim, S:skin, E:'#3a2f22', K:hair, T:shirt, A:skin, P:pants, B:boots});
  }
  SPR.player={};
  for(const d of ['down','up','left','right']){ SPR.player[d]=[outline(farmer(d,0)),outline(farmer(d,1))]; }

  // ---------- NPC shopkeeper "Mara" ----------
  (function(){
    const S=skin,H='#8a4f38',T='#b0698a',Pp='#7a6a4a',B=boots;
    SPR.npc=outline(drawMap([
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HSSSSSSSSH...',
      '...HSESSSESH....',
      '....SSSSSSSS....',
      '....TTTTTTTT....',
      '...TTTTTTTTTT...',
      '...STTTTTTTTS...',
      '....TTTTTTTT....',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PP....PP....',
      '....B......B....',
      '................',
      '................',
    ],{S,H,T,P:Pp,B,E:'#3a2f22'}));
  })();

  // ---------- mailbox ----------
  (function(){
    const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,7,9,2,7,P.woodD);
    px(x,4,3,8,7,'#c94f3d'); px(x,4,3,8,2,'#a83e30'); px(x,4,3,2,2,'#e06a50');
    px(x,11,2,1,4,'#e9c46a'); // flag
    SPR.mailbox=c;
  })();

  // ---------- festival lantern ----------
  (function(){
    const c=cv(TILE,TILE), x=c.getContext('2d');
    px(x,7,0,2,6,P.woodD);            // post
    px(x,5,5,6,7,'#e9c46a');          // lantern body
    px(x,5,5,6,1,'#c9962e'); px(x,5,11,6,1,'#c9962e');
    px(x,6,7,4,3,'#f7e3a8');          // glow core
    SPR.lantern=c;
  })();

  // ---------- cottage (slate roof, smaller than farmhouse) ----------
  (function(){
    const c=cv(64,48), x=c.getContext('2d');
    px(x,6,22,52,24,P.wall); px(x,6,44,52,2,P.wallD);
    px(x,6,22,52,2,P.woodD); px(x,6,22,2,24,P.woodD); px(x,56,22,2,24,P.woodD);
    px(x,26,24,2,22,P.wood);
    // slate roof
    x.fillStyle='#7a8a9c';
    x.beginPath(); x.moveTo(2,22); x.lineTo(32,6); x.lineTo(62,22); x.closePath(); x.fill();
    x.fillStyle='#5f6d7e';
    for(let j=10;j<22;j+=6){ const w=64-(j-4)*2.9; x.fillRect((64-w)/2,j,w,1); }
    // door + window
    px(x,29,34,9,12,P.woodD); px(x,30,35,7,10,P.wood); px(x,35,39,1,1,P.cream);
    px(x,12,30,8,7,P.cream); px(x,13,31,6,5,'#a9c6cf');
    px(x,44,30,8,7,P.cream); px(x,45,31,6,5,'#a9c6cf');
    // chimney
    px(x,48,2,6,10,P.stoneD); px(x,47,0,8,3,P.stone);
    SPR.cottage=c;
  })();

  // ---------- well ----------
  (function(){
    const c=cv(24,24), x=c.getContext('2d');
    // posts + roof
    px(x,4,2,2,10,P.woodD); px(x,18,2,2,10,P.woodD);
    x.fillStyle=P.roof; x.beginPath(); x.moveTo(1,4); x.lineTo(12,0); x.lineTo(23,4); x.closePath(); x.fill();
    x.fillStyle=P.roofD; x.fillRect(3,4,18,1);
    // stone ring
    px(x,4,14,16,7,P.stone); px(x,4,14,16,2,P.stoneD);
    px(x,6,15,12,3,'#3a4a55'); // dark water
    px(x,4,14,2,1,'#c4bfb7'); px(x,10,16,2,1,'#c4bfb7'); px(x,16,17,2,1,'#c4bfb7');
    // crank
    px(x,11,5,2,2,P.wood); px(x,11,7,2,5,'#5b5148');
    SPR.well=c;
  })();

  // ---------- Fern (forager) + Piet (carpenter) ----------
  (function(){
    const S=skin;
    SPR.fern=outline(drawMap([
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHHHHHHH....',
      '....SSSSSSSS....',
      '....SESSSSES....',
      '....SSSSSSSS....',
      '....TTTTTTTT....',
      '...TTTTTTTTTT...',
      '...STTTTTTTTS...',
      '....TTTTTTTT....',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
      '................',
      '................',
      '................',
    ],{S,H:'#a85f38',T:'#7a8a5f',P:'#5f5648',B:'#4a3f2e',E:'#3a2f22'}));
    SPR.piet=outline(drawMap([
      '.....CCCCCC.....',
      '....CCCCCCCC....',
      '....SSSSSSSS....',
      '....SESSSSES....',
      '....SSSSSSSS....',
      '....TTTTTTTT....',
      '...TTTTTTTTTT...',
      '...STTTTTTTTS...',
      '....AAAAAAAA....',
      '....AAAAAAAA....',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
      '................',
      '................',
      '................',
    ],{S,C:'#6b5b45',T:'#a87c52',A:'#8c6540',P:'#5b5148',B:'#4a3f2e',E:'#3a2f22'}));
  })();

  // ---------- Old Bram (pond villager) ----------
  (function(){
    const S=skin,H='#c9c2b8',T='#7a6a4a',Pp='#5b5148',B=boots;
    SPR.bram=outline(drawMap([
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....SSSSSSSS....',
      '....SESSSSES....',
      '....SSSSSSSS....',
      '....SHHHHHHS....',
      '.....HHHHHH.....',
      '....TTTTTTTT....',
      '...TTTTTTTTTT...',
      '...STTTTTTTTS...',
      '....TTTTTTTT....',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....BBB..BBB....',
      '................',
    ],{S,H,T,P:Pp,B,E:'#3a2f22'}));
  })();

  // ---------- forage ground sprites ----------
  SPR.forage={
    dandelion:(function(){ const c=cv(TILE,TILE),x=c.getContext('2d');
      px(x,7,9,2,6,'#5f7a4a'); px(x,6,4,4,4,'#e9d66b'); px(x,7,5,2,2,'#d4b84e'); return c; })(),
    wildplum:(function(){ const c=cv(TILE,TILE),x=c.getContext('2d');
      px(x,6,10,5,5,'#8a5f8e'); px(x,7,9,3,2,'#8a5f8e'); px(x,7,11,2,2,'#a87cb0'); px(x,8,7,1,3,'#5f7a4a'); px(x,9,7,3,2,'#6d8c54'); return c; })(),
    morel:(function(){ const c=cv(TILE,TILE),x=c.getContext('2d');
      px(x,6,9,4,6,'#d9cbb2'); px(x,5,4,6,6,'#a88f68'); px(x,6,5,4,4,'#8c7350'); px(x,7,6,2,3,'#a88f68'); return c; })(),
  };

  // ---------- pet cat ----------
  (function(){
    SPR.cat=drawMap([
      '................',
      '................',
      '................',
      '................',
      '..K......K......',
      '..KK....KK......',
      '..KKKKKKKK..t...',
      '..KEKKKKEK.t....',
      '..KKKKKKKKKtt...',
      '..KKKKKKKK......',
      '..K.K..K.K......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],{K:'#5a5148',E:'#e9c46a',t:'#7a7066'});
  })();

  // ---------- tool icons for belt (16x16) ----------
  function icon(rows,colors){ return drawMap(rows,colors); }
  SPR.icons={
    hoe: icon([
      '......DD........','.....DWW........','....DWWD........','...DWW..........',
      '...WW...........','..WW............','..W.............','..W.............',
      '.W..............','.W..............','W...............','................',
      '................','................','................','................'],
      {W:'#8c6540',D:'#8d877f'}),
    can: icon([
      '................','................','....WWWWW.......','...WWWWWWWW.....',
      '...WwWWWWWWW....','..WWWWWWWW..S...','..WWWWWWWW.SS...','..WWWWWWWW..S...',
      '...WWWWWWW.......'.replace('.......','...S...'),'....WWWWW....SSS..','................','................',
      '................','................','................','................'],
      {W:'#7fa3b8',w:'#9ccfda',S:'#7fa3b8'}),
    hand: icon([
      '................','................','.....SS.........','....SSSSSS......',
      '....SSSSSSS.....','...SSSSSSSSSS...','...SSSSSSSSSSS..','...SSSSSSSSSSS..',
      '....SSSSSSSSS...','.....SSSSSS.....','......SSS.......','................',
      '................','................','................','................'],
      {S:skin}),
    rod: icon([
      '..W.............','...W............','....W...........','.....W..........',
      '......W.........','.......W........','........W.......','.........W......',
      '..........W.....','..........L.....','..........L.....','..........F.....',
      '................','................','................','................'],
      {W:'#8c6540',L:'#c9c9c9',F:'#c94f3d'}),
    scythe: icon([
      '........DDDDDD..','......DD........','.....D..........','....D...........',
      '...W............','..W.............','..W.............','.W..............',
      '.W..............','.W..............','W...............','................',
      '................','................','................','................'],
      {W:'#8c6540',D:'#a8a29a'}),
    pick: icon([
      '....DDDDDD......','..DD......DD....','.D....WW....D...','......WW........',
      '.....WW.........','....WW..........','...WW...........','..WW............',
      '.WW.............','.W..............','................','................',
      '................','................','................','................'],
      {W:'#8c6540',D:'#8d877f'}),
  };
  // quarry cave entrance: rock face with a dark way in
  SPR.caveent=icon([
    '....RRRRRRRR....','..RRRRRRRRRRRR..','.RRRRRRRRRRRRRR.','.RRRRBBBBBBBRRR.',
    '.RRRBBBBBBBBBRR.','.RRBBDDDDDDBBRR.','.RRBDDDDDDDDBRR.','RRBDDDDDDDDDBRR.',
    'RRBDDDDDDDDDBRR.','RRBDDDDDDDDDBRR.','RRBDDDDDDDDDBRR.','RRBDDDDDDDDDBRR.',
    'RRBDDDDDDDDDBRR.','RRBDDDDDDDDDBRR.','RRSSSSSSSSSSSSRR','..SSSSSSSSSSSS..'],
    {R:'#6d6b78',B:'#4a4854',D:'#17151d',S:'#8d8d94'});
  return SPR;
}
