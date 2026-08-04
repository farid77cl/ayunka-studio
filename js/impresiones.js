/* Ayünka Studio — Impresiones: bandeja de lo que sale de la K2.
   Cada impresión llega como PENDIENTE con su precio ya calculado desde los gramos
   y horas REALES de la impresora. Se aprueba (crea el producto) o se descarta.
   Las decisiones viven en DB.bandeja, así que sobreviven a recargar la bandeja. */
(function () {
  const URL_BANDEJA = 'https://ncuvdpydwnepbysadoux.supabase.co/storage/v1/object/public/archivos/impresion/bandeja.json';
  let cache = null, filtro = 'pendiente';

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLP = n => '$' + Math.round(+n || 0).toLocaleString('es-CL');
  function aviso(t) { try { if (window.A && window.A._toast) return window.A._toast(t); } catch (e) {} console.log(t); }

  function decisiones() { window.DB.bandeja = window.DB.bandeja || {}; return window.DB.bandeja; }
  function productoDe(a) { return (window.DB.products || []).find(p => p.origenArchivo === a) || null; }
  function estadoDe(a) {
    const d = decisiones()[a];
    if (d) return d;
    // Si ya hay un producto que salió de este archivo, está aprobado — aunque haya
    // entrado por «Traer catálogo» y no por el botón Aprobar. Sin esto, aparecían
    // en «pendientes» cosas que ya tenían su ficha hecha.
    return productoDe(a) ? 'aprobado' : 'pendiente';
  }

  function view() {
    return `<div class="row between" style="align-items:center">
        <div class="sectiontitle" style="margin:0">Impresiones de la K2</div>
        <button class="btn" onclick="IMPRESIONES.recargar()">Traer de la impresora</button>
      </div>
      <div class="card muted" style="font-size:13px">
        Cada impresión llega con los <b>gramos y horas reales</b> que midió la máquina, no con
        los estimados del rebanador. El precio es una sugerencia: al aprobar puedes ajustarlo y
        agregarle los extras (el LED de la caja de luz, un imán, una borla).
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0">
        ${['pendiente', 'aprobado', 'descartado', 'todo'].map(f =>
          `<button class="subtab ${filtro === f ? 'active' : ''}" onclick="IMPRESIONES.filtrar('${f}')">${f === 'todo' ? 'Todas' : f + 's'}</button>`).join('')}
      </div>
      <div id="imp-lista"><div class="card muted">Cargando…</div></div>`;
  }

  function pinta() {
    const cont = $('#imp-lista'); if (!cont) return;
    if (!cache) { cont.innerHTML = '<div class="card muted">Aprieta «Traer de la impresora».</div>'; return; }
    const items = (cache.items || []).filter(i => filtro === 'todo' || estadoDe(i.archivo) === filtro);
    if (!items.length) { cont.innerHTML = `<div class="card muted">No hay impresiones ${filtro === 'todo' ? '' : filtro + 's'}.</div>`; return; }

    cont.innerHTML = items.map(i => {
      const est = estadoDe(i.archivo);
      const ya = productoDe(i.archivo);
      return `<div class="card" style="margin-bottom:8px">
        <div class="row between" style="align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <b style="word-break:break-word">${esc(i.nombre_sugerido)}</b>
            ${i.probable_prueba ? '<span class="pill warn" style="margin-left:6px">parece prueba</span>' : ''}
            ${est !== 'pendiente' ? `<span class="pill ${est === 'aprobado' ? 'ok' : ''}" style="margin-left:6px">${est}</span>` : ''}
            <div class="muted" style="font-size:12px;margin-top:3px">
              ${i.gramos} g · ${(+i.horas).toFixed(2)} h${i.veces > 1 ? ' · impreso ' + i.veces + ' veces' : ''}
            </div>
            ${i.carpeta_producto ? `<div class="muted" style="font-size:12px">fotos en <code>rrss/productos/${esc(i.carpeta_producto)}/</code></div>` : ''}
            <div style="font-size:12px;margin-top:4px">
              ${i.archivo_nube
                ? `<a href="${esc(i.archivo_nube)}" target="_blank" rel="noopener">bajar el archivo para reimprimir</a>`
                : `<a href="${esc(urlImpresora(i))}" target="_blank" rel="noopener" onclick="return IMPRESIONES.avisoDescarga()">bajar de la impresora</a>
                   <span class="muted">(solo en la red de la K2)</span>`}
              ${i.timelapse_url ? ` · <a href="${esc(i.timelapse_url)}" target="_blank" rel="noopener">timelapse</a>` : ''}
            </div>
          </div>
          <div style="text-align:right;white-space:nowrap">
            <div><b>${CLP(i.precio_sugerido)}</b></div>
            <div class="muted" style="font-size:11px">sugerido</div>
          </div>
        </div>
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
          ${ya ? `<button class="linkish" onclick="A.editProduct('${ya.id}')">Ver el producto →</button>`
               : `<button class="btn" onclick="IMPRESIONES.aprobar('${esc(i.archivo).replace(/'/g, "\\'")}')">Aprobar</button>`}
          ${est !== 'descartado' ? `<button class="linkish" onclick="IMPRESIONES.descartar('${esc(i.archivo).replace(/'/g, "\\'")}')">Descartar</button>` : ''}
          ${est === 'descartado' ? `<button class="linkish" onclick="IMPRESIONES.reponer('${esc(i.archivo).replace(/'/g, "\\'")}')">Devolver a pendientes</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  async function recargar() {
    const cont = $('#imp-lista'); if (cont) cont.innerHTML = '<div class="card muted">Buscando…</div>';
    try {
      const r = await fetch(URL_BANDEJA + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cache = await r.json();
      pinta(); aviso((cache.items || []).length + ' impresiones');
    } catch (e) {
      if (cont) cont.innerHTML = `<div class="card">No se pudo traer la bandeja.<div class="muted" style="font-size:12px;margin-top:4px">${esc(e.message || e)}. La genera n8n con el historial de la impresora; si nunca se ha corrido, todavía no existe.</div></div>`;
    }
  }

  // El nombre del archivo trae espacios y acentos: sin codificar, el enlace se rompe.
  function urlImpresora(i) {
    if (i.archivo_nube) return i.archivo_nube;
    const base = 'http://192.168.100.90:4408/server/files/gcodes/';
    return base + String(i.archivo).split('/').map(encodeURIComponent).join('/');
  }

  // Dos motivos por los que la descarga puede fallar, y conviene decirlos antes:
  //  1. no estar en la red de la impresora
  //  2. Chrome bloquea descargas por http cuando la página va por https
  function avisoDescarga() {
    return confirm('El archivo vive en la impresora (192.168.100.90).\n\n' +
      'Para bajarlo necesitas:\n' +
      '· estar en la misma red que la K2\n' +
      '· y que Chrome no bloquee la descarga (la app va por https y la impresora por http; si no pasa nada, abre el enlace desde la propia página de la impresora)\n\n' +
      '¿Intentamos igual?');
  }

  function item(a) { return (cache && (cache.items || []).find(i => i.archivo === a)) || null; }

  function aprobar(a) {
    const i = item(a); if (!i) return;
    // Se abre el formulario normal de producto, prellenado. Así el extra, la foto y
    // el resto se editan con lo que ya existe, sin inventar otra pantalla.
    window.A._prod = {
      id: null, name: i.nombre_sugerido, material: 'PLA',
      grams: i.gramos, timeH: i.horas, colors: 1, postMin: 0,
      packOverride: null, extraCosto: 0, extraNota: '', price: null, stock: 0,
      filamentId: null, imageId: null, files: [],
      origenArchivo: i.archivo, origenGcode: i.gcode_url,
      carpetaFotos: i.carpeta_producto || null
    };
    decisiones()[a] = 'aprobado'; window.saveDB();
    window.A.renderProductModal();
  }

  function descartar(a) { decisiones()[a] = 'descartado'; window.saveDB(); pinta(); }
  function reponer(a) { delete decisiones()[a]; window.saveDB(); pinta(); }
  function filtrar(f) { filtro = f; if (window.__render) window.__render(); setTimeout(pinta, 0); }


  /* ---------- Traer el catálogo real de Ayünka ----------
     Empareja por SKU: actualiza lo que ya existe, agrega lo que falta y NUNCA borra.
     Lo que Farid haya editado a mano (precio, foto propia, archivos) se respeta. */
  const URL_CATALOGO = 'https://ncuvdpydwnepbysadoux.supabase.co/storage/v1/object/public/archivos/catalogo/productos-app.json';

  async function traerCatalogo() {
    if (!confirm('Trae el catálogo de Ayünka (36 productos con foto y datos reales).\n\nActualiza los que ya tienes y agrega los que falten. No borra nada ni pisa los precios que hayas escrito tú.')) return;
    try {
      const r = await fetch(URL_CATALOGO + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const cat = await r.json();
      const DB = window.DB;
      DB.products = DB.products || [];
      let nuevos = 0, tocados = 0;
      for (const c of (cat.productos || [])) {
        let p = DB.products.find(x => x.sku === c.sku)
             || DB.products.find(x => (x.name || '').toLowerCase() === (c.name || '').toLowerCase());
        if (!p) {
          p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) };
          DB.products.push(p); nuevos++;
        } else tocados++;
        // se copia lo del catálogo, pero sin pisar lo que él haya puesto a mano
        p.sku = c.sku; p.name = p.name || c.name; p.linea = c.linea;
        p.material = p.material || c.material; p.colors = p.colors || c.colors;
        p.postMin = p.postMin != null ? p.postMin : c.postMin;
        if (!p.grams && c.grams) p.grams = c.grams;
        if (!p.timeH && c.timeH) p.timeH = c.timeH;
        if (p.price == null && c.price != null) p.price = c.price;
        if (!p.extraCosto && c.extraCosto) { p.extraCosto = c.extraCosto; p.extraNota = c.extraNota; }
        if (!p.imageUrl && !p.imageId && c.imageUrl) p.imageUrl = c.imageUrl;
        if (!p.igId && c.igId) p.igId = c.igId;
        if (c.origenArchivo) { p.origenArchivo = c.origenArchivo; p.origenGcode = c.origenGcode; }
        if (c.carpetaFotos) p.carpetaFotos = c.carpetaFotos;
        p.files = p.files || [];
        p.stock = p.stock || 0;
        p.packOverride = p.packOverride != null ? p.packOverride : null;
        p.filamentId = p.filamentId || null;
      }
      window.saveDB();
      aviso(nuevos + ' productos nuevos · ' + tocados + ' actualizados');
      if (window.__render) window.__render();
    } catch (e) {
      alert('No se pudo traer el catálogo: ' + (e.message || e));
    }
  }


  /* ---------- Subir a la nube lo que quedó en el dispositivo ----------
     Antes los archivos y las fotos podían quedar en IndexedDB o como data: URL,
     y entonces existían solo en ese computador. En los demás salían rotos.
     Esto los sube a Supabase de una vez y deja todo remoto. */
  async function subirTodoALaNube() {
    if (!(window.Supa && window.Supa.configured())) {
      alert('Primero configura Supabase en Ajustes.'); return;
    }
    const DB = window.DB;
    const pendientes = (DB.products || []).reduce((n, p) => n
      + (p.imageId ? 1 : 0)
      + (String(p.imageUrl || '').startsWith('data:') ? 1 : 0)
      + (p.files || []).filter(f => f.id && !f.url).length, 0);
    if (!pendientes) { alert('No queda nada guardado en el dispositivo: ya está todo en la nube.'); return; }
    if (!confirm('Hay ' + pendientes + ' archivo(s) o foto(s) guardados solo en este dispositivo.\n\nSe suben a Supabase y quedan disponibles desde cualquier lado. ¿Seguimos?')) return;

    let ok = 0; const fallaron = [];
    const dataUrlABlob = async u => (await fetch(u)).blob();

    for (const p of (DB.products || [])) {
      // foto guardada en IndexedDB
      if (p.imageId) {
        try {
          const f = await window.IDB.getFile(p.imageId);
          if (f && f.blob) {
            p.imageUrl = await window.Supa.upload(f.blob, (p.name || 'producto') + '.jpg');
            window.IDB.delFile(p.imageId).catch(() => {});
            p.imageId = null; ok++;
          } else { fallaron.push((p.name || '?') + ' · foto (no está en este dispositivo)'); }
        } catch (e) { fallaron.push((p.name || '?') + ' · foto: ' + (e.message || e)); }
      }
      // foto incrustada como data: URL — pesa mucho y no viaja bien
      if (String(p.imageUrl || '').startsWith('data:')) {
        try {
          p.imageUrl = await window.Supa.upload(await dataUrlABlob(p.imageUrl), (p.name || 'producto') + '.jpg');
          ok++;
        } catch (e) { fallaron.push((p.name || '?') + ' · foto incrustada: ' + (e.message || e)); }
      }
      // archivos STL/3MF en IndexedDB
      for (const f of (p.files || [])) {
        if (!f.id || f.url) continue;
        try {
          const g = await window.IDB.getFile(f.id);
          if (g && g.blob) {
            f.url = await window.Supa.upload(g.blob, f.name || 'archivo');
            window.IDB.delFile(f.id).catch(() => {});
            delete f.id; ok++;
          } else { fallaron.push((p.name || '?') + ' · ' + (f.name || 'archivo') + ' (no está en este dispositivo)'); }
        } catch (e) { fallaron.push((p.name || '?') + ' · ' + (f.name || 'archivo') + ': ' + (e.message || e)); }
      }
    }

    window.saveDB();
    if (window.__render) window.__render();
    let msg = ok + ' subido(s) a la nube.';
    if (fallaron.length) msg += '\n\nNo se pudo con ' + fallaron.length + ':\n· ' + fallaron.slice(0, 8).join('\n· ')
      + '\n\nLos que dicen «no está en este dispositivo» se subieron desde otro computador: ábrelo ahí y repite, o vuelve a adjuntarlos.';
    alert(msg);
  }

  window.IMPRESIONES = { traerCatalogo, subirTodoALaNube, avisoDescarga, urlImpresora, view, init: () => { pinta(); if (!cache) recargar(); }, recargar, aprobar, descartar, reponer, filtrar };
})();
