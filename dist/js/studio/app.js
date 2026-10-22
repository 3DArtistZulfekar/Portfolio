import {createViewer,extension,reducedMotion} from '../viewer.js';
import {getDrafts,getDraft,saveDraft,deleteDraft,getCatalog,resolveAssets,modelHref} from './storage.js';
import {getConfig,connect,getConnection,disconnect,publishDraft} from './publish.js';
import {escapeHTML as esc,arrow,initShell,safeLink} from '../shared.js';
initShell();
const $=s=>document.querySelector(s),MAX=80*1024*1024;
let selected=null,companions=[],cover=null,editingId=null,viewer=null,urls=[],previewReady=false,loadGeneration=0,collectionAssets=[],busy=false;
const setStatus=(message,error=false)=>{const el=$('#studio-status');el.textContent=message;el.classList.toggle('error-message',error);};
const formatBytes=bytes=>bytes>=1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB';
function revokeURLs(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];}
function blobURL(blob){const url=URL.createObjectURL(blob);urls.push(url);return url;}
function validateFile(file){if(!file.size)throw new Error('“'+file.name+'” is empty. Select a valid file.');if(file.size>MAX)throw new Error('“'+file.name+'” exceeds 80 MB. Optimize the file and try again.');if(file.name==='studio-cover.png')throw new Error('Rename “studio-cover.png”; this name is reserved for the project cover.');}
function updateConnection(){const connection=getConnection();$('#connection-status').innerHTML='<span class="status-dot"></span>'+(connection?esc(connection.cfg.owner+'/'+connection.cfg.repo):'Local workspace');$('#connection-status').classList.toggle('connected',!!connection);$('#open-connection').innerHTML=connection?'Repository settings '+arrow:'Connect GitHub '+arrow;$('#disconnect').hidden=!connection;$('#draft-explainer').textContent=connection?'Save a private browser draft, or publish to '+connection.cfg.owner+'/'+connection.cfg.repo+'.':'Local drafts stay in this browser. Connect GitHub when you’re ready to publish.';}
function connectionPanel(show){$('#connection-panel').hidden=!show;$('#open-connection').setAttribute('aria-expanded',show);if(show){const cfg=getConnection()?.cfg||getConfig();$('#gh-owner').value=cfg.owner;$('#gh-repo').value=cfg.repo;$('#gh-branch').value=cfg.branch;$('#gh-owner').focus();$('#connection-panel').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});}}
$('#open-connection').addEventListener('click',()=>connectionPanel($('#connection-panel').hidden));$('#close-connection').addEventListener('click',()=>connectionPanel(false));
$('#disconnect').addEventListener('click',()=>{disconnect();$('#gh-token').value='';updateConnection();setStatus('GitHub disconnected. Your local drafts are still here.');});
$('#connection-form').addEventListener('submit',async e=>{e.preventDefault();const button=$('#connect-submit');button.disabled=true;button.textContent='Connecting…';$('#connection-error').textContent='';try{await connect({...getConfig(),owner:$('#gh-owner').value.trim(),repo:$('#gh-repo').value.trim(),branch:$('#gh-branch').value.trim()},$('#gh-token').value.trim());$('#gh-token').value='';connectionPanel(false);updateConnection();setStatus('GitHub connected. You can now publish your project.');}catch(err){$('#connection-error').textContent=err.message;}finally{button.disabled=false;button.textContent='Connect repository';}});
function renderCompanions(){
 $('#companion-list').innerHTML=companions.map((f,i)=>`<span class="companion-tag">${esc(f.name)}<button type="button" data-remove-companion="${i}" aria-label="Remove ${esc(f.name)}"><svg class="icon"><use href="#close"/></svg></button></span>`).join('');
 $('#companion-list').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{companions.splice(Number(button.dataset.removeCompanion),1);renderCompanions();if(selected)loadPreview();}));
}
function addCompanions(files){
 const allowed=['png','jpg','jpeg','webp','avif','bin','mtl','tga','bmp'];
 for(const file of files){validateFile(file);if(!allowed.includes(extension(file.name)))throw new Error('“'+file.name+'” is not a supported companion file. Use texture images, .bin, or .mtl files.');}
 for(const file of files){const existing=companions.findIndex(f=>f.name.toLowerCase()===file.name.toLowerCase());const item={name:file.name,blob:file};if(existing>=0)companions[existing]=item;else companions.push(item);}
 renderCompanions();
}
async function chooseFiles(files){
 if(busy)return;setStatus('');
 try{
  const models=files.filter(f=>['glb','gltf','fbx','obj'].includes(extension(f.name)));
  if(models.length>1)throw new Error('Add one model at a time, together with its textures and companion files.');
  if(!models.length&&!selected)throw new Error('Include a GLB, glTF, FBX, or OBJ model first.');
  const next=models[0];if(next)validateFile(next);
  addCompanions(files.filter(f=>f!==next));
  if(next){selected={name:next.name,blob:next};cover=null;$('#cover-note').textContent='We’ll capture the current angle automatically when you save.';if(!$('#project-title').value)$('#project-title').value=next.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');}
  updateSelected();await loadPreview();
 }catch(err){setStatus(err.message,true);}
}
function updateSelected(){const has=!!selected;$('#selected-file').hidden=!has;$('#drop-zone').hidden=has;if(has){$('#selected-name').textContent=selected.name;$('#selected-size').textContent=formatBytes(selected.blob.size);$('#preview-format').textContent=extension(selected.name).toUpperCase()+' / REAL-TIME';}}
async function loadPreview(){
 const token=++loadGeneration;previewReady=false;$('#preview-feedback').textContent='';$('#preview-loading').hidden=false;$('#preview-placeholder').hidden=true;
 viewer?.dispose();viewer=null;revokeURLs();
 if(!selected)return;
 viewer=createViewer($('#studio-scene'),{onError:err=>{if(token!==loadGeneration)return;$('#preview-feedback').textContent='Couldn’t preview this model. '+err.message;$('#preview-feedback').classList.add('error-message');$('#preview-loading').hidden=true;}});
 if(!viewer){$('#preview-loading').hidden=true;return;}
 try{
  const result=await viewer.load({url:blobURL(selected.blob),format:selected.name,textures:companions.map(f=>({name:f.name,url:blobURL(f.blob)})),onProgress:p=>{if(token===loadGeneration)$('#preview-loading').textContent='Loading your model… '+p+'%';}});
  if(token!==loadGeneration)return;
  previewReady=true;$('#preview-feedback').classList.remove('error-message');$('#preview-feedback').textContent=result?.missing.length?'Missing files: '+result.missing.join(', ')+'. Add them above to complete the materials.':'Model loaded. Rotate to your favorite angle; that becomes your cover.';
 }catch(err){if(token!==loadGeneration)return;$('#preview-feedback').classList.add('error-message');$('#preview-feedback').textContent='Couldn’t load the model. '+err.message+' Check companion files, or try exporting an uncompressed GLB.';}
 finally{if(token===loadGeneration)$('#preview-loading').hidden=true;}
}
for(const selector of ['#model-file','#replace-model'])$(selector).addEventListener('change',e=>{if(e.target.files[0])chooseFiles(Array.from(e.target.files));e.target.value='';});
$('#companion-files').addEventListener('change',e=>{if(busy)return;try{addCompanions(Array.from(e.target.files));if(selected)loadPreview();}catch(err){setStatus(err.message,true);}e.target.value='';});
const drop=$('#drop-zone');
for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover');});
for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover');});
drop.addEventListener('drop',e=>chooseFiles(Array.from(e.dataTransfer.files)));
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});window.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
$('#cover-file').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;try{validateFile(file);if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG, or WebP cover image.');cover=file;$('#cover-note').textContent='Cover ready: '+file.name;}catch(err){setStatus(err.message,true);}e.target.value='';});
$('#capture-cover').addEventListener('click',async()=>{try{if(!previewReady)throw new Error('Load a model before capturing its cover.');cover=await viewer.capture();$('#cover-note').textContent='Current view captured. This angle will be your project cover.';setStatus('Cover captured. Save your draft to keep it.');}catch(err){setStatus(err.message,true);}});
document.querySelectorAll('[data-preview-mode]').forEach(button=>button.addEventListener('click',()=>{viewer?.setMode(button.dataset.previewMode);document.querySelectorAll('[data-preview-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});}));
async function persistDraft(){
 if(!$('#project-form').reportValidity())return null;
 if(!selected)throw new Error('Add a 3D model before saving your project.');
 if(!previewReady)throw new Error('Wait for a successful model preview before saving. Check any missing companion files above.');
 if(!cover){try{cover=await viewer.capture();}catch{}}
 const previous=editingId?await getDraft(editingId):null;
 const draft={id:editingId||'project-'+crypto.randomUUID(),title:$('#project-title').value.trim(),type:extension(selected.name).toUpperCase(),category:$('#project-category').value,description:$('#project-description').value.trim(),modelName:selected.name,modelBlob:selected.blob,companions,coverBlob:cover,createdAt:previous?.createdAt||Date.now(),updatedAt:Date.now()};
 if(!draft.title)throw new Error('Give your project a title before saving.');
 await saveDraft(draft);editingId=draft.id;$('#new-project').hidden=false;$('#editor-title').textContent='MAKE IT YOURS.';return draft;
}
function setBusy(value){busy=value;$('#save-draft').disabled=value;$('#publish-project').disabled=value;$('#project-form').querySelectorAll('input,select,textarea').forEach(el=>el.disabled=value);}
$('#project-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const draft=await persistDraft();if(!draft)return;setStatus('Draft saved in this browser. Open the playground to explore it, or publish when you’re ready.');await renderCollection();}catch(err){setStatus(err.message,true);}finally{setBusy(false);}});
$('#publish-project').addEventListener('click',async()=>{
 if(busy)return;
 if(!getConnection()){connectionPanel(true);setStatus('Connect your GitHub repository to publish. You can save a local draft at any time.');return;}
 setBusy(true);try{const draft=await persistDraft();if(!draft)return;await publishDraft(draft,message=>setStatus(message));await saveDraft({...draft,publishedAt:Date.now()});setStatus('Published to GitHub. Your site will update after its GitHub Pages deployment completes.');resetEditor(false);await renderCollection();}catch(err){setStatus(err.message+' Your local draft is saved if it was valid.',true);}finally{setBusy(false);}
});
function resetEditor(clearStatus=true){if(busy&&clearStatus)return;loadGeneration++;viewer?.dispose();viewer=null;revokeURLs();selected=null;companions=[];cover=null;editingId=null;previewReady=false;$('#project-form').reset();$('#editor-title').textContent='ADD SOMETHING GREAT.';$('#new-project').hidden=true;$('#preview-placeholder').hidden=false;$('#preview-loading').hidden=true;$('#preview-feedback').textContent='';$('#preview-format').textContent='YOUR NEXT PIECE';$('#cover-note').textContent='We’ll capture the current angle automatically when you save.';document.querySelectorAll('[data-preview-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.previewMode==='material');b.setAttribute('aria-pressed',b.dataset.previewMode==='material');});renderCompanions();updateSelected();if(clearStatus)setStatus('');}
$('#new-project').addEventListener('click',()=>resetEditor());
async function editProject(id){if(busy)return;const draft=await getDraft(id);if(!draft){setStatus('This draft no longer exists.',true);return;}resetEditor();editingId=draft.id;selected={name:draft.modelName,blob:draft.modelBlob};companions=draft.companions||[];cover=draft.coverBlob;$('#project-title').value=draft.title;$('#project-description').value=draft.description;$('#project-category').value=draft.category||'Other';$('#editor-title').textContent='MAKE IT YOURS.';$('#new-project').hidden=false;$('#cover-note').textContent=cover?'Saved cover attached. Capture a new angle to replace it.':'The current view will become your cover.';renderCompanions();updateSelected();$('#editor-title').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});await loadPreview();}
async function renderCollection(){
 collectionAssets.forEach(a=>a.revoke());collectionAssets=[];
 try{
  const models=await getCatalog();$('#collection-count').textContent=models.length+' PIECES';
  $('#studio-collection-list').innerHTML=models.length?models.map(m=>{const a=resolveAssets(m);collectionAssets.push(a);return `<div class="collection-row"><div class="collection-thumb">${a.thumbnail?`<img src="${esc(safeLink(a.thumbnail))}" alt="${esc(m.title)}" loading="lazy">`:'<svg class="icon"><use href="#cube"/></svg>'}</div><div class="collection-info"><h3>${esc(m.title)}</h3><p>${esc(extension(m.modelName||m.file).toUpperCase())} · ${m.publishing?'PUBLISHED · DEPLOYING':m.local?'LOCAL DRAFT':'PUBLISHED COLLECTION'}</p></div><div class="collection-row-actions"><a href="${esc(modelHref(m))}">View ${arrow}</a>${m.local&&!m.publishing?`<button type="button" class="button-quiet" data-edit="${esc(m.id)}">Edit</button><button type="button" class="button-quiet delete-draft" data-delete="${esc(m.id)}">Delete</button>`:''}</div></div>`;}).join(''):'<p class="collection-empty">Your collection starts here. Add your first model above.</p>';
  document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>editProject(button.dataset.edit).catch(err=>setStatus(err.message,true))));
  document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{if(busy)return;const id=button.dataset.delete;const row=button.closest('.collection-row');const draft=await getDraft(id);if(!draft||!confirm('Delete the local draft “'+draft.title+'”?'))return;await deleteDraft(id);if(editingId===id)resetEditor();await renderCollection();setStatus('Local draft deleted.');}));
 }catch(err){$('#studio-collection-list').innerHTML='<p class="collection-empty">The collection could not load. Refresh to try again.</p>';}
}
updateConnection();await renderCollection();
window.addEventListener('pagehide',()=>{viewer?.dispose();revokeURLs();collectionAssets.forEach(a=>a.revoke());},{once:true});
