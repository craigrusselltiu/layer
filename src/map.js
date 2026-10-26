import L from 'leaflet';
import { unwrapRoute } from './wardrobe.js';
export function createMap(id,onSelect){
 const map=L.map(id,{zoomControl:false,scrollWheelZoom:false,worldCopyJump:false,minZoom:1,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([28,30],2);
 L.control.zoom({position:'bottomright'}).addTo(map);
 const tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:18}).addTo(map);
 let tileErrors=0;
 tile.on('tileerror',()=>{if(++tileErrors===3){const note=document.createElement('div');note.className='map-error';note.textContent='Map tiles unavailable. Your route is still shown.';document.getElementById(id).append(note);}});
 tile.on('load',()=>{if(!tileErrors)document.querySelector('.map-error')?.remove();});
 const layers=L.layerGroup().addTo(map);let route=[];
 const color=temp=>temp<0?'#6b9dcd':temp<10?'#9dc8b0':temp<20?'#d4d87e':temp<28?'#e8b177':'#d5806c';
 function fit(){if(route.length===1)map.setView(route[0],6,{animate:false});else if(route.length>1)map.fitBounds(L.latLngBounds(route),{padding:[40,50],maxZoom:7,animate:false});}
 function update(stops,selected,period,format,refit=false){
  layers.clearLayers();route=unwrapRoute(stops);
  if(route.length>1){L.polyline(route,{color:'#fbfceb',weight:5,opacity:.8}).addTo(layers);L.polyline(route,{color:'#557d62',weight:2,dashArray:'5 7'}).addTo(layers);}
  stops.forEach((s,i)=>{
   const values=(s.weather||[]).map(d=>period==='day'?d.high:d.low).filter(Number.isFinite);const temp=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
   if(temp!==null)L.marker(route[i],{interactive:false,keyboard:false,icon:L.divIcon({className:'heat-marker',html:`<div class="heat-disc" style="--heat:${color(temp)}"></div>`,iconSize:[110,110],iconAnchor:[55,55]})}).addTo(layers);
   const marker=L.marker(route[i],{title:s.city.name,icon:L.divIcon({className:'heat-marker',html:`<div class="map-pin" style="${i===selected?'background:#d9edb4;border-color:#2d563d':''}">${i+1}</div>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(layers);
   const label=document.createElement('span');label.textContent=`${s.city.name}${temp!==null?' · '+format(temp):''}`;marker.bindTooltip(label,{permanent:true,direction:'top',offset:[0,-15],className:'city-tooltip'});marker.on('click',()=>onSelect(i));
  });
  if(refit)fit();
 }
 new ResizeObserver(()=>map.invalidateSize()).observe(document.getElementById(id));return {update,fit};
}
