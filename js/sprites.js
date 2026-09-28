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

  // ---------- grass (per-season sets, like the trees) ----------
  // [base1, base2, patch1, patch2, dark-dither, light-dither, flower1, flower2, backdrop]
  const GRASS_PALS={
    spring:['#8fb36b','#85a961','rgba(110,140,84,0.35)','rgba(157,192,122,0.30)','#7b9c58','#9dc07a','#f0e2b8','#e8b7c2'],
    summer:['#7ba457','#71994e','rgba(96,128,72,0.35)','rgba(140,178,104,0.30)','#678c48','#8db06a','#f4e8c0','#e8b7c2'],
    autumn:['#a89e58','#9c9350','rgba(140,128,70,0.35)','rgba(190,176,100,0.30)','#8a8044','#c0b468','#e8d8a0','#d89a6a'],
    winter:['#e2eaf1','#dae4ed','rgba(185,200,215,0.30)','rgba(245,250,255,0.45)','#c2ceda','#f6fafd','#ffffff','#ffffff'],
  };
  function grassTile(seed,pal){
    const r=mulberry32(seed); const c=cv(TILE,TILE), x=c.getContext('2d');
    const [g1,g2,gp1,gp2,gd,gl,gf1,gf2]=pal;
    px(x,0,0,16,16, r()<0.5?g1:g2);
    // large soft tonal patches first
    for(let k=0;k<2;k++){
      x.fillStyle=r()<0.5?gp1:gp2;
      const bx=Math.floor(r()*11), by=Math.floor(r()*11);
      x.fillRect(bx,by,5,3); x.fillRect(bx+1,by-1,3,5);
    }
    dither(x,16,16,gd,0.05,r);
    dither(x,16,16,gl,0.04,r);
    if(r()<0.35){ px(x,2+Math.floor(r()*11),2+Math.floor(r()*11),1,1, r()<0.5?gf1:gf2); }
    if(r()<0.25){ const gx=2+Math.floor(r()*10), gy=4+Math.floor(r()*8); px(x,gx,gy,1,2,gd); px(x,gx+1,gy+1,1,1,gd); }
    return c;
  }
  const SNamesG=['spring','summer','autumn','winter'];
  SPR.grassBySeason=SNamesG.map(n=>[grassTile(11,GRASS_PALS[n]),grassTile(22,GRASS_PALS[n]),grassTile(33,GRASS_PALS[n]),grassTile(44,GRASS_PALS[n]),grassTile(55,GRASS_PALS[n])]);
  SPR.grass=SPR.grassBySeason[0];
  SPR.grassBg={spring:'#8fb36b',summer:'#7ba457',autumn:'#a89e58',winter:'#e2eaf1'};

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
    // pass 1: coverage bitmap, so overlapping blobs shade as one canopy
    const cov=new Uint8Array(40*44);
    for(const [bx,by,br] of blobs){
      for(let j=-br;j<=br;j++)for(let i=-br;i<=br;i++){
        const d=i*i+j*j;
        const edge=br*br*(0.82+hash2(bx+i,by+j,kind==='blossom'?71:31)*0.35);
        if(d<=edge)cov[(by+j)*40+(bx+i)]=1;
      }
    }
    // pass 2: one canopy-space light gradient (sun high left), dapple, dark bottom rim
    for(let gy=0;gy<44;gy++)for(let gx=0;gx<40;gx++){
      if(!cov[gy*40+gx])continue;
      const nx=(gx-20)/20, ny=(gy-14)/15;
      const light=-(nx*0.55)-(ny*0.95);
      let col=L1;
      if(light>0.55)col=L3;
      else if(light<-0.10)col=L2;
      const h=hash2(gx,gy,kind==='blossom'?7:3);
      if(h>0.94&&col!==L2)col=col===L3?L1:L3; // sparse sun-dapple
      else if(h<0.05&&col===L1)col=L2;        // sparse deep fleck
      if(gy+1<44&&!cov[(gy+1)*40+gx])col=L2;  // crisp underside rim
      x.fillStyle=col;
      x.fillRect(gx,gy,1,1);
    }
    // trunk visible below the canopy
    px(x,17,38,6,5,P.trunk); px(x,17,38,2,5,P.trunkD);
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

  // ---------- small item icons (menus): fish + ores ----------
  SPR.item={};
  function fishIcon(body, belly, fin){
    const c=cv(16,16), x=c.getContext('2d');
    px(x,4,7,8,5,body); px(x,5,6,6,1,body); // body
    px(x,5,9,6,2,belly); // belly
    px(x,1,8,3,3,fin); px(x,0,7,1,1,fin); px(x,0,12,1,1,fin); // tail
    px(x,12,6,3,2,fin); // dorsal
    px(x,10,8,1,1,'#2e2620'); // eye
    px(x,6,7,2,1,'rgba(255,255,255,0.35)'); // glint
    return c;
  }
  SPR.item.minnow=fishIcon('#a8bcc4','#d0dce0','#8aa4b0');
  SPR.item.dace=fishIcon('#7a9ab0','#b8ccd8','#5f8296');
  SPR.item.duskcarp=fishIcon('#5a5a74','#8a8aa0','#c96f4a');
  function oreIcon(rock, crystal, glint){
    const c=cv(16,16), x=c.getContext('2d');
    px(x,2,9,12,6,'#6d6b78'); px(x,2,9,12,2,'#54525e'); px(x,2,9,3,6,'#54525e'); // rock base
    px(x,5,4,3,7,crystal); px(x,9,5,3,6,crystal); // crystals
    px(x,6,5,1,3,glint); px(x,10,6,1,2,glint); // glints
    return c;
  }
  SPR.item.pitstone=oreIcon('#6d6b78','#9aa3ad','#c4ccd4');

  // ---------- letter art: letterhead motif + envelope icon ----------
  (function(){
    const c=cv(96,24), x=c.getContext('2d');
    // vine: stem with leaf pairs, reads at small scale
    x.fillStyle='#7b9c58';
    for(let i=6;i<90;i+=4) x.fillRect(i,12,3,1);
    for(let i=8;i<88;i+=8){
      x.fillRect(i,9,2,3); x.fillRect(i+1,8,2,2); // leaf up
      x.fillRect(i+4,13,2,3); x.fillRect(i+5,14,2,2); // leaf down
    }
    // wax seal center
    x.fillStyle='#b35a3e'; x.beginPath(); x.arc(48,12,6,0,7); x.fill();
    x.fillStyle='#8f4530'; x.beginPath(); x.arc(49,13,5,0,7); x.fill();
    x.fillStyle='#d98a6a'; x.fillRect(46,9,2,2); // seal glint
    x.fillStyle='#f7efe0'; x.font='7px serif'; x.fillText('T',45.5,14.5); // valley mark
    SPR.letterhead=c;
    const e=cv(16,16), ex=e.getContext('2d');
    px(ex,2,4,12,9,'#f4ead2'); px(ex,2,4,12,1,'#d9c9a8'); px(ex,2,12,12,1,'#d9c9a8');
    px(ex,2,4,1,9,'#d9c9a8'); px(ex,13,4,1,9,'#d9c9a8');
    // flap
    for(let i=0;i<6;i++){ ex.fillStyle='#e8dcc0'; ex.fillRect(3+i,5+i,10-2*i,1); }
    px(ex,6,8,4,4,'#b35a3e'); // wax blob
    SPR.letterEnv=e;
  })();
  SPR.item.emberquartz=oreIcon('#6d6b78','#e8862d','#f7c948');
  SPR.item.moondrop=oreIcon('#6d6b78','#bcd8e8','#f0faff');

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

  // ---------- villagers: parametric 3-view, 2-frame walk sprites ----------
  function person(o){
    const S=skin,E='#3a2f22',H=o.hair,Tk=o.top,Pp=o.pants,B=boots,C=o.cap||'#6b5b45',R=o.apron||'#8c6540';
    const HEAD_DOWN={
      short:['.....HHHHHH.....','....HHHHHHHH....','....HHHHHHHH....','....SSSSSSSS....','....SESSSSES....','....SSSSSSSS....'],
      long:['.....HHHHHH.....','....HHHHHHHH....','...HHHHHHHHHH...','...HSSSSSSSSH...','...HSESSSESH...','...HSSSSSSSSH...'],
      beard:['................','.....HHHHHH.....','....HHHHHHHH....','....SSSSSSSS....','....SESSSSES....','....SSSSSSSS....'],
      cap:['.....CCCCCC.....','....CCCCCCCC....','....CCCCCCCC....','....SSSSSSSS....','....SESSSSES....','....SSSSSSSS....'],
    };
    const CHIN={ short:'.....SSSSSS.....', long:'...HSSSSSSSSH...', beard:'....SHHHHHHS....', cap:'.....SSSSSS.....' };
    const HEAD_UP={
      short:['.....HHHHHH.....','....HHHHHHHH....','....HHHHHHHH....','....HHHHHHHH....','....HHHHHHHH....','.....SSSSSS.....'],
      long:['.....HHHHHH.....','....HHHHHHHH....','...HHHHHHHHHH...','...HHHHHHHHHH...','...HHHHHHHHHH...','...HHHHHHHHHH...'],
      beard:['................','.....HHHHHH.....','....HHHHHHHH....','....HHHHHHHH....','....HHHHHHHH....','.....SSSSSS.....'],
      cap:['.....CCCCCC.....','....CCCCCCCC....','....CCCCCCCC....','....CCCCCCCC....','....CCCCCCCC....','.....SSSSSS.....'],
    };
    const HEAD_SIDE={
      short:['.....HHHHHH.....','....HHHHHHHH....','....HHHHSSSS....','....HHHHSSSE....','....HHHHSSSS....','.....SSSSSS.....'],
      long:['.....HHHHHH.....','....HHHHHHHH....','...HHHHHHSSSS...','...HHHHHHSSSE...','...HHHHHHSSSS...','...HHHHHHSSS....'],
      beard:['................','.....HHHHHH.....','....HHHHSSSS....','....HHHHSSSE....','....HHHHSSSS....','....SSHHHHH.....'],
      cap:['.....CCCCCC.....','....CCCCCCCCCC..','....CCCCSSSS....','....CCCCSSSE....','....CCCCSSSS....','.....SSSSSS.....'],
    };
    const L0=['....PP....PP....','....BB....BB....'];
    const L1=['.....PP..PP.....','.....B....B.....'];
    function build(head,legs){
      const body=['....TTTTTTTT....','...TTTTTTTTTT...','...ATTTTTTTTA...','....TTTTTTTT....'];
      if(o.apron) body.push('....RRRRRRRR....','....RRRRRRRR....');
      const rows=[...head, CHIN[o.style], ...body, '....PPPPPPPP....', ...legs];
      while(rows.length<16) rows.push('................');
      return outline(drawMap(rows,{S,H,T:Tk,A:S,P:Pp,B,E,C,R}));
    }
    return {
      down:[build(HEAD_DOWN[o.style],L0),build(HEAD_DOWN[o.style],L1)],
      up:[build(HEAD_UP[o.style],L0),build(HEAD_UP[o.style],L1)],
      side:[build(HEAD_SIDE[o.style],L0),build(HEAD_SIDE[o.style],L1)],
    };
  }
  SPR.villagers={
    mara:person({style:'long',hair:'#8a4f38',top:'#b0698a',pants:'#7a6a4a'}),
    bram:person({style:'beard',hair:'#c9c2b8',top:'#7a6a4a',pants:'#5b5148'}),
    fern:person({style:'short',hair:'#a85f38',top:'#7a8a5f',pants:'#5f5648'}),
    piet:person({style:'cap',cap:'#6b5b45',top:'#a87c52',apron:'#8c6540',pants:'#5b5148'}),
  };
  SPR.npc=SPR.villagers.mara.down[0]; // shop stand keeps her facing forward


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
  // villager portraits (24x24) for dialogue cards
  function portrait(base, hair, hairStyle, extra){
    const c=document.createElement('canvas'); c.width=24; c.height=24;
    const x=c.getContext('2d');
    const R=(a,b,w,h,col)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
    R(0,0,24,24,'#e8dcc4');                    // warm backdrop
    R(0,22,24,2,'#d8c8a8');
    R(7,8,10,11,base);                         // face
    R(6,19,12,5,'#5a6e46');                    // shoulders
    if(hairStyle==='bun'){ R(6,5,12,4,hair); R(5,7,3,7,hair); R(17,7,2,4,hair); R(9,4,6,3,hair); }
    else if(hairStyle==='cap'){ R(5,4,14,5,extra.cap); R(4,8,16,2,extra.cap); }
    else if(hairStyle==='loose'){ R(6,4,12,5,hair); R(5,8,3,9,hair); R(16,8,3,9,hair); }
    else if(hairStyle==='sides'){ R(5,7,2,6,hair); R(17,7,2,6,hair); R(6,5,12,2,hair); }
    R(9,12,2,2,'#2e2620'); R(14,12,2,2,'#2e2620');   // eyes
    if(extra.freckles){ R(8,15,1,1,'#c98850'); R(10,16,1,1,'#c98850'); R(15,15,1,1,'#c98850'); }
    if(extra.beard){ R(8,16,9,5,extra.beard); R(10,15,5,1,extra.beard); }
    if(extra.blush){ R(7,14,2,1,'#e8a888'); R(16,14,2,1,'#e8a888'); }
    R(11,16,3,1,'#b87a5a');                    // mouth hint
    return c;
  }
  SPR.portraits={
    mara:  portrait('#eec39a','#6e4a2e','bun',{blush:true}),
    bram:  portrait('#d8ad84','#8d8d94','cap',{cap:'#5a5148',beard:'#a8a8ad'}),
    fern:  portrait('#f0c9a0','#b85a32','loose',{freckles:true,blush:true}),
    piet:  portrait('#e0b58e','#7a5a3a','sides',{beard:'#7a5a3a'}),
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
