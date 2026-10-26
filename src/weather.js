import { datesFor } from './wardrobe.js';
const fields='apparent_temperature_max,apparent_temperature_min,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max';
const cache=new Map();
export async function requestJSON(url,signal){
 const response=await fetch(url,{signal:signal||AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error(response.status===429?'Weather service is busy. Try again in a minute.':'Weather could not be loaded. Try again.');
 const data=await response.json();if(data.error)throw new Error('Weather data is unavailable for this location.');return data;
}
export async function searchCities(query,signal){const data=await requestJSON(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({name:query.trim(),count:'6',language:'en',format:'json'})}`,signal);return data.results||[];}
function rows(data,source){return (data.daily?.time||[]).map((date,i)=>({date,high:data.daily.apparent_temperature_max?.[i],low:data.daily.apparent_temperature_min?.[i],airHigh:data.daily.temperature_2m_max?.[i],airLow:data.daily.temperature_2m_min?.[i],rain:data.daily.precipitation_sum?.[i],wind:data.daily.wind_speed_10m_max?.[i],source})).filter(d=>Number.isFinite(d.high)&&Number.isFinite(d.low));}
const mean=(items,key)=>{const values=items.map(d=>d[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};
export function historicalDays(data,dates,years){
 const history=rows(data,'Historical estimate');
 const byDay=new Map();for(const d of history){const md=d.date.slice(5);if(!byDay.has(md))byDay.set(md,[]);byDay.get(md).push(d);}
 return dates.map(date=>{
  const md=date.slice(5);const sample=byDay.get(md)|| (md==='02-29'?byDay.get('02-28'):null);
  if(!sample?.length)throw new Error('Historical weather is incomplete for these dates.');
  return {date,...Object.fromEntries(['high','low','airHigh','airLow','rain','wind'].map(k=>[k,mean(sample,k)])),source:'Historical estimate',years,samples:sample.length};
 });
}
async function cached(url,ttl){const saved=cache.get(url);if(saved&&Date.now()-saved.at<ttl)return saved.data;const data=await requestJSON(url);cache.set(url,{data,at:Date.now()});return data;}
export async function weatherFor(stop){
 const dates=datesFor(stop.start,stop.days);
 const params={latitude:String(stop.city.latitude),longitude:String(stop.city.longitude),daily:fields,timezone:'auto'};
 const forecastURL=`https://api.open-meteo.com/v1/forecast?${new URLSearchParams({...params,forecast_days:'16'})}`;
 let forecast=[];let forecastFailed=false;
 try{forecast=rows(await cached(forecastURL,30*60*1000),'Forecast');}catch{forecastFailed=true;}
 const byDate=new Map(forecast.map(d=>[d.date,d]));const missing=dates.filter(d=>!byDate.has(d));
 if(missing.length){
  const endYear=new Date().getFullYear()-1,startYear=endYear-4;
  const archiveURL=`https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({...params,start_date:`${startYear}-01-01`,end_date:`${endYear}-12-31`})}`;
  const archive=await cached(archiveURL,24*60*60*1000);
  for(const day of historicalDays(archive,missing,`${startYear}–${endYear}`)){day.forecastUnavailable=forecastFailed;byDate.set(day.date,day);}
 }
 return dates.map(d=>byDate.get(d));
}
