// TILTH input: keyboard + touch joystick
'use strict';
const Input={
  keys:{}, move:{x:0,y:0}, act:false, actEdge:false, cycleEdge:false, menuClose:false,
  touchMove:{x:0,y:0,active:false},
};
function initInput(canvas){
  addEventListener('keydown',e=>{
    if(e.repeat)return;
    Input.keys[e.key.toLowerCase()]=true;
    if(e.key==='e'||e.key==='E'||e.key===' '){ Input.actEdge=true; e.preventDefault(); }
    if(e.key==='q'||e.key==='Q'||e.key==='Tab'){ Input.cycleEdge=true; e.preventDefault(); }
    if(e.key==='Escape'){ Input.menuClose=true; }
    if(e.key==='j'||e.key==='J'){ Input.journalEdge=true; }
    if(e.key>='1'&&e.key<='9'){ Input.numKey=+e.key; }
    if(e.key==='m'||e.key==='M'){ if(typeof Music!=='undefined'){ const mu=Music.toggleMute(); if(typeof toast==='function') toast(mu?'music off':'music on'); } }
  });
  addEventListener('keyup',e=>{ Input.keys[e.key.toLowerCase()]=false; });
  // touch joystick
  const stick=document.getElementById('stick'), nub=document.getElementById('stick-nub');
  let sid=null, cx=0, cy=0;
  stick.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; sid=t.identifier; const r=stick.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2; e.preventDefault(); },{passive:false});
  stick.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){ if(t.identifier!==sid)continue;
      let dx=t.clientX-cx, dy=t.clientY-cy; const m=Math.hypot(dx,dy), max=40;
      if(m>max){ dx=dx/m*max; dy=dy/m*max; }
      nub.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      Input.touchMove={x:dx/max, y:dy/max, active:true};
    } e.preventDefault();
  },{passive:false});
  const endStick=e=>{ for(const t of e.changedTouches){ if(t.identifier!==sid)continue; sid=null; Input.touchMove={x:0,y:0,active:false}; nub.style.transform='translate(-50%,-50%)'; } };
  stick.addEventListener('touchend',endStick); stick.addEventListener('touchcancel',endStick);
  document.getElementById('btn-act').addEventListener('touchstart',e=>{ if(window.modalAct){ window.modalAct(); } else Input.actEdge=true; e.preventDefault(); },{passive:false});
  document.getElementById('btn-cycle').addEventListener('touchstart',e=>{ Input.cycleEdge=true; e.preventDefault(); },{passive:false});
  // desktop: click canvas to act toward facing (optional, keep simple)
}
function readMove(){
  let x=0,y=0; const k=Input.keys;
  if(k['a']||k['arrowleft'])x-=1; if(k['d']||k['arrowright'])x+=1;
  if(k['w']||k['arrowup'])y-=1; if(k['s']||k['arrowdown'])y+=1;
  if(Input.touchMove.active){ x=Input.touchMove.x; y=Input.touchMove.y; }
  const m=Math.hypot(x,y); if(m>1){x/=m;y/=m;}
  return {x,y};
}
