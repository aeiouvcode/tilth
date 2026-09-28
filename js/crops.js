// TILTH crops — original set, gentle economy
'use strict';
const CROPS={
  cloveroot:{ id:'cloveroot', name:'Cloveroot', seed:'Cloveroot seeds', days:3, seedCost:20, sell:38,  color:'#e0d389', dark:'#c4b168', seasons:[0,2] },
  sunbean:  { id:'sunbean',   name:'Sunbean',   seed:'Sunbean seeds',   days:5, seedCost:45, sell:95,  color:'#d9a441', dark:'#b98730', tall:true, seasons:[1] },
  duskberry:{ id:'duskberry', name:'Duskberry', seed:'Duskberry seeds', days:6, seedCost:70, sell:150, color:'#8a6ea8', dark:'#6d5588', regrow:3, seasons:[2] },
  embermelon:{id:'embermelon',name:'Ember Melon',seed:'Ember melon seeds',days:9,seedCost:110,sell:280, color:'#c96f4a', dark:'#a8563a', vine:true, seasons:[1] },
};
const FORAGE={
  dandelion:{ id:'dandelion', name:'Dandelion', sell:10 },
  wildplum: { id:'wildplum',  name:'Wild Plum', sell:22 },
  morel:    { id:'morel',     name:'Morel',     sell:48 },
};
const FISH={
  minnow:   { id:'minnow',    name:'Pond Minnow', sell:15, zone:0.5 },
  dace:     { id:'dace',      name:'Brook Dace',  sell:34, zone:0.3 },
  duskcarp: { id:'duskcarp',  name:'Dusk Carp',   sell:65, zone:0.16, night:true },
};
// quarry cave ores — the second economy axis: energy for coin, no watering
const ORES={
  pitstone:   { id:'pitstone',    name:'Pit Stone',    sell:6 },
  emberquartz:{ id:'emberquartz', name:'Ember Quartz', sell:26 },
  moondrop:   { id:'moondrop',    name:'Moon Drop',    sell:60 },
};
// unified sell-price / display-name lookup for the crate
const ITEMS={};
for(const d of Object.values(CROPS)) ITEMS[d.id]=d;
for(const d of Object.values(FORAGE)) ITEMS[d.id]=d;
for(const d of Object.values(FISH)) ITEMS[d.id]=d;
for(const d of Object.values(ORES)) ITEMS[d.id]=d;
const TOOLS=[
  {id:'hoe',     name:'Hoe'},
  {id:'can',     name:'Watering can'},
  {id:'hand',    name:'Hands'},
  {id:'scythe',  name:'Scythe'},
  {id:'pick',    name:'Pickaxe'},
  {id:'seeds',   name:'Seeds'}, // pseudo-tool: plant selected seed
  {id:'rod',     name:'Fishing rod'},
];
const SEASONS=['Spring','Summer','Autumn','Winter'];
