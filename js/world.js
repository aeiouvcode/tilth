// TILTH world: 48x36 valley, hand-laid with seeded scatter
'use strict';
const W=48, H=36;
// tile ids
const T={GRASS:0, PATH:1, SOIL:2, SOILWET:3, WATER:4, SAND:5, FENCE:6, ROCK:7, TREE:8, TREEB:9, HOUSE:10, CRATE:11, STAND:12, DOORMAT:13, COTTAGE:14, WELL:15, MAILBOX:16, CAVEENT:17};
const SOLID=new Set([T.WATER,T.FENCE,T.ROCK,T.TREE,T.TREEB,T.HOUSE,T.CRATE,T.STAND,T.COTTAGE,T.WELL,T.MAILBOX,T.CAVEENT]);

// farmhouse interior: small separate room map
const IT={FLOOR:0, WALL:1, BED:2, TABLE:3, RUG:4, DOOR:5, SHELF:6};
const IW=11, IH=8;
const ISOLID=new Set([IT.WALL,IT.BED,IT.TABLE,IT.SHELF]);
function makeInterior(){
  const g=new Uint8Array(IW*IH).fill(IT.FLOOR);
  const set=(x,y,v)=>{ g[y*IW+x]=v; };
  for(let x=0;x<IW;x++){ set(x,0,IT.WALL); set(x,IH-1,IT.WALL); }
  for(let y=0;y<IH;y++){ set(0,y,IT.WALL); set(IW-1,y,IT.WALL); }
  set(1,1,IT.BED); set(2,1,IT.BED); set(1,2,IT.BED); set(2,2,IT.BED);
  set(9,1,IT.SHELF); set(9,2,IT.SHELF);
  set(7,3,IT.TABLE);
  set(4,3,IT.RUG); set(5,3,IT.RUG); set(4,4,IT.RUG); set(5,4,IT.RUG);
  set(5,IH-1,IT.DOOR);
  return g;
}

function makeWorld(){
  const g=new Uint8Array(W*H).fill(T.GRASS);
  const at=(x,y)=>g[y*W+x];
  const set=(x,y,v)=>{ if(x>=0&&y>=0&&x<W&&y<H) g[y*W+x]=v; };
  const fillRect=(x0,y0,w,h,v)=>{ for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)set(x,y,v); };

  // farmhouse 4x3 at (6,4)
  fillRect(6,4,4,3,T.HOUSE); set(8,7,T.DOORMAT); set(10,7,T.MAILBOX);
  // shipping crate near house
  set(11,6,T.CRATE);
  // Mara's seed stand (2x2) down the lane
  fillRect(14,11,2,2,T.STAND);
  // dirt lane: from doormat right, then down through fields
  for(let x=8;x<=15;x++) set(x,8,T.PATH);
  for(let y=8;y<=12;y++) set(15,y,T.PATH);
  // fence around the big field (18..34 x 12..24)
  for(let x=17;x<=35;x++){ set(x,11,T.FENCE); set(x,25,T.FENCE); }
  for(let y=11;y<=25;y++){ set(17,y,T.FENCE); set(35,y,T.FENCE); }
  set(21,11,T.PATH); // gate north
  set(26,25,T.PATH); // gate south
  // pond bottom-left with sand rim
  const pr=mulberry32(7);
  for(let y=22;y<33;y++)for(let x=4;x<17;x++){
    const dx=(x-10)/6.5, dy=(y-27)/4.5;
    const d=dx*dx+dy*dy;
    if(d<0.75) set(x,y,T.WATER);
    else if(d<1.05 && at(x,y)===T.GRASS) set(x,y,T.SAND);
  }
  // trees along north + west + scattered south-east
  for(let x=2;x<W-2;x+=3){ if(hash2(x,1,5)>0.25) set(x,1, hash2(x,0,9)>0.75?T.TREEB:T.TREE); }
  for(let y=3;y<20;y+=4){ if(hash2(1,y,6)>0.35) set(1,y,T.TREE); }
  for(let i=0;i<26;i++){
    const x=2+Math.floor(pr()*(W-4)), y=27+Math.floor(pr()*(H-29));
    if(at(x,y)===T.GRASS && hash2(x,y,21)>0.4) set(x,y, hash2(x,y,33)>0.8?T.TREEB:T.TREE);
  }
  for(let i=0;i<8;i++){
    const x=38+Math.floor(pr()*8), y=4+Math.floor(pr()*22);
    if(at(x,y)===T.GRASS) set(x,y, hash2(x,y,44)>0.5?T.ROCK:T.TREE);
  }
  // a few rocks in the field
  set(30,18,T.ROCK); set(24,21,T.ROCK);
  // village lane east + cottage + well
  for(let x=16;x<=44;x++) set(x,8,T.PATH);
  for(let y=5;y<=8;y++) set(42,y,T.PATH);
  fillRect(41,2,4,3,T.COTTAGE);
  set(39,8,T.WELL);
  // clear the scatter zone so the village reads clean
  for(let y=1;y<12;y++)for(let x=38;x<47;x++){
    const v=at(x,y);
    if((v===T.TREE||v===T.TREEB||v===T.ROCK) && !(y===1)) set(x,y,T.GRASS);
  }
  // quarry cave entrance: south off the village lane, set into the rocks
  for(let x=41;x<=44;x++) set(x,4,T.COTTAGE); // restore cottage row
  for(let y=12;y<=15;y++)for(let x=43;x<=47;x++) set(x,y,T.GRASS); // clear a pocket
  for(let y=9;y<=13;y++) set(44,y,T.PATH);
  set(45,13,T.PATH);
  set(46,13,T.CAVEENT);
  set(45,12,T.ROCK); set(46,12,T.ROCK); set(45,14,T.ROCK); set(46,14,T.ROCK);
  // pre-tilled starter patch 6x4 inside field
  fillRect(20,13,6,4,T.SOIL);
  return g;
}

// quarry cave interior: one dark chamber, ore nodes are entities not tiles
const CT={FLOOR:0, WALL:1, DOOR:2, STAIRS:3};
const CW=13, CH=9;
const CSOLID=new Set([CT.WALL]);
function makeCave(){
  const g=new Uint8Array(CW*CH).fill(CT.FLOOR);
  const set=(x,y,v)=>{ g[y*CW+x]=v; };
  for(let x=0;x<CW;x++){ set(x,0,CT.WALL); set(x,CH-1,CT.WALL); }
  for(let y=0;y<CH;y++){ set(0,y,CT.WALL); set(CW-1,y,CT.WALL); }
  set(6,CH-1,CT.DOOR);
  set(11,7,CT.STAIRS);
  return g;
}
// candidate node spots; 5 chosen per day, seeded by day
const CAVE_SPOTS=[[2,2],[5,2],[9,2],[11,3],[2,5],[4,6],[8,5],[10,6],[6,3]];
