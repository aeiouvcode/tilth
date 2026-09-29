// TILTH crops — original set, gentle economy
'use strict';
const CROPS={
  cloveroot:{ id:'cloveroot', name:'Cloveroot', seed:'Cloveroot seeds', days:3, seedCost:20, sell:48,  color:'#e0d389', dark:'#c4b168', seasons:[0,2] },
  sunbean:  { id:'sunbean',   name:'Sunbean',   seed:'Sunbean seeds',   days:5, seedCost:45, sell:115,  color:'#d9a441', dark:'#b98730', tall:true, seasons:[1] },
  duskberry:{ id:'duskberry', name:'Duskberry', seed:'Duskberry seeds', days:6, seedCost:70, sell:180, color:'#8a6ea8', dark:'#6d5588', regrow:3, seasons:[2] },
  embermelon:{id:'embermelon',name:'Ember Melon',seed:'Ember melon seeds',days:9,seedCost:110,sell:330, color:'#c96f4a', dark:'#a8563a', vine:true, seasons:[1] },
  frostroot:{ id:'frostroot', name:'Frostroot', seed:'Frostroot seeds', days:4, seedCost:35, sell:90,  color:'#b8d4d8', dark:'#8aa8b0', seasons:[3] },
};
const FORAGE={
  dandelion:{ id:'dandelion', name:'Dandelion', sell:10 },
  wildplum: { id:'wildplum',  name:'Wild Plum', sell:22 },
  morel:    { id:'morel',     name:'Morel',     sell:48 },
  wintermint:{id:'wintermint',name:'Wintermint',sell:12 },
  snowberry:{ id:'snowberry', name:'Snowberry', sell:18 },
  frostcap: { id:'frostcap',  name:'Frostcap',  sell:40 },
};
const FISH={
  minnow:   { id:'minnow',    name:'Pond Minnow', sell:15, zone:0.5 },
  dace:     { id:'dace',      name:'Brook Dace',  sell:34, zone:0.3 },
  duskcarp: { id:'duskcarp',  name:'Dusk Carp',   sell:65, zone:0.16, night:true },
  icefin:   { id:'icefin',    name:'Icefin',      sell:55, zone:0.2,  winter:true },
};
// quarry cave ores — the second economy axis: energy for coin, no watering
const ORES={
  pitstone:   { id:'pitstone',    name:'Pit Stone',    sell:3 },
  emberquartz:{ id:'emberquartz', name:'Ember Quartz', sell:12 },
  moondrop:   { id:'moondrop',    name:'Moon Drop',    sell:28 },
  sunstone:   { id:'sunstone',    name:'Sunstone',     sell:45 },
  deepopal:   { id:'deepopal',    name:'Deep Opal',    sell:90 },
};
// animal produce (coop)
const ANIMAL={
  egg:{ id:'egg', name:'Egg', sell:25 },
  milk:{ id:'milk', name:'Milk', sell:60 },
  sunegg:{ id:'sunegg', name:'Sun Egg', sell:55 },
  creammilk:{ id:'creammilk', name:'Cream Milk', sell:110 },
};
// hearth cooking: crafted meals - flat prices (no skill perk), not journal collectables
const RECIPES=[
  { id:'friedegg',  name:'Fried Egg',        sell:55,  energy:25, needs:{egg:1} },
  { id:'warmmilk',  name:'Warm Milk',        sell:130, energy:20, needs:{milk:1} },
  { id:'gardenhash',name:'Garden Hash',      sell:190, energy:45, needs:{cloveroot:1, sunbean:1} },
  { id:'skewer',    name:'Brookside Skewer', sell:150, energy:60, needs:{dace:1, morel:1} },
  { id:'hearthpie', name:'Hearth Pie',       sell:260, energy:50, needs:{duskberry:1, egg:1} },
];
// unified sell-price / display-name lookup for the crate
const ITEMS={};
for(const d of Object.values(CROPS)) ITEMS[d.id]=d;
for(const d of Object.values(FORAGE)) ITEMS[d.id]=d;
for(const d of Object.values(FISH)) ITEMS[d.id]=d;
for(const d of Object.values(ORES)) ITEMS[d.id]=d;
for(const d of Object.values(ANIMAL)) ITEMS[d.id]=d;
const KEEPSAKE={ ribbon:{ id:'ribbon', name:'Prize Ribbon', sell:100 } };
for(const d of RECIPES) ITEMS[d.id]=d;
for(const d of Object.values(KEEPSAKE)) ITEMS[d.id]=d;
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
