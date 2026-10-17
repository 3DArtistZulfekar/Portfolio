const DB='zulf-studio-v1', STORE='projects';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Browser storage is unavailable. Allow site storage and try again.'));});}
async function transact(mode,action){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const request=action(tx.objectStore(STORE));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Could not save the project. Browser storage may be full.'));});}finally{db.close();}}
export const getDrafts=()=>transact('readonly',store=>store.getAll());
export const getDraft=id=>transact('readonly',store=>store.get(id));
export const saveDraft=draft=>transact('readwrite',store=>store.put(draft));
export const deleteDraft=id=>transact('readwrite',store=>store.delete(id));
export async function getCatalog(){
  const response=await fetch('data/models.json');if(!response.ok)throw new Error('The model collection couldn’t load. Refresh to try again.');
  const data=await response.json();const deployed=Array.isArray(data)?data:data.models||[];let published=deployed;
  try{const overlay=JSON.parse(sessionStorage.getItem('zulf-published-models')||'null');if(Array.isArray(overlay))published=overlay;}catch{}
  let drafts=[];try{drafts=await getDrafts();}catch{}
  const models=published.map((model,index)=>({...model,index}));
  for(const draft of drafts){
    if(deployed.some(m=>m.id===draft.id))continue;
    const local={...draft,local:true,publishing:!!draft.publishedAt};
    const index=models.findIndex(m=>m.id===draft.id);
    if(index<0)models.push(local);else if(draft.publishedAt)models[index]=local;
  }
  return models;
}
export const modelHref=model=>model.id?'model.html?id='+encodeURIComponent(model.id):'model.html?i='+model.index;
export function resolveAssets(model){
  const urls=[];const make=blob=>{const url=URL.createObjectURL(blob);urls.push(url);return url;};
  if(model.local){return {url:make(model.modelBlob),format:model.modelName,textures:(model.companions||[]).map(f=>({name:f.name,url:make(f.blob)})),thumbnail:model.coverBlob?make(model.coverBlob):null,revoke:()=>urls.forEach(url=>URL.revokeObjectURL(url))};}
  return {url:model.file,format:model.file,textures:(model.textures||[]).map(t=>({name:typeof t==='string'?t:t.path,url:typeof t==='string'?t:t.path})),thumbnail:model.thumbnail,revoke:()=>{}};
}
