import {createViewer,reducedMotion} from './viewer.js';
import {escapeHTML as esc,safeLink} from './shared.js';
const hero=document.querySelector('#hero-scene');
const loading=hero.querySelector('.scene-loading');
const showError=err=>{loading.textContent='Explore the selected work below. Interactive 3D is unavailable in this browser.';loading.classList.add('fallback-caption');hero.style.background='url("assets/website/helmet-fallback.png") center / contain no-repeat';hero.dataset.state='error';console.warn(err);};
const viewer=createViewer(hero,{hero:true,onError:showError,onLoad:()=>{loading.hidden=true;}});
viewer?.load({url:'assets/models/dggg/Helmet.fbx',heroStyle:true}).catch(showError);
document.querySelectorAll('[data-hero-mode]').forEach(button=>button.addEventListener('click',()=>{
  viewer?.setMode(button.dataset.heroMode);
  document.querySelectorAll('[data-hero-mode]').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);});
}));
const updateTime=()=>{document.querySelector('[data-time]').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' IST';};updateTime();setInterval(updateTime,60000);
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
// Start the second scene only when it approaches the viewport.
const playground=document.querySelector('#playground-scene');
const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)return;observer.disconnect();const pebble=createViewer(playground,{decorative:true,onError:()=>{playground.innerHTML='<img class="pebble-fallback" src="assets/models/covers/model-3.png" alt="Pebble form study">';}});pebble?.load({url:'assets/models/study_pebble.glb',heroStyle:true}).catch(()=>{});},{rootMargin:'200px'});observer.observe(playground);
fetch('data/personal.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
  const list=document.querySelector('#production-list');
  const projects=data.live_projects||[];
  list.innerHTML=projects.map((p,i)=>`<a class="production-row" href="${esc(safeLink(p.url))}" target="_blank" rel="noopener" ${i>=4?'hidden':''}><h3>${esc(p.title)}</h3><span>${esc(p.type)}</span><svg class="icon"><use href="#arrow-up-right"/></svg></a>`).join('');
  if(projects.length>4){const toggle=document.createElement('button');toggle.type='button';toggle.className='button-quiet production-toggle';toggle.textContent=`All ${projects.length} live projects +`;toggle.setAttribute('aria-expanded','false');toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';list.querySelectorAll('.production-row').forEach((row,i)=>{if(i>=4)row.hidden=expanded;});toggle.setAttribute('aria-expanded',String(!expanded));toggle.textContent=expanded?`All ${projects.length} live projects +`:'Show fewer projects −';});list.after(toggle);}
  document.querySelector('#tools-list').innerHTML=(data.hard_skills||[]).map(t=>`<span>${esc(t)}</span>`).join('');
  document.querySelector('#experience-list').innerHTML=(data.professional_experience||[]).map(e=>`<div class="experience-row"><strong>${esc(e.company)}</strong><span>${esc(e.job_title)}</span><span>${esc(e.period)}</span></div>`).join('');
}).catch(()=>{document.querySelector('#production-list').innerHTML='<p class="notice">The project list couldn’t load. <a href="https://www.artstation.com/zulfekarahmad15">Explore the work on ArtStation.</a></p>';});
if(!reducedMotion&&'animate' in Element.prototype){
  const title=document.querySelector('.hero-title');title.animate([{transform:'translateY(24px)',opacity:.65},{transform:'translateY(0)',opacity:1}],{duration:1400,easing:'cubic-bezier(.16,1,.3,1)'});
}
window.addEventListener('pagehide',()=>viewer?.dispose(),{once:true});
