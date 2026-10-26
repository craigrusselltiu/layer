import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outfitFor,packingFor,validateStops,addDays,dateISO,unwrapRoute } from '../src/wardrobe.js';
import { historicalDays } from '../src/weather.js';
test('colder weather never reduces insulation',()=>{let previous=7;for(let t=-30;t<=40;t++){const next=outfitFor(t).level;assert.ok(next<=previous);previous=next;}});
test('warmth bands and comfort preferences',()=>{assert.equal(outfitFor(-11).level,6);assert.equal(outfitFor(0).level,4);assert.equal(outfitFor(15).level,2);assert.equal(outfitFor(25).level,0);assert.ok(outfitFor(16,'cold').level>outfitFor(16,'normal').level);assert.ok(outfitFor(16,'normal','still').level>outfitFor(16,'normal','active').level);assert.equal(outfitFor(null),null);});
test('rain adds protection without changing warmth band',()=>{const dry=outfitFor(18),wet=outfitFor(18,'normal','walking',2);assert.equal(wet.level,dry.level);assert.ok(wet.items.includes('shell'));assert.ok(!dry.items.includes('shell'));});
test('minus 20 always includes explicit thermal and insulated leg layers',()=>{
 for(const sensitivity of ['cold','normal','warm'])for(const activity of ['still','walking','active']){
  const outfit=outfitFor(-20,sensitivity,activity);
  assert.ok(outfit.items.includes('thermalLeggings'));
  assert.ok(outfit.items.includes('insulatedPants'));
  assert.ok(!outfit.items.includes('trousers'));
  assert.equal(outfit.legLayers,2);
 }
});
test('leg insulation increases across freezing and deep-cold boundaries',()=>{
 assert.equal(outfitFor(8).legLayers,1);
 assert.equal(outfitFor(0).legLayers,1);
 assert.ok(outfitFor(-.1).items.includes('thermalLeggings'));
 assert.ok(outfitFor(-9).items.includes('lined'));
 assert.ok(outfitFor(-10).items.includes('insulatedPants'));
 assert.ok(outfitFor(-2,'warm','active').items.includes('thermalLeggings'));
 assert.equal(outfitFor(-20).layers,3);
 const packed=packingFor([{weather:[{high:8,low:-20,rain:0}]}],'normal','walking');
 assert.ok(packed.includes('thermalLeggings'));
 assert.ok(packed.includes('insulatedPants'));
});
test('packing includes cold nights and all stops exactly once',()=>{const packed=packingFor([{weather:[{high:28,low:22,rain:0}]},{weather:[{high:12,low:-12,rain:2}]}],'normal','walking');assert.ok(packed.includes('shorts'));assert.ok(packed.includes('parka'));assert.ok(packed.includes('gloves'));assert.ok(packed.includes('shell'));assert.equal(new Set(packed).size,packed.length);});
test('dates handle leap days and year boundaries',()=>{assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(addDays('2027-12-31',1),'2028-01-01');});
test('invalid and overlapping itineraries are rejected',()=>{const base={city:{latitude:0,longitude:0},start:addDays(dateISO(),10),days:3};assert.equal(validateStops([base]),'');assert.match(validateStops([{...base,days:0}]),/1–60/);assert.match(validateStops([{...base,city:null}]),/Choose a city/);assert.match(validateStops([base,{...base,start:addDays(base.start,1)}]),/before/);assert.equal(validateStops([base,{...base,start:addDays(base.start,2)}]),'');assert.match(validateStops([{...base,start:'2027-02-30'}]),/valid date/);});
test('date-line route takes short longitude path',()=>{const points=unwrapRoute([{city:{latitude:35,longitude:140}},{city:{latitude:21,longitude:-158}}]);assert.equal(points[1][1],202);assert.ok(Math.abs(points[1][1]-points[0][1])<180);});
test('historical averages exclude missing values and handle leap-day fallback',()=>{const data={daily:{time:['2023-02-28','2024-02-28','2025-02-28'],apparent_temperature_max:[10,20,null],apparent_temperature_min:[0,10,null],precipitation_sum:[0,2,null]}};const [day]=historicalDays(data,['2028-02-29'],'2021–2025');assert.equal(day.high,15);assert.equal(day.low,5);assert.equal(day.rain,1);assert.equal(day.samples,2);assert.equal(day.source,'Historical estimate');assert.equal(day.wind,null);});
test('missing historical dates fail visibly',()=>{assert.throws(()=>historicalDays({daily:{time:[]}},['2028-01-01'],'2021–2025'),/incomplete/);});
