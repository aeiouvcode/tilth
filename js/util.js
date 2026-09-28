// TILTH util: seeded rng + helpers
'use strict';
function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(x,y,s){let h=(x*374761393+y*668265263)^(s*974634211);h=(h^(h>>13))*1274126177;return ((h^(h>>16))>>>0)/4294967296;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function pick(rng,arr){return arr[Math.floor(rng()*arr.length)];}
// small canvas factory
function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function px(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
// draw pixel-map sprite: rows of chars, map char->color ('.' = transparent)
function drawMap(rows, colors, scale=1){
  const h=rows.length, w=rows[0].length;
  const c=cv(w*scale,h*scale), x=c.getContext('2d');
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const ch=rows[j][i];
    if(ch==='.'||ch===' ')continue;
    x.fillStyle=colors[ch];x.fillRect(i*scale,j*scale,scale,scale);
  }
  return c;
}
// ordered dither sprinkle onto a canvas region
function dither(ctx,w,h,color,density,rng,size=1){
  ctx.fillStyle=color;
  const n=Math.floor(w*h*density);
  for(let k=0;k<n;k++){ctx.fillRect(Math.floor(rng()*w),Math.floor(rng()*h),size,size);}
}


// dark 1px outline around an opaque sprite for readability
function outline(src, color='rgba(46,38,26,0.85)'){
  const w=src.width, h=src.height;
  const c=cv(w+2,h+2), x=c.getContext('2d');
  const sx=src.getContext('2d').getImageData(0,0,w,h).data;
  x.fillStyle=color;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    if(sx[(j*w+i)*4+3]>40){
      x.fillRect(i,j+1,3,1); x.fillRect(i+1,j,1,3);
      x.fillRect(i+2,j+1,1,1); x.fillRect(i,j+1,1,1);
    }
  }
  x.drawImage(src,1,1);
  return c;
}
