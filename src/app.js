import './style.css';
import { clothing,outfitFor,packingFor,dateISO,addDays,validateStops } from './wardrobe.js';
import { searchCities,weatherFor } from './weather.js';
import { createMannequin } from './mannequin.js';
import { createMap } from './map.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=(start=addDays(dateISO(),7))=>({id:crypto.randomUUID(),city:null,query:'',start,days:3});
let state={stops:[blank()],unit:'C',sensitivity:'normal',activity:'walking',checked:[]};
try{const saved=JSON.parse(localStorage.getItem('layer-trip-v1'));if(saved&&Array.isArray(saved.stops)&&saved.stops.length>0&&saved.stops.length<=8){state={...state,...saved,stops:saved.stops.map(s=>({...s,weather:undefined}))};}}catch{}
let selected=0,dayIndex=0,period='day',planned=[],busy=false,revision=0;
const mannequin=createMannequin($('mannequin'));
const map=createMap('map',i=>{selected=i;dayIndex=0;renderResults();});
const temp=t=>Number.isFinite(t)?`${Math.round(state.unit==='F'?t*9/5+32:t)}°`: '—';
function save(){try{localStorage.setItem('layer-trip-v1',JSON.stringify({...state,stops:state.stops.map(({weather,...s})=>s)}));}catch{$('form-status').textContent='Device storage is unavailable. Keep this tab open.';}}
function changed(){revision++;save();$('form-status').textContent=planned.length?'Trip changed. Find your layers again.':'';updateLength();}
function updateLength(){$('trip-length').textContent=`${state.stops.reduce((n,s)=>n+(Number(s.days)||0),0)} DAYS`;}
function renderStops(){
 $('stops').innerHTML=state.stops.map((s,i)=>`<div class="stop-card" data-id="${escape(s.id)}"><span class="stop-number">${i+1}</span><div class="stop-topline"><label for="city-${i}">Destination</label>${state.stops.length>1?`<button type="button" class="remove-stop" aria-label="Remove stop ${i+1}">×</button>`:''}</div><div class="city-field"><input id="city-${i}" class="city-input" placeholder="City or town" value="${escape(s.query||s.city?.name||'')}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="results-${i}" aria-label="Destination ${i+1}"><div id="results-${i}" class="suggestions" role="listbox"></div></div><div class="stop-dates"><div><label for="start-${i}">Arriving</label><input id="start-${i}" class="start-input" type="date" min="${dateISO()}" value="${escape(s.start)}" required></div><div><label for="days-${i}">Days</label><input id="days-${i}" class="days-input" type="number" min="1" max="60" value="${s.days}" required></div></div></div>`).join('');
 document.querySelectorAll('.stop-card').forEach((card,i)=>{
  const s=state.stops[i],input=card.querySelector('.city-input'),list=card.querySelector('.suggestions');let timer,controller,request=0;
  const close=()=>{list.innerHTML='';input.setAttribute('aria-expanded','false');};
  input.addEventListener('input',()=>{
   s.query=input.value;s.city=null;changed();clearTimeout(timer);controller?.abort();const current=++request;close();if(input.value.trim().length<2)return;
   timer=setTimeout(async()=>{
    controller=new AbortController();list.innerHTML='<div class="search-message">Searching…</div>';input.setAttribute('aria-expanded','true');
    try{const cities=await searchCities(input.value,controller.signal);if(current!==request||!card.isConnected)return;list.innerHTML='';if(!cities.length){list.innerHTML='<div class="search-message">No cities found.</div>';return;}
     for(const city of cities){const button=document.createElement('button');button.type='button';button.className='suggestion';button.setAttribute('role','option');button.innerHTML=`${escape(city.name)}<small>${escape([city.admin1,city.country].filter(Boolean).join(', '))}</small>`;button.addEventListener('click',()=>{s.city={name:city.name,latitude:city.latitude,longitude:city.longitude,country:city.country||'',admin1:city.admin1||''};s.query=`${city.name}, ${city.country||city.admin1||''}`;input.value=s.query;input.removeAttribute('aria-invalid');close();changed();input.focus();});list.append(button);}
    }catch(error){if(error.name!=='AbortError'&&current===request)list.innerHTML='<div class="search-message">Search unavailable. Try again.</div>';}
   },300);
  });
  card.addEventListener('keydown',e=>{const options=[...list.querySelectorAll('button')];if(e.key==='Escape'){close();input.focus();}if(e.key==='ArrowDown'&&options.length){e.preventDefault();options[(options.indexOf(document.activeElement)+1)%options.length].focus();}if(e.key==='ArrowUp'&&options.length){e.preventDefault();options[(options.indexOf(document.activeElement)-1+options.length)%options.length].focus();}if(e.key==='Enter'&&document.activeElement===input&&options.length){e.preventDefault();options[0].click();}});
  card.addEventListener('focusout',()=>setTimeout(()=>{if(!card.contains(document.activeElement))close();},100));
  card.querySelector('.start-input').addEventListener('change',e=>{s.start=e.target.value;changed();});card.querySelector('.days-input').addEventListener('input',e=>{s.days=Number(e.target.value);changed();});
  card.querySelector('.remove-stop')?.addEventListener('click',()=>{clearTimeout(timer);controller?.abort();state.stops.splice(i,1);changed();renderStops();});
 });
 $('add-stop').disabled=state.stops.length>=8;updateLength();
}
const iconPaths={shirt:'m3 7 5-3 4 2 4-2 5 3-3 5-2-1v10H8V11l-2 1Z',coat:'m3 7 5-3 4 2 4-2 5 3-3 13-3-1V9l-3 3-3-3v10l-3 1Z M12 12v9',pants:'M6 3h12l2 18h-6l-2-12-2 12H4Z',shoe:'M4 7h5l3 7 7 2 2 3v2H3V9Z M3 18h17',sock:'M8 3h8v12l-6 6H4v-5l4-3Z',hat:'M5 16v-4a7 7 0 0 1 14 0v4M3 16h18v5H3Z',scarf:'M5 4h14v6H5Zm3 6v11h5V10m2 0v8h4v-8',glove:'M6 12V5h3V3h3v2h3v2h3v10l-3 4H9l-5-6v-5Z'};
function icon(type){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[type]||iconPaths.shirt}"/></svg>`;}
function renderPacking(){
 const ids=packingFor(planned,state.sensitivity,state.activity);
 $('packing-count').textContent=`${ids.length} ITEMS`;
 $('packing-list').innerHTML=ids.length?ids.map(id=>`<label class="pack-item"><input type="checkbox" data-item="${id}" ${state.checked.includes(id)?'checked':''}><span>${clothing[id][0]}</span></label>`).join(''):'';
 $('packing-list').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{state.checked=input.checked?[...new Set([...state.checked,input.dataset.item])]:state.checked.filter(x=>x!==input.dataset.item);save();}));
}
function renderResults(refit=false){
 $('units').innerHTML=state.unit==='C'?'°C <span>/ °F</span>':'°F <span>/ °C</span>';
 $('legend-cold').textContent=temp(-10);$('legend-hot').textContent=temp(35);
 $('day').setAttribute('aria-pressed',String(period==='day'));$('night').setAttribute('aria-pressed',String(period==='night'));
 if(!planned.length){map.update([],0,period,temp);renderPacking();return;}
 selected=Math.min(selected,planned.length-1);const stop=planned[selected];dayIndex=Math.min(dayIndex,stop.weather.length-1);const day=stop.weather[dayIndex];const temperature=period==='day'?day.high:day.low;
 const outfit=outfitFor(temperature,state.sensitivity,state.activity,day.rain);
 $('stop-tabs').innerHTML=planned.map((s,i)=>`<button class="stop-tab" role="tab" aria-selected="${i===selected}" data-index="${i}"><span>${String(i+1).padStart(2,'0')}</span>${escape(s.city.name)}</button>`).join('');$('stop-tabs').setAttribute('role','tablist');
 $('stop-tabs').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{selected=Number(btn.dataset.index);dayIndex=0;renderResults();}));
 $('weather-source').textContent=day.source;$('weather-source').title=day.years?`Same calendar day, ${day.years}. ${day.samples} historical samples.`:'Local daily weather forecast';
 $('temperature').innerHTML=`${temp(temperature).replace('°','')}<sup>°${state.unit}</sup>`;$('feels-label').textContent=`Feels like · ${period==='day'?'daytime high':'overnight low'}`;
 $('weather-extras').innerHTML=`<span>${period==='day'?'☾ Night':'☀ Day'} ${temp(period==='day'?day.low:day.high)}</span>${Number.isFinite(day.wind)?`<span>↝ ${Math.round(day.wind)} km/h wind</span>`:''}${day.rain>=1?`<span>☂ ${Math.round(day.rain*10)/10} mm ${day.source==='Forecast'?'rain':'avg. rain'}</span>`:''}`;
 $('outfit-number').textContent=String(selected+1).padStart(2,'0');$('layer-count').textContent=`${outfit.layers} TOP / ${outfit.legLayers} LEG LAYERS · ${period==='day'?'DAY':'NIGHT'}`;$('outfit-name').textContent=outfit.name;mannequin.update(outfit);
 $('day-strip').innerHTML=stop.weather.map((d,i)=>`<button class="day-button" data-index="${i}" aria-pressed="${i===dayIndex}" aria-label="${escape(d.date)}, ${temp(period==='day'?d.high:d.low)}, ${d.source}"><span>${new Date(d.date+'T12:00:00').toLocaleDateString('en',{day:'numeric',month:'short'})}</span><strong>${temp(period==='day'?d.high:d.low)}</strong><span>${d.source==='Forecast'?'FCST':'EST.'}</span></button>`).join('');
 $('day-strip').querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{const scroll=$('day-strip').scrollLeft;dayIndex=Number(btn.dataset.index);renderResults();$('day-strip').scrollLeft=scroll;}));
 $('outfit-items').innerHTML=outfit.items.map(id=>`<div class="outfit-item"><span class="item-icon">${icon(clothing[id][2])}</span><span class="item-name">${clothing[id][0]}</span><span class="item-type">${clothing[id][1]}</span></div>`).join('')+(outfit.extreme?'<p class="extreme-note">Extreme temperatures — plan for exposure and time outdoors.</p>':'');
 renderPacking();map.update(planned,selected,period,temp,refit);
}
$('add-stop').addEventListener('click',()=>{const last=state.stops.at(-1);const start=last.start&&Number.isInteger(last.days)?addDays(last.start,last.days):addDays(dateISO(),7);state.stops.push(blank(start));changed();renderStops();document.querySelector('.stop-card:last-child .city-input').focus();});
$('trip-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const error=validateStops(state.stops);if(error){$('form-status').textContent=error;state.stops.forEach((s,i)=>{if(!s.city)$(`city-${i}`).setAttribute('aria-invalid','true');});return;}
 busy=true;const currentRevision=revision;const snapshot=structuredClone(state.stops);$('plan-button').disabled=true;$('plan-button').textContent='Checking the weather…';$('form-status').textContent='';
 try{
  // Two requests at a time to respect the public API's rate limits.
  const results=[];for(let i=0;i<snapshot.length;i+=2){results.push(...await Promise.all(snapshot.slice(i,i+2).map(async s=>({...s,weather:await weatherFor(s)}))));}
  if(currentRevision!==revision){$('form-status').textContent='Trip changed while loading. Find your layers again.';return;}
  planned=results;selected=0;dayIndex=0;save();renderResults(true);
  if(planned.some(s=>s.weather.some(d=>d.forecastUnavailable)))$('form-status').textContent='Forecast unavailable. Showing historical estimates.';
 }catch(error){$('form-status').textContent=error.name==='TimeoutError'?'Weather request timed out. Try again.':error.message||'Could not load weather. Try again.';}
 finally{busy=false;$('plan-button').disabled=false;$('plan-button').innerHTML='Find my layers <span>↗</span>';}
});
for(const key of ['sensitivity','activity']){$(key).value=state[key];$(key).addEventListener('change',e=>{state[key]=e.target.value;save();renderResults();});}
$('units').addEventListener('click',()=>{state.unit=state.unit==='C'?'F':'C';save();renderResults();});
for(const p of ['day','night'])$(p).addEventListener('click',()=>{period=p;renderResults();});
$('rotate-left').addEventListener('click',()=>mannequin.rotate(-.4));$('rotate-right').addEventListener('click',()=>mannequin.rotate(.4));$('fit-map').addEventListener('click',()=>map.fit());
$('copy-list').addEventListener('click',async()=>{const items=packingFor(planned,state.sensitivity,state.activity);if(!items.length){$('packing-status').textContent='Add a trip first.';return;}try{await navigator.clipboard.writeText(items.map(id=>`${state.checked.includes(id)?'☑':'☐'} ${clothing[id][0]}`).join('\n'));$('packing-status').textContent='Copied.';}catch{$('packing-status').textContent='Copy unavailable. Select the list to copy it.';}});
$('reset').addEventListener('click',()=>{revision++;state.stops=[blank()];state.checked=[];planned=[];selected=dayIndex=0;save();renderStops();$('stop-tabs').innerHTML='';$('day-strip').innerHTML='';$('outfit-items').innerHTML='<div class="empty-outfit">Your layers will appear here.</div>';$('weather-source').textContent='READY TO GO';$('temperature').innerHTML='—<sup>°</sup>';$('feels-label').textContent='Add your destination';$('weather-extras').innerHTML='';$('outfit-name').textContent='Where to?';$('layer-count').textContent='YOUR EVERYDAY KIT';$('form-status').textContent='';$('packing-status').textContent='';mannequin.update({level:2,items:['tee','sweater','trousers','sneakers'],name:'Everyday layers'});renderResults();});
$('about-open').addEventListener('click',()=>$('about').showModal());$('about-close').addEventListener('click',()=>$('about').close());$('about').addEventListener('click',e=>{if(e.target===$('about')){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();}});
renderStops();renderResults();
