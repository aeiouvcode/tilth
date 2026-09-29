// TILTH generative music: a seeded pentatonic tune per day, mood-aware.
// All synthesis in code - zero assets. Engine is WebAudio; the phrase
// generator is a pure function so the autotest can verify it without sound.
'use strict';
const MUSIC_SCALES={ day:[0,2,4,7,9], night:[0,3,5,7,10] };
function phraseFor(day, season, mood){
  // mood: 0 day, 1 dusk, 2 night, 3 lantern evening, 4 solstice
  const r=mulberry32(day*977 + season*131 + mood*17 + 11);
  const deg=(mood===2)?MUSIC_SCALES.night:MUSIC_SCALES.day;
  const bars=8, spb=4, notes=[];
  let cur=2+Math.floor(r()*3);
  for(let b=0;b<bars;b++){
    // each bar opens on a chord tone, then walks
    cur=clamp([0,2,4][Math.floor(r()*3)] + Math.floor(r()*3)-1, 0, deg.length-1);
    for(let s=0;s<spb;s++){
      const dens = mood===2 ? 0.38 : mood===3 ? 0.75 : mood===4 ? 0.65 : 0.55;
      if(s===0 || r()<dens){
        notes.push({bar:b, step:s, midi:deg[cur], oct: (r()<0.22?12:0)});
        if(r()<0.4) cur=clamp(cur+(r()<0.5?-1:1), 0, deg.length-1);
      }
    }
  }
  return notes;
}
const Music={
  on:false, muted:false, timer:null, nextT:0, step:0, phrase:[], mood:-1,
  start(){
    if(this.muted||this.on||!ac())return;
    this.on=true; this.retune(true);
    this.nextT=AC.currentTime+0.15; this.step=0;
    this.timer=setInterval(()=>this.tick(), 180);
  },
  stop(){ if(this.timer)clearInterval(this.timer); this.timer=null; this.on=false; },
  toggleMute(){
    this.muted=!this.muted;
    try{ localStorage.setItem('tilth-mute', this.muted?'1':''); }catch(e){}
    if(this.muted) this.stop(); else this.start();
    return this.muted;
  },
  loadMute(){ try{ this.muted=localStorage.getItem('tilth-mute')==='1'; }catch(e){} },
  moodOf(g){
    if(g.day%28===0 && g.minutes>=1080) return 4; // solstice: the annual fire
    if(g.day%7===0 && g.minutes>=1080) return 3;         // lantern evening
    if(g.minutes>=1230 || g.minutes<330) return 2;       // night
    if(g.minutes>=1110) return 1;                        // dusk
    return 0;
  },
  retune(force){
    const g=Game.G; if(!g)return;
    const m=this.moodOf(g);
    if(force||m!==this.mood){ this.mood=m; this.phrase=phraseFor(g.day, Game.season(), m); }
  },
  tick(){
    if(!this.on||!AC)return;
    const g=Game.G; if(!g)return;
    this.retune(false);
    const bpm= this.mood===4 ? 68 : this.mood===3 ? 92 : this.mood===2 ? 56 : this.mood===1 ? 64 : 76;
    const stepDur=60/bpm; // quarter-note steps
    const horizon=AC.currentTime+0.6;
    let guard=0;
    while(this.nextT<horizon && guard++<64){
      this.scheduleStep(this.step, this.nextT, stepDur, g);
      this.nextT+=stepDur; this.step=(this.step+1)%32;
    }
  },
  scheduleStep(step, t, stepDur, g){
    const bar=Math.floor(step/4), s=step%4;
    const rain=g.weather==='rain';
    // pad: root+fifth drone at bar starts (every 2 bars alternate I and IV)
    if(s===0){
      const shift=(bar%4===2)?5:0; // IV lift mid-phrase
      const root= this.mood===2 ? 174.61 : 220.0; // F3 night, A3 otherwise
      const f=root*Math.pow(2,shift/12);
      this.note(f, t, stepDur*4.2, 'triangle', 0.020);
      this.note(f*1.5, t, stepDur*4.2, 'triangle', 0.012);
    }
    for(const n of this.phrase){
      if(n.bar!==bar||n.step!==s)continue;
      if(rain && (n.step===2) && n.oct===0)continue; // rain thins the middle
      const root= this.mood===2 ? 174.61 : 220.0;
      const f=root*2*Math.pow(2,(n.midi+n.oct)/12);
      this.note(f, t, stepDur*(this.mood===2?1.8:1.2), 'sine', this.mood===2?0.026:0.032);
    }
    if(this.mood===4 && s===0 && bar%2===0){ // soft bell, one ember per two bars
      this.note(440*Math.pow(2,(bar%4)*2/12), t, 0.42, 'sine', 0.018);
    }
    if(this.mood===3 && s===2){ // festival sparkle
      this.note(880*Math.pow(2,(bar%3)*2/12), t, 0.18, 'sine', 0.012);
    }
  },
  note(freq, t, dur, type, vol){
    const o=AC.createOscillator(), gn=AC.createGain(), fl=AC.createBiquadFilter();
    fl.type='lowpass'; fl.frequency.value= this.mood===2?1100:2400;
    o.type=type; o.frequency.value=freq;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t+0.06);
    gn.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(fl); fl.connect(gn); gn.connect(AC.destination);
    o.start(t); o.stop(t+dur+0.05);
  },
};
