import {getCatalog,resolveAssets} from './studio/storage.js';
import {createViewer,extension,reducedMotion} from './viewer.js';
import {initShell} from './shared.js';
initShell();
const $=selector=>document.querySelector(selector);
const loading=$('#model-loading'),status=$('#viewer-status');
let viewer,assets;
const fail=err=>{loading.hidden=true;status.textContent=err.message;status.classList.add('error-message');};
try{
  const catalog=await getCatalog(),params=new URLSearchParams(location.search);
  const id=params.get('id'),index=Number(params.get('i')||0);
  const model=id?catalog.find(m=>m.id===id):catalog.find(m=>!m.local&&m.index===index);
  if(!model)throw new Error('This model could not be found. Return to the playground to choose another piece.');
  $('#model-title').textContent=model.title;$('#model-description').textContent=model.description||'';
  $('#model-format').textContent=extension(model.modelName||model.file).toUpperCase()+' / '+(model.category||'INTERACTIVE 3D');
  $('#local-notice').hidden=!model.local;
  if(model.publishing)$('#local-notice').textContent='Published to GitHub. You’re seeing a local preview while GitHub Pages deploys the project. Its public link will work after deployment.';
  document.title=model.title+' — Zulfekar Ahmad';assets=resolveAssets(model);
  viewer=createViewer($('#model-scene'),{onError:fail,onLoad:({missing})=>{loading.hidden=true;status.textContent=missing.length?'Some companion files are missing: '+missing.join(', ')+'. Add them in the artist studio.':'Rendered in real time. Find your perspective.';}});
  if(viewer){await viewer.load({...assets,onProgress:p=>{loading.querySelector('span:last-child').textContent='Loading the model… '+p+'%';}});$('#auto-rotate').checked=!reducedMotion;}
  else if(assets.thumbnail){const image=document.createElement('img');image.src=assets.thumbnail;image.alt=model.title;image.style.height='100%';image.style.objectFit='contain';$('#model-scene').append(image);}
  $('#share-model').addEventListener('click',async()=>{if(model.local&&!model.publishing){status.textContent='Publish this local draft from the artist studio to create a shareable link.';return;}try{await navigator.clipboard.writeText(location.href);status.textContent=model.publishing?'Link copied. It will be available publicly after deployment.':'Model link copied.';}catch{status.textContent='Copy this model’s URL from the address bar to share it.';}});
}catch(err){fail(err);}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{viewer?.setMode(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});}));
$('#auto-rotate').addEventListener('change',e=>{if(viewer)viewer.controls.autoRotate=e.target.checked;});
$('#reset-view').addEventListener('click',()=>viewer?.reset());
const stage=$('#model-stage'),fullscreen=$('#fullscreen');
if(!stage.requestFullscreen)fullscreen.hidden=true;
fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{status.textContent='Fullscreen is not available in this browser.';}});
document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
window.addEventListener('pagehide',()=>{viewer?.dispose();assets?.revoke();},{once:true});
