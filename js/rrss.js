/* Ayünka Studio — RRSS: aprobar publicaciones y ver reportes
   Se integra como pestañas "Aprobar" y "Reportes". */
(function(){
  /* La cola vive en Supabase: la app la guarda ahí y n8n la lee de ahí.
     GitHub queda solo como respaldo de arranque (primera vez / si Supabase falla). */
  const BASE='https://ncuvdpydwnepbysadoux.supabase.co/storage/v1/object/';
  const SB=BASE+'public/archivos/';
  const GH='https://raw.githubusercontent.com/farid77cl/ayunka-studio/main/img/posts/';
  const ARCH={ posts:'posts-aprobados.json', historias:'historias-aprobadas.json' };
  const F={
    posts:     SB+'cola/'+ARCH.posts,
    historias: SB+'cola/'+ARCH.historias,
    metricas:  SB+'reportes/semanal-ultimo.json',
    consultas: SB+'reportes/alertas-comentarios.json',
    mensajes:  SB+'reportes/mensajes-pendientes.json',
    cola:      SB+'reportes/cola-estado.json',
    bitacora:  SB+'reportes/bitacora.json'
  };
  const D={}; let tipo='posts', filtro='todos', sucio=false;
  const esc = s => (s||'').toString().replace(/</g,'&lt;');
  const fecha = s => s ? new Date(s).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short'}) : '—';

  function cfg(){
    try{ const c=JSON.parse(localStorage.getItem('ayunka-supa-cfg')); if(c&&c.url&&c.key) return c; }catch(e){}
    return (window.AYUNKA_CONFIG&&window.AYUNKA_CONFIG.supabase)||null;
  }

  async function get(k){
    try{ const r=await fetch(F[k]+'?v='+Date.now()); if(r.ok) return await r.json(); }catch(e){}
    if(ARCH[k]){ // respaldo: leer la copia de GitHub
      try{ const r=await fetch(GH+ARCH[k]+'?v='+Date.now()); if(r.ok) return await r.json(); }catch(e){}
    }
    return null;
  }

  async function guardar(){
    const c=cfg(); if(!c) throw new Error('Almacenamiento no configurado');
    const r=await fetch(BASE+(c.bucket||'archivos')+'/cola/'+ARCH[tipo],{
      method:'POST',
      headers:{ apikey:c.key, Authorization:'Bearer '+c.key,
                'Content-Type':'application/json', 'x-upsert':'true' },
      body: JSON.stringify(D[tipo],null,2)
    });
    if(!r.ok) throw new Error('No se pudo guardar ('+r.status+')');
    return true;
  }

  function estado(txt,cls){
    const e=document.getElementById('ap_estado');
    if(e){ e.textContent=txt; e.className='muted'+(cls?' '+cls:''); }
  }

  /* ============ APROBAR ============ */
  function viewAprobar(){
    return `
    <div class="row between"><h1 class="page">Aprobar publicaciones</h1></div>
    <p class="sub">Revisa antes de que n8n publique · 1 post al día a las 20:00</p>
    <div class="row" style="gap:8px;margin:10px 0">
      <button class="btn primary" id="ap_tp" onclick="RRSS.tab('posts')">📸 Publicaciones</button>
      <button class="btn ghost"   id="ap_th" onclick="RRSS.tab('historias')">📖 Historias</button>
    </div>
    <div class="card">
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn ghost sm" onclick="RRSS.all(true)">✅ Aprobar todo</button>
        <button class="btn ghost sm" onclick="RRSS.all(false)">🚫 Rechazar todo</button>
        <button class="btn ghost sm" onclick="RRSS.filtro('todos')">Todos</button>
        <button class="btn ghost sm" onclick="RRSS.filtro('si')">Aprobados</button>
        <button class="btn ghost sm" onclick="RRSS.filtro('no')">Rechazados</button>
        <span class="muted" id="ap_count" style="margin-left:auto"></span>
      </div>
    </div>
    <div id="ap_grid" class="grid cards"></div>
    <div class="card" style="position:sticky;bottom:8px">
      <div class="row between" style="flex-wrap:wrap;gap:8px">
        <span class="muted" id="ap_estado">Guarda para que n8n tome los cambios.</span>
        <div class="row" style="gap:8px">
          <button class="btn primary" id="ap_save" onclick="RRSS.save()">💾 Guardar</button>
          <button class="btn ghost sm" onclick="RRSS.download()">⬇️</button>
        </div>
      </div>
    </div>`;
  }

  async function initAprobar(){
    if(!D.posts) D.posts = await get('posts') || [];
    if(!D.historias) D.historias = await get('historias') || [];
    render();
  }

  function render(){
    const g=document.getElementById('ap_grid'); if(!g) return;
    const arr=D[tipo]||[];
    const vis=arr.filter(p=> filtro==='todos' || (filtro==='si')===(p.aprobado!==false));
    const c=document.getElementById('ap_count');
    if(c) c.textContent=`${arr.filter(p=>p.aprobado!==false).length} aprobados de ${arr.length}`;
    document.getElementById('ap_tp').className='btn '+(tipo==='posts'?'primary':'ghost');
    document.getElementById('ap_th').className='btn '+(tipo==='historias'?'primary':'ghost');
    if(!vis.length){ g.innerHTML='<div class="card empty">Nada que mostrar.</div>'; return; }
    g.innerHTML=vis.map(p=>{
      const i=arr.indexOf(p), ap=p.aprobado!==false;
      const cap=(p.caption||'').trim();
      return `<div class="card" style="${ap?'':'opacity:.5'}">
        <img src="${p.image_url}" loading="lazy" style="width:100%;border-radius:10px;display:block">
        <div class="row between" style="margin-top:8px">
          <b>${esc((p.slug||'').replace(/-/g,' '))}</b>
          ${p.linea?`<span class="tag">${esc(p.linea)}</span>`:''}
        </div>
        ${cap?`<div class="muted" style="max-height:56px;overflow:hidden;white-space:pre-wrap;font-size:12px;margin-top:6px">${esc(cap)}</div>`:''}
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn ${ap?'primary':'ghost'}" style="flex:1" onclick="RRSS.mark(${i},true)">✅ Publicar</button>
          <button class="btn ${ap?'ghost':'primary'}" style="flex:1" onclick="RRSS.mark(${i},false)">🚫 No</button>
        </div>
      </div>`;
    }).join('');
  }

  /* ============ REPORTES ============ */
  function viewReportes(){
    return `
    <div class="row between"><h1 class="page">Reportes</h1></div>
    <p class="sub" id="rp_upd">Lo que n8n recopiló por ti</p>
    <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap">
      <button class="btn primary" id="rp_1" onclick="RRSS.rtab('metricas')">📊 Métricas</button>
      <button class="btn ghost"   id="rp_2" onclick="RRSS.rtab('consultas')">💬 Consultas</button>
      <button class="btn ghost"   id="rp_3" onclick="RRSS.rtab('mensajes')">✉️ Mensajes</button>
      <button class="btn ghost"   id="rp_4" onclick="RRSS.rtab('bitacora')">🩺 Actividad</button>
    </div>
    <div id="rp_cola"></div>
    <div id="rp_body"><div class="card empty">Cargando…</div></div>`;
  }

  let rtipo='metricas';
  async function initReportes(){
    for(const k of ['metricas','consultas','mensajes','bitacora','posts'])
      if(D[k]===undefined) D[k]=await get(k);
    pintarCola();
    pintarRep();
  }

  /* El estado de la cola se calcula aquí y ahora, con la cola y la bitácora.
     Antes se leía de reportes/cola-estado.json, que solo se reescribe los lunes:
     mostraba números viejos toda la semana. */
  function pintarCola(){
    const el=document.getElementById('rp_cola'); if(!el) return;
    const cola=Array.isArray(D.posts)?D.posts:null;
    if(!cola){ el.innerHTML=''; return; }

    const bit=Array.isArray(D.bitacora)?D.bitacora:[];
    const yaSalio=new Set(bit.filter(x=>x&&x.estado==='ok'&&x.slug).map(x=>x.slug));

    const conTexto = p => p && String(p.caption||'').trim();
    const listos   = cola.filter(p=>p.aprobado===true && conTexto(p) && !yaSalio.has(p.slug));
    const porOK    = cola.filter(p=>p.aprobado!==true && conTexto(p)).length;
    const sinTexto = cola.filter(p=>!conTexto(p)).length;
    const dias     = listos.length;

    const hasta=new Date(Date.now()+dias*86400000).toLocaleDateString('es-CL',{day:'2-digit',month:'long'});
    const nivel = dias===0 ? 'critico' : (dias<=5 ? 'bajo' : 'ok');
    const pill  = nivel==='critico' ? 'bad' : (nivel==='bajo' ? 'warn' : 'ok');
    const icono = nivel==='critico' ? '🚨' : (nivel==='bajo' ? '⚠️' : '🌿');
    const msg = dias===0 ? 'La cuenta se queda sin publicar'
              : dias<=5  ? `Quedan ${dias} día(s) de contenido`
                         : `Todo bien: hay contenido para ${dias} día(s)`;

    const detalle=[`alcanza hasta el ${hasta}`];
    if(porOK)    detalle.push(`${porOK} esperando tu OK`);
    if(sinTexto) detalle.push(`${sinTexto} esperando texto`);

    const sig = listos.slice().sort((a,b)=>(a.orden||0)-(b.orden||0))[0];

    el.innerHTML=`
      <div class="card" style="border-left:4px solid var(--${nivel==='ok'?'pizarra':'coral'})">
        <div class="row between" style="flex-wrap:wrap;gap:8px;align-items:center">
          <span><b>${icono} ${msg}</b><br>
            <span class="muted">${detalle.join(' · ')}</span>
            ${sig?`<br><span class="muted">Esta noche a las 20:00 sale <b>${esc((sig.slug||'').replace(/-/g,' '))}</b></span>`:''}
          </span>
          <span class="pill ${pill}">${dias} días</span>
        </div>
        ${(nivel!=='ok'||porOK)?`<div class="row" style="margin-top:10px;gap:8px">
          ${porOK?`<a class="btn primary sm" href="#/aprobar">✅ Revisar los ${porOK} pendientes</a>`:''}
          ${nivel!=='ok'?`<a class="btn ghost sm" href="#/nuevo">➕ Subir producto nuevo</a>`:''}
        </div>`:''}
      </div>`;
  }

  function pintarRep(){
    const b=document.getElementById('rp_body'); if(!b) return;
    ['1','2','3','4'].forEach((n,i)=>{
      const el=document.getElementById('rp_'+n);
      if(el) el.className='btn '+(['metricas','consultas','mensajes','bitacora'][i]===rtipo?'primary':'ghost');
    });
    if(rtipo==='bitacora'){ pintarBitacora(b); return; }
    if(rtipo==='metricas'){
      const m=D.metricas;
      if(!m){ b.innerHTML='<div class="card empty">Sin reporte aún.<br><span class="muted">Se genera los lunes a las 09:00.</span></div>'; return; }
      const u=document.getElementById('rp_upd');
      if(u) u.textContent='Actualizado: '+fecha(m.generado);
      b.innerHTML=`
        <div class="grid cards">
          <div class="card kpi"><span>Posts esta semana</span><b>${m.publicaciones_semana??0}</b></div>
          <div class="card kpi"><span>Interacciones</span><b style="color:var(--coral)">${m.interacciones_semana??0}</b></div>
          <div class="card kpi"><span>Promedio por post</span><b>${m.promedio_por_post??0}</b></div>
          <div class="card kpi"><span>Mejor horario</span><b>${esc(m.mejor_horario)||'—'}</b></div>
        </div>
        <div class="sectiontitle">Los que mejor funcionaron</div>
        ${(m.top_posts||[]).map((p,i)=>`
          <div class="card"><div class="row between">
            <span><b>${i+1}.</b> ${esc(p.texto)}<br>
              <span class="muted">${p.fecha} · ${esc(p.tipo)} · <a href="${p.link}" target="_blank">ver ↗</a></span></span>
            <span style="text-align:right"><b style="font-size:18px">${p.interacciones}</b><br>
              <span class="muted">❤️ ${p.likes} · 💬 ${p.comentarios}</span></span>
          </div></div>`).join('') || '<div class="card empty">Sin datos.</div>'}`;
    }
    if(rtipo==='consultas'){
      const c=D.consultas;
      if(!c){ b.innerHTML='<div class="card empty">Sin datos aún.<br><span class="muted">Se revisa 3 veces al día.</span></div>'; return; }
      b.innerHTML=`
        <div class="card kpi"><span>Consultas detectadas</span><b style="color:var(--coral)">${c.total??0}</b></div>
        <div class="sectiontitle">Comentarios que preguntan por productos</div>
        ${(c.alertas||[]).map(a=>`
          <div class="card"><div class="row between">
            <span>«${esc(a.comentario)}»<br>
              <span class="muted">@${esc(a.usuario)} · ${esc(a.fecha)} · <a href="${a.post}" target="_blank">ver post ↗</a></span></span>
            <span class="pill warn">${esc(a.palabra_clave)}</span>
          </div></div>`).join('') || '<div class="card empty">Sin consultas nuevas 🎉</div>'}`;
    }
    if(rtipo==='mensajes'){
      const g=D.mensajes;
      if(!g){ b.innerHTML='<div class="card empty">Sin datos aún.<br><span class="muted">Se revisa cada 3 horas.</span></div>'; return; }
      b.innerHTML=`
        <div class="grid cards">
          <div class="card kpi"><span>Sin responder</span><b style="color:var(--coral)">${g.sin_responder??0}</b></div>
          <div class="card kpi"><span>Horario</span><b>${esc(g.horario_atencion)||'—'}</b></div>
        </div>
        <div class="sectiontitle">Conversaciones pendientes</div>
        ${(g.conversaciones||[]).map(v=>`
          <div class="card"><div class="row between">
            <span>«${esc(v.ultimo_mensaje)}»<br><span class="muted">${esc(v.de)} · ${esc(v.fecha)}</span></span>
            <span class="pill ${v.sin_leer?'bad':'ok'}">${v.sin_leer||0} sin leer</span>
          </div></div>`).join('') || '<div class="card empty">Todo respondido 🎉</div>'}`;
    }
  }

  /* ---- Actividad: cómo le fue a n8n en cada corrida ---- */
  /* El sello depende de qué hizo el flujo, no solo de si terminó bien.
     Antes todo lo que salía "ok" decía "Publicado", incluso las alertas de comentarios. */
  function sello(x){
    if(x.estado==='falla')        return {icono:'🚨', pill:'bad',  texto:'Falló'};
    if(x.estado==='sin-novedad')  return {icono:'😴', pill:'warn', texto:'Sin novedad'};
    const f=(x.flujo||'').toLowerCase();
    if(x.link || f.startsWith('instagram')) return {icono:'📷', pill:'ok', texto:'Publicado'};
    if(f.startsWith('historia'))            return {icono:'📖', pill:'ok', texto:'Historia'};
    if(f.includes('alerta') || f.includes('consulta'))
                                            return {icono:'💬', pill:'warn', texto:'Hay consultas'};
    if(f.includes('mensaje'))               return {icono:'✉️', pill:'ok', texto:'Inbox revisado'};
    if(f.includes('reporte') || f.includes('métricas') || f.includes('metricas'))
                                            return {icono:'📊', pill:'ok', texto:'Reporte listo'};
    if(f.includes('respaldo'))              return {icono:'💾', pill:'ok', texto:'Respaldo'};
    if(f.includes('caption'))               return {icono:'✍️', pill:'ok', texto:'Texto escrito'};
    if(f.includes('cola'))                  return {icono:'📦', pill:'ok', texto:'Cola revisada'};
    if(f.includes('enlaces'))               return {icono:'🔗', pill:'ok', texto:'Datos al día'};
    if(f.includes('resumen'))               return {icono:'📨', pill:'ok', texto:'Resumen enviado'};
    return {icono:'✅', pill:'ok', texto:'Listo'};
  }

  function pintarBitacora(b){
    const arr=Array.isArray(D.bitacora)?D.bitacora:[];
    if(!arr.length){
      b.innerHTML='<div class="card empty">Sin registros todavía.<br>'+
        '<span class="muted">Se llena sola cada vez que n8n intenta publicar.</span></div>';
      return;
    }
    const fallas=arr.filter(x=>x.estado==='falla').length;
    const ultima=arr[0];
    const u=document.getElementById('rp_upd');
    if(u) u.textContent='Última corrida: '+fecha(ultima.ts);

    const alerta = ultima.estado==='falla'
      ? `<div class="card" style="border-left:4px solid var(--coral)">
           <b>🚨 La última publicación falló</b><br>
           <span class="muted">${esc(ultima.detalle)}</span>
           <div class="row" style="margin-top:10px">
             <a class="btn primary sm" href="http://192.168.1.200:5678" target="_blank">Abrir n8n ↗</a>
           </div>
         </div>`
      : '';

    b.innerHTML=alerta+`
      <div class="grid cards">
        <div class="card kpi"><span>Últimas corridas</span><b>${arr.length}</b></div>
        <div class="card kpi"><span>Con problema</span>
          <b style="color:${fallas?'var(--coral)':'inherit'}">${fallas}</b></div>
      </div>
      <div class="sectiontitle">Historial</div>
      ${arr.map(x=>{
        const e=sello(x);
        return `<div class="card"><div class="row between" style="gap:10px">
          <span>${e.icono} <b>${esc(x.flujo||'n8n')}</b><br>
            <span class="muted">${esc(x.detalle)}</span><br>
            <span class="muted" style="font-size:11px">${fecha(x.ts)}${
              x.link?` · <a href="${esc(x.link)}" target="_blank">ver post ↗</a>`:''}</span></span>
          <span class="pill ${e.pill}">${e.texto}</span>
        </div></div>`;
      }).join('')}`;
  }

  window.RRSS={
    viewAprobar, initAprobar, viewReportes, initReportes,
    tab(t){
      if(sucio && !confirm('Tienes cambios sin guardar. ¿Cambiar igual?')) return;
      tipo=t; filtro='todos'; sucio=false; render();
      estado('Guarda para que n8n tome los cambios.');
    },
    filtro(f){ filtro=f; render(); },
    mark(i,v){ D[tipo][i].aprobado=v; sucio=true; render(); estado('Cambios sin guardar ·'); },
    all(v){ (D[tipo]||[]).forEach(p=>p.aprobado=v); sucio=true; render(); estado('Cambios sin guardar ·'); },
    async save(){
      const b=document.getElementById('ap_save');
      if(b){ b.disabled=true; b.textContent='Guardando…'; }
      try{
        await guardar(); sucio=false;
        estado('✅ Guardado — n8n ya lo ve ('+new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})+')');
      }catch(e){
        estado('⚠️ '+e.message+' — usa ⬇️ y súbelo a GitHub');
      }finally{ if(b){ b.disabled=false; b.textContent='💾 Guardar'; } }
    },
    rtab(t){ rtipo=t; pintarRep(); },
    download(){
      const n = tipo==='posts' ? 'posts-aprobados.json' : 'historias-aprobadas.json';
      const b=new Blob([JSON.stringify(D[tipo],null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=n; a.click();
    },
    async copy(){
      await navigator.clipboard.writeText(JSON.stringify(D[tipo],null,2));
      if(window.A) alert('JSON copiado ✔'); }
  };
})();
