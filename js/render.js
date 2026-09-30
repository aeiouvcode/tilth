// TILTH renderer: integer-scaled pixel camera, y-sorted entities, light tint
'use strict';
const Render={
  canvas:null, ctx:null, scale:3, vw:0, vh:0,
  init(){
    this.canvas=document.getElementById('game');
    this.ctx=this.canvas.getContext('2d');
    this.resize(); addEventListener('resize',()=>this.resize(Game.G));
  },
  scaleForViewport(vw,vh,outdoors=true){
    // Portrait phones prioritize people over a 22-tile-wide overview. Keep
    // integer pixels and the wider view for short or very narrow screens.
    const phoneClose=outdoors&&vw>=360&&vw<=520&&vh>=640&&vh>vw;
    return clamp(Math.floor(Math.min(vw/(TILE*22), vh/(TILE*15))), phoneClose?3:2, 8);
  },
  resize(G){
    const vw=innerWidth, vh=innerHeight;
    this.scale=this.scaleForViewport(vw,vh,!(G&&(G.indoor||G.inCave)));
    this.canvas.width=Math.ceil(vw/this.scale); this.canvas.height=Math.ceil(vh/this.scale);
    this.canvas.style.width=(this.canvas.width*this.scale)+'px';
    this.canvas.style.height=(this.canvas.height*this.scale)+'px';
    this.ctx.imageSmoothingEnabled=false;
  },
  // A small enamel tag stays legible at the game's 2-3x mobile pixel scale.
  careBadge(ctx,x,y,trust,age,cared){
    const flash=Number.isFinite(age)&&age>=0&&age<1000, rise=flash?Math.round((1-age/1000)*3):0;
    const bx=Math.round(x)-8, by=Math.round(y)-rise;
    ctx.fillStyle=trust>=6?'#5d4632':'#594a42'; ctx.fillRect(bx-2,by-2,19,10);
    ctx.fillStyle=trust>=6?'#f3dfab':'#f3dfd0'; ctx.fillRect(bx-1,by-1,17,8);
    ctx.fillStyle=trust>=6?'#b78031':'#b96564';
    ctx.fillRect(bx+1,by+1,2,1); ctx.fillRect(bx+4,by+1,2,1);
    ctx.fillRect(bx+1,by+2,5,1); ctx.fillRect(bx+2,by+3,3,1); ctx.fillRect(bx+3,by+4,1,1);
    ctx.font='6px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillStyle='#4a3f2e'; ctx.fillText(String(Math.floor(trust/2)),bx+8,by+1);
    ctx.fillStyle=cared?'#63865a':'#ae7967';
    if(cared){ ctx.fillRect(bx+12,by+4,2,1); ctx.fillRect(bx+13,by+3,1,1); ctx.fillRect(bx+14,by+2,1,1); }
    else { ctx.fillRect(bx+13,by+1,1,3); ctx.fillRect(bx+13,by+5,1,1); }
  },
  // small contextual pill above the facing tile: what the current tool will do
  hintPill(G, ctx, cx, cy, below){
    const label=Game.interactHint(); if(!label)return;
    ctx.font='5px monospace';
    const w=Math.ceil(ctx.measureText(label).width)+6;
    const x=Math.round(clamp(cx-w/2, 2, this.canvas.width-w-2)), y=Math.round(below?cy+19:cy-11);
    if(y<2)return;
    ctx.fillStyle='rgba(46,38,26,0.85)';
    ctx.beginPath(); ctx.roundRect(x,y,w,8,2); ctx.fill();
    ctx.fillStyle='#f7efe0'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(label, x+3, y+4.5);
  },
  draw(G, now){
    if(this.scale!==this.scaleForViewport(innerWidth,innerHeight,!(G.indoor||G.inCave)))this.resize(G);
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
      if(G.seasonCached===3 && t===T.WATER){ // frozen over: pale wash + ice speckle
        ctx.fillStyle='rgba(214,232,244,0.45)'; ctx.fillRect(dx,dy,TILE,TILE);
        ctx.fillStyle='rgba(248,252,255,0.8)';
        for(let k=0;k<3;k++){ const hx=Math.floor(hash2(x*5+k,y*7+k,93)*13), hy=Math.floor(hash2(x*3+k,y*11+k,94)*15);
          ctx.fillRect(dx+hx,dy+hy,2,1); }
      }
      if(G.seasonCached===3 && t!==T.WATER && t!==T.GRASS){ // winter frost on dirt/stone: even wash + speckle
        ctx.fillStyle='rgba(232,240,248,0.30)'; ctx.fillRect(dx,dy,TILE,TILE);
        ctx.fillStyle='rgba(245,250,255,0.55)';
        for(let k=0;k<2;k++){ const hx=Math.floor(hash2(x*7+k,y*3+k,91)*14), hy=Math.floor(hash2(x*3,y*5+k,92)*14); ctx.fillRect(dx+hx,dy+hy,2,1); }
      }
      if(t===T.PATH && G.seasonCached!==3 && hash2(x,y,63)>0.72){ // wildflowers along the lane
        const FC=['#e8b7c2','#f0e2b8','#c9d4e8'];
        const fc=FC[Math.floor(hash2(x,y,64)*3)];
        const fx=Math.floor(hash2(x,y,65)*10)+3, fy=Math.floor(hash2(x,y,66)*10)+3;
        ctx.fillStyle='#678c48'; ctx.fillRect(dx+fx+1,dy+fy+2,1,2);
        ctx.fillStyle=fc; ctx.fillRect(dx+fx,dy+fy,3,1); ctx.fillRect(dx+fx+1,dy+fy-1,1,3);
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
    // The field gate is the handoff from work to the old road. Draw on empty
    // grass only so an older save's tilled edge or crop always wins.
    {
      const sx=21*TILE-camX, sy=11*TILE-camY, winter=G.seasonCached===3;
      ctx.fillStyle='#73543b';
      for(const px2 of [sx-7,sx+19]){
        ctx.fillRect(px2,sy-10,3,11); ctx.fillStyle='#a87c52'; ctx.fillRect(px2-1,sy-12,5,2); ctx.fillStyle='#73543b';
      }
      ctx.fillStyle=winter?'#f3f6f8':'#d9c596'; ctx.fillRect(sx-6,sy-12,4,1); ctx.fillRect(sx+18,sy-12,4,1);
      // Uneven stone footsteps point north, without painting over worked ground.
      for(let k=0;k<3;k++){
        const gx=21+(k%2), gy=8+k;
        if(G.grid[gy*W+gx]!==T.PATH) continue;
        const dx=gx*TILE-camX,dy=gy*TILE-camY;
        ctx.fillStyle=winter?'#aebcc5':'#a99779'; ctx.fillRect(dx+4,dy+11,6,2); ctx.fillRect(dx+7,dy+9,3,1);
      }
      // Planted verge gives the gate and cedar road a connected visual rhythm.
      for(let x=18;x<=34;x++){
        if(x===21||G.grid[10*W+x]!==T.GRASS) continue;
        const dx=x*TILE-camX,dy=10*TILE-camY;
        if(dx<-TILE||dx>cw+TILE) continue;
        ctx.fillStyle=winter?'#c5d2d9':G.seasonCached===2?'#9c8d60':'#587b48';
        ctx.fillRect(dx+4,dy+11,2,4);ctx.fillRect(dx+10,dy+9,2,6);
        ctx.fillRect(dx+2,dy+10,4,2);ctx.fillRect(dx+9,dy+9,5,2);
        if(!winter){ctx.fillStyle=x%3===0?'#eed79e':'#d8baba';ctx.fillRect(dx+3,dy+9,2,2);}
      }
    }
    // Cedarwalk: a path-side pause, with seasonal cloth and a weathered name board.
    // It is drawn in the world, not an interface badge.
    {
      const bx=28*TILE-camX, by=8*TILE-camY, winter=G.seasonCached===3;
      ctx.fillStyle='rgba(59,55,40,0.18)'; ctx.beginPath(); ctx.ellipse(bx+9,by+13,20,4,0,0,7); ctx.fill();
      ctx.fillStyle='#755437'; ctx.fillRect(bx+5,by+4,2,12); ctx.fillRect(bx+25,by+4,2,12);
      ctx.fillStyle='#a87c52'; ctx.fillRect(bx+2,by+3,29,5);
      ctx.fillStyle='#c09468'; ctx.fillRect(bx+3,by+4,27,1);
      ctx.fillStyle='#6e4f38'; ctx.fillRect(bx+7,by+11,2,4); ctx.fillRect(bx+23,by+11,2,4);
      ctx.fillStyle=winter?'#e5e8df':G.seasonCached===2?'#bd8f54':'#d9bc83';
      ctx.fillRect(bx+18,by+5,7,2);
      if(winter){ ctx.fillStyle='#f7fafc'; ctx.fillRect(bx+2,by+2,10,1); ctx.fillRect(bx+20,by+2,11,1); }
      if(G.gateWelcomeDay>0&&G.day>G.gateWelcomeDay){
        // An object from the second meeting changes the road without a checklist icon.
        ctx.fillStyle='#5e4535';ctx.fillRect(bx+11,by+1,8,1);
        ctx.fillStyle=winter?'#aab9c0':'#e8dbc3';ctx.fillRect(bx+12,by-4,6,5);
        ctx.fillStyle='#b47859';ctx.fillRect(bx+12,by-4,6,1);
        ctx.fillStyle='#eadfcb';ctx.fillRect(bx+18,by-3,2,2);ctx.fillRect(bx+20,by-2,1,2);
      }
      // The lettered board faces a traveler approaching from the farm.
      ctx.fillStyle='#704a31'; ctx.fillRect(bx+11,by-6,2,13); ctx.fillRect(bx+9,by-10,20,8);
      ctx.fillStyle='#c9a579'; ctx.fillRect(bx+10,by-9,18,6);
      ctx.fillStyle='#5d4632'; ctx.fillRect(bx+12,by-7,2,2); ctx.fillRect(bx+16,by-7,8,1);
      ctx.fillStyle=G.seasonCached===2?'#bc713b':winter?'#f2f5f7':'#6d8c54';
      ctx.fillRect(bx+15,by-11,4,2); ctx.fillRect(bx+14,by-12,2,2);
    }
    // A lasting, non-economic choice changes the whole roadside border.
    if(G.roadChoice){
      for(let x=23;x<=34;x++){
        if(x===28||x===31||G.grid[9*W+x]!==T.GRASS)continue;
        const dx=x*TILE-camX,dy=9*TILE-camY;
        if(dx<-TILE||dx>cw+TILE)continue;
        if(G.roadChoice==='flowers'){
          // Hand-planted clusters break the picket-line repetition. Seeded shape, no flicker.
          const patch=hash2(x,9,141);
          if(patch<0.16)continue;
          ctx.fillStyle=G.seasonCached===3?'#99a9b0':'#776349';ctx.fillRect(dx+2,dy+11,11,2);
          for(let k=0;k<(patch>0.7?3:2);k++){
            const px=dx+3+k*4+Math.floor(hash2(x,k,142)*3),py=dy+7+Math.floor(hash2(x,k,143)*3);
            ctx.fillStyle=G.seasonCached===3?'#d5e1e6':G.seasonCached===2?'#a07b58':'#557747';ctx.fillRect(px,py,1,4);
            if(G.seasonCached!==3){ctx.fillStyle=(x+k)%3?'#e8b7c2':'#e9d6a7';ctx.fillRect(px-1,py-2,3,2);ctx.fillRect(px,py-3,1,1);}
          }
        } else {
          ctx.fillStyle=G.seasonCached===3?'#cbd5d8':G.seasonCached===2?'#a69657':'#678a54';
          for(let k=0;k<2+Math.floor(hash2(x,9,144)*3);k++){
            const px=dx+2+k*4,py=dy+8+Math.floor(hash2(x,k,145)*3);
            ctx.fillRect(px,py,1,5);ctx.fillRect(px-1,py+1,3,1);
          }
        }
      }
    }
    // A broad sheltered community table faces the ordinary road from the
    // farm. It is scenery over clear ground, not a collision or resource tile.
    if(G.day>=8 && [17,18,19,20].every(x=>[6,7].every(y=>
      (G.grid[y*W+x]===T.GRASS||G.grid[y*W+x]===T.PATH)&&!G.crops.has(y*W+x)))){
      const tx=17*TILE-camX,ty=6*TILE-camY, winter=G.seasonCached===3;
      if(tx>-5*TILE&&tx<cw+TILE&&ty>-4*TILE&&ty<ch+TILE){
        ctx.fillStyle='rgba(56,48,36,0.18)';ctx.fillRect(tx+2,ty+20,61,17);
        ctx.fillStyle='#584333';ctx.fillRect(tx+4,ty-16,4,44);ctx.fillRect(tx+59,ty-16,4,44);
        ctx.fillStyle='#a97754';ctx.fillRect(tx+2,ty-20,64,8);
        ctx.fillStyle=winter?'#ddd0bf':'#d3b188';ctx.fillRect(tx+4,ty-19,60,3);
        ctx.fillStyle='#604735';ctx.fillRect(tx+9,ty-11,48,30);
        ctx.fillStyle='#b78c60';ctx.fillRect(tx+12,ty-8,42,24);
        const pages=Math.min(3,(G.tableWeeks||[]).length);
        for(let i=0;i<3;i++){
          const x=tx+15+i*13,y=ty-5+(i%2);
          ctx.fillStyle=i<pages?'#f0e4c9':'#d9c7aa';ctx.fillRect(x,y,11,17);
          ctx.fillStyle='#a57351';ctx.fillRect(x+5,y-2,2,3);
          if(i<pages){
            // Each weekly page has a different subject at phone scale: gate,
            // pond, then cedar. The written branch has varied line lengths.
            if(G.commonTable==='sketches'){
              ctx.fillStyle='#577961';
              if(i===0){ // the open field gate
                ctx.fillRect(x+2,y+4,2,9);ctx.fillRect(x+8,y+4,2,9);
                ctx.fillRect(x+2,y+4,8,2);ctx.fillRect(x+4,y+10,5,1);
              }else if(i===1){ // Bram's pond
                ctx.fillStyle='#7299a0';ctx.fillRect(x+1,y+8,9,4);
                ctx.fillStyle='#416e75';ctx.fillRect(x+3,y+9,4,1);
                ctx.fillStyle='#7c8b57';ctx.fillRect(x+2,y+4,1,5);ctx.fillRect(x+8,y+5,1,4);
              }else{ // a cedar beside the road
                ctx.fillStyle='#5a7950';ctx.fillRect(x+4,y+3,4,3);
                ctx.fillRect(x+2,y+5,8,4);ctx.fillRect(x+3,y+8,6,2);
                ctx.fillStyle='#735944';ctx.fillRect(x+5,y+10,2,3);
              }
            }else{
              ctx.fillStyle='#775a43';
              const widths=[[8,5,7,4],[6,8,4,7],[7,3,8,5]][i];
              for(let line=0;line<4;line++)ctx.fillRect(x+2,y+3+line*3,widths[line],1);
              ctx.fillStyle='#a47353';ctx.fillRect(x+7,y+14,2,1);
            }
          }
        }
        // Cloth tabs stay on the roof through later seasons. Large enough to
        // recognize at phone width, yet clear of every drawing and crop tile.
        if(pages===3)for(const season of (G.tableSeasons||[])){
          const mx=tx+7+season*13,my=ty-20;
          ctx.fillStyle='#584333';ctx.fillRect(mx-1,my-2,12,11);
          ctx.fillStyle=['#9cbe87','#d5af64','#ad7355','#b6d2db'][season];ctx.fillRect(mx,my,10,8);
          ctx.fillStyle='#efe3c8';
          if(season===0){ctx.fillRect(mx+4,my+2,2,4);ctx.fillRect(mx+2,my+4,6,1);}
          else if(season===1){ctx.fillRect(mx+3,my+2,4,4);ctx.fillRect(mx+4,my+1,2,6);}
          else if(season===2){ctx.fillRect(mx+2,my+3,6,2);ctx.fillRect(mx+6,my+2,2,4);}
          else{ctx.fillRect(mx+4,my+1,2,6);ctx.fillRect(mx+2,my+3,6,2);}
        }
        ctx.fillStyle='#76543b';ctx.fillRect(tx+10,ty+24,48,8);
        ctx.fillStyle='#d5ad7c';ctx.fillRect(tx+12,ty+24,44,3);
        ctx.fillStyle='#614b3b';ctx.fillRect(tx+13,ty+32,3,7);ctx.fillRect(tx+52,ty+32,3,7);
      }
    }
    // The entry route carries Fern's folded note on the inside gate post.
    // It is scenery over the post, never a replacement for worked ground.
    if(G.day>=2&&!G.meadowLesson){
      const nx=21*TILE-camX, ny=11*TILE-camY;
      if(nx>-TILE&&nx<cw+TILE&&ny>-TILE&&ny<ch+TILE){
        ctx.fillStyle='#70503c';ctx.fillRect(nx-12,ny-29,15,14);
        ctx.fillStyle='#e7d7ae';ctx.fillRect(nx-11,ny-29,13,11);
        ctx.fillStyle='#c5ad7a';ctx.fillRect(nx-9,ny-26,9,1);ctx.fillRect(nx-9,ny-23,7,1);
        ctx.fillStyle='#608069';ctx.fillRect(nx-9,ny-21,4,1);
        ctx.fillStyle='#a87550';ctx.fillRect(nx-12,ny-29,2,2);
      }
    }
    // Fern's field lesson: the whole clearing changes after the player's answer.
    // Scattered furniture sits only on clear grass, never on worked ground.
    if(G.day>=2){
      const winter=G.seasonCached===3, chosen=!!G.meadowLesson;
      const free=(x,y)=>G.grid[y*W+x]===T.GRASS&&!G.crops.has(y*W+x);
      const tile=(x,y,paint)=>{if(!free(x,y))return;const dx=x*TILE-camX,dy=y*TILE-camY;
        if(dx<-TILE||dx>cw+TILE||dy<-TILE||dy>ch+TILE)return;paint(dx,dy);};
      // A winding low verge encloses the teaching area without gating travel.
      for(const [x,y] of [[10,15],[11,15],[12,15],[13,15],[14,15],[15,16],[15,17],[14,19],[13,19],[12,19],[11,19],[10,18]]){
        tile(x,y,(dx,dy)=>{const k=hash2(x,y,221);
          ctx.fillStyle=winter?'#acb9bf':'#718c59';ctx.fillRect(dx+3+Math.floor(k*5),dy+8,1,6);ctx.fillRect(dx+9,dy+6,1,7);
          ctx.fillStyle=winter?'#e7ebeb':G.seasonCached===2?'#c89b72':'#dfd1ac';ctx.fillRect(dx+8,dy+5,3,2);
        });
      }
      for(const [x,y] of [[10,17],[11,18],[13,18],[15,18]]) tile(x,y,(dx,dy)=>{
        ctx.fillStyle=winter?'#c4cdd0':'#b29d7b';ctx.fillRect(dx+3,dy+10,9,3);ctx.fillStyle='#d8c7a6';ctx.fillRect(dx+4,dy+10,7,1);
      });
      // The player's decision is a legible 4-tile-wide structure at phone scale.
      const canopyClear=[11,12,13,14].every(x=>[16,17].every(y=>free(x,y)));
      if(chosen && G.meadowLesson==='shade' && canopyClear){
        for(let x=11;x<=14;x++)for(let y=16;y<=17;y++)tile(x,y,(dx,dy)=>{
          ctx.fillStyle='rgba(50,61,42,0.15)';ctx.fillRect(dx,dy,TILE,TILE);
        });
        for(const x of [11,14])tile(x,16,(dx,dy)=>{ctx.fillStyle='#684a36';ctx.fillRect(dx+3,dy-10,2,29);ctx.fillRect(dx+2,dy+16,5,2);});
        const dx=11*TILE-camX,dy=16*TILE-camY;
        if(dx>-5*TILE&&dx<cw+TILE&&dy>-5*TILE&&dy<ch+TILE){
          ctx.fillStyle='#6c5543';ctx.fillRect(dx+2,dy-17,64,3);
          ctx.fillStyle=winter?'#c8b9a1':'#c69b70';ctx.fillRect(dx+3,dy-14,62,8);
          ctx.fillStyle=winter?'#ddcfb8':'#e7c69b';ctx.fillRect(dx+3,dy-13,62,3);
          ctx.fillStyle='#9f775d';for(let k=0;k<4;k++)ctx.fillRect(dx+4+k*16,dy-6,14,2);
        }
      } else if(chosen && G.meadowLesson==='sky'){
        for(const [x,y] of [[11,16],[14,16],[11,18],[14,18]])tile(x,y,(dx,dy)=>{
          ctx.fillStyle='#6f513a';ctx.fillRect(dx+3,dy+8,11,2);ctx.fillRect(dx+4,dy+10,1,5);ctx.fillRect(dx+12,dy+10,1,5);
          ctx.fillStyle='#b68e61';ctx.fillRect(dx+4,dy+8,9,1);
        });
      } else if(!chosen){
        // Stakes and a rolled cloth make the day-two proposal visible before speaking.
        for(const [x,y] of [[11,16],[14,16],[11,18],[14,18]])tile(x,y,(dx,dy)=>{
          ctx.fillStyle='#6f513a';ctx.fillRect(dx+7,dy+5,2,11);
          ctx.fillStyle='#e0c9a1';ctx.fillRect(dx+6,dy+5,4,2);
        });
      }
      // Mara's broad open field folio sits to the west of Fern's table.
      // It yields to worked tiles rather than covering farm work.
      const activeReturn=G.fieldPlan&&G.seasonCached>0&&G.seasonCached<4&&
        ((G.day-1)%7)>=1&&((G.day-1)%7)<=3&&G.minutes>=600&&G.minutes<900;
      if(activeReturn && [[10,16],[10,17],[10,18],[11,16],[11,17],[11,18]].every(([x,y])=>free(x,y))){
        const dx=10*TILE-camX,dy=16*TILE-camY;
        if(dx>-2*TILE&&dx<cw+TILE&&dy>-4*TILE&&dy<ch+TILE){
          ctx.fillStyle='rgba(61,52,40,0.18)';ctx.fillRect(dx+3,dy+10,25,35);
          ctx.fillStyle=G.seasonCached===3?'#c8b8a0':G.seasonCached===2?'#b87f59':'#c69876';ctx.fillRect(dx+4,dy+9,22,34);
          ctx.fillStyle=G.seasonCached===3?'#eee7d6':'#e9d9b9';ctx.fillRect(dx+5,dy+10,20,31);
          ctx.fillStyle=G.seasonCached===3?'#73919b':G.seasonCached===2?'#a06d4b':'#678352';
          for(let k=0;k<3;k++){ctx.fillRect(dx+8+k*4,dy+15+k*6,7,2);ctx.fillRect(dx+10+k*4,dy+12+k*6,2,4);}
          ctx.fillStyle='#684f3d';ctx.fillRect(dx+4,dy+38,22,2);
          ctx.fillRect(dx+5,dy+40,2,6);ctx.fillRect(dx+23,dy+40,2,6);
        }
      }
      // Their seasonal return is visible from the path: a long paper chain
      // suspended behind the table. It folds away if the player tills the area.
      const gathering=G.fieldPlan&&G.seasonCached>0&&G.seasonCached<4&&
        ((G.day-1)%7)>=1&&((G.day-1)%7)<=3&&G.minutes>=600&&G.minutes<900;
      if(gathering && [12,13,14].every(x=>free(x,17))){
        const dx=12*TILE-camX,dy=17*TILE-camY;
        if(dx>-4*TILE&&dx<cw+TILE&&dy>-2*TILE&&dy<ch+TILE){
          const paper=G.seasonCached===3?'#ece8d8':G.seasonCached===2?'#e0bf8b':'#e5d2ac';
          ctx.fillStyle='#66503d';ctx.fillRect(dx+1,dy-13,46,1);
          for(let k=0;k<5;k++){
            const x=dx+3+k*9,y=dy-12+(k%2);
            ctx.fillStyle=paper;ctx.fillRect(x,y,7,10);
            ctx.fillStyle=G.seasonCached===3?'#8b9eaa':G.seasonCached===2?'#a06e4d':'#64815b';
            ctx.fillRect(x+2,y+3,3,1);ctx.fillRect(x+3,y+5,2,2);
            ctx.fillStyle='#b08761';ctx.fillRect(x+3,y-1,1,2);
          }
        }
      }
      // Fern's wide drawing table and paper remain in both versions.
      tile(12,17,(dx,dy)=>{
        ctx.fillStyle='rgba(58,54,39,0.25)';ctx.fillRect(dx-4,dy+12,39,5);
        ctx.fillStyle='#76543b';ctx.fillRect(dx-3,dy+6,37,8);ctx.fillRect(dx,dy+14,3,5);ctx.fillRect(dx+28,dy+14,3,5);
        ctx.fillStyle='#bc9466';ctx.fillRect(dx-2,dy+6,35,3);
        ctx.fillStyle='#f0e6ce';ctx.fillRect(dx+3,dy+2,14,9);ctx.fillRect(dx+18,dy+3,10,7);
        ctx.fillStyle='#5a7751';ctx.fillRect(dx+7,dy+5,3,2);ctx.fillRect(dx+20,dy+6,4,1);
        ctx.fillStyle='#8d6244';ctx.fillRect(dx+15,dy+2,2,8);
      });
    }
    // A second decision takes the lesson into the neighboring meadow.
    // No collision changes: the drawn route or nesting strip yields to worked soil.
    if(G.fieldPlan){
      const free=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&G.grid[y*W+x]===T.GRASS&&!G.crops.has(y*W+x);
      const mature=G.fieldPlanDay>0&&G.day>G.fieldPlanDay;
      if(G.fieldPlan==='walk'){
        for(const [x,y] of [[14,18],[15,18],[15,19],[16,19],[16,20],[17,20],[18,20],[18,21],[19,21],[20,21]]){
          if(!free(x,y))continue;
          const dx=x*TILE-camX,dy=y*TILE-camY;if(dx<-TILE||dx>cw+TILE||dy<-TILE||dy>ch+TILE)continue;
          const j=Math.floor(hash2(x,y,231)*3);
          ctx.fillStyle=G.seasonCached===3?'#afbdc4':'#a58b67';ctx.fillRect(dx+1+j,dy+9,12,5);
          ctx.fillStyle=G.seasonCached===3?'#d4dfe2':'#c9b18b';ctx.fillRect(dx+2+j,dy+9,8,1);
          ctx.fillStyle=G.seasonCached===3?'#c5d2d8':'#768f5d';ctx.fillRect(dx+1,dy+7,2,3);ctx.fillRect(dx+13,dy+12,2,3);
          if(mature){ctx.fillStyle=G.seasonCached===3?'#e3edf0':'#e6e0c8';ctx.fillRect(dx+12,dy+6,2,2);}
        }
      }else{
        for(let x=11;x<=20;x++)for(let y=19;y<=21;y++){
          const edge=hash2(x,y,234);if(edge<0.18 || (y===19 && edge<0.43))continue;
          if(!free(x,y))continue;const dx=x*TILE-camX,dy=y*TILE-camY;
          if(dx<-TILE||dx>cw+TILE||dy<-TILE||dy>ch+TILE)continue;
          for(let k=0;k<(edge>0.7?3:2);k++){
            const sx=dx+2+k*5+Math.floor(hash2(x,y+k,232)*3),h=5+Math.floor(hash2(x+k,y,233)*6);
            ctx.fillStyle=G.seasonCached===3?'#a9b9be':G.seasonCached===2?'#aa9568':'#648458';ctx.fillRect(sx,dy+14-h,1,h);
            if(G.seasonCached!==3) {ctx.fillStyle='#e5d4aa';ctx.fillRect(sx-1,dy+12-h,3,2);}
          }
        }
        if(mature&&G.seasonCached!==3){
          for(const [x,y] of [[12,20],[17,20],[19,21]]){
            if(!free(x,y))continue;const dx=x*TILE-camX,dy=y*TILE-camY;
            ctx.fillStyle='#504d41';ctx.fillRect(dx+4,dy+4,5,2);ctx.fillRect(dx+5,dy+2,1,2);
            ctx.fillStyle='#d3ae72';ctx.fillRect(dx+9,dy+4,2,1);
          }
        }
      }
    }
    // The field has a separate, once-per-season day beyond the table.
    // It occurs only on the clear edge. A worked tile removes its drawing,
    // never the crop or the walking route.
    if(Game.fieldSeasonDay()){
      const free=(x,y)=>G.grid[y*W+x]===T.GRASS&&!G.crops.has(y*W+x);
      const sx=14*TILE-camX,sy=19*TILE-camY,winter=G.seasonCached===3;
      if(sx>-6*TILE&&sx<cw+4*TILE&&sy>-5*TILE&&sy<ch+3*TILE){
        const display=[[14,18],[15,18],[16,18],[14,19],[15,19],[16,19],[14,20],[15,20],[16,20]].every(([x,y])=>free(x,y));
        if(display){
          ctx.fillStyle='rgba(58,47,38,0.18)';ctx.fillRect(sx+2,sy+24,45,9);
          ctx.fillStyle=winter?'#c4bcb0':G.seasonCached===2?'#a47655':'#b98a64';ctx.fillRect(sx+1,sy+15,47,12);
          ctx.fillStyle=winter?'#e5ded0':G.seasonCached===2?'#d6b487':'#e0c89e';ctx.fillRect(sx+2,sy+15,45,9);
          ctx.fillStyle='#704f39';ctx.fillRect(sx+4,sy+27,3,8);ctx.fillRect(sx+42,sy+27,3,8);
          // Three broad panels are visible at the phone camera's 2-3x scale.
          for(let i=0;i<3;i++){
            const x=sx+5+i*14;
            ctx.fillStyle='#f0e6ce';ctx.fillRect(x,sy+17,11,7);
            ctx.fillStyle=winter?'#79919b':G.seasonCached===2?'#a57951':'#6b875d';
            ctx.fillRect(x+2,sy+20,7,2);ctx.fillRect(x+5,sy+18,2,5);
          }
          ctx.fillStyle='#80654a';ctx.fillRect(sx+9,sy+12,2,4);ctx.fillRect(sx+37,sy+12,2,4);
          ctx.fillStyle='#ecdabb';ctx.fillRect(sx+10,sy+12,28,2);
        }
      }
    }
    // The north-shore lookout is built into the walkable bank, never the water.
    // A first catch gives the player a say in the bank's future.
    {
      const winter=G.seasonCached===3, shoreX=11*TILE-camX, shoreY=22*TILE-camY;
      // Low curved shore edging, drawn only on untouched grass. The water remains castable.
      for(let x=7;x<=15;x++){
        if(G.grid[22*W+x]!==T.GRASS||G.crops.has(22*W+x))continue;
        const dx=x*TILE-camX,dy=shoreY;
        if(dx<-TILE||dx>cw+TILE)continue;
        const fringe=hash2(x,22,192);
        ctx.fillStyle=winter?'#bac9d0':'#557d53';
        for(let k=0;k<2;k++){
          const sx=dx+2+Math.floor(hash2(x,k,193)*11), sy=dy+9+Math.floor(hash2(x,k,194)*4);
          ctx.fillRect(sx,sy,1,3);ctx.fillRect(sx-1,sy+1,3,1);
        }
        if(fringe>0.55){ctx.fillStyle=winter?'#b5c2cc':'#826f59';ctx.fillRect(dx+4,dy+13,5,2);}
      }
      // An uneven footpath links the farm lane to the north bank without
      // turning any player-worked ground into a permanent path tile.
      const approach=[];
      for(let y=13;y<=20;y++)approach.push([14-Math.floor((y-13)/3),y]);
      for(const x of [12,11])approach.push([x,21]);
      for(const [x,y] of approach){
        if(G.grid[y*W+x]!==T.GRASS||G.crops.has(y*W+x))continue;
        const dx=x*TILE-camX,dy=y*TILE-camY;
        if(dx<-TILE||dx>cw+TILE||dy<-TILE||dy>ch+TILE)continue;
        const j=Math.floor(hash2(x,y,197)*3);
        ctx.fillStyle='rgba(56,59,43,0.13)';ctx.fillRect(dx+2+j,dy+12,11,2);
        ctx.fillStyle=winter?'#bac6c8':'#978a70';ctx.fillRect(dx+3+j,dy+8,8,3);
        ctx.fillStyle=winter?'#d9e0e0':'#b7aa8c';ctx.fillRect(dx+4+j,dy+8,5,1);
        ctx.fillStyle=winter?'#9faeb4':'#698354';ctx.fillRect(dx+12,dy+7,1,5);
      }
      // A single weathered platform and notch post give the discovery a silhouette.
      if(G.grid[22*W+11]===T.GRASS&&!G.crops.has(22*W+11)){
        ctx.fillStyle='rgba(52,67,47,0.19)';ctx.fillRect(shoreX-7,shoreY+12,32,4);
        ctx.fillStyle='#73543c';ctx.fillRect(shoreX-5,shoreY+7,31,7);
        ctx.fillStyle='#ac815b';for(let k=0;k<3;k++)ctx.fillRect(shoreX-4,shoreY+8+k*2,28,1);
        ctx.fillStyle='#684a36';ctx.fillRect(shoreX-4,shoreY+12,3,5);ctx.fillRect(shoreX+22,shoreY+12,3,5);
        ctx.fillStyle='#74533b';ctx.fillRect(shoreX+20,shoreY-8,3,20);
        ctx.fillStyle='#c49d70';ctx.fillRect(shoreX+18,shoreY-9,7,3);
        ctx.fillStyle='#513f33';ctx.fillRect(shoreX+21,shoreY-5,2,1);ctx.fillRect(shoreX+21,shoreY-2,2,1);
      }
      if(G.pondChoice==='reeds'){
        for(let x=7;x<=15;x++){
          if(G.grid[22*W+x]!==T.GRASS||G.crops.has(22*W+x)||x===11)continue;
          const dx=x*TILE-camX;
          if(dx<-TILE||dx>cw+TILE)continue;
          for(let k=0;k<3;k++){
            const sx=dx+2+k*5+Math.floor(hash2(x,k,195)*2), h=7+Math.floor(hash2(x,k,196)*5);
            ctx.fillStyle=winter?'#a9b9bd':'#617851';ctx.fillRect(sx,shoreY+13-h,1,h);
            ctx.fillStyle=winter?'#889aa1':'#806442';ctx.fillRect(sx,shoreY+11-h,2,3);
          }
        }
        // A small flock returns only after the bank has had a day to settle.
        if(G.pondChoiceDay>0&&G.day>G.pondChoiceDay&&G.seasonCached!==3){
          for(let k=0;k<3;k++){
            const dx=(7+k*3)*TILE-camX,dy=22*TILE-camY;
            ctx.fillStyle='#514b3d';ctx.fillRect(dx+5,dy+5,3,2);ctx.fillRect(dx+6,dy+3,1,2);
            ctx.fillStyle='#caa867';ctx.fillRect(dx+8,dy+5,2,1);
            ctx.fillStyle='#383d32';ctx.fillRect(dx+6,dy+4,1,1);
          }
        }
      }else if(G.pondChoice==='open'){
        for(let x=7;x<=15;x++){
          if(G.grid[22*W+x]!==T.GRASS||G.crops.has(22*W+x)||x===11)continue;
          const dx=x*TILE-camX;if(dx<-TILE||dx>cw+TILE)continue;
          ctx.fillStyle=winter?'#a8b8be':'#927b5b';ctx.fillRect(dx+2,shoreY+12,10,2);
          ctx.fillStyle=winter?'#d6e0e5':'#cbb084';ctx.fillRect(dx+3,shoreY+11,8,1);
        }
        if(G.pondChoiceDay>0&&G.day>G.pondChoiceDay){
          // The unobstructed low light crosses the water in broken strips.
          ctx.fillStyle=winter?'rgba(239,247,249,0.65)':'rgba(239,214,157,0.65)';
          for(let k=0;k<9;k++){
            const sy=(24+k)*TILE-camY, sx=(10+(k%3))*TILE-camX;
            ctx.fillRect(sx+2+(k%2)*3,sy+9,8+(k%3)*3,1);
          }
        }
      }
    }
    // A line of planted herbs and low stones follows the eastbound road.
    for(let x=23;x<=37;x++){
      if(x===28||x===31||x===36) continue;
      const sx=x*TILE-camX, sy=7*TILE-camY;
      if(sx<-TILE||sx>cw+TILE) continue;
      const leaf=G.seasonCached===3?'#c1cbd3':G.seasonCached===2?'#9a7743':'#547c4d';
      ctx.fillStyle='#857c69'; ctx.fillRect(sx+3,sy+13,5,2);
      ctx.fillStyle=leaf; ctx.fillRect(sx+9,sy+10,2,5); ctx.fillRect(sx+7,sy+11,3,2); ctx.fillRect(sx+11,sy+9,3,2);
      if(G.seasonCached!==3){
        ctx.fillStyle=G.seasonCached===2?'#bd9154':'#f0e2b8'; ctx.fillRect(sx+8,sy+9,2,2);
      }
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
      else if(t===T.WELL) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.well, x*TILE-camX-4, y*TILE-camY-8);
        if(Game.isFair()){ // harvest fair decorations around the well
          const pumpkin=(px2,py2,s)=>{ ctx.fillStyle='#d97c2e'; ctx.beginPath(); ctx.ellipse(px2,py2,5*s,4*s,0,0,7); ctx.fill();
            ctx.fillStyle='#b8621f'; ctx.fillRect(px2-1,py2-4*s,2,8*s); ctx.fillRect(px2-3*s,py2-3*s,1,6*s); ctx.fillRect(px2+2*s,py2-3*s,1,6*s);
            ctx.fillStyle='#678c48'; ctx.fillRect(px2-1,py2-5*s,2,2); };
          pumpkin(x*TILE-camX-2.5*TILE, y*TILE-camY-1.2*TILE, 1);
          pumpkin(x*TILE-camX+2.6*TILE, y*TILE-camY+1.4*TILE, 1.2);
          pumpkin(x*TILE-camX-2.1*TILE, y*TILE-camY+1.8*TILE, 0.8);
          // hay bale
          ctx.fillStyle='#d9b45c'; ctx.fillRect(x*TILE-camX+1.8*TILE, y*TILE-camY-1.6*TILE, 14, 9);
          ctx.fillStyle='#b8933f'; ctx.fillRect(x*TILE-camX+1.8*TILE, y*TILE-camY-1.6*TILE+3, 14, 1); ctx.fillRect(x*TILE-camX+1.8*TILE, y*TILE-camY-1.6*TILE+6, 14, 1);
          ctx.fillStyle='#e8cd7e'; ctx.fillRect(x*TILE-camX+1.8*TILE+2, y*TILE-camY-1.6*TILE+1, 3, 1);
          // the judging table: piet's old barn door on legs, autumn cloth
          const tx2=x*TILE-camX-2.6*TILE, ty2=y*TILE-camY+1.15*TILE;
          ctx.fillStyle='rgba(50,60,40,0.14)'; ctx.beginPath(); ctx.ellipse(tx2+14, ty2+13, 14, 2.5, 0, 0, 7); ctx.fill();
          ctx.fillStyle='#5a3d28'; ctx.fillRect(tx2+1,ty2+4,2,9); ctx.fillRect(tx2+25,ty2+4,2,9);
          ctx.fillStyle='#8a6a42'; ctx.fillRect(tx2,ty2,28,6);
          ctx.fillStyle='#b8574a'; ctx.fillRect(tx2+3,ty2+2,22,3);
          ctx.fillStyle='#e9c46a'; ctx.fillRect(tx2+5,ty2+1,3,4); ctx.fillRect(tx2+11,ty2+1,3,4); ctx.fillRect(tx2+17,ty2+1,3,4); // entered produce glints
        }
      }});
      else if(t===T.CAVEENT) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.caveent, x*TILE-camX, y*TILE-camY); }});
      else if(t===T.BARN && G.grid[y*W+x-1]!==T.BARN && (y===0||G.grid[(y-1)*W+x]!==T.BARN)){
        ents.push({y:y*TILE+42, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.13)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+24, y*TILE-camY+40, 28, 4, 0, 0, 7); ctx.fill(); ctx.drawImage(SPR.barn, x*TILE-camX-2, y*TILE-camY-10); }});
      }
      else if(t===T.COOP && G.grid[y*W+x-1]!==T.COOP && (y===0||G.grid[(y-1)*W+x]!==T.COOP)){
        ents.push({y:y*TILE+42, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.13)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+18, y*TILE-camY+40, 20, 3.5, 0, 0, 7); ctx.fill(); ctx.drawImage(SPR.coop, x*TILE-camX-2, y*TILE-camY-10); }});
      }
      else if(t===T.MAILBOX) ents.push({y:y*TILE+16, draw:()=>{ ctx.drawImage(SPR.mailbox, x*TILE-camX, y*TILE-camY);
        if(G.letters&&G.letters.some(l=>!l.read)){ const tw=Math.sin(now/300)>0; if(tw){ ctx.fillStyle='#e9c46a'; ctx.fillRect(x*TILE-camX+12, y*TILE-camY+1, 3, 3); } } }});
      else if(t===T.STAND && G.grid[y*W+x-1]!==T.STAND && (y===0||G.grid[(y-1)*W+x]!==T.STAND)){
        ents.push({y:y*TILE+34, draw:()=>{ // pennant string, swaying gently - drawn after passers-by
          const sway=Math.sin(now/900)*1.5;
          ctx.strokeStyle='#8a6a42'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(x*TILE-camX+1,y*TILE-camY-10); ctx.quadraticCurveTo(x*TILE-camX+16,y*TILE-camY-6+sway,x*TILE-camX+31,y*TILE-camY-10); ctx.stroke();
          const flagC=['#c9452e','#d9a441','#7a9e5f','#8a6ea8'];
          for(let fi=0;fi<4;fi++){
            const fx2=x*TILE-camX+4+fi*7, fy2=y*TILE-camY-8+Math.sin(now/900+fi)*1.2;
            ctx.fillStyle=flagC[fi]; ctx.beginPath(); ctx.moveTo(fx2,fy2); ctx.lineTo(fx2+6,fy2); ctx.lineTo(fx2+3,fy2+6); ctx.closePath(); ctx.fill();
          }
        }});
        ents.push({y:y*TILE+32, draw:()=>{ ctx.drawImage(SPR.stand,x*TILE-camX,y*TILE-camY); ctx.fillStyle='rgba(60,60,40,0.18)'; ctx.beginPath(); ctx.ellipse(x*TILE-camX+19, y*TILE-camY+3, 6, 2.5, 0, 0, 7); ctx.fill();
          ctx.drawImage(SPR.npc, x*TILE-camX+9, y*TILE-camY-13); }});
      }
    }
    if(Game.solsticeEvening()){
      // cedar-log fire, depth-sorted with the villagers; shape changes each frame
      ents.push({y:10.6*TILE, draw:()=>{
        const fx=36.5*TILE-camX, fy=10.1*TILE-camY;
        ctx.fillStyle='rgba(73,55,55,0.32)'; ctx.beginPath(); ctx.ellipse(fx,fy+13,15,5,0,0,7); ctx.fill();
        for(let i=0;i<9;i++){
          const a=i*6.283/9, sx=fx+Math.cos(a)*11, sy=fy+10+Math.sin(a)*4;
          ctx.fillStyle=i%2?'#8797a2':'#aeb9bc'; ctx.beginPath(); ctx.ellipse(sx,sy,3,2,0,0,7); ctx.fill();
        }
        // Split-log seats with two enamel cups: a place to linger, not a shop stall.
        for(const side of [-1,1]){
          const sx=fx+side*27, sy=fy+9;
          ctx.fillStyle='#42342f'; ctx.fillRect(sx-8,sy+3,16,4);
          ctx.fillStyle='#8b6346'; ctx.fillRect(sx-9,sy-1,18,5);
          ctx.fillStyle='#b98757'; ctx.fillRect(sx-7,sy,14,1);
          ctx.fillStyle='#ebd8bb'; ctx.fillRect(sx-3,sy-6,6,5);
          ctx.fillStyle='#a86c5a'; ctx.fillRect(sx-2,sy-5,4,1);
          ctx.strokeStyle='#ebd8bb'; ctx.lineWidth=1; ctx.strokeRect(sx+3,sy-5,2,3);
        }
        ctx.strokeStyle='#5b392c'; ctx.lineWidth=4; ctx.beginPath();
        ctx.moveTo(fx-9,fy+9); ctx.lineTo(fx+8,fy+12); ctx.moveTo(fx+8,fy+8); ctx.lineTo(fx-8,fy+12); ctx.stroke();
        const flick=Math.sin(now/125)*2;
        ctx.fillStyle='#bc563b'; ctx.beginPath(); ctx.moveTo(fx-10,fy+7); ctx.quadraticCurveTo(fx-13,fy-3+flick,fx-5,fy-17); ctx.quadraticCurveTo(fx-1,fy-8,fx+1,fy-24+flick); ctx.quadraticCurveTo(fx+13,fy-10,fx+10,fy+7); ctx.fill();
        ctx.fillStyle='#f5a94f'; ctx.beginPath(); ctx.moveTo(fx-6,fy+7); ctx.quadraticCurveTo(fx-8,fy-4+flick,fx-1,fy-15); ctx.quadraticCurveTo(fx+1,fy-9,fx+4,fy-18); ctx.quadraticCurveTo(fx+9,fy-3,fx+7,fy+7); ctx.fill();
        ctx.fillStyle='#fff0af'; ctx.beginPath(); ctx.moveTo(fx-2,fy+6); ctx.quadraticCurveTo(fx-3,fy-1,fx+1,fy-9+flick/2); ctx.quadraticCurveTo(fx+5,fy+1,fx+3,fy+6); ctx.fill();
        for(let i=0;i<4;i++){
          const sy=fy-8-((now/100+i*11)%30), sx=fx+Math.sin(now/380+i*17)*7;
          ctx.fillStyle='rgba(255,194,104,0.75)'; ctx.fillRect(Math.round(sx),Math.round(sy),1,1);
        }
      }});
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
    if(G.coop){
      for(const k in G.eggs){ const ex=(+k)%W, ey=Math.floor((+k)/W);
        ents.push({y:ey*TILE+12, draw:()=>{ ctx.drawImage(G.eggs[k]==='sunegg'?SPR.item.sunegg:SPR.item.egg, ex*TILE-camX+3, ey*TILE-camY+6, 10, 10); }}); }
      for(const hn of G.hens){
        ents.push({y:hn.y+4, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.15)'; ctx.beginPath(); ctx.ellipse(hn.x-camX, hn.y-camY+5, 5, 2, 0, 0, 7); ctx.fill();
          ctx.save(); ctx.translate(hn.x-camX, hn.y-camY); if(hn.flip){ctx.scale(-1,1);} ctx.drawImage(SPR.hen,-6,-10); ctx.restore();
          const care=G.animalCare['hen'+G.hens.indexOf(hn)]||0;
          this.careBadge(ctx,hn.x-camX,hn.y-camY-17,care,now-hn.careFx,hn.pettedDay===G.day); }}); }
    }
    if(G.cow){
      const cw3=G.cow;
      ents.push({y:cw3.y+6, draw:()=>{ ctx.fillStyle='rgba(50,60,40,0.15)'; ctx.beginPath(); ctx.ellipse(cw3.x-camX, cw3.y-camY+6, 8, 2.5, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(cw3.x-camX, cw3.y-camY); if(cw3.flip){ctx.scale(-1,1);} ctx.drawImage(SPR.cow,-8,-11); ctx.restore();
        const care=G.animalCare.cow||0; this.careBadge(ctx,cw3.x-camX,cw3.y-camY-19,care,now-cw3.careFx,cw3.pettedDay===G.day); }});
    }
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
    if(f) { ctx.strokeStyle='rgba(247,239,224,0.5)'; ctx.lineWidth=1; ctx.strokeRect(f.x*TILE-camX+0.5, f.y*TILE-camY+0.5, TILE-1, TILE-1);
      // A long place label should not cover the three page drawings.
      if(Game.nearCommonTable() && TOOLS[G.tool].id==='hand')
        this.hintPill(G,ctx,px-camX,py-camY+13,true);
      else this.hintPill(G, ctx, f.x*TILE-camX+TILE/2, f.y*TILE-camY, G.player.dir==='down'); }
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
    if(Game.solsticeEvening()){
      const bx=36.5*TILE-camX, by=10*TILE-camY;
      if(bx>-95&&bx<cw+95&&by>-95&&by<ch+95){
        // The fire pools light over the snow and falls off before the cottage.
        ctx.save(); ctx.globalCompositeOperation='screen';
        const grad=ctx.createRadialGradient(bx,by,3,bx,by,78+Math.sin(now/220)*3);
        grad.addColorStop(0,'rgba(255,160,69,0.55)'); grad.addColorStop(0.45,'rgba(225,116,58,0.20)'); grad.addColorStop(1,'rgba(225,116,58,0)');
        ctx.fillStyle=grad; ctx.fillRect(bx-82,by-82,164,164); ctx.restore();
        // winter paper pennants frame the gathering, not a second row of UI
        ctx.strokeStyle='#74564e'; ctx.lineWidth=1; ctx.beginPath();
        ctx.moveTo(bx-61,by-35); ctx.quadraticCurveTo(bx,by-27,bx+61,by-35); ctx.stroke();
        for(let i=0;i<9;i++){
          const px2=bx-52+i*13, py2=by-32+3*(1-Math.abs(i-4)/4);
          ctx.fillStyle=i%2?'#d9b582':'#e5d6bd'; ctx.beginPath();
          ctx.moveTo(px2-3,py2); ctx.lineTo(px2+3,py2); ctx.lineTo(px2,py2+6); ctx.fill();
        }
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
      else if(it===IT.HEARTH && x===7 && y===1){ // the kitchen counter under the fireplace
        ents.push({y:dy+30, draw:()=>{
          ctx.fillStyle='#6e4f33'; ctx.fillRect(dx-2,dy+2,36,12);          // counter block
          ctx.fillStyle='#5a3d28'; ctx.fillRect(dx-2,dy+2,36,2);
          ctx.fillStyle='#8d8d94'; ctx.fillRect(dx+1,dy-1,30,4);           // iron stovetop
          ctx.fillStyle='#54525e'; ctx.fillRect(dx+1,dy-1,30,1);
          ctx.fillStyle='#3d3d44'; ctx.fillRect(dx+4,dy+0,8,3); ctx.fillRect(dx+19,dy+0,8,3); // burners
          ctx.fillStyle='#2e2e34'; ctx.fillRect(dx+11,dy-6,10,7);          // pot
          ctx.fillStyle='#4a4a52'; ctx.fillRect(dx+11,dy-6,10,2);
          const st=(Math.sin(now/700)+1)/2;                                 // steam wisp
          ctx.fillStyle=`rgba(240,240,240,${0.25+0.2*st})`;
          ctx.fillRect(dx+14,dy-9-(st>0.5?1:0),2,2); ctx.fillRect(dx+17,dy-12,1,2);
          ctx.fillStyle='#e9d9b8'; ctx.fillRect(dx+24,dy+5,7,5);           // folded cloth
          ctx.fillStyle='#c9b184'; ctx.fillRect(dx+24,dy+7,7,1);
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
          const notes=G.solsticeKeepsakes||[], last=notes[notes.length-1];
          if(last){ // The chosen winter leaves a different, code-drawn mark at home.
            if(last.id==='wintermint'){
              ctx.fillStyle='#e9d9b8'; ctx.fillRect(dx+2,dy+22,10,2);
              ctx.fillStyle='#5f7a4a'; ctx.fillRect(dx+6,dy+17,1,5); ctx.fillRect(dx+4,dy+18,3,2); ctx.fillRect(dx+7,dy+17,3,2);
            } else {
              ctx.fillStyle='#d9b889'; ctx.fillRect(dx+2,dy+14,12,1); ctx.fillRect(dx+2,dy+14,1,7); ctx.fillRect(dx+13,dy+14,1,7);
              ctx.fillStyle='#c97542'; ctx.fillRect(dx+7,dy+17,2,2); ctx.fillStyle='#594536'; ctx.fillRect(dx+4,dy+20,8,1);
            }
          }
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
        this.hintPill(G, ctx, tx*TILE-camX+TILE/2, ty*TILE-camY, G.player.dir==='down');
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
      {floor:['#635153','#5c4a4c'], wall:'#473839', walld:'#3c2f30', stone:'#544243', mult:'#ccab9e', bg:'#1a1214'},
      {floor:['#4a4458','#443f52'], wall:'#322e40', walld:'#292533', stone:'#3e3a4c', mult:'#b0a8cc', bg:'#13101a'},
      {floor:['#5c4a3a','#544233'], wall:'#3a2f26', walld:'#2e251e', stone:'#4a3b2d', mult:'#e0c9a0', bg:'#171009'}][lvl];
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
        if(lvl===4 && hash2(x,y,97)>0.68){ // violet crystal seams in the gloam
          const tw=(Math.sin(now/460+x*9+y*4)+1)/2;
          ctx.fillStyle='#7a5fc0'; ctx.fillRect(dx+5,dy+4,2,6); ctx.fillRect(dx+9,dy+6,2,5);
          ctx.fillStyle=`rgba(201,184,240,${0.3+0.5*tw})`; ctx.fillRect(dx+5,dy+4,1,2); ctx.fillRect(dx+9,dy+6,1,2);
        }
        if(lvl===5 && hash2(x,y,98)>0.7){ // golden ore veins in the core walls
          const gl2=(Math.sin(now/620+x*6+y*2)+1)/2;
          ctx.fillStyle=`rgba(240,177,62,${0.35+0.4*gl2})`;
          ctx.fillRect(dx+3,dy+5,7,1); ctx.fillRect(dx+6,dy+6,1,4); ctx.fillRect(dx+10,dy+3,3,1);
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
        if(lvl===5 && hash2(x,y,99)>0.8){ // molten seams in the core floor
          const gl3=(Math.sin(now/540+x*3+y*7)+1)/2;
          ctx.fillStyle=`rgba(255,214,120,${0.2+0.3*gl3})`;
          ctx.fillRect(dx+1,dy+9,12,1); ctx.fillRect(dx+5,dy+4,1,5);
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
      } else if(n.type==='sunstone'){
        ctx.fillStyle='#f0b13e'; ctx.fillRect(dx+4,dy+2,3,7); ctx.fillRect(dx+9,dy+4,3,5);
        ctx.fillStyle='#ffe9a8'; ctx.fillRect(dx+5,dy+3,1,3); ctx.fillRect(dx+10,dy+5,1,2);
      } else if(n.type==='deepopal'){
        const tw2=(Math.sin(now/330+n.x*3+n.y)+1)/2;
        ctx.fillStyle='#7a5fc0'; ctx.fillRect(dx+3,dy+3,4,7); ctx.fillRect(dx+9,dy+2,4,8);
        ctx.fillStyle=`rgba(201,184,240,${0.4+0.5*tw2})`; ctx.fillRect(dx+4,dy+4,2,3); ctx.fillRect(dx+10,dy+3,2,3);
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
        this.hintPill(G, ctx, tx*TILE-camX+TILE/2, ty*TILE-camY, G.player.dir==='down');
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
