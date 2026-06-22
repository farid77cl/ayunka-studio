/* Ayünka Studio — sincronización en la nube (Firebase Firestore, opcional)
   Configúrala en Ajustes pegando la config de tu proyecto Firebase.
   Funciona cuando la app está publicada en https (GitHub Pages), no en archivo local. */
(function(){
  const CKEY='ayunka-sync-cfg';
  let st={on:false, ready:false, applying:false, db:null, ref:null, timer:null, status:'desactivada'};
  function cfg(){ try{return JSON.parse(localStorage.getItem(CKEY));}catch(e){return null;} }
  function configured(){ const c=cfg(); return !!(c&&c.firebase&&c.firebase.projectId); }
  function setCfg(firebaseObj, workspace){ localStorage.setItem(CKEY, JSON.stringify({firebase:firebaseObj, workspace:workspace||'ayunka'})); }
  function clearCfg(){ localStorage.removeItem(CKEY); }
  function note(m){ st.status=m; if(window.A&&window.A._syncNote) window.A._syncNote(m); }

  async function init(){
    const c=cfg(); if(!c) return;
    try{
      const appMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const fsMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const authMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const app=appMod.initializeApp(c.firebase);
      try{ await authMod.signInAnonymously(authMod.getAuth(app)); }catch(e){}
      st.db=fsMod.getFirestore(app);
      st.ref=fsMod.doc(st.db,'studios',c.workspace||'ayunka');
      st._fs=fsMod; st.on=true; st.ready=true; note('conectada');
      fsMod.onSnapshot(st.ref,snap=>{
        const data=snap.data(); if(!data||!data.db) return;
        if((data.updatedAt||0) > (window.DB._updatedAt||0)){
          st.applying=true;
          const r=data.db; for(const k in r){ window.DB[k]=r[k]; } window.DB._updatedAt=data.updatedAt;
          try{ localStorage.setItem('ayunka-studio-db-v1', JSON.stringify(window.DB)); }catch(e){}
          if(window.__render) window.__render();
          st.applying=false; note('actualizada desde la nube');
        }
      });
      // primer push si la nube está vacía
      const cur=await fsMod.getDoc(st.ref);
      if(!cur.exists()) push();
    }catch(e){ note('error: '+(e&&e.message||e)); }
  }
  async function push(){
    if(!st.ready||st.applying) return;
    try{ window.DB._updatedAt=Date.now(); await st._fs.setDoc(st.ref,{db:window.DB,updatedAt:window.DB._updatedAt}); note('guardada en la nube '+new Date().toLocaleTimeString('es-CL')); }
    catch(e){ note('error al guardar: '+(e&&e.message||e)); }
  }
  function pushSoon(){ if(!st.ready||st.applying) return; clearTimeout(st.timer); st.timer=setTimeout(push,1500); }

  window.Sync={configured,setCfg,clearCfg,init,push,pushSoon,status:()=>st.status,isOn:()=>st.on};
})();
