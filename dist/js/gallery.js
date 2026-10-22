import {getCatalog,resolveAssets,modelHref} from './studio/storage.js';
import {escapeHTML as esc,arrow,initShell,safeLink} from './shared.js';
import {extension} from './viewer.js';
initShell();
const grid=document.querySelector('#model-gallery');let models=[],assets=[];
function render(filter='all'){
  assets.forEach(a=>a.revoke());assets=[];
  const filtered=models.filter(m=>{const ext=extension(m.modelName||m.file);return filter==='all'||(filter==='glb'?['glb','gltf'].includes(ext):filter===ext);});
  if(!filtered.length){grid.innerHTML='<div class="empty-state"><h2>NOTHING IN THIS DIMENSION. YET.</h2><p>Try another format, or add a model from the artist studio.</p></div>';return;}
  grid.innerHTML=filtered.map(m=>{
    const a=resolveAssets(m);assets.push(a);const ext=extension(m.modelName||m.file).toUpperCase();
    return `<a class="model-card" href="${esc(modelHref(m))}" aria-label="Explore ${esc(m.title)}"><div class="model-card-art">${a.thumbnail?`<img src="${esc(safeLink(a.thumbnail))}" alt="${esc(m.title)}" loading="lazy">`:`<div class="model-placeholder"><svg class="icon" viewBox="0 0 24 24"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10"/></svg></div>`}<span class="model-card-format">${esc(ext)} / INTERACTIVE 3D</span>${m.local?'<span class="draft-label">'+(m.publishing?'DEPLOYING':'LOCAL DRAFT')+'</span>':''}<span class="project-open">${arrow}</span></div><h2>${esc(m.title)}</h2><p>${esc(m.description)}</p></a>`;
  }).join('');
  grid.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.replaceWith(Object.assign(document.createElement('div'),{className:'model-placeholder',textContent:'3D'}));},{once:true}));
}
try{models=await getCatalog();render();}catch(err){grid.innerHTML=`<div class="empty-state"><h2>THE COLLECTION COULDN’T LOAD.</h2><p>${esc(err.message)}</p><button class="button button-secondary" onclick="location.reload()">Try again</button></div>`;}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});render(button.dataset.filter);}));
window.addEventListener('pagehide',()=>assets.forEach(a=>a.revoke()),{once:true});
