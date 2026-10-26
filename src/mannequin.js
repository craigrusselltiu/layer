import * as THREE from 'three';
import { clothing } from './wardrobe.js';
export function createMannequin(container){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{
  container.innerHTML='<svg class="fallback-mannequin" viewBox="0 0 200 320" aria-hidden="true"><ellipse cx="100" cy="300" rx="65" ry="12" fill="#5b7855" opacity=".2"/><path d="m73 152-4 123h23l8-99 8 99h23l-4-123" fill="#77836a"/><path id="fallback-shirt" d="m65 69 35-12 35 12 23 87-19 5-14-53 5 63H70l5-63-14 53-19-5z" fill="#d9e4b3"/><path d="m87 48 1 18h24l1-18" fill="#c1c9b2"/><path d="m80 13 20-7 20 7 4 24-10 20H86L76 37z" fill="#c8d1b9"/><path d="m68 273-8 18h34v-18m14 0v18h34l-10-18" fill="#e8ecd7"/></svg>';
  return {update(outfit){container.querySelector('#fallback-shirt').setAttribute('fill',outfit.level>=4?'#496151':outfit.level>=2?'#bdc79a':'#e6e9ce');const pants=container.querySelector('svg path');pants.setAttribute('stroke',outfit.items.includes('insulatedPants')?'#526452':'none');pants.setAttribute('stroke-width','7');container.setAttribute('aria-label',`${outfit.name}: ${outfit.items.map(id=>clothing[id][0]).join(', ')}. 3D is unavailable.`);},rotate(){}};
 }
 renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(renderer.domElement);
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(31,1,.1,100);camera.position.set(0,2.1,7.6);camera.lookAt(0,1.53,0);
 scene.add(new THREE.HemisphereLight(0xfaffde,0x5b7765,3));const light=new THREE.DirectionalLight(0xffffff,3.1);light.position.set(-3,6,5);scene.add(light);const rim=new THREE.DirectionalLight(0xd7f5c5,2);rim.position.set(3,3,-2);scene.add(rim);
 const root=new THREE.Group();root.position.set(.18,.34,0);root.rotation.y=-.27;scene.add(root);const body=new THREE.Group();root.add(body);
 const material=(color)=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.9,metalness:0});
 const skin=material('#bbc8af'),shirt=material('#e2e7c7'),pants=material('#7d8b72'),shoe=material('#e5e9d5'),sole=material('#a2af96'),dark=material('#3f554a'),outer=material('#617967'),trim=material('#aebd8d');
 function mesh(geo,mat,x,y,z,parent=body){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
 function box(w,h,d,mat,x,y,z,parent=body){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
 function cylinder(rt,rb,h,segments,mat,x,y,z,parent=body){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat,x,y,z,parent);}
 // Angular, deliberately low-poly proportions and neutral mannequin face.
 const head=mesh(new THREE.IcosahedronGeometry(.255,0),skin,0,2.73,0);head.scale.set(.82,1.22,.88);
 cylinder(.095,.11,.2,6,skin,0,2.42,0);
 const torso=cylinder(.36,.28,.71,4,shirt,0,2.02,0);torso.rotation.y=Math.PI/4;torso.scale.z=.65;
 const hips=box(.49,.21,.31,pants,0,1.56,0);
 const lowerLegs=[],upperLegs=[];
 for(const side of [-1,1]){
  const upper=cylinder(.115,.1,.54,5,pants,side*.14,1.23,0);upper.rotation.z=side*-.025;upperLegs.push(upper);
  lowerLegs.push(cylinder(.10,.075,.55,5,pants,side*.15,.71,.015));
  box(.20,.15,.37,shoe,side*.15,.39,.09);box(.205,.055,.38,sole,side*.15,.30,.09);
  const arm=new THREE.Group();arm.position.set(side*.36,2.26,0);arm.rotation.z=side*.14;body.add(arm);
  cylinder(.115,.085,.43,5,shirt,side*.035,-.17,0,arm);
  cylinder(.08,.065,.43,5,skin,side*.08,-.57,.015,arm);
  mesh(new THREE.IcosahedronGeometry(.092,0),skin,side*.09,-.82,.02,arm).scale.set(.8,1.3,.85);
 }
 const clothes=new THREE.Group();body.add(clothes);
 const platform=cylinder(.77,.79,.12,48,material('#99b087'),0,.20,0,root);platform.material.roughness=.6;
 const disc=cylinder(.73,.73,.025,48,material('#c6d6ab'),0,.275,0,root);
 const ring=mesh(new THREE.TorusGeometry(.8,.012,5,64),material('#ebf7c9'),0,.23,0,root);ring.rotation.x=Math.PI/2;
 function clearClothes(){while(clothes.children.length){const m=clothes.children[0];clothes.remove(m);m.geometry?.dispose();}}
 function update(outfit){
  clearClothes();const level=outfit.level;const ids=outfit.items;
  shirt.color.set(level>=4?'#c3cfad':level>=2?'#c7d0a0':'#e7ead0');pants.color.set(level>=4?'#526452':'#7d8b72');shoe.color.set(level>=5?'#49584a':'#e5e9d5');
  for(const leg of lowerLegs)leg.material=level===0?skin:pants;
  const legWidth=ids.includes('insulatedPants')?1.3:ids.includes('lined')?1.12:1;
  for(const leg of [...upperLegs,...lowerLegs])leg.scale.set(legWidth,1,legWidth);
  hips.scale.x=ids.includes('insulatedPants')?1.1:1;
  if(ids.includes('thermalLeggings'))for(const side of [-1,1]){
   cylinder(.10,.09,.09,5,dark,side*.15,.65,.015,clothes);
   if(ids.includes('insulatedPants'))box(.12,.16,.025,dark,side*.15,1.05,.135,clothes);
  }
  if(level>=2){
   const coatColor=level>=5?'#455d50':level>=3?'#708365':'#b9c58e';outer.color.set(coatColor);
   const jacket=cylinder(level>=4?.40:.37,level>=4?.37:.3,level>=5?.98:.75,4,outer,0,level>=5?1.94:2.02,0,clothes);jacket.rotation.y=Math.PI/4;jacket.scale.z=.72;
   for(const side of [-1,1]){const sleeve=cylinder(.135,.09,.80,5,outer,side*.435,1.91,0,clothes);sleeve.rotation.z=side*.14;}
   box(.022,level>=5?.86:.67,.015,trim,0,level>=5?1.94:2.03,.215,clothes);
   for(const side of [-1,1]){box(.12,.13,.025,outer,side*.15,1.82,.22,clothes);const collar=box(.12,.21,.05,outer,side*.08,2.34,.16,clothes);collar.rotation.z=side*.4;}
   if(level>=4) for(let y=1.68;y<2.25;y+=.15)box(.48,.012,.016,dark,0,y,.22,clothes);
  }
  if(ids.includes('beanie')){const hat=mesh(new THREE.SphereGeometry(.26,6,3,0,Math.PI*2,0,Math.PI/2),outer,0,2.80,0,clothes);hat.scale.set(.86,.9,.87);cylinder(.235,.235,.08,6,outer,0,2.80,0,clothes);}
  if(ids.includes('scarf')){cylinder(.16,.17,.15,6,trim,0,2.40,0,clothes);box(.12,.44,.065,trim,.13,2.20,.25,clothes);}
  if(ids.includes('gloves'))for(const side of [-1,1])mesh(new THREE.IcosahedronGeometry(.10,0),dark,side*.56,1.44,.02,clothes).scale.set(.8,1.3,.85);
  if(ids.includes('boots'))for(const side of [-1,1])cylinder(.103,.105,.27,5,dark,side*.15,.48,.025,clothes);
  if(ids.includes('shell')&&level<3){const shell=cylinder(.38,.33,.77,4,outer,0,2.02,0,clothes);shell.rotation.y=Math.PI/4;shell.scale.z=.72;for(const side of [-1,1]){const sleeve=cylinder(.13,.09,.8,5,outer,side*.435,1.91,0,clothes);sleeve.rotation.z=side*.14;}box(.02,.67,.02,trim,0,2.02,.23,clothes);}
  container.setAttribute('aria-label',`${outfit.name}. Rotatable mannequin wearing ${ids.map(id=>clothing[id][0]).join(', ')}. Use arrow keys to rotate.`);draw();
 }
 function draw(){renderer.render(scene,camera);}
 function resize(){const width=container.clientWidth,height=container.clientHeight;renderer.setSize(Math.round(width*.8),Math.round(height*.8),false);camera.aspect=width/height;camera.updateProjectionMatrix();draw();}
 new ResizeObserver(resize).observe(container);
 let dragging=false,lastX=0;container.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;container.setPointerCapture(e.pointerId);});container.addEventListener('pointermove',e=>{if(dragging){root.rotation.y+=(e.clientX-lastX)*.012;lastX=e.clientX;draw();}});for(const event of ['pointerup','pointercancel'])container.addEventListener(event,()=>dragging=false);
 const rotate=(amount)=>{root.rotation.y+=amount;draw();};container.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();rotate(e.key==='ArrowLeft'?-.3:.3);}});
 update({level:2,items:['tee','sweater','trousers','sneakers'],name:'Everyday layers'});resize();return {update,rotate};
}
