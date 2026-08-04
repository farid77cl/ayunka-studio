/* Ayünka Studio — enlaza cada producto con su publicación de Instagram.
   La lista la deja n8n en Supabase (reportes/publicaciones.json), así que
   la app no necesita el token de Meta. */
(function(){
  const URL='https://ncuvdpydwnepbysadoux.supabase.co/storage/v1/object/public/archivos/reportes/publicaciones.json';
  const CACHE='ayunka-ig-pubs';
  let PUBS=null, cargando=null;

  const norm = s => (s||'').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ')
    .replace(/\s+/g,' ').trim();

  /* palabras que no distinguen un producto de otro */
  const VACIAS = new Set(['de','la','el','los','las','con','para','por','y','en','un','una',
                          'del','al','mini','cajita','caja','set','kit','pack']);

  // Las publicaciones traen la fecha como 2026-08-04. Farid la quiere dd-mm-aa.
  function ddmmaa(f){
    const m=String(f||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3]+'-'+m[2]+'-'+m[1].slice(2) : (f||'');
  }
  function cargar(){
    if(PUBS) return Promise.resolve(PUBS);
    if(cargando) return cargando;
    cargando = fetch(URL+'?v='+Date.now())
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        PUBS = (d && d.publicaciones) || [];
        try{ localStorage.setItem(CACHE, JSON.stringify(PUBS)); }catch(e){ console.warn('No se pudo guardar en el navegador (¿sin espacio?)',e); }
        return PUBS;
      })
      .catch(()=>{
        try{ PUBS = JSON.parse(localStorage.getItem(CACHE)||'[]'); }catch(e){ PUBS=[]; }
        return PUBS;
      });
    return cargando;
  }

  /* lo que ya está en memoria, sin esperar */
  function ya(){
    if(PUBS) return PUBS;
    try{ return JSON.parse(localStorage.getItem(CACHE)||'[]'); }catch(e){ return []; }
  }

  function buscar(id){ return ya().find(p=>p.id===id) || null; }

  /* qué tan bien calza el nombre del producto con una publicación */
  function afinidad(nombre, pub){
    const pal = norm(nombre).split(' ').filter(w=>w.length>2 && !VACIAS.has(w));
    if(!pal.length) return 0;
    const donde = pub.buscar || norm(pub.titulo);
    const aciertos = pal.filter(w=>donde.includes(w)).length;
    return aciertos/pal.length;
  }

  /* publicaciones ordenadas: primero las que se parecen al nombre */
  function sugerencias(nombre){
    return ya()
      .map(p=>({p, s:afinidad(nombre,p)}))
      .sort((a,b)=> b.s-a.s || (a.p.fecha<b.p.fecha?1:-1))
      .map(x=>x.p);
  }

  /* ---- lo que se muestra en la ficha ---- */
  function chip(prod){
    if(!prod || !prod.igId) return '';
    const p = buscar(prod.igId);
    if(!p) return '';
    return `<a class="ig-chip" href="${p.permalink}" target="_blank" rel="noopener"
              onclick="event.stopPropagation()" title="Ver en Instagram">
      <span class="ig-nums">${p.likes} me gusta · ${p.comentarios} comentarios</span>
    </a>`;
  }

  /* ---- selector para el formulario del producto ---- */
  function selector(prod){
    const lista = sugerencias(prod.name||'');
    if(!lista.length){
      return `<label class="field">Publicación de Instagram
        <span class="muted">Todavía no hay lista. n8n la genera cada mañana a las 07:30.</span></label>`;
    }
    const opts = lista.map(p=>{
      const et = `${ddmmaa(p.fecha)} · ${p.titulo || '(sin título)'} · ${p.interacciones} interac.`;
      return `<option value="${p.id}" ${prod.igId===p.id?'selected':''}>${esc(et)}</option>`;
    }).join('');
    const act = prod.igId ? buscar(prod.igId) : null;
    return `<label class="field">Publicación de Instagram
      <select id="f-ig" onchange="A._prod.igId=this.value||null;A.prodRefresh()">
        <option value="">— sin publicación asociada —</option>${opts}
      </select></label>
      ${act?`<div class="muted" style="margin-top:-4px">
        <a href="${act.permalink}" target="_blank" rel="noopener">Ver el post ↗</a>
        · ${act.likes} me gusta · ${act.comentarios} comentarios</div>`:''}`;
  }

  function esc(s){ return String(s||'').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

  window.IG={cargar,ya,buscar,sugerencias,chip,selector,afinidad};
})();
