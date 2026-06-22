/* Ayünka Studio — almacenamiento de archivos (IndexedDB) para fotos y STL */
(function(){
  const DBN='ayunka-files', STORE='files'; let _db=null;
  function open(){
    return new Promise((res,rej)=>{
      if(_db) return res(_db);
      if(!('indexedDB' in window)) return rej(new Error('no-idb'));
      const r=indexedDB.open(DBN,1);
      r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE,{keyPath:'id'}); };
      r.onsuccess=()=>{ _db=r.result; res(_db); };
      r.onerror=()=>rej(r.error);
    });
  }
  async function putFile(blob,meta){
    const db=await open(); const id=(window.uid?window.uid():Math.random().toString(36).slice(2));
    const rec={id,name:meta.name||'archivo',type:blob.type||meta.type||'',kind:meta.kind||'file',blob};
    return new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(rec); tx.oncomplete=()=>res(id); tx.onerror=()=>rej(tx.error); });
  }
  async function getFile(id){
    if(!id) return null; const db=await open();
    return new Promise((res,rej)=>{ const r=db.transaction(STORE).objectStore(STORE).get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error); });
  }
  async function delFile(id){
    if(!id) return; const db=await open();
    return new Promise((res)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>res(); });
  }
  async function urlFor(id){ const f=await getFile(id); return f? URL.createObjectURL(f.blob):null; }
  async function openFile(id){
    const f=await getFile(id); if(!f) return false;
    const url=URL.createObjectURL(f.blob); const a=document.createElement('a');
    a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000); return true;
  }
  window.IDB={putFile,getFile,delFile,urlFor,openFile,available:('indexedDB' in window)};
})();
