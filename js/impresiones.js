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
  function estadoDe(a) { return decisiones()[a] || 'pendiente'; }

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
      const ya = (window.DB.products || []).find(p => p.origenArchivo === i.archivo);
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
              <a href="${esc(i.gcode_url)}" target="_blank" rel="noopener">bajar el archivo para reimprimir</a>
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

  window.IMPRESIONES = { view, init: () => { pinta(); if (!cache) recargar(); }, recargar, aprobar, descartar, reponer, filtrar };
})();
