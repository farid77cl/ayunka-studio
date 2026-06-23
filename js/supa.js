/* Ayünka Studio — almacenamiento de archivos en la nube (Supabase Storage, gratis) */
(function(){
  const CKEY='ayunka-supa-cfg';
  let _client=null;
  function cfg(){ try{return JSON.parse(localStorage.getItem(CKEY));}catch(e){return null;} }
  function configured(){ const c=cfg(); return !!(c&&c.url&&c.key&&c.bucket); }
  function normUrl(u){ return (u||'').trim().replace(/\/+$/,'').replace(/\/rest\/v1$/,'').replace(/\/+$/,''); }
  function setCfg(url,key,bucket){ localStorage.setItem(CKEY,JSON.stringify({url:normUrl(url),key:(key||'').trim(),bucket:(bucket||'archivos').trim()})); _client=null; }
  function clearCfg(){ localStorage.removeItem(CKEY); _client=null; }
  async function client(){
    if(_client) return _client;
    const c=cfg(); if(!c) throw new Error('Almacenamiento no configurado');
    const mod=await import('https://esm.sh/@supabase/supabase-js@2');
    _client=mod.createClient(c.url,c.key); return _client;
  }
  async function upload(blob,name){
    const c=cfg(); const cl=await client();
    const safe=(name||'archivo').replace(/[^A-Za-z0-9._-]/g,'-');
    const path=Date.now()+'-'+Math.random().toString(36).slice(2,7)+'-'+safe;
    const {error}=await cl.storage.from(c.bucket).upload(path,blob,{upsert:true,contentType:blob.type||undefined});
    if(error) throw error;
    const {data}=cl.storage.from(c.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  window.Supa={configured,setCfg,clearCfg,upload};
})();
