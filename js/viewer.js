import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const extension = path => String(path || '').split(/[?#]/)[0].split('.').pop().toLowerCase();
const filename = path => { try { return decodeURIComponent(String(path).replaceAll('\\', '/').split('/').pop().split('?')[0]).toLowerCase(); } catch { return String(path).toLowerCase(); } };
const disposeTree = root => root?.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });

export function createViewer(container, options = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance', preserveDrawingBuffer:true});
  } catch {
    container.dataset.state = 'unavailable';
    options.onError?.(new Error('Interactive 3D isn’t available in this browser. Try a browser with WebGL enabled.'));
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.hero ? 1.75 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.hero ? 1.05 : 1.15;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(options.hero ? 35 : 39, 1, .05, 100);
  camera.position.set(options.hero ? 3.4 : 3.5, options.hero ? 1 : 1.8, 5.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false; controls.enableZoom = !options.hero && !options.decorative;
  controls.minDistance = 2.3; controls.maxDistance = 12;
  controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI * .85;
  controls.autoRotate = !reducedMotion && !options.decorative;
  controls.autoRotateSpeed = options.hero ? .28 : .65;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = options.hero ? .9 : 1.2;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xeaf2dc, 0x1c2411, options.hero ? 1 : 2));
  const key = new THREE.DirectionalLight(0xfff8e5, 4); key.position.set(3,6,5); scene.add(key);
  const rim = new THREE.DirectionalLight(options.hero ? 0xd5f35a : 0xffffff, options.hero ? 6 : 2); rim.position.set(-4,2,-3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xb9cbc7, 2); fill.position.set(-3,1,4); scene.add(fill);
  const rig = new THREE.Group(); scene.add(rig);
  const wireMaterial = new THREE.MeshBasicMaterial({color:options.hero ? 0xd5f35a : 0xb9d35d,wireframe:true,transparent:true,opacity:.65});
  const clayMaterial = new THREE.MeshStandardMaterial({color:0xc8cdb9,roughness:.5,metalness:.05});
  let object = null, sourceMaterials = new Map(), mixer = null, disposed = false, generation = 0, visible = true, loaded = false;
  let displayMode = 'material';
  const clock = new THREE.Clock();
  const center = new THREE.Vector3();
  const startPosition = camera.position.clone();
  const targetPointer = new THREE.Vector2(), smoothPointer = new THREE.Vector2();
  let dragging = false, tick = 0;
  const onPointerMove = e => { if (!options.hero || dragging) return; const r = container.getBoundingClientRect(); targetPointer.set(((e.clientX-r.left)/r.width-.5)*.14, ((e.clientY-r.top)/r.height-.5)*.09); };
  const onStart = () => { dragging = true; };
  const onEnd = () => { dragging = false; };
  const onKey = e => { if (!object || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)) return; e.preventDefault(); if(e.key==='Home') api.reset(); else {controls.autoRotate=false; if(e.key==='ArrowLeft')rig.rotation.y-=.15;if(e.key==='ArrowRight')rig.rotation.y+=.15;if(e.key==='ArrowUp')rig.rotation.x-=.1;if(e.key==='ArrowDown')rig.rotation.x+=.1;} };
  container.addEventListener('pointermove',onPointerMove);container.addEventListener('keydown',onKey);
  controls.addEventListener('start',onStart);controls.addEventListener('end',onEnd);
  const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; clock.getDelta(); },{rootMargin:'100px'}); visibility.observe(container);
  const resize = new ResizeObserver(() => { const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); });resize.observe(container);
  // The etched rings locate the sculpture in space without turning it into a UI card.
  if(options.hero){
    for(const radius of [1.6,2.05,2.6]){
      const points=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,-1.52,Math.sin(a)*radius));}
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x687348,transparent:true,opacity:.18}));scene.add(ring);
    }
  }
  function frame(time){
    if(disposed)return;
    const dt=Math.min(clock.getDelta(),.05);
    if(!visible||document.hidden)return;
    controls.update(dt);
    if(mixer&&!reducedMotion)mixer.update(dt);
    if(options.hero&&!reducedMotion&&!dragging){smoothPointer.lerp(targetPointer,.035);rig.rotation.z=smoothPointer.x*.5;rig.position.y=Math.sin(time*.00065)*.055;}
    if(options.decorative&&!reducedMotion){rig.rotation.y+=dt*.18;rig.rotation.z=Math.sin(time*.00025)*.08;}
    renderer.render(scene,camera);tick++;
  }
  renderer.setAnimationLoop(frame);
  function clearObject(){
    if(!object)return;
    object.traverse(o=>{if(o.isMesh&&sourceMaterials.has(o.uuid))o.material=sourceMaterials.get(o.uuid);});
    rig.remove(object);disposeTree(object);object=null;sourceMaterials.clear();mixer=null;loaded=false;
  }
  const api = {
    renderer, scene, camera, controls,
    async load({url,format,textures=[],heroStyle=false,onProgress}={}) {
      const token=++generation; clearObject();container.dataset.state='loading';
      const missing=new Set();
      const manager=new THREE.LoadingManager();
      manager.addHandler(/\.tga$/i, new TGALoader(manager));
      const map=new Map(textures.map(t=>[filename(t.name||t.path||t.url),t.url||t.path]));
      const emptyPixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
      manager.setURLModifier(request=>heroStyle&&!/^(data:|blob:)/.test(request)&&/\.(png|jpe?g|webp|tga)$/i.test(request)?emptyPixel:map.get(filename(request))||request);
      manager.onError=resource=>missing.add(filename(resource));
      manager.onProgress=(_,done,total)=>onProgress?.(Math.round(done/total*90));
      let pendingAssets=0;
      const idleCallbacks=[];
      const startAsset=manager.itemStart.bind(manager),endAsset=manager.itemEnd.bind(manager);
      manager.itemStart=resource=>{pendingAssets++;startAsset(resource);};
      manager.itemEnd=resource=>{endAsset(resource);pendingAssets--;if(!pendingAssets)idleCallbacks.splice(0).forEach(resolve=>resolve());};
      const waitForAssets=()=>pendingAssets?new Promise(resolve=>idleCallbacks.push(resolve)):Promise.resolve();
      const ext=extension(format||url);let loader;
      if(ext==='glb'||ext==='gltf')loader=new GLTFLoader(manager);
      else if(ext==='obj'){
        loader=new OBJLoader(manager);
        const mtl=textures.find(t=>extension(t.name||t.path)==='mtl');
        if(mtl){const materials=await new MTLLoader(manager).loadAsync(mtl.url||mtl.path);materials.preload();loader.setMaterials(materials);}
      }else if(ext==='fbx')loader=new FBXLoader(manager);
      else throw new Error('Choose a GLB, glTF, FBX, or OBJ model.');
      let root;
      try {
        const data=await loader.loadAsync(url,event=>{if(event.total)onProgress?.(Math.round(event.loaded/event.total*85));});
        root=data.scene||data;
        await waitForAssets();
        if(disposed||token!==generation){disposeTree(root);return;}
        const box=new THREE.Box3().setFromObject(root);
        const size=box.getSize(new THREE.Vector3());
        const max=Math.max(size.x,size.y,size.z);
        if(!Number.isFinite(max)||max<=0)throw new Error('The file has no visible mesh. Export a model with mesh geometry and try again.');
        box.getCenter(center);
        const scale=(options.hero?2.65:options.decorative?3.2:3)/max;
        root.scale.multiplyScalar(scale);root.position.addScaledVector(center,-scale);
        let fallbackTexture=null;
        // A loose diffuse map is useful for OBJ without an MTL; other PBR maps are never treated as albedo.
        if(ext==='obj'&&!textures.some(t=>extension(t.name||t.path)==='mtl')){
          const diffuse=textures.find(t=>/\.(png|jpe?g|webp)$/i.test(t.name||t.path||'')&&!/(normal|rough|metal|height|ambient|occlusion|_ao|bump)/i.test(t.name||t.path));
          if(diffuse){try{fallbackTexture=await new THREE.TextureLoader().loadAsync(diffuse.url||diffuse.path);fallbackTexture.colorSpace=THREE.SRGBColorSpace;}catch{missing.add(filename(diffuse.name||diffuse.path));}}
        }
        root.traverse(child=>{
          if(!child.isMesh)return;
          if(heroStyle){
            const old=[].concat(child.material||[]);
            const glass=/glass|visor/i.test(child.name);
            const mats=old.map(m=>new THREE.MeshPhysicalMaterial({name:m?.name,color:glass?0x101a14:0x59604e,metalness:.92,roughness:glass?.09:.27,clearcoat:1,clearcoatRoughness:.19}));
            old.forEach(m=>{for(const v of Object.values(m||{}))if(v?.isTexture)v.dispose();m?.dispose();});
            child.material=Array.isArray(child.material)?mats:mats[0];
          }else if(fallbackTexture&&!child.material?.map){child.material=new THREE.MeshStandardMaterial({map:fallbackTexture,roughness:.65});}
          const materials=[].concat(child.material||[]);materials.forEach(m=>{if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;});
          sourceMaterials.set(child.uuid,child.material);
        });
        object=root;rig.add(root);rig.rotation.set(0,options.hero?-.25:0,options.hero?-.08:0);rig.position.set(0,0,0);
        const clips=data.animations||root.animations;if(clips?.length){mixer=new THREE.AnimationMixer(root);clips.forEach(clip=>mixer.clipAction(clip).play());}
        loaded=true;api.setMode(displayMode);api.reset();
        if(options.hero){camera.position.set(3,.65,5.5);controls.target.set(0,-.08,0);controls.update();}
        if(options.decorative){camera.position.set(3.7,2.1,5.8);controls.enabled=false;}
        renderer.render(scene,camera);renderer.domElement.classList.add('ready');container.dataset.state='ready';onProgress?.(100);
        options.onLoad?.({missing:[...missing]});
        return {missing:[...missing]};
      }catch(err){
        if(disposed||token!==generation)return;
        if(root&&root!==object)disposeTree(root);
        container.dataset.state='error';options.onError?.(err);throw err;
      }
    },
    setMode(mode){displayMode=mode;object?.traverse(child=>{if(child.isMesh)child.material=mode==='wireframe'?wireMaterial:mode==='clay'?clayMaterial:sourceMaterials.get(child.uuid);});},
    reset(){camera.position.copy(startPosition);controls.target.set(0,0,0);controls.update();},
    async capture(){if(!loaded)throw new Error('Load a model before capturing a cover.');renderer.render(scene,camera);return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not capture this model.')),'image/png'));},
    dispose(){if(disposed)return;disposed=true;generation++;renderer.setAnimationLoop(null);resize.disconnect();visibility.disconnect();controls.dispose();clearObject();wireMaterial.dispose();clayMaterial.dispose();environment.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});renderer.dispose();renderer.domElement.remove();container.removeEventListener('pointermove',onPointerMove);container.removeEventListener('keydown',onKey);}
  };
  return api;
}
