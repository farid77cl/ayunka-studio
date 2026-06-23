/* Ayünka Studio — visor 3D de STL/3MF dentro de la app (Three.js) */
(function(){
  function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error(src));document.head.appendChild(s);});}
  async function ensure(){
    if(!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    if(!window.THREE.STLLoader) await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js');
    if(!window.THREE.OrbitControls){ try{ await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'); }catch(e){} }
  }
  let cur=null;
  function close(){ if(cur){ try{cancelAnimationFrame(cur.raf); cur.renderer.dispose();}catch(e){} cur=null; } const r=document.getElementById('viewer-root'); if(r) r.innerHTML=''; }
  async function open(blob,name){
    const root=document.getElementById('viewer-root'); if(!root) return;
    root.innerHTML='<div class="modal-bg" style="z-index:70" onclick="if(event.target===this)window.STLViewer.close()"><div class="modal"><h2 style="margin:0 0 10px">'+(name||'Modelo')+'</h2><div id="stlv" style="width:100%;height:360px;background:#ECE6DA;border-radius:12px;display:flex;align-items:center;justify-content:center"><span class="muted">Cargando visor 3D…</span></div><div class="muted" style="margin-top:6px">Arrastra para girar · rueda para zoom</div><div class="row between" style="margin-top:12px"><button class="btn ghost" onclick="window.STLViewer.close()">Cerrar</button><button class="btn ghost" id="stlv-dl">Descargar para laminar</button></div></div></div>';
    document.getElementById('stlv-dl').onclick=()=>{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name||'modelo.stl';a.click();setTimeout(()=>URL.revokeObjectURL(u),4000);};
    const ext=(name||'').toLowerCase().split('.').pop();
    if(ext!=='stl'){ const c=document.getElementById('stlv'); if(c)c.innerHTML='<span class="muted" style="padding:16px;text-align:center">Vista previa 3D disponible solo para STL.<br>Para 3MF/OBJ usa «Descargar para laminar».</span>'; return; }
    try{ await ensure(); }catch(e){ const c=document.getElementById('stlv'); if(c)c.innerHTML='<span class="muted" style="padding:16px;text-align:center">No se pudo cargar el visor (sin conexión). Usa «Descargar para laminar».</span>'; return; }
    let buf; try{ buf=await blob.arrayBuffer(); }catch(e){ return; }
    render(buf);
  }
  function render(buf){
    const cont=document.getElementById('stlv'); if(!cont) return; cont.innerHTML='';
    const THREE=window.THREE, W=cont.clientWidth||600, H=cont.clientHeight||360;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0xECE6DA);
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,8000);
    const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(window.devicePixelRatio||1); renderer.setSize(W,H); cont.appendChild(renderer.domElement);
    let geo; try{ geo=new THREE.STLLoader().parse(buf); }catch(e){ cont.innerHTML='<span class="muted">No pude leer el archivo 3D.</span>'; return; }
    geo.computeVertexNormals(); geo.center();
    const mesh=new THREE.Mesh(geo,new THREE.MeshPhongMaterial({color:0xE39B96,shininess:25}));
    scene.add(mesh);
    geo.computeBoundingSphere(); const r=(geo.boundingSphere&&geo.boundingSphere.radius)||50;
    camera.position.set(r*1.6,r*1.3,r*2.2); camera.lookAt(0,0,0);
    scene.add(new THREE.AmbientLight(0xffffff,0.65));
    const d1=new THREE.DirectionalLight(0xffffff,0.8); d1.position.set(1,1,1); scene.add(d1);
    const d2=new THREE.DirectionalLight(0xffffff,0.35); d2.position.set(-1,-0.6,-1); scene.add(d2);
    let controls=null; if(THREE.OrbitControls){ controls=new THREE.OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.autoRotate=true; controls.autoRotateSpeed=2.2; }
    let raf; (function animate(){ raf=requestAnimationFrame(animate); if(controls) controls.update(); else mesh.rotation.z+=0.012; renderer.render(scene,camera); })();
    cur={renderer,raf};
  }
  async function openUrl(url,name){
    try{ const r=await fetch(url); if(!r.ok) throw new Error('http'); const b=await r.blob(); return open(b,name||decodeURIComponent((url||'').split('/').pop())); }
    catch(e){ const root=document.getElementById('viewer-root'); if(root) root.innerHTML='<div class="modal-bg" style="z-index:70" onclick="if(event.target===this)window.STLViewer.close()"><div class="modal"><p class="muted">No se pudo cargar el modelo (revisa la conexión o que la app esté publicada).</p><div class="row"><button class="btn ghost" onclick="window.STLViewer.close()">Cerrar</button></div></div></div>'; } }
  window.STLViewer={open,openUrl,close};
})();
