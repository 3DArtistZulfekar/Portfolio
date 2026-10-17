import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {connect,publishDraft,getConnection,disconnect} from '../js/studio/publish.js';
const makeStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};};
globalThis.FileReader=class {readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result='data:application/octet-stream;base64,'+Buffer.from(buffer).toString('base64');this.onload();}).catch(()=>this.onerror());}};
beforeEach(()=>{globalThis.sessionStorage=makeStorage();globalThis.localStorage=makeStorage();});
const cfg={owner:'artist',repo:'Portfolio',branch:'main',jsonPath:'data/models.json',modelsDir:'assets/models'};
const draft={id:'project-123',title:'Étude — 玉',type:'GLB',category:'Material study',description:'Model and textures, together.',modelName:'scene.glb',modelBlob:new Blob(['model']),companions:[{name:'surface.png',blob:new Blob(['texture'])}],coverBlob:new Blob(['cover'])};
function mockGitHub({conflict=false,denied=false}={}){
 const calls=[];let blobIndex=0;const manifest={credit:'preserved',models:[{title:'Existing piece',file:'assets/existing.glb'}]};
 globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname;const method=options.method||'GET';const body=options.body?JSON.parse(options.body):undefined;calls.push({path,method,body,headers:options.headers});if(denied)return new Response('{}',{status:401});
 let payload={};let status=200;
 if(path.endsWith('/branches/main'))payload={commit:{sha:'old-head'}};
 else if(path.endsWith('/repos/artist/Portfolio'))payload={permissions:{push:true}};
 else if(path.endsWith('/git/commits/old-head'))payload={tree:{sha:'old-tree'}};
 else if(path.endsWith('/contents/data/models.json'))payload={content:Buffer.from(JSON.stringify(manifest)).toString('base64')};
 else if(path.endsWith('/git/blobs'))payload={sha:'blob-'+(++blobIndex)};
 else if(path.endsWith('/git/trees'))payload={sha:'new-tree'};
 else if(path.endsWith('/git/commits'))payload={sha:'new-commit'};
 else if(path.endsWith('/git/refs/heads/main')){payload={};if(conflict){status=422;payload={message:'Update is not a fast forward'};}}
 else throw new Error('Unexpected request '+path);
 return new Response(JSON.stringify(payload),{status});};
 return {calls,manifest};
}
test('publishes the model, companions, cover and UTF-8 metadata in one non-forced commit',async()=>{
 const {calls}=mockGitHub();await connect(cfg,'test-token');const result=await publishDraft(draft);
 assert.equal(result.length,2);assert.equal(result[1].title,'Étude — 玉');
 const tree=calls.find(c=>c.path.endsWith('/git/trees')).body;
 assert.equal(tree.base_tree,'old-tree');assert.equal(tree.tree.length,4);
 assert.deepEqual(tree.tree.filter(e=>e.sha).map(e=>e.path),['assets/models/project-123/scene.glb','assets/models/project-123/surface.png','assets/models/project-123/studio-cover.png']);
 const manifest=JSON.parse(tree.tree.find(e=>e.path==='data/models.json').content);assert.equal(manifest.credit,'preserved');assert.equal(manifest.models[0].title,'Existing piece');
 const refs=calls.filter(c=>c.path.includes('/git/refs/'));assert.equal(refs.length,1);assert.deepEqual(refs[0].body,{sha:'new-commit',force:false});
 assert.equal(JSON.parse(sessionStorage.getItem('zulf-published-models'))[1].title,draft.title);assert.equal(localStorage.getItem('zulf-studio-connection'),null);assert.equal(localStorage.getItem('zulf-gh-token'),null);
});
test('a concurrent repository change never becomes a false publish success',async()=>{
 mockGitHub({conflict:true});await connect(cfg,'test-token');await assert.rejects(()=>publishDraft(draft),/repository changed/);assert.equal(sessionStorage.getItem('zulf-published-models'),null);
});
test('rejected credentials are not saved and disconnect clears the session credential',async()=>{
 mockGitHub({denied:true});await assert.rejects(()=>connect(cfg,'invalid'),/token was rejected/);assert.equal(getConnection(),null);
 mockGitHub();await connect(cfg,'valid');assert.ok(getConnection());disconnect();assert.equal(getConnection(),null);
});
