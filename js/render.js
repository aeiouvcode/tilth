// TILTH renderer: integer-scaled pixel camera, y-sorted entities, light tint
'use strict';
const Render={
  canvas:null, ctx:null, scale:3, vw:0, vh:0,
  init(){
    this.canvas=document.getElementById('game');
    this.ctx=this.canvas.getContext('2d');
    this.resize(); addEventListener('resize',()=>this.resize());
  },
  resize(){
    const vw=innerWidth, vh=innerHeight;
    this.scale=clamp(Math.floor(Math.min(vw/(TILE*22), vh/(TILE*15))), 2, 8);
    this.canvas.width=Math.ceil(vw/this.scale); this.canvas.height=Math.ceil(vh/this.scale);
    this.canvas.style.width=(this.canvas.width*this.scale)+'px';
    this.canvas.style.height=(this.canvas.height*this.scale)+'px';
    this.ctx.imageSmoothingEnabled=false;
  },
  draw(G, now){
    if(G.indoor){ this.drawInterior(G, now); return; }
    if(G.inCave){ this.drawCave(G, now); return; }
    const ctx=this.ctx, cw=this.canvas.width, ch=this.canvas.height;
    // camera
    const px=G.player.x, py=G.player.y;
    const camX=clamp(Math.round(px-cw/2), 0, W*TILE-cw);
    const camY=clamp(Math.round(py-ch/2), 0, H*TILE-ch);
    const SBG=['#8fb36b','#7ba457','#a89e58','#e2eaf1'];
    ctx.fillStyle=SBG[G.seasonCached||0]; ctx.fillRect(0,0,cw,ch);
    // ground
    const x0=Math.floor(camX/TILE), y0=Math.floor(camY/TILE);
    const x1=Math.min(W-1, Math.ceil((camX+cw)/TILE)), y1=Math.min(H-1, Math.ceil((camY+ch)/TILE));
    const waterFrame=Math.floor(now/800)%2;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=G.grid[y*W+x], dx=x*TILE-camX, dy=y*TILE-camY;
      let img;
      if(t===T.GRASS){ const gs=SPR.grassBySeason[G.seasonCached||0]; img=gs[Math.floor(hash2(x,y,1)*gs.length)]; }
      else if(t===T.PATH||t===T.DOORMAT) img=SPR.path;
      else if(t===T.SOIL) img=SPR.soil;
      else if(t===T.SOILWET) img=SPR.soilWet;
      else if(t===T.WATER){ img=SPR.water[waterFrame]; }
      else if(t===T.SAND) img=SPR.sand;
      else img=SPR.grassBySeason[G.seasonCached||0][0];
      ctx.drawImage(img,dx,dy);
      if(G.seasonCached===3 && t!==T.WATER && t!==T.GRASS){ // winter frost on dirt/stone: even wash + speckle
        ctx.fillStyle='rgba(232,240,248,0.30)'; ctx.fillRect(dx,dy,TILE,TILE);
        ctx.fillStyle='rgba(245,250,255,0.55)';
        for(let k=0;k<5;k++){ const hx=Math.floor(hash2(x*7+k,y*3+k,91)*14), hy=Math.floor(hash2(x*3,y*5+k,92)*14); ctx.fillRect(dx+hx,dy+hy,2,1); }
      }
      if(t===T.PATH){ // grass creeps onto path edges where a grass neighbor sits
        const TUFTC=['#7b9c58','#678c48','#8a8044','#c2ceda'];
        const tc=TUFTC[G.seasonCached||0];
        const nb=[[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]]; // dx,dy,edge-id
        ctx.fillStyle=tc;
        for(const [ox,oy,eid] of nb){
          const nx2=x+ox, ny2=y+oy;
          if(nx2<0||ny2<0||nx2>=W||ny2>=H)continue;
          if(G.grid[ny2*W+nx2]!==T.GRASS)continue;
          const h=hash2(x*4+eid,y*4-eid,77);
          if(h<0.45)continue;
          const hx=Math.floor(hash2(x,y,80+eid)*10)+3, hy=Math.floor(hash2(x,y,84+eid)*10)+3;
          if(eid===0){ ctx.fillRect(dx+hx,dy,1,3); ctx.fillRect(dx+hx+2,dy,1,2); }
          else if(eid===2){ ctx.fillRect(dx+hx,dy+13,1,3); ctx.fillRect(dx+hx-2,dy+14,1,2); }
          else if(eid===1){ ctx.fillRect(dx+13,dy+hy,3,1); ctx.fillRect(dx+14,dy+hy+2,2,1); }
          else { ctx.fillRect(dx,dy+hy,3,1); ctx.fillRect(dx,dy+hy-2,2,1); }
        }
      }
      if(t===T.DOORMAT){ ctx.fillStyle='#c96f4a'; ctx.fillRect(dx+3,dy+10,10,4); }
      if(t===T.GRASS){ // hash-driven meadow detail: tufts, clover, wildflowers (snow glints in winter)
        const hd=hash2(x,y,51);
        if(G.seasonCached===3){
          if(hd>0.94){ const hx=Math.floor(hash2(x,y,52)*12)+2, hy=Math.floor(hash2(x,y,53)*12)+2;
            ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(dx+hx,dy+hy,1,1); ctx.fillRect(dx+hx-1,dy+hy+1,1,1); ctx.fillRect(dx+hx+1,dy+hy+1,1,1); ctx.fillRect(dx+hx,dy+hy+2,1,1); }
        } else if(hd>0.90){
          const hx=Math.floor(hash2(x,y,52)*10)+3, hy=Math.floor(hash2(x,y,53)*10)+3;
          if(hd>0.975){ // wildflower: tiny cross with a warm heart
            const fc=hash2(x,y,54)>0.5?'#f4ecd8':'#e9c46a';
            ctx.fillStyle=G.seasonCached===2?'#7a7040':'#5f7a4a'; ctx.fillRect(dx+hx+1,dy+hy+2,1,3);
            ctx.fillStyle=fc; ctx.fillRect(dx+hx,dy+hy,3,1); ctx.fillRect(dx+hx+1,dy+hy-1,1,3);
          } else if(hd>0.94){ // clover patch
            ctx.fillStyle=G.seasonCached===2?'#8a8044':'#6d8c54';
            ctx.fillRect(dx+hx,dy+hy,2,2); ctx.fillRect(dx+hx+3,dy+hy+1,2,2); ctx.fillRect(dx+hx+1,dy+hy+3,2,2);
          } else { // grass tuft
            ctx.fillStyle=G.seasonCached===2?'#948a4a':(G.seasonCached===1?'#678c48':'#7b9c58');
            ctx.fillRect(dx+hx,dy+hy+2,1,3); ctx.fillRect(dx+hx+2,dy+hy,1,5); ctx.fillRect(dx+hx+4,dy+hy+2,1,3);
          }
        }
      }
      if(t===T.FENCE) ctx.drawImage(SPR.fence,dx,dy);
      if(t===T.ROCK) ctx.drawImage(SPR.rock,dx,dy);
    }
    // forage on grass
    for(const [key,fg] of G.forage){
      const x=key%W, y=Math.floor(key/W);
      if(x<x0-1||x>x1||y<y0-1||y>y1)continue;
      ctx.drawImage(SPR.forage[fg.id], x*TILE-camX, y*TILE-camY);
    }
    // crops on soil
    for(const [key,c] of G.crops){
      const x=key%W, y=Math.floor(key/W);
      if(x<x0-1||x>x1||y<y0-1||y>y1)continue;
      const def=CROPS[c.id];
      ctx.drawImage(SPR.crop(def,c.stage), x*TILE-camX, y*TILE-camY);
      if(c.stage>=3){ // ready sparkle
        const tw=(Math.sin(now/300+x*2+y)+1)/2;
        ctx.fillStyle=`rgba(255,244,200,${0.35+0.4*tw})`;
        ctx.fillRect(x*TILE-camX+7, y*TILE-camY+1+Math.round(tw), 2, 2);
      }
    }
    // cloud shadows (ground level, beneath entities)
    ctx.fillStyle='rgba(60,80,50,0.13)';
    for(const cl of G.clouds){
      const cx=((cl.x)%(W*TILE+240))-120-camX, cy=cl.y-camY;
      if(cx<-160||cx>cw+160)continue;
      ctx.beginPath(); ctx.ellipse(cx,cy,cl.r*1.8,cl.r*0.8,0,0,7); ctx.fill();
    }
    // entities y-sorted
    const ents=[];
    for(let y=y0-2;y<=y1+2;y++)for(let x=x0-2;x<=x1+2;x++){
      if(x<0||y<0||x>=W||y>=H)continue;
      const t=G.grid[y*W+x];
      if(t===T.TREE||t===T.TREEB){ const si=G.seasonCached||0; ents.push({y:y*TILE+16, draw:()=>{
        const bare=si===3;
        ctx.fillStyle='rgba(50,60,40,0.16)';
        ctx.beginPath(); ctx.ellipse(x*TILE-camX+11, y*TILE-camY+15, bare?7:13, bare?3:4.5, 0, 0, 7); ctx.fill();
        ctx.drawImage(t===T.TREE?SPR.trees[si]:SPR.treesB[si], x*TILE-camX-12, y*TILE-camY-28); }}); }
      else if(t===T.HOUSE && G.grid[y*W+x-1]!==T.HOUSE && (y===0||G.grid[(y-1)*W+x]!==T.HOUSE)){
        // top-left of house
        ents.push({y:y*TILE+48, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.13)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+32, y*TILE-camY+48, 34, 4, 0, 0, 7); ctx.fill(); ctx.drawImage(SPR.house, x*TILE-camX, y*TILE-camY); }});
      }
      else if(t===T.CRATE) ents.push({y:y*TILE+16, draw:()=>ctx.drawImage(SPR.crate,x*TILE-camX,y*TILE-camY)});
      else if(t===T.COTTAGE && G.grid[y*W+x-1]!==T.COTTAGE && (y===0||G.grid[(y-1)*W+x]!==T.COTTAGE)){
        ents.push({y:y*TILE+48, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.13)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+32, y*TILE-camY+48, 34, 4, 0, 0, 7); ctx.fill(); ctx.drawImage(SPR.cottage, x*TILE-camX, y*TILE-camY); }});
      }
      else if(t===T.WELL) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.well, x*TILE-camX-4, y*TILE-camY-8); }});
      else if(t===T.CAVEENT) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.caveent, x*TILE-camX, y*TILE-camY); }});
      else if(t===T.MAILBOX) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.mailbox, x*TILE-camX, y*TILE-camY);
        if(G.letters&&G.letters.some(l=>!l.read)){ const tw=Math.sin(now/300)>0; if(tw){ ctx.fillStyle='#e9c46a'; ctx.fillRect(x*TILE-camX+12, y*TILE-camY+1, 3, 3); } } }});
      else if(t===T.STAND && G.grid[y*W+x-1]!==T.STAND && (y===0||G.grid[(y-1)*W+x]!==T.STAND)){
        ents.push({y:y*TILE+32, draw:()=>{ ctx.drawImage(SPR.stand,x*TILE-camX,y*TILE-camY); ctx.fillStyle='rgba(60,60,40,0.18)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+19, y*TILE-camY+3, 6, 2.5, 0, 0, 7); ctx.fill();
          ctx.drawImage(SPR.npc, x*TILE-camX+9, y*TILE-camY-13); }});
      }
    }
    // wandering villagers
    for(const id of ['mara','bram','fern','piet']){
      const n=G[id]; if(!n)continue;
      const set=SPR.villagers[id];
      ents.push({y:n.y+6, draw:()=>{
        ctx.fillStyle='rgba(60,60,40,0.18)';
        ctx.beginPath(); ctx.ellipse(n.x-camX, n.y-camY+7, 6, 2.5, 0, 0, 7); ctx.fill();
        const view=n.dir==='up'?set.up:((n.dir==='left'||n.dir==='right')?set.side:set.down);
        const fr=n.moving?Math.floor(now/180)%2:0;
        ctx.save(); ctx.translate(Math.round(n.x-camX), Math.round(n.y-camY));
        if(n.dir==='left'||(n.dir!=='right'&&n.flip))ctx.scale(-1,1);
        ctx.drawImage(view[fr],-9,-13-(n.moving&&fr?1:0)); ctx.restore();
      }});
    }
    // cat
    ents.push({y:G.cat.y+6, draw:()=>{ const f=Math.floor(now/400)%2; ctx.save(); ctx.translate(G.cat.x-camX, G.cat.y-camY); if(G.cat.flip){ctx.scale(-1,1);} ctx.drawImage(SPR.cat,-8,-8); ctx.restore(); }});
    // player
    ents.push({y:py+8, draw:()=>{
      const fr=G.player.moving?Math.floor(now/180)%2:0;
      ctx.fillStyle='rgba(60,60,40,0.18)';
      ctx.beginPath(); ctx.ellipse(Math.round(px-camX), Math.round(py-camY+7), 6, 2.5, 0, 0, 7); ctx.fill();
      ctx.drawImage(SPR.player[G.player.dir][fr], Math.round(px-camX-9), Math.round(py-camY-13-(G.player.moving&&fr?1:0)));
    }});
    ents.sort((a,b)=>a.y-b.y);
    for(const e of ents)e.draw();
    // facing highlight
    const f=facingTile(G.player);
    if(f) { ctx.strokeStyle='rgba(247,239,224,0.5)'; ctx.lineWidth=1; ctx.strokeRect(f.x*TILE-camX+0.5, f.y*TILE-camY+0.5, TILE-1, TILE-1); }
    // fishing bobber
    if(G.fishing){
      const bx=G.fishing.x*TILE-camX+8, by=G.fishing.y*TILE-camY+8+Math.sin(now/350)*1.5;
      ctx.fillStyle='#f7efe0'; ctx.fillRect(bx-2,by-3,4,3);
      ctx.fillStyle='#c94f3d'; ctx.fillRect(bx-2,by-1,4,3);
      if(G.fishing.state==='bite'){
        const pulse=Math.abs(Math.sin(now/120));
        ctx.fillStyle='#f7efe0'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
        ctx.fillText('!', bx, by-8-pulse*2);
        ctx.strokeStyle='rgba(247,239,224,'+(0.4+0.4*pulse)+')';
        ctx.strokeRect(G.fishing.x*TILE-camX+2.5, G.fishing.y*TILE-camY+2.5, TILE-5, TILE-5);
      }
    }
    // butterflies
    for(const b of G.butterflies){
      const bx=b.x+Math.sin(now/500+b.p)*10-camX, by=b.y+Math.cos(now/700+b.p)*6-camY;
      if(bx<-4||by<-4||bx>cw+4||by>ch+4)continue;
      const w=Math.abs(Math.sin(now/120+b.p));
      ctx.fillStyle=b.c; ctx.fillRect(bx-1,by-1,2,1+Math.round(w));
    }
    // lighting overlay (hour tint + season grade)
    const tint=lightTint(G.minutes);
    const SEASON_GRADE=[null,'#eef0d0','#ecd0a0','#ccdcec'];
    const sg=SEASON_GRADE[G.seasonCached||0];
    if(tint||sg){
      ctx.globalCompositeOperation='multiply';
      if(sg){ ctx.fillStyle=sg; ctx.fillRect(0,0,cw,ch); }
      if(tint){ ctx.fillStyle=tint; ctx.fillRect(0,0,cw,ch); }
      ctx.globalCompositeOperation='source-over';
    }
    // lantern evening: lane strung with lanterns + warm glow
    if(G.day%7===0 && G.minutes>=1080){
      for(let lx=16;lx<=44;lx+=4){
        const dx=lx*TILE-camX, dy=8*TILE-camY-6;
        if(dx<-20||dx>cw+20)continue;
        ctx.drawImage(SPR.lantern,dx,dy);
        const glow=(Math.sin(now/700+lx)+1)/2;
        const grad=ctx.createRadialGradient(dx+8,dy+8,2,dx+8,dy+8,18+6*glow);
        grad.addColorStop(0,'rgba(233,196,106,0.35)'); grad.addColorStop(1,'rgba(233,196,106,0)');
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(dx+8,dy+8,24,0,7); ctx.fill();
      }
    }
    // rain
    if(G.weather==='rain'){
      ctx.strokeStyle='rgba(220,235,245,0.5)'; ctx.lineWidth=1;
      const off=(now/3)%24;
      for(let i=0;i<70;i++){
        const rx=(i*97)% (cw+40), ry=((i*61)+off*((i%3)+2))%(ch+20);
        ctx.beginPath(); ctx.moveTo(rx-20, ry-10); ctx.lineTo(rx-23, ry-4); ctx.stroke();
      }
      ctx.globalCompositeOperation='multiply';
      ctx.fillStyle='#d8dcd8'; ctx.fillRect(0,0,cw,ch);
      ctx.globalCompositeOperation='source-over';
    }
    // fireflies at night
    if(G.minutes>=1200||G.minutes<330){
      for(const f2 of G.fireflies){
        const a=(Math.sin(now/600+f2.p)+1)/2;
        ctx.fillStyle=`rgba(240,230,150,${0.25+0.55*a})`;
        ctx.fillRect(f2.x+Math.sin(now/900+f2.p)*14-camX, f2.y+Math.cos(now/1100+f2.p)*10-camY, 1, 1);
      }
    }
  }
  ,
  drawInterior(G, now){
    const ctx=this.ctx, cw=this.canvas.width, ch=this.canvas.height;
    const roomW=IW*TILE, roomH=IH*TILE;
    const camX=roomW>cw ? clamp(Math.round(G.player.x-cw/2), 0, roomW-cw) : Math.round((roomW-cw)/2);
    const camY=roomH>ch ? clamp(Math.round(G.player.y-ch/2), 0, roomH-ch) : Math.round((roomH-ch)/2);
    ctx.fillStyle='#241b14'; ctx.fillRect(0,0,cw,ch);
    // walls + plank floor
    for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){
      const dx=x*TILE-camX, dy=y*TILE-camY;
      const it=G.interior[y*IW+x];
      if(it===IT.WALL){
        ctx.fillStyle='#5f4630'; ctx.fillRect(dx,dy,TILE,TILE);
        ctx.fillStyle='#543d2a'; ctx.fillRect(dx,dy+12,TILE,4);
        if(y===0){ ctx.fillStyle='#4c3722'; ctx.fillRect(dx,dy,TILE,3); }
        if(y===IH-1){ ctx.fillStyle='#4c3722'; ctx.fillRect(dx,dy+13,TILE,3); }
      } else {
        ctx.fillStyle=(x+y)%2?'#8a6844':'#84633f'; ctx.fillRect(dx,dy,TILE,TILE);
        ctx.fillStyle='rgba(60,40,24,0.22)'; ctx.fillRect(dx,dy,TILE,1); ctx.fillRect(dx,dy,1,TILE);
      }
    }
    // rug (2x2 woven block)
    for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){
      if(G.interior[y*IW+x]!==IT.RUG)continue;
      const dx=x*TILE-camX, dy=y*TILE-camY;
      ctx.fillStyle='#b8574a'; ctx.fillRect(dx,dy,TILE,TILE);
      ctx.fillStyle='#e9d9b8'; ctx.fillRect(dx,dy+7,TILE,2);
      if(x===4){ ctx.fillStyle='#8d3d34'; ctx.fillRect(dx,dy,2,TILE); }
      if(x===5){ ctx.fillStyle='#8d3d34'; ctx.fillRect(dx+14,dy,2,TILE); }
      if(y===3){ ctx.fillStyle='#8d3d34'; ctx.fillRect(dx,dy,TILE,2); }
      if(y===4){ ctx.fillStyle='#8d3d34'; ctx.fillRect(dx,dy+14,TILE,2); }
    }
    // window on the north wall (x 4-5): sky by hour, rain streaks when wet
    {
      const dx=4*TILE-camX, dy=-camY;
      ctx.fillStyle='#3d2c1c'; ctx.fillRect(dx-2,dy+1,36,13);
      const m=G.minutes;
      const sky = m<330||m>=1230 ? '#2c3050' : m<420 ? '#d8a880' : m<1020 ? '#bfd9e8' : m<1170 ? '#e8c090' : '#c88a70';
      ctx.fillStyle=sky; ctx.fillRect(dx,dy+3,32,9);
      ctx.fillStyle='#3d2c1c'; ctx.fillRect(dx+15,dy+3,2,9); ctx.fillRect(dx,dy+7,32,1);
      if(G.weather==='rain'){
        ctx.strokeStyle='rgba(220,235,245,0.7)'; ctx.lineWidth=1;
        const off=(now/4)%6;
        for(let i=0;i<6;i++){ const rx=dx+2+i*6, ry=dy+3+((i*3+off)%8);
          ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-1,ry+3); ctx.stroke(); }
      }
    }
    // fireplace on the north wall (x 7-8) with animated fire
    {
      const dx=7*TILE-camX, dy=-camY;
      ctx.fillStyle='#8d8d94'; ctx.fillRect(dx-2,dy+4,36,12);      // stone surround
      ctx.fillStyle='#6d6d74'; ctx.fillRect(dx-2,dy+4,36,2);
      ctx.fillStyle='#1d1510'; ctx.fillRect(dx+3,dy+7,26,9);       // firebox
      const f=Math.floor(now/180)%2;
      ctx.fillStyle='#e8862d';
      ctx.fillRect(dx+7,dy+10+(f?1:0),5,5); ctx.fillRect(dx+20,dy+10+(f?0:1),5,5);
      ctx.fillRect(dx+13,dy+9,6,6);
      ctx.fillStyle='#f7c948';
      ctx.fillRect(dx+9,dy+12,3,3); ctx.fillRect(dx+15,dy+11+(f?1:0),3,3); ctx.fillRect(dx+22,dy+12,3,3);
      const glow=0.12+0.06*Math.sin(now/300);
      const grad=ctx.createRadialGradient(dx+16,dy+14,4,dx+16,dy+14,42);
      grad.addColorStop(0,`rgba(255,170,80,${glow})`); grad.addColorStop(1,'rgba(255,170,80,0)');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(dx+16,dy+14,42,0,7); ctx.fill();
    }
    // door in the south wall
    {
      const dx=5*TILE-camX, dy=7*TILE-camY;
      ctx.fillStyle='#1d1510'; ctx.fillRect(dx+2,dy+2,12,14);
      ctx.fillStyle='#c96f4a'; ctx.fillRect(dx+1,dy+12,14,4);
    }
    // furniture (y-sorted with the player)
    const ents=[];
    for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){
      const it=G.interior[y*IW+x], dx=x*TILE-camX, dy=y*TILE-camY;
      if(it===IT.BED && x===1 && y===1){ // draw the 2x2 bed once, from its top-left
        ents.push({y:dy+34, draw:()=>{
          ctx.fillStyle='#5a3d28'; ctx.fillRect(dx-1,dy-2,34,7);            // headboard
          ctx.fillStyle='#e9d9b8'; ctx.fillRect(dx+1,dy+5,30,10);           // mattress + pillow
          ctx.fillStyle='#f4ecd8'; ctx.fillRect(dx+3,dy+6,12,7);
          ctx.fillStyle='#b8574a'; ctx.fillRect(dx+1,dy+15,30,17);          // quilt
          ctx.fillStyle='#a34a3e'; ctx.fillRect(dx+1,dy+15,30,3);
          ctx.fillStyle='#e9d9b8'; for(let q=0;q<4;q++) ctx.fillRect(dx+4+q*7,dy+19,3,3);
        }});
      }
      else if(it===IT.SHELF && y===1){
        ents.push({y:dy+34, draw:()=>{
          ctx.fillStyle='#5a3d28'; ctx.fillRect(dx-2,dy-6,20,40);           // shelf body
          ctx.fillStyle='#6e4f33'; ctx.fillRect(dx,dy-4,16,36);
          ctx.fillStyle='#5a3d28'; ctx.fillRect(dx,dy+8,16,2); ctx.fillRect(dx,dy+20,16,2);
          ctx.fillStyle='#c96f4a'; ctx.fillRect(dx+2,dy+1,4,6);
          ctx.fillStyle='#7d9b76'; ctx.fillRect(dx+9,dy+2,4,5);
          ctx.fillStyle='#e9c46a'; ctx.fillRect(dx+3,dy+13,3,6);
          ctx.fillStyle='#8fa3b8'; ctx.fillRect(dx+8,dy+12,5,7);
          ctx.fillStyle='#b8574a'; ctx.fillRect(dx+4,dy+25,8,6);
        }});
      }
      else if(it===IT.TABLE){
        ents.push({y:dy+16, draw:()=>{
          ctx.fillStyle='#5a3d28'; ctx.fillRect(dx-3,dy+9,6,5); ctx.fillRect(dx+13,dy+9,6,5); // stools
          ctx.fillStyle='#6e4f33'; ctx.fillRect(dx-1,dy+1,18,13);           // tabletop
          ctx.fillStyle='#7d5a3a'; ctx.fillRect(dx+1,dy+3,14,9);
          ctx.fillStyle='#e9d9b8'; ctx.fillRect(dx+6,dy+5,5,4);             // mug + plate
          ctx.fillStyle='#c96f4a'; ctx.fillRect(dx+11,dy+6,3,3);
        }});
      }
    }
    // player
    const p=G.player, fr=p.moving?Math.floor(now/180)%2:0;
    ents.push({y:p.y-camY+8, draw:()=>{
      ctx.fillStyle='rgba(40,26,16,0.25)';
      ctx.beginPath(); ctx.ellipse(Math.round(p.x-camX), Math.round(p.y-camY+7), 6, 2.5, 0, 0, 7); ctx.fill();
      ctx.drawImage(SPR.player[p.dir][fr], Math.round(p.x-camX-9), Math.round(p.y-camY-13));
    }});
    ents.sort((a,b)=>a.y-b.y);
    for(const e of ents)e.draw();
    // facing highlight
    {
      const tx=Math.floor(p.x/TILE + (p.dir==='right'?1:p.dir==='left'?-1:0));
      const ty=Math.floor(p.y/TILE + (p.dir==='down'?1:p.dir==='up'?-1:0));
      if(tx>=0&&ty>=0&&tx<IW&&ty<IH){
        ctx.strokeStyle='rgba(247,239,224,0.4)'; ctx.lineWidth=1;
        ctx.strokeRect(tx*TILE-camX+0.5, ty*TILE-camY+0.5, TILE-1, TILE-1);
      }
    }
    // constant cozy interior light (day tint does not reach inside)
    ctx.globalCompositeOperation='multiply';
    ctx.fillStyle='#f2dfc8'; ctx.fillRect(0,0,cw,ch);
    ctx.globalCompositeOperation='source-over';
    const vg=ctx.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*0.35,cw/2,ch/2,Math.max(cw,ch)*0.75);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(20,12,8,0.35)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,cw,ch);
  },
  drawCave(G, now){
    const ctx=this.ctx, cw=this.canvas.width, ch=this.canvas.height;
    const roomW=CW*TILE, roomH=CH*TILE;
    const camX=roomW>cw ? clamp(Math.round(G.player.x-cw/2), 0, roomW-cw) : Math.round((roomW-cw)/2);
    const camY=roomH>ch ? clamp(Math.round(G.player.y-ch/2), 0, roomH-ch) : Math.round((roomH-ch)/2);
    const lvl=G.caveLevel||1;
    const PAL=[null,
      {floor:['#5d5b68','#575562'], wall:'#3b3a45', walld:'#33323c', stone:'#45434f', mult:'#c0bacd', bg:'#16141c'},
      {floor:['#4e5266','#484c5f'], wall:'#343747', walld:'#2c2f3d', stone:'#3d4152', mult:'#a8b4cc', bg:'#101219'},
      {floor:['#635153','#5c4a4c'], wall:'#473839', walld:'#3c2f30', stone:'#544243', mult:'#ccab9e', bg:'#1a1214'}][lvl];
    ctx.fillStyle=PAL.bg; ctx.fillRect(0,0,cw,ch);
    // pre-generated floor tile variants (cached per level): tonal patches, pebbles, cracks
    if(!this._caveFloor) this._caveFloor={};
    if(!this._caveFloor[lvl]){
      const set=[];
      for(let v=0;v<5;v++){
        const rr=mulberry32(3100+lvl*100+v); const c=cv(TILE,TILE), x2=c.getContext('2d');
        x2.fillStyle=rr()<0.5?PAL.floor[0]:PAL.floor[1]; x2.fillRect(0,0,TILE,TILE);
        x2.globalAlpha=0.22; x2.fillStyle=PAL.stone;
        const bx=Math.floor(rr()*10), by=Math.floor(rr()*10);
        x2.fillRect(bx,by,5,3); x2.fillRect(bx+1,by+4,3,4);
        x2.globalAlpha=1;
        for(let k=0;k<3;k++){ if(rr()<0.7){ x2.fillStyle=PAL.wall; x2.fillRect(2+Math.floor(rr()*12),2+Math.floor(rr()*12),2,1); } }
        if(rr()<0.22){ x2.fillStyle=PAL.walld; const cx2=3+Math.floor(rr()*8), cy2=3+Math.floor(rr()*8);
          const form=Math.floor(rr()*3);
          if(form===0){ x2.fillRect(cx2,cy2,5,1); x2.fillRect(cx2,cy2+1,1,2); }
          else if(form===1){ x2.fillRect(cx2,cy2,1,5); x2.fillRect(cx2+1,cy2+4,3,1); }
          else { x2.fillRect(cx2,cy2,2,1); x2.fillRect(cx2+3,cy2+2,2,1); x2.fillRect(cx2+1,cy2+4,2,1); } }
        set.push(c);
      }
      this._caveFloor[lvl]=set;
    }
    const floorTiles=this._caveFloor[lvl];
    // stone floor + walls
    for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
      const dx=x*TILE-camX, dy=y*TILE-camY;
      const t=G.cave[y*CW+x];
      if(t===CT.WALL){
        ctx.fillStyle=PAL.wall; ctx.fillRect(dx,dy,TILE,TILE);
        if(hash2(x,y,90)>0.35){ ctx.fillStyle=PAL.stone; ctx.fillRect(dx,dy+3+Math.floor(hash2(x,y,91)*4),TILE,1); } // strata band
        if(hash2(x,y,92)>0.55){ ctx.fillStyle=PAL.walld; ctx.fillRect(dx,dy+8+Math.floor(hash2(x,y,93)*3),TILE,1); } // deeper seam
        ctx.fillStyle=PAL.walld; ctx.fillRect(dx,dy+11,TILE,5);
        if(hash2(x,y,77)>0.6){ ctx.fillStyle=PAL.stone; ctx.fillRect(dx+3+Math.floor(hash2(x,y,78)*8),dy+3+Math.floor(hash2(x,y,79)*5),3,2); }
        if(y+1<CH && G.cave[(y+1)*CW+x]!==CT.WALL){ // rim light on the floor-facing edge
          ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.fillRect(dx,dy+13,TILE,2);
        }
        if(lvl===2 && hash2(x,y,95)>0.7){ // frost crystals on deep-cold walls
          const tw=(Math.sin(now/400+x*7+y*3)+1)/2;
          ctx.fillStyle='#9fd4e8'; ctx.fillRect(dx+4,dy+3,2,5); ctx.fillRect(dx+8,dy+5,2,4);
          ctx.fillStyle=`rgba(240,250,255,${0.3+0.5*tw})`; ctx.fillRect(dx+4,dy+3,1,2); ctx.fillRect(dx+8,dy+5,1,2);
        }
      } else {
        ctx.drawImage(floorTiles[Math.floor(hash2(x,y,80)*floorTiles.length)],dx,dy);
        if(lvl===3 && hash2(x,y,96)>0.78){ // ember cracks in the warm deep
          const gl=(Math.sin(now/500+x*5+y)+1)/2;
          ctx.fillStyle=`rgba(232,134,45,${0.25+0.35*gl})`;
          ctx.fillRect(dx+2,dy+7,10,1); ctx.fillRect(dx+7,dy+3,1,6);
        }
        if(t===CT.STAIRS){
          ctx.fillStyle='#17151d'; ctx.fillRect(dx+2,dy+2,12,12);
          ctx.fillStyle=PAL.walld;
          for(let s2=0;s2<3;s2++) ctx.fillRect(dx+3+s2*2,dy+3+s2*4,8-s2*2,2);
        }
      }
    }
    // doorway glow (warm daylight spilling in)
    {
      const dx=6*TILE-camX, dy=(CH-1)*TILE-camY;
      ctx.fillStyle='#0d0b12'; ctx.fillRect(dx+2,dy+2,12,14);
      const grad=ctx.createRadialGradient(dx+8,dy+16,2,dx+8,dy+16,26);
      grad.addColorStop(0,'rgba(240,220,170,0.28)'); grad.addColorStop(1,'rgba(240,220,170,0)');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(dx+8,dy+16,26,0,7); ctx.fill();
    }
    // wall lanterns
    for(const lx of [2,10]){
      const dx=lx*TILE-camX, dy=-camY+3;
      ctx.drawImage(SPR.lantern,dx,dy);
      const glow=(Math.sin(now/800+lx*3)+1)/2;
      const grad=ctx.createRadialGradient(dx+8,dy+8,3,dx+8,dy+8,30+8*glow);
      grad.addColorStop(0,'rgba(233,196,106,0.30)'); grad.addColorStop(1,'rgba(233,196,106,0)');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(dx+8,dy+8,38,0,7); ctx.fill();
    }
    // ore nodes
    for(const n of G.nodes){
      const dx=n.x*TILE-camX, dy=n.y*TILE-camY;
      ctx.fillStyle='#6d6b78'; ctx.fillRect(dx+1,dy+4,14,11);
      ctx.fillStyle='#54525e'; ctx.fillRect(dx+1,dy+4,14,3); ctx.fillRect(dx+1,dy+4,3,11);
      ctx.fillStyle='#7d7b88'; ctx.fillRect(dx+3,dy+6,4,3);
      if(n.type==='pitstone'){
        ctx.fillStyle='#9aa3ad'; ctx.fillRect(dx+4,dy+10,2,2); ctx.fillRect(dx+9,dy+7,2,2); ctx.fillRect(dx+11,dy+11,2,2);
      } else if(n.type==='emberquartz'){
        ctx.fillStyle='#e8862d'; ctx.fillRect(dx+4,dy+2,3,6); ctx.fillRect(dx+9,dy+3,3,5);
        ctx.fillStyle='#f7c948'; ctx.fillRect(dx+5,dy+3,1,3); ctx.fillRect(dx+10,dy+4,1,3);
      } else { // moondrop
        const tw=(Math.sin(now/280+n.x*5)+1)/2;
        ctx.fillStyle='#bcd8e8'; ctx.fillRect(dx+5,dy+2,4,7); ctx.fillRect(dx+10,dy+4,3,5);
        ctx.fillStyle=`rgba(240,250,255,${0.4+0.5*tw})`;
        ctx.fillRect(dx+6,dy+3,1,2); ctx.fillRect(dx+11,dy+5,1,2);
      }
    }
    // player with a carried lamp light
    const p=G.player, fr=p.moving?Math.floor(now/180)%2:0;
    ctx.fillStyle='rgba(10,8,14,0.35)';
    ctx.beginPath(); ctx.ellipse(Math.round(p.x-camX), Math.round(p.y-camY+7), 6, 2.5, 0, 0, 7); ctx.fill();
    ctx.drawImage(SPR.player[p.dir][fr], Math.round(p.x-camX-9), Math.round(p.y-camY-13));
    // facing highlight
    {
      const tx=Math.floor(p.x/TILE + (p.dir==='right'?1:p.dir==='left'?-1:0));
      const ty=Math.floor(p.y/TILE + (p.dir==='down'?1:p.dir==='up'?-1:0));
      if(tx>=0&&ty>=0&&tx<CW&&ty<CH){
        ctx.strokeStyle='rgba(247,239,224,0.35)'; ctx.lineWidth=1;
        ctx.strokeRect(tx*TILE-camX+0.5, ty*TILE-camY+0.5, TILE-1, TILE-1);
      }
    }
    // dust motes in the lamp light
    for(let i=0;i<10;i++){
      const mx=(hash2(i,1,93)*roomW + Math.sin(now/1400+i*2)*10)-camX;
      const my=(hash2(i,2,94)*roomH + ((now/40+i*37)%40))-camY;
      ctx.fillStyle='rgba(220,210,190,0.25)'; ctx.fillRect(mx,my,1,1);
    }
    // darkness: cold multiply + heavy vignette + warm pool around the player
    ctx.globalCompositeOperation='multiply';
    ctx.fillStyle=PAL.mult; ctx.fillRect(0,0,cw,ch);
    ctx.globalCompositeOperation='source-over';
    const lamp=ctx.createRadialGradient(p.x-camX,p.y-camY,10,p.x-camX,p.y-camY,110);
    lamp.addColorStop(0,'rgba(255,214,150,0.16)'); lamp.addColorStop(1,'rgba(255,214,150,0)');
    ctx.fillStyle=lamp; ctx.beginPath(); ctx.arc(p.x-camX,p.y-camY,110,0,7); ctx.fill();
    const vg=ctx.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*0.3,cw/2,ch/2,Math.max(cw,ch)*0.7);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(8,6,14,0.55)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,cw,ch);
  }
};
function facingTile(p){
  const tx=Math.floor(p.x/TILE + (p.dir==='right'?1:p.dir==='left'?-1:0));
  const ty=Math.floor(p.y/TILE + (p.dir==='down'?1:p.dir==='up'?-1:0));
  if(tx<0||ty<0||tx>=W||ty>=H)return null;
  return {x:tx,y:ty};
}
function lightTint(min){
  // timeline of tint colors by hour
  const stops=[ [0,'#7d7dae'],[300,'#7d7dae'],[330,'#e8d0b8'],[420,'#ffefd4'],[720,'#ffffff'],[1020,'#ffeed6'],[1110,'#f0b890'],[1170,'#d89a80'],[1230,'#9890b8'],[1440,'#7d7dae'] ];
  let a=stops[0], b=stops[stops.length-1];
  for(let i=0;i<stops.length-1;i++){ if(min>=stops[i][0]&&min<=stops[i+1][0]){ a=stops[i]; b=stops[i+1]; break; } }
  const t=(min-a[0])/Math.max(1,(b[0]-a[0]));
  const ca=hex2rgb(a[1]), cb=hex2rgb(b[1]);
  const r=Math.round(lerp(ca[0],cb[0],t)), g=Math.round(lerp(ca[1],cb[1],t)), bl=Math.round(lerp(ca[2],cb[2],t));
  if(r===255&&g===255&&bl===255)return null;
  return `rgb(${r},${g},${bl})`;
}
function hex2rgb(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
