import {getConfig,saveConfig} from '../github.js';
export {getConfig,saveConfig};
export const getConnection=()=>{try{return JSON.parse(sessionStorage.getItem('zulf-studio-connection')||'null');}catch{return null;}};
export function disconnect(){sessionStorage.removeItem('zulf-studio-connection');}
async function request(path,token,{method='GET',body}={}){
  let response;try{response=await fetch('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(120000)});}catch{throw new Error('GitHub could not be reached. Your draft is safe; check your connection and try again.');}
  if(!response.ok){let message='';try{message=(await response.json()).message||'';}catch{}if(response.status===401)throw new Error('The token was rejected. Reconnect with a valid GitHub token.');if(response.status===403||response.status===404)throw new Error('GitHub access was denied. Check the repository, branch, and token’s Contents read/write permission.');if(response.status===422||response.status===409)throw new Error('The repository changed or GitHub rejected the upload. Reconnect and publish again; your draft is safe. '+message);throw new Error('GitHub returned '+response.status+'. '+message);}
  return response.status===204?null:response.json();
}
const repoBase=cfg=>'/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo);
export async function connect(cfg,token){
  if(!/^[\w.-]+$/.test(cfg.owner)||!/^[\w.-]+$/.test(cfg.repo)||!cfg.branch.trim())throw new Error('Enter a valid owner, repository, and branch.');
  const base=repoBase(cfg);await request(base+'/branches/'+encodeURIComponent(cfg.branch),token);
  const repo=await request(base,token);if(repo.permissions&&repo.permissions.push===false)throw new Error('This GitHub account does not have write access to the repository.');
  const connection={cfg:{...getConfig(),...cfg},token};sessionStorage.setItem('zulf-studio-connection',JSON.stringify(connection));saveConfig(connection.cfg);return connection;
}
const base64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('The file could not be read. Select it again.'));r.readAsDataURL(blob);});
const clean=name=>name.replace(/[<>:"|?*\x00-\x1F]/g,'_').replaceAll('\\','/').split('/').filter(s=>s&&s!=='.'&&s!=='..').join('/');
export async function publishDraft(draft,onProgress=()=>{}){
  const connection=getConnection();if(!connection)throw new Error('Connect GitHub before publishing.');
  const {cfg,token}=connection,base=repoBase(cfg);
  onProgress('Reading the latest portfolio…');
  const branch=await request(base+'/branches/'+encodeURIComponent(cfg.branch),token);
  const parent=branch.commit.sha;
  const commit=await request(base+'/git/commits/'+parent,token);
  let manifest={models:[]};
  try{const file=await request(base+'/contents/'+cfg.jsonPath+'?ref='+encodeURIComponent(parent),token);const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));manifest=JSON.parse(new TextDecoder().decode(bytes));}catch(err){throw new Error('The model catalog could not be read from the selected branch. Check that '+cfg.jsonPath+' exists. '+err.message);}
  const existing=Array.isArray(manifest)?manifest:manifest.models;if(!Array.isArray(existing))throw new Error('The repository’s model catalog has an unsupported format.');
  if(existing.some(m=>m.id===draft.id)){sessionStorage.setItem('zulf-published-models',JSON.stringify(existing));return existing;}
  const folder=cfg.modelsDir+'/'+draft.id;
  const files=[{name:draft.modelName,blob:draft.modelBlob},...(draft.companions||[]),...(draft.coverBlob?[{name:'studio-cover.png',blob:draft.coverBlob}]:[])];
  const tree=[];
  for(let i=0;i<files.length;i++){
    const f=files[i];onProgress(`Uploading file ${i+1} of ${files.length}: ${f.name}`);
    const blob=await request(base+'/git/blobs',token,{method:'POST',body:{encoding:'base64',content:await base64(f.blob)}});
    tree.push({path:folder+'/'+clean(f.name),mode:'100644',type:'blob',sha:blob.sha});
  }
  const model={id:draft.id,title:draft.title,type:draft.type,category:draft.category,description:draft.description,file:folder+'/'+clean(draft.modelName),textures:(draft.companions||[]).map(f=>folder+'/'+clean(f.name)),...(draft.coverBlob?{thumbnail:folder+'/studio-cover.png'}:{})};
  const models=[...existing,model];const next=Array.isArray(manifest)?models:{...manifest,models};
  tree.push({path:cfg.jsonPath,mode:'100644',type:'blob',content:JSON.stringify(next,null,2)});
  onProgress('Publishing the project…');
  const nextTree=await request(base+'/git/trees',token,{method:'POST',body:{base_tree:commit.tree.sha,tree}});
  const nextCommit=await request(base+'/git/commits',token,{method:'POST',body:{message:'Showcase '+draft.title,tree:nextTree.sha,parents:[parent]}});
  await request(base+'/git/refs/heads/'+encodeURIComponent(cfg.branch),token,{method:'PATCH',body:{sha:nextCommit.sha,force:false}});
  sessionStorage.setItem('zulf-published-models',JSON.stringify(models));return models;
}
