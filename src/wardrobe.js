export const clothing = {
 tee: ['T-shirt','Base layer','shirt'], long: ['Long-sleeve top','Base layer','shirt'], thermal: ['Thermal top','Base layer','shirt'], fleece: ['Fleece','Mid layer','shirt'], sweater: ['Light jumper','Mid layer','shirt'], jacket: ['Light jacket','Outer layer','coat'], coat: ['Insulated coat','Outer layer','coat'], parka: ['Heavy parka','Outer layer','coat'], thermalLeggings: ['Thermal leggings','Leg base','pants'], shorts: ['Shorts','Bottoms','pants'], trousers: ['Trousers','Bottoms','pants'], lined: ['Fleece-lined trousers','Leg outer','pants'], insulatedPants: ['Insulated windproof trousers','Leg outer','pants'], sneakers: ['Trainers','Footwear','shoe'], boots: ['Insulated boots','Footwear','shoe'], socks: ['Warm socks','Footwear','sock'], beanie: ['Beanie','Accessories','hat'], scarf: ['Scarf','Accessories','scarf'], gloves: ['Gloves','Accessories','glove'], shell: ['Waterproof shell','Rain','coat']
};
export function outfitFor(temp, sensitivity='normal', activity='walking', rain=0) {
 if (!Number.isFinite(temp)) return null;
 const adjusted = temp + ({cold:-3,normal:0,warm:3}[sensitivity] ?? 0) + ({still:-3,walking:0,active:4}[activity] ?? 0);
 let level,name,items;
 if(adjusted < -10){level=6;name='Bundle up';items=['thermal','fleece','parka','lined','boots','socks','beanie','scarf','gloves'];}
 else if(adjusted < 0){level=5;name='Proper winter layers';items=['thermal','fleece','coat','lined','boots','socks','beanie','gloves'];}
 else if(adjusted < 8){level=4;name='Keep the warmth in';items=['long','fleece','coat','trousers','sneakers','socks','beanie'];}
 else if(adjusted < 15){level=3;name='A few good layers';items=['tee','sweater','jacket','trousers','sneakers'];}
 else if(adjusted < 20){level=2;name='Take a light layer';items=['tee','sweater','trousers','sneakers'];}
 else if(adjusted < 25){level=1;name='Keep it light';items=['tee','trousers','sneakers'];}
 else {level=0;name='Easy, breezy';items=['tee','shorts','sneakers'];}
 // Keep leg protection explicit. Comfort preferences may add insulation, but
 // cannot remove thermal bottoms when the actual feels-like value is below 0.
 // These are conservative planning bands, not garment temperature ratings.
 const legTemperature=Math.min(temp,adjusted);
 if(legTemperature<0){
  const bottomIndex=items.findIndex(x=>['shorts','trousers','lined'].includes(x));
  items.splice(bottomIndex,1,'thermalLeggings',legTemperature<=-10?'insulatedPants':'lined');
 }
 if(rain>=1) items.push('shell');
 return {level,name,items,adjusted,extreme:temp<-15||temp>35,layers:items.filter(x=>['tee','long','thermal','fleece','sweater','jacket','coat','parka','shell'].includes(x)).length,legLayers:items.filter(x=>['thermalLeggings','shorts','trousers','lined','insulatedPants'].includes(x)).length};
}
export function packingFor(stops, sensitivity, activity) {
 const items = new Set();
 for(const stop of stops) for(const day of stop.weather||[]) for(const temp of [day.high,day.low]) {
  const outfit=outfitFor(temp,sensitivity,activity,day.rain);
  outfit?.items.forEach(item=>items.add(item));
 }
 return [...items].sort((a,b)=>Object.keys(clothing).indexOf(a)-Object.keys(clothing).indexOf(b));
}
export function dateISO(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function addDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function datesFor(start,days){return Array.from({length:days},(_,i)=>addDays(start,i));}
export function validateStops(stops){
 if(!stops.length || stops.length>8) return 'Add between 1 and 8 stops.';
 let previousEnd;
 for(const [i,s] of stops.entries()){
  if(!s.city || !Number.isFinite(s.city.latitude) || !Number.isFinite(s.city.longitude)) return `Choose a city from the results for stop ${i+1}.`;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.start)||!Number.isFinite(Date.parse(s.start))||new Date(s.start).toISOString().slice(0,10)!==s.start) return `Choose a valid date for stop ${i+1}.`;
  if(s.start<dateISO()) return `Stop ${i+1} starts in the past.`;
  if(Number(s.start.slice(0,4))>new Date().getFullYear()+5) return 'Choose a trip within the next 5 years.';
  if(!Number.isInteger(s.days)||s.days<1||s.days>60) return 'Each stop can be 1–60 days.';
  if(previousEnd && s.start<previousEnd) return `Stop ${i+1} starts before the previous stop ends.`;
  previousEnd=addDays(s.start,s.days-1);
 }
 if(stops.reduce((n,s)=>n+s.days,0)>180) return 'Keep the trip to 180 days or fewer.';
 return '';
}
export function unwrapRoute(stops){let previous;return stops.map(s=>{let lng=s.city.longitude;if(previous!==undefined){while(lng-previous>180)lng-=360;while(lng-previous< -180)lng+=360;}previous=lng;return [s.city.latitude,lng];});}
