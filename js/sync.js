/* Ayünka Studio — sincronización en la nube (Firebase) con login propio.
   Regla anti-pérdida: la nube manda al conectar, y los datos de ejemplo NUNCA se suben. */
(function(){
  const CKEY='ayunka-sync-cfg', DBKEY='ayunka-studio-db-v1';
  let st={ready:false,applying:false,ref:null,_fs:null,timer:null,status:'desactivada'};
  function cfg(){ try{return JSON.parse(localStorage.getItem(CKEY));}catch(e){return null;} }
  function configured(){ const c=cfg(); return !!(c&&c.firebase&&c.firebase.projectId&&c.email); }
  function setCfg(firebaseObj,workspace,email,password){ localStorage.setItem(CKEY,JSON.stringify({firebase:firebaseObj,workspace:workspace||'ayunka',email:email||'',password:password||''})); }
  function clearCfg(){ localStorage.removeItem(CKEY); }
  function note(m){ st.status=m; if(window.A&&window.A._syncNote) window.A._syncNote(m); }

  function applyRemote(data){
    if(window.snapshotDB) window.snapshotDB('antes de sincronizar');
    st.applying=true;
    for(const k in data.db){ window.DB[k]=data.db[k]; }
    window.DB._updatedAt=data.updatedAt||Date.now(); window.DB._seed=false;
    try{ localStorage.setItem(DBKEY,JSON.stringify(window.DB)); }catch(e){}
    if(window.__render) window.__render();
    st.applying=false;
  }
  async function push(){
    if(!st.ready||st.applying) return;
    if(window.DB._seed){ note('listo (sin subir datos de ejemplo)'); return; } // nunca subir el seed
    try{ window.DB._updatedAt=Date.now(); await st._fs.setDoc(st.ref,{db:window.DB,updatedAt:window.DB._updatedAt,owner:(cfg()||{}).email||''}); note('guardada en la nube '+new Date().toLocaleTimeString('es-CL')); }
    catch(e){ note('error al guardar: '+(e&&e.message||e)); }
  }
  function pushSoon(){ if(!st.ready||st.applying||window.DB._seed) return; clearTimeout(st.timer); st.timer=setTimeout(push,1500); }

  async function init(){
    const c=cfg(); if(!c||!c.email) return;
    try{
      const appMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const authMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const fsMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const app=appMod.initializeApp(c.firebase); const auth=authMod.getAuth(app);
      note('iniciando sesión…');
      try{ await authMod.signInWithEmailAndPassword(auth,c.email,c.password); }
      catch(e){ if(e&&(e.code==='auth/user-not-found'||e.code==='auth/invalid-credential')){ try{ await authMod.createUserWithEmailAndPassword(auth,c.email,c.password); }catch(e2){ note('error de login: '+(e2.code||e2.message)); return; } } else { note('error de login: '+(e.code||e.message)); return; } }
      st._fs=fsMod; st.ref=fsMod.doc(fsMod.getFirestore(app),'studios',c.workspace||'ayunka'); st.ready=true;
      // Reconciliación al conectar: la NUBE manda si existe; si está vacía, solo subo si tengo datos reales.
      try{
        const cur=await fsMod.getDoc(st.ref);
        if(cur.exists()&&cur.data()&&cur.data().db){
          const remote=cur.data();
          if(!window.DB._seed && (window.DB._updatedAt||0) > (remote.updatedAt||0)){ await push(); note('tus datos locales (más nuevos) se subieron'); }
          else { applyRemote(remote); note('datos cargados de la nube'); }
        }
        else if(!window.DB._seed){ await push(); note('nube creada con tus datos'); }
        else { note('conectada (esperando datos reales)'); }
      }catch(e){ note('error al leer la nube: '+(e&&e.message||e)); }
      note('conectada como '+c.email);
      fsMod.onSnapshot(st.ref,snap=>{ const data=snap.data(); if(!data||!data.db) return; if((data.updatedAt||0)>(window.DB._updatedAt||0)){ applyRemote(data); note('actualizada desde la nube'); } },err=>note('sin acceso: '+(err.code||err.message)));
    }catch(e){ note('error: '+(e&&e.message||e)); }
  }
  window.Sync={configured,setCfg,clearCfg,init,push,pushSoon,status:()=>st.status,isOn:()=>st.ready};
})();
