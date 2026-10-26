import { test,expect } from '@playwright/test';
import { dateISO,addDays } from '../../src/wardrobe.js';
const today=dateISO();
const cities=[{name:'Tokyo',latitude:35.68,longitude:139.69,country:'Japan',admin1:'Tokyo'},{name:'Sapporo',latitude:43.06,longitude:141.35,country:'Japan',admin1:'Hokkaido'},{name:'Honolulu',latitude:21.30,longitude:-157.85,country:'United States',admin1:'Hawaii'}];
async function fixtures(page){
 await page.route('**/geocoding-api.open-meteo.com/**',route=>{const query=new URL(route.request().url()).searchParams.get('name').toLowerCase();return route.fulfill({json:{results:cities.filter(c=>c.name.toLowerCase().includes(query))}});});
 await page.route('**/api.open-meteo.com/**',route=>{const cold=new URL(route.request().url()).searchParams.get('latitude')==='43.06';return route.fulfill({json:{daily:{time:Array.from({length:16},(_,i)=>addDays(today,i)),apparent_temperature_max:Array(16).fill(cold?4:18),apparent_temperature_min:Array(16).fill(cold?-7:10),temperature_2m_max:Array(16).fill(cold?7:20),temperature_2m_min:Array(16).fill(cold?-3:13),precipitation_sum:Array(16).fill(cold?2:0),wind_speed_10m_max:Array(16).fill(18)}}});});
 await page.route('**/archive-api.open-meteo.com/**',route=>{const year=new Date().getFullYear()-1;const times=Array.from({length:365},(_,i)=>addDays(`${year}-01-01`,i));return route.fulfill({json:{daily:{time:times,apparent_temperature_max:Array(365).fill(12),apparent_temperature_min:Array(365).fill(3),temperature_2m_max:Array(365).fill(15),temperature_2m_min:Array(365).fill(5),precipitation_sum:Array(365).fill(.8),wind_speed_10m_max:Array(365).fill(14)}}});});
}
async function city(page,index,name){await page.locator(`#city-${index}`).fill(name);await page.getByRole('option').filter({hasText:name}).first().click();}
test('multi-city outfits, night layers, packing, preferences, persistence and reset',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await fixtures(page);await page.goto('/');
 await city(page,0,'Tokyo');await page.locator('#start-0').fill(addDays(today,1));await page.getByRole('button',{name:'Add a stop'}).click();await city(page,1,'Sapporo');await page.getByRole('button',{name:'Find my layers'}).click();
 await expect(page.locator('#outfit-name')).toHaveText('Take a light layer');await expect(page.locator('#packing-list')).toContainText('Thermal top');await expect(page.locator('#packing-list')).toContainText('Thermal leggings');await expect(page.locator('#weather-source')).toHaveText('Forecast');
 await page.getByRole('button',{name:'Night',exact:true}).click();await expect(page.locator('#outfit-name')).toHaveText('A few good layers');
 await page.getByRole('tab',{name:/Sapporo/}).click();await expect(page.locator('#outfit-name')).toHaveText('Proper winter layers');await expect(page.locator('#outfit-items')).toContainText('Gloves');
 await page.getByRole('button',{name:'Change temperature unit'}).click();await expect(page.locator('#temperature')).toHaveText('19°F');
 await page.locator('#packing-list input').first().check();await page.locator('#sensitivity').selectOption('cold');await expect(page.locator('#packing-list input').first()).toBeChecked();
 await page.getByRole('button',{name:'Day',exact:true}).click();await page.getByRole('tab',{name:/Tokyo/}).click();await page.getByRole('button',{name:'Change temperature unit'}).click();await page.locator('#sensitivity').selectOption('normal');
 await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 await page.reload();await expect(page.locator('#city-0')).toHaveValue('Tokyo, Japan');await expect(page.locator('#city-1')).toHaveValue('Sapporo, Japan');await page.getByRole('button',{name:'Find my layers'}).click();await expect(page.locator('#packing-list input').first()).toBeChecked();
 await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.locator('.stop-card')).toHaveCount(1);await expect(page.locator('#temperature')).toHaveText('—°');expect(errors).toEqual([]);
});
test('mobile, long-range estimates and input validation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixtures(page);await page.goto('/');await page.getByRole('button',{name:'Find my layers'}).click();await expect(page.locator('#form-status')).toContainText('Choose a city');
 await city(page,0,'Tokyo');await page.locator('#start-0').fill(addDays(today,45));await page.getByRole('button',{name:'Find my layers'}).click();await expect(page.locator('#weather-source')).toHaveText('Historical estimate');
 await expect(page.locator('#outfit-name')).toHaveText('A few good layers');await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();await page.getByRole('button',{name:'About weather and clothing estimates'}).click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
});
test('failed services show errors, never invented forecasts',async({page})=>{
 await fixtures(page);await page.route('**/api.open-meteo.com/**',route=>route.fulfill({status:503,json:{}}));await page.goto('/');await city(page,0,'Tokyo');await page.getByRole('button',{name:'Find my layers'}).click();await expect(page.locator('#weather-source')).toHaveText('Historical estimate');await expect(page.locator('#form-status')).toContainText('Forecast unavailable');
 await page.route('**/archive-api.open-meteo.com/**',route=>route.fulfill({status:503,json:{}}));await page.reload();await page.getByRole('button',{name:'Find my layers'}).click();await expect(page.locator('#form-status')).toContainText('Weather could not be loaded');await expect(page.locator('#temperature')).toHaveText('—°');
});
test('minus 20 shows two leg layers in outfit, mannequin and packing list',async({page})=>{
 await fixtures(page);
 await page.route('**/api.open-meteo.com/**',route=>route.fulfill({json:{daily:{time:Array.from({length:16},(_,i)=>addDays(today,i)),apparent_temperature_max:Array(16).fill(-20),apparent_temperature_min:Array(16).fill(-25),precipitation_sum:Array(16).fill(0)}}}));
 await page.goto('/');await city(page,0,'Sapporo');await page.getByRole('button',{name:'Find my layers'}).click();
 await expect(page.locator('#temperature')).toHaveText('-20°C');
 await expect(page.locator('#layer-count')).toHaveText('3 TOP / 2 LEG LAYERS · DAY');
 for(const selector of ['#outfit-items','#packing-list']){
  await expect(page.locator(selector)).toContainText('Thermal leggings');
  await expect(page.locator(selector)).toContainText('Insulated windproof trousers');
 }
 await expect(page.locator('#mannequin')).toHaveAttribute('aria-label',/Thermal leggings, Insulated windproof trousers/);
 await page.locator('#sensitivity').selectOption('warm');await page.locator('#activity').selectOption('active');
 await expect(page.locator('#layer-count')).toContainText('2 LEG LAYERS');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/cold-layers-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
