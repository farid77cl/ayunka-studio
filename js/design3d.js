/* Ayünka Studio — Diseño 3D · interfaz.

   Se compone en un lienzo 2D (arrastrando, como en Canva) y se revisa en 3D. El 2D
   es el editor de verdad: mover cosas en 3D con el dedo en un celular es un suplicio.

   Regla para que no se sienta lento: el HTML del panel SOLO se vuelve a pintar cuando
   cambia la estructura (agregar o quitar una capa, seleccionar otra). Mientras se
   arrastra o se escribe, se redibuja el lienzo y nada más; el 3D se recalcula con
   retardo. Repintar el HTML en cada tecla hacía perder el foco del input.           */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '\\x3C');
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? (d || 0) : n; };
  function toast(t) { try { if (window.A && window.A._toast) return window.A._toast(t); } catch (e) {} console.log(t); }

  let P = null;                 // proyecto actual
  let sel = null;               // id de la capa seleccionada
  let vista = '2d';             // '2d' | '3d'
  let compilado = null;
  let cacheFigs = new Map();    // id capa -> {clave, figs}  (sin posición aplicada)
  let cacheBase = { clave: null, figs: [] };
  let three = null, t3d = null, tCompilar = null;
  let imgTmp = null;            // {imageData, nombre} mientras se ajusta la importación
  let arrastre = null;

  /* ---------- utilidades del modelo ---------- */
  function B() { return window.D3DBuild; }
  function G() { return window.D3DFormas; }
  function capaSel() { return (P.capas || []).find(c => c.id === sel) || null; }
  function claveForma(c) {
    if (c.tipo === 'texto') return ['t', c.txt, c.fuente, c.mm, c.align, c.espaciado, c.interlinea].join('|');
    if (c.tipo === 'figura') return ['f', c.figura, c.ancho, c.alto, JSON.stringify(c.params || {})].join('|');
    return ['i', c.id, c.ancho, c.alto, (c.figs || []).length].join('|');
  }
  async function figsDe(c) {
    const k = claveForma(c), hit = cacheFigs.get(c.id);
    if (hit && hit.clave === k) return hit.figs;
    let figs = [];
    try {
      if (c.tipo === 'texto') {
        if (String(c.txt || '').trim()) figs = await window.D3DFuentes.contornos(c.txt, { fuente: c.fuente, mm: num(c.mm, 10), align: c.align, espaciado: num(c.espaciado, 0), interlinea: num(c.interlinea, 1.25) });
      } else if (c.tipo === 'figura') figs = G().figura(c.figura, num(c.ancho, 15), num(c.alto, 15), c.params);
      else if (c.tipo === 'imagen' && c.figs && c.figs.length) figs = G().encajar(c.figs, num(c.ancho, 30), num(c.alto, 30));
    } catch (e) { console.warn('capa', c.nombre, e); }
    cacheFigs.set(c.id, { clave: k, figs });
    return figs;
  }
  function figsPuestas(c, figs) { return G().transformar(figs, { x: num(c.x, 0), y: num(c.y, 0), rot: num(c.rot, 0) }); }
  async function figsBase() {
    const b = P.base || {};
    const k = [b.origen, b.figura, b.txt, b.fuente, b.ancho, b.alto, JSON.stringify(b.params || {})].join('|');
    if (cacheBase.clave === k) return cacheBase.figs;
    let figs = [];
    try { figs = await B().figsDeBase(P); } catch (e) { console.warn('base', e); }
    cacheBase = { clave: k, figs };
    return figs;
  }

  /* ---------- lienzo 2D ----------
     El encuadre NO se recalcula en cada dibujo a propósito: si dependiera del
     contenido, arrastrar una pieza hacia afuera reescalaría toda la vista y se
     sentiría como que el diseño «huye» del dedo. Se encuadra al abrir, al cambiar
     de plantilla y cuando se pide «Centrar»; el resto del tiempo manda el usuario
     con la rueda y arrastrando el fondo.                                          */
  let vp = { s: 0, cx: 0, cy: 0 };
  const m2p = (x, y) => [vp.cx + x * vp.s, vp.cy - y * vp.s];
  const p2m = (px, py) => [(px - vp.cx) / vp.s, (vp.cy - py) / vp.s];

  const rad = g => (+g || 0) * Math.PI / 180;
  function rotar(x, y, r) { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; }

  // Caja de la capa en SU propio sistema (sin girar ni trasladar), ya con el
  // estirado aplicado. De aquí salen los tiradores, que por eso giran con la pieza.
  function cajaLocal(c, figs) {
    if (!figs || !figs.length) return null;
    const b = G().bboxDe(figs);
    const sx = num(c.escalaX, 1) || 1, sy = num(c.escalaY, 1) || 1;
    return { x1: b.x1 * sx, y1: b.y1 * sy, x2: b.x2 * sx, y2: b.y2 * sy, w: b.w * sx, h: b.h * sy };
  }
  const DIRS = { nw: [-1, 1], n: [0, 1], ne: [1, 1], w: [-1, 0], e: [1, 0], sw: [-1, -1], s: [0, -1], se: [1, -1] };
  // Punto de un tirador en milímetros globales.
  function puntoHandle(c, bl, dir) {
    const [ux, uy] = DIRS[dir];
    const lx = ux * bl.w / 2, ly = uy * bl.h / 2;
    const [rx, ry] = rotar(lx, ly, rad(c.rot));
    return [rx + num(c.x, 0), ry + num(c.y, 0)];
  }
  function puntoGiro(c, bl) {
    const d = bl.h / 2 + 26 / (vp.s || 1);   // 26 px por encima del borde
    const [rx, ry] = rotar(0, d, rad(c.rot));
    return [rx + num(c.x, 0), ry + num(c.y, 0)];
  }

  function trazar(ctx, figs) {
    ctx.beginPath();
    for (const f of figs) {
      const anillos = [f.outer].concat(f.holes || []);
      for (const a of anillos) {
        if (!a.length) continue;
        let p = m2p(a[0][0], a[0][1]); ctx.moveTo(p[0], p[1]);
        for (let i = 1; i < a.length; i++) { p = m2p(a[i][0], a[i][1]); ctx.lineTo(p[0], p[1]); }
        ctx.closePath();
      }
    }
  }

  async function dibujar(reencuadrar) {
    const cv = $('#d3d-2d'); if (!cv || !P) return;
    const cont = cv.parentElement;
    const W = Math.max(240, cont.clientWidth), H = num(cv.dataset.h, 420);
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ECE6DA'; ctx.fillRect(0, 0, W, H);

    // resolver todo lo visible
    const bf = await figsBase();
    const capas = (P.capas || []).filter(c => c.visible !== false);
    const resueltas = [];
    for (const c of capas) resueltas.push({ c, base: await figsDe(c), figs: figsPuestas(c, await figsDe(c)) });

    const todo = bf.concat(resueltas.reduce((a, r) => a.concat(r.figs), []));
    const bb = todo.length ? G().bboxDe(todo) : { x1: -30, y1: -20, x2: 30, y2: 20, w: 60, h: 40 };
    if (reencuadrar || !vp.s) {
      const mw = Math.max(bb.w, 10), mh = Math.max(bb.h, 10);
      vp.s = Math.min((W - 40) / mw, (H - 40) / mh);
      vp.cx = W / 2 - ((bb.x1 + bb.x2) / 2) * vp.s;
      vp.cy = H / 2 + ((bb.y1 + bb.y2) / 2) * vp.s;
    }

    // base
    if (bf.length) {
      ctx.save();
      trazar(ctx, bf);
      ctx.fillStyle = B().hexDe(num(P.base.color, 1), P.paleta);
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(47,58,64,.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    // capas
    for (const { c, figs } of resueltas) {
      if (!figs.length) continue;
      ctx.save();
      trazar(ctx, figs);
      if (c.calado) { ctx.fillStyle = '#ECE6DA'; ctx.fill('evenodd'); ctx.strokeStyle = 'rgba(203,90,82,.9)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.stroke(); }
      else { ctx.fillStyle = B().hexDe(num(c.color, 2), P.paleta); ctx.fill('evenodd');
             ctx.strokeStyle = 'rgba(47,58,64,.25)'; ctx.lineWidth = .8; ctx.stroke(); }
      ctx.restore();
    }
    // selección: la caja y los tiradores van girados como la pieza
    const cs = capaSel();
    cv._sel = null;
    if (cs && cs.visible !== false) {
      const r = resueltas.find(x => x.c.id === cs.id);
      const bl = r ? cajaLocal(cs, r.base) : null;
      if (bl) {
        const esq = ['nw', 'ne', 'se', 'sw'].map(d => m2p(...puntoHandle(cs, bl, d)));
        ctx.save();
        ctx.strokeStyle = '#5F7C8E'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(esq[0][0], esq[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(esq[i][0], esq[i][1]);
        ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);

        // varilla y perilla de giro
        const pg = m2p(...puntoGiro(cs, bl)), pn = m2p(...puntoHandle(cs, bl, 'n'));
        ctx.strokeStyle = '#5F7C8E'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(pn[0], pn[1]); ctx.lineTo(pg[0], pg[1]); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pg[0], pg[1], 7, 0, 7); ctx.fill();
        ctx.strokeStyle = '#5F7C8E'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#5F7C8E'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(pg[0], pg[1], 3.4, 0.6, 5.2); ctx.stroke();

        // ocho tiradores de tamaño
        const hs = {};
        for (const d of Object.keys(DIRS)) {
          const p = m2p(...puntoHandle(cs, bl, d)); hs[d] = p;
          const lado = (d.length === 1);
          ctx.fillStyle = lado ? '#ECE6DA' : '#fff';
          ctx.strokeStyle = '#5F7C8E'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.rect(p[0] - 5, p[1] - 5, 10, 10); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        cv._sel = { id: cs.id, bl, hs, giro: pg };
      }
    }
    cv._resueltas = resueltas;

    // guías de centro
    ctx.save(); ctx.strokeStyle = 'rgba(95,124,142,.25)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
    const o = m2p(0, 0);
    ctx.beginPath(); ctx.moveTo(o[0], 0); ctx.lineTo(o[0], H); ctx.moveTo(0, o[1]); ctx.lineTo(W, o[1]); ctx.stroke();
    ctx.restore();

    // medidas
    ctx.save(); ctx.fillStyle = '#5F7C8E'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(bb.w.toFixed(0) + ' × ' + bb.h.toFixed(0) + ' mm', 10, H - 10);
    ctx.restore();
  }

  /* ---------- interacción en el lienzo ---------- */
  function hit(px, py) {
    const cv = $('#d3d-2d'); const rs = (cv && cv._resueltas) || [];
    const m = p2m(px, py);
    for (let i = rs.length - 1; i >= 0; i--) {
      for (const f of rs[i].figs) if (G().dentro(m, f.outer)) return rs[i].c;
    }
    return null;
  }
  function bajoCursor(cv, px, py) {
    const s = cv._sel;
    if (s) {
      if (Math.hypot(px - s.giro[0], py - s.giro[1]) < 11) return { tipo: 'giro' };
      for (const d of Object.keys(s.hs)) {
        const p = s.hs[d];
        if (Math.abs(px - p[0]) < 8 && Math.abs(py - p[1]) < 8) return { tipo: 'escala', dir: d };
      }
    }
    return null;
  }
  const CURSORES = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  function cursorDe(cv, dir) {
    const s = cv._sel; if (!s) return 'default';
    const p = s.hs[dir], c = m2p(num(capaSel().x, 0), num(capaSel().y, 0));
    let a = Math.atan2(p[1] - c[1], p[0] - c[0]) * 180 / Math.PI;
    a = ((a % 180) + 180) % 180;
    return CURSORES[Math.round(a / 45) % 4];
  }

  function onDown(e) {
    const cv = $('#d3d-2d'); if (!cv || !P) return;
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const cs = capaSel();

    const h = bajoCursor(cv, px, py);
    if (cs && h) {
      const bl = cv._sel.bl;
      if (h.tipo === 'giro') {
        const m = p2m(px, py);
        arrastre = { modo: 'giro', id: cs.id, rot0: num(cs.rot, 0),
                     ang0: Math.atan2(m[1] - num(cs.y, 0), m[0] - num(cs.x, 0)) * 180 / Math.PI };
      } else {
        const [ux, uy] = DIRS[h.dir];
        // el punto de anclaje es el tirador opuesto, y se queda quieto mientras se estira
        const anclaL = [-ux * bl.w / 2, -uy * bl.h / 2];
        const [ax, ay] = rotar(anclaL[0], anclaL[1], rad(cs.rot));
        arrastre = { modo: 'escala', id: cs.id, dir: h.dir, ux, uy,
                     w0: bl.w, h0: bl.h, mm0: num(cs.mm, 10),
                     ex0: num(cs.escalaX, 1) || 1, ey0: num(cs.escalaY, 1) || 1,
                     ancla: [ax + num(cs.x, 0), ay + num(cs.y, 0)] };
      }
      cv.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }

    const c = hit(px, py);
    if (c) {
      // hay que redibujar aquí: si solo se toca sin arrastrar, nadie más lo haría y
      // los tiradores no aparecían hasta mover la pieza.
      if (c.id !== sel) { sel = c.id; pintarPanel(); dibujar(); }
      arrastre = { modo: 'mover', id: c.id, px, py, x0: num(c.x, 0), y0: num(c.y, 0) };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
    } else {
      // el fondo desplaza la vista; si no se llegó a mover, es un clic que deselecciona
      arrastre = { modo: 'pan', px, py, cx0: vp.cx, cy0: vp.cy, movido: false };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
    }
  }

  function onMove(e) {
    const cv = $('#d3d-2d'); if (!cv || !P) return;
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    if (!arrastre) {   // solo actualizar el cursor
      const h = bajoCursor(cv, px, py);
      cv.style.cursor = h ? (h.tipo === 'giro' ? 'grab' : cursorDe(cv, h.dir)) : (hit(px, py) ? 'move' : 'default');
      return;
    }

    if (arrastre.modo === 'pan') {
      if (Math.hypot(px - arrastre.px, py - arrastre.py) > 3) arrastre.movido = true;
      vp.cx = arrastre.cx0 + (px - arrastre.px);
      vp.cy = arrastre.cy0 + (py - arrastre.py);
      dibujar(); e.preventDefault(); return;
    }

    const c = (P.capas || []).find(x => x.id === arrastre.id); if (!c) return;

    if (arrastre.modo === 'mover') {
      let nx = arrastre.x0 + (px - arrastre.px) / vp.s;
      let ny = arrastre.y0 - (py - arrastre.py) / vp.s;
      if (Math.abs(nx) < 1.2) nx = 0;           // imán al centro: alinear a ojo nunca queda recto
      if (Math.abs(ny) < 1.2) ny = 0;
      c.x = Math.round(nx * 10) / 10; c.y = Math.round(ny * 10) / 10;

    } else if (arrastre.modo === 'giro') {
      const m = p2m(px, py);
      const ang = Math.atan2(m[1] - num(c.y, 0), m[0] - num(c.x, 0)) * 180 / Math.PI;
      let rot = arrastre.rot0 + (ang - arrastre.ang0);
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      else { const q = Math.round(rot / 90) * 90; if (Math.abs(rot - q) < 2.5) rot = q; }  // imán a los rectos
      c.rot = Math.round(((rot % 360) + 360) % 360 * 10) / 10;

    } else if (arrastre.modo === 'escala') {
      const m = p2m(px, py);
      // el tirador arrastrado, medido desde el ancla y en los ejes de la pieza
      const d = rotar(m[0] - arrastre.ancla[0], m[1] - arrastre.ancla[1], -rad(c.rot));
      const libreX = arrastre.ux !== 0, libreY = arrastre.uy !== 0;
      let w = libreX ? Math.max(0.6, Math.abs(d[0])) : arrastre.w0;
      let h = libreY ? Math.max(0.6, Math.abs(d[1])) : arrastre.h0;
      if (libreX && libreY && (e.shiftKey || c.tipo === 'texto')) {
        const f = Math.max(w / arrastre.w0, h / arrastre.h0);
        w = arrastre.w0 * f; h = arrastre.h0 * f;
      }
      if (c.tipo === 'texto') {
        if (libreX && libreY) c.mm = Math.max(1.5, Math.round(arrastre.mm0 * (w / arrastre.w0) * 10) / 10);
        else if (libreX) c.escalaX = Math.max(0.1, Math.round(arrastre.ex0 * (w / arrastre.w0) * 100) / 100);
        else c.escalaY = Math.max(0.1, Math.round(arrastre.ey0 * (h / arrastre.h0) * 100) / 100);
      } else {
        if (libreX) c.ancho = Math.max(1, Math.round(w * 10) / 10);
        if (libreY) c.alto = Math.max(1, Math.round(h * 10) / 10);
      }
      // Recolocar la pieza para que el ancla no se mueva. Se usan el w/h recién
      // calculados y no la caja del caché: ese caché todavía tiene la medida vieja
      // hasta el siguiente dibujo, y el ancla se arrancaba medio milímetro por paso.
      const aL = rotar(-arrastre.ux * w / 2, -arrastre.uy * h / 2, rad(c.rot));
      c.x = Math.round((arrastre.ancla[0] - aL[0]) * 10) / 10;
      c.y = Math.round((arrastre.ancla[1] - aL[1]) * 10) / 10;
    }
    dibujar(); agendar3D(); sincronizarCampos();
    e.preventDefault();
  }

  function onUp() {
    if (!arrastre) return;
    const era = arrastre; arrastre = null;
    if (era.modo === 'pan') { if (!era.movido && sel) { sel = null; pintarPanel(); dibujar(); } return; }
    guardarSuave();
  }

  function onRueda(e) {
    if (!P || vista !== '2d') return;
    const cv = $('#d3d-2d'); if (!cv) return;
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.13 : 1 / 1.13;
    const ns = Math.max(0.4, Math.min(80, vp.s * f)), real = ns / vp.s;
    vp.cx = px - (px - vp.cx) * real;           // acercar hacia donde apunta el cursor
    vp.cy = py - (py - vp.cy) * real;
    vp.s = ns;
    dibujar(); e.preventDefault();
  }

  function onTecla(e) {
    if (!P || vista !== '2d') return;
    const t = (document.activeElement || {}).tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if ($('#modal-root') && $('#modal-root').children.length) return;
    const c = capaSel();
    if (e.key === 'Escape') { if (sel) { sel = null; pintarPanel(); dibujar(); } return; }
    if (!c) return;
    const paso = e.shiftKey ? 5 : 0.5;
    let usada = true;
    switch (e.key) {
      case 'ArrowLeft':  c.x = Math.round((num(c.x, 0) - paso) * 10) / 10; break;
      case 'ArrowRight': c.x = Math.round((num(c.x, 0) + paso) * 10) / 10; break;
      case 'ArrowUp':    c.y = Math.round((num(c.y, 0) + paso) * 10) / 10; break;
      case 'ArrowDown':  c.y = Math.round((num(c.y, 0) - paso) * 10) / 10; break;
      case 'Delete': case 'Backspace': API.quitar(c.id); return;
      case 'd': case 'D': if (e.ctrlKey || e.metaKey) { API.duplicar(c.id); e.preventDefault(); } return;
      case '[': c.rot = Math.round((num(c.rot, 0) - (e.shiftKey ? 15 : 1)) * 10) / 10; break;
      case ']': c.rot = Math.round((num(c.rot, 0) + (e.shiftKey ? 15 : 1)) * 10) / 10; break;
      default: usada = false;
    }
    if (!usada) return;
    e.preventDefault();
    dibujar(); agendar3D(); sincronizarCampos(); guardarSuave();
  }

  /* ---------- 3D ---------- */
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); }); }
  async function ensureThree() {
    if (!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    if (!window.THREE.OrbitControls) { try { await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'); } catch (e) {} }
  }
  function montar3D() {
    const cont = $('#d3d-3d'); if (!cont || three) return;
    const THREE = window.THREE, W = cont.clientWidth || 400, H = num(cont.dataset.h, 420);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xECE6DA);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 20000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1); renderer.setSize(W, H);
    cont.innerHTML = ''; cont.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, .72));
    const d1 = new THREE.DirectionalLight(0xffffff, .7); d1.position.set(1, -1, 1.4); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, .3); d2.position.set(-1, .6, -.8); scene.add(d2);
    const grupo = new THREE.Group(); scene.add(grupo);
    let controls = null;
    if (THREE.OrbitControls) { controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; }
    // `three` se arma ANTES de arrancar el bucle: el primer frame corre de inmediato
    // y si todavía valía null reventaba al intentar guardar el raf.
    three = { THREE, scene, camera, renderer, controls, grupo, cont, raf: 0, encuadrado: false };
    (function loop() { if (!three) return; three.raf = requestAnimationFrame(loop); if (controls) controls.update(); renderer.render(scene, camera); })();
  }
  function encuadrar() {
    if (!three || !compilado) return;
    const d = compilado.dims, r = Math.max(d.ancho, d.alto, d.espesor, 20);
    three.camera.position.set(r * .35, -r * 1.25, r * 1.05);
    three.camera.up.set(0, 0, 1); three.camera.lookAt(0, 0, d.espesor / 2);
    if (three.controls) { three.controls.target.set(0, 0, d.espesor / 2); three.controls.update(); }
    three.encuadrado = true;
  }
  function agendar3D() { clearTimeout(t3d); t3d = setTimeout(refrescar3D, 260); }
  async function refrescar3D() {
    if (!P) return;
    try { compilado = await B().compilar(P); } catch (e) { console.error(e); toast('No pude generar el modelo'); return; }
    pintarAvisos();
    if (vista !== '3d' || !window.THREE) return;
    montar3D(); if (!three) return;
    while (three.grupo.children.length) {
      const m = three.grupo.children.pop();
      if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose();
      three.grupo.remove(m);
    }
    const g = B().aThree(compilado, { paleta: P.paleta, pieza: P._piezaVista || null });
    while (g.children.length) three.grupo.add(g.children[0]);
    if (!three.encuadrado) encuadrar();
  }

  /* ---------- guardado ---------- */
  // Solo se guarda lo que Farid tocó de verdad. Sin esto, pasearse por las plantillas
  // para mirarlas dejaba «Mis diseños» lleno de copias que nadie pidió.
  function guardarSuave() { if (P) P._tocado = true; clearTimeout(guardarSuave._t); guardarSuave._t = setTimeout(persistir, 700); }
  function persistir() {
    if (!P || !P._tocado) return;
    const DB = window.DB; if (!DB) return;
    DB.disenos3d = DB.disenos3d || [];
    const i = DB.disenos3d.findIndex(x => x.id === P.id);
    P.modificado = new Date().toISOString();
    if (i >= 0) DB.disenos3d[i] = P; else DB.disenos3d.push(P);
    try { window.saveDB(); } catch (e) {}
  }

  /* ---------- panel: capas y propiedades ---------- */
  function filaCapa(c, i, n) {
    const act = c.id === sel;
    const ico = c.tipo === 'texto' ? '🅰' : c.tipo === 'imagen' ? '🖼' : '✦';
    return `<div class="d3d-capa ${act ? 'sel' : ''}" onclick="DISENO3D.sel('${escJs(c.id)}')">
      <span class="d3d-ico">${ico}</span>
      <span class="d3d-nom">${esc(c.nombre || c.txt || 'Capa')}</span>
      <span class="d3d-sw" style="background:${B().hexDe(num(c.color, 2), P.paleta)}" title="Color ${c.color}"></span>
      <button class="linkish" title="${c.visible === false ? 'Mostrar' : 'Ocultar'}" onclick="event.stopPropagation();DISENO3D.visible('${escJs(c.id)}')">${c.visible === false ? '🚫' : '👁'}</button>
      <button class="linkish" title="Subir" ${i === 0 ? 'disabled' : ''} onclick="event.stopPropagation();DISENO3D.mover('${escJs(c.id)}',-1)">↑</button>
      <button class="linkish" title="Bajar" ${i === n - 1 ? 'disabled' : ''} onclick="event.stopPropagation();DISENO3D.mover('${escJs(c.id)}',1)">↓</button>
      <button class="linkish" title="Duplicar" onclick="event.stopPropagation();DISENO3D.duplicar('${escJs(c.id)}')">⧉</button>
      <button class="linkish" title="Quitar" onclick="event.stopPropagation();DISENO3D.quitar('${escJs(c.id)}')">🗑</button>
    </div>`;
  }

  function selColor(valor, fn) {
    return `<div class="row" style="gap:5px">${B().COLORES.map(c =>
      `<button type="button" class="d3d-color ${num(valor, 1) === c.i ? 'act' : ''}" style="background:${B().hexDe(c.i, P.paleta)}"
        title="Color ${c.i} del CFS" onclick="${fn}(${c.i})">${num(valor, 1) === c.i ? '✓' : ''}</button>`).join('')}
      <input type="color" value="${B().hexDe(num(valor, 1), P.paleta)}" title="Cambiar este color"
        oninput="DISENO3D.tinte(${num(valor, 1)},this.value)" style="width:34px;padding:2px;height:30px">
    </div>`;
  }

  function propsCapa(c) {
    if (!c) return `<div class="card muted" style="font-size:13px">Toca una capa en el lienzo, o agrega una nueva. Puedes arrastrarla para moverla y usar el cuadrito de la esquina para agrandarla.</div>`;
    const modoC = B().modoDe(c);
    const alturaBase = (P.base && P.base.origen !== 'ninguna') ? num(P.base.grosor, 3) : 0;
    const comun = `
      <div class="formgrid">
        <label class="field">Posición X (mm)<input type="number" step="0.5" value="${num(c.x, 0)}" oninput="DISENO3D.prop('x',this.value)"></label>
        <label class="field">Posición Y (mm)<input type="number" step="0.5" value="${num(c.y, 0)}" oninput="DISENO3D.prop('y',this.value)"></label>
        <label class="field">Giro (°)<input type="number" step="1" value="${num(c.rot, 0)}" oninput="DISENO3D.prop('rot',this.value)"></label>
        <label class="field">Relieve (mm)<input type="number" step="0.2" min="0.2" value="${num(c.altura, 1.2)}" oninput="DISENO3D.prop('altura',this.value)"></label>
      </div>
      <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
        <button class="btn ghost sm" title="Girar 90° a la izquierda" onclick="DISENO3D.girar(-90)">⟲ 90°</button>
        <button class="btn ghost sm" title="Girar 90° a la derecha" onclick="DISENO3D.girar(90)">⟳ 90°</button>
        <button class="btn ghost sm" title="Dejarla derecha" onclick="DISENO3D.enderezar()">Enderezar</button>
        <button class="btn ghost sm" title="Llevar al centro" onclick="DISENO3D.centrarCapa()">Centrar</button>
        <button class="btn ghost sm" title="Centrar solo de lado a lado" onclick="DISENO3D.centrarCapa('x')">Centrar ↔</button>
      </div>
      <label class="field" style="margin-top:10px">Color${selColor(c.color, 'DISENO3D.color')}</label>
      <label class="field" style="margin-top:10px">Cómo se apoya
        <select onchange="DISENO3D.prop('modo',this.value)">
          <option value="relieve" ${modoC === 'relieve' ? 'selected' : ''}>En relieve (sobresale)</option>
          <option value="grabado" ${modoC === 'grabado' ? 'selected' : ''}>Grabada (hundida en la base)</option>
          <option value="calado" ${modoC === 'calado' ? 'selected' : ''}>Calada (atraviesa — pasa la luz)</option>
        </select></label>
      ${modoC === 'grabado'
        ? `<label class="field" style="margin-top:8px">Profundidad del grabado (mm)<input type="number" step="0.2" min="0.2" value="${num(c.prof, 1)}" oninput="DISENO3D.prop('prof',this.value)"></label>
           <div class="muted" style="margin-top:4px">Grabar deja apoyado el centro de la «o»; calar lo suelta y se cae.</div>`
        : ''}
      ${modoC === 'relieve'
        ? `<label class="field" style="margin-top:8px">Altura Z (mm) <span class="muted">— 0 = sobre la cara de la base</span>
             <input type="number" step="0.5" value="${num(c.z, 0)}" oninput="DISENO3D.prop('z',this.value)"></label>
           ${alturaBase > 0 ? `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
             <button class="btn ghost sm" onclick="DISENO3D.prop('z',0)">A ras de la cara</button>
             <button class="btn ghost sm" title="Lo mete dentro de la base, a media altura" onclick="DISENO3D.zMedio()">A media altura</button>
             <button class="btn ghost sm" title="Lo hunde hasta que solo asome" onclick="DISENO3D.zHundir()">Hundir</button>
           </div>` : ''}`
        : ''}`;

    if (c.tipo === 'texto') {
      const gr = window.D3DFuentes.grupos();
      return `<label class="field">Texto<textarea rows="2" oninput="DISENO3D.prop('txt',this.value)">${esc(c.txt)}</textarea></label>
        <div class="muted" style="margin:-4px 0 8px">Enter para escribir en varias líneas.</div>
        <div class="formgrid">
          <label class="field">Letra<select onchange="DISENO3D.prop('fuente',this.value)">
            ${Object.keys(gr).map(g => `<optgroup label="${esc(g)}">${gr[g].map(f => `<option value="${f.id}" ${c.fuente === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</optgroup>`).join('')}
          </select></label>
          <label class="field">Tamaño (mm)<input type="number" step="0.5" min="2" value="${num(c.mm, 10)}" oninput="DISENO3D.prop('mm',this.value)"></label>
          <label class="field">Alineación<select onchange="DISENO3D.prop('align',this.value)">
            ${[['izquierda', 'Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha']].map(([v, l]) => `<option value="${v}" ${c.align === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field">Separación (mm)<input type="number" step="0.2" value="${num(c.espaciado, 0)}" oninput="DISENO3D.prop('espaciado',this.value)"></label>
          <label class="field">Ancho de letra (%)<input type="number" step="5" min="10" value="${Math.round((num(c.escalaX, 1) || 1) * 100)}" oninput="DISENO3D.prop('escalaX',this.value/100)"></label>
          <label class="field">Alto de letra (%)<input type="number" step="5" min="10" value="${Math.round((num(c.escalaY, 1) || 1) * 100)}" oninput="DISENO3D.prop('escalaY',this.value/100)"></label>
        </div>
        ${((num(c.escalaX, 1) || 1) !== 1 || (num(c.escalaY, 1) || 1) !== 1)
          ? `<button class="linkish" style="margin-top:6px" onclick="DISENO3D.sinEstirar()">Quitar el estirado</button>` : ''}
        ${comun}`;
    }
    if (c.tipo === 'figura') {
      const def = G().FIGURAS[c.figura] || {};
      const pars = def.params ? Object.keys(def.params).map(k =>
        `<label class="field">${esc(k)}<input type="number" step="${k === 'puntas' || k === 'petalos' || k === 'rayos' ? 1 : 0.05}"
           value="${(c.params && c.params[k] != null) ? c.params[k] : def.params[k]}" oninput="DISENO3D.param('${escJs(k)}',this.value)"></label>`).join('') : '';
      return `<label class="field">Figura<select onchange="DISENO3D.prop('figura',this.value)">
          ${(() => { const gr = G().gruposFiguras(); return Object.keys(gr).map(g =>
            `<optgroup label="${esc(g)}">${gr[g].map(f => `<option value="${f.id}" ${c.figura === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</optgroup>`).join(''); })()}</select></label>
        <div class="formgrid" style="margin-top:8px">
          <label class="field">Ancho (mm)<input type="number" step="0.5" min="1" value="${num(c.ancho, 15)}" oninput="DISENO3D.prop('ancho',this.value)"></label>
          <label class="field">Alto (mm)<input type="number" step="0.5" min="1" value="${num(c.alto, 15)}" oninput="DISENO3D.prop('alto',this.value)"></label>
          ${pars}
        </div>${comun}`;
    }
    return `<div class="muted" style="margin-bottom:8px">Imagen: ${esc(c.nombre)} · ${(c.figs || []).length} pieza(s)</div>
      <div class="formgrid">
        <label class="field">Ancho (mm)<input type="number" step="0.5" min="1" value="${num(c.ancho, 30)}" oninput="DISENO3D.prop('ancho',this.value)"></label>
        <label class="field">Alto (mm)<input type="number" step="0.5" min="1" value="${num(c.alto, 30)}" oninput="DISENO3D.prop('alto',this.value)"></label>
      </div>${comun}`;
  }

  function panelBase() {
    const b = P.base || {};
    const origen = b.origen || 'figura';
    return `<div class="formgrid">
        <label class="field">La base es<select onchange="DISENO3D.base('origen',this.value)">
          <option value="figura" ${origen === 'figura' ? 'selected' : ''}>Una figura</option>
          <option value="texto" ${origen === 'texto' ? 'selected' : ''}>Una letra o palabra</option>
          <option value="imagen" ${origen === 'imagen' ? 'selected' : ''}>Una imagen mía</option>
          <option value="ninguna" ${origen === 'ninguna' ? 'selected' : ''}>Sin base (piezas sueltas)</option>
        </select></label>
        ${origen === 'figura' ? `<label class="field">Figura<select onchange="DISENO3D.base('figura',this.value)">
          ${(() => { const gr = G().gruposFiguras(); return Object.keys(gr).map(g =>
            `<optgroup label="${esc(g)}">${gr[g].map(f => `<option value="${f.id}" ${b.figura === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</optgroup>`).join(''); })()}</select></label>` : ''}
        ${origen === 'imagen' ? `<label class="field">Imagen<button class="btn ghost sm" style="margin-top:2px" onclick="DISENO3D.addImagen('base')">${(b.figs && b.figs.length) ? 'Cambiar imagen' : 'Subir imagen…'}</button></label>` : ''}
        ${origen === 'texto' ? `<label class="field">Letra o palabra<input value="${esc(b.txt || '')}" oninput="DISENO3D.base('txt',this.value)"></label>
          <label class="field">Tipo de letra<select onchange="DISENO3D.base('fuente',this.value)">
            ${window.D3DFuentes.lista().map(f => `<option value="${f.id}" ${b.fuente === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>` : ''}
        ${origen !== 'ninguna' ? `
          ${(origen === 'figura' || origen === 'imagen') ? `<label class="field">Ancho (mm)<input type="number" step="1" min="5" value="${num(b.ancho, 60)}" oninput="DISENO3D.base('ancho',this.value)"></label>` : ''}
          <label class="field">${origen === 'texto' ? 'Alto de la letra (mm)' : 'Alto (mm)'}<input type="number" step="1" min="5" value="${num(b.alto, 30)}" oninput="DISENO3D.base('alto',this.value)"></label>
          <label class="field">${origen === 'texto' ? 'Profundidad (mm)' : 'Grosor (mm)'}<input type="number" step="0.5" min="0.4" value="${num(b.grosor, 3)}" oninput="DISENO3D.base('grosor',this.value)"></label>` : ''}
      </div>
      ${origen !== 'ninguna' ? `<label class="field" style="margin-top:10px">Color de la base${selColor(b.color, 'DISENO3D.colorBase')}</label>` : ''}
      ${origen === 'texto' ? `<div class="muted" style="margin-top:6px">La letra se imprime acostada sobre su cara trasera: la «profundidad» es lo que sobresale de la mesa.</div>` : ''}`;
  }

  function panelAccesorios() {
    const a = P.argolla || {}, m = P.montaje || {};
    return `<label class="row" style="gap:8px;font-size:13px"><input type="checkbox" style="width:auto" ${a.activa ? 'checked' : ''} onchange="DISENO3D.acc('argolla','activa',this.checked)"><span>Agujero para argolla (llavero)</span></label>
      ${a.activa ? `<div class="formgrid" style="margin-top:8px">
        <label class="field">Diámetro (mm)<input type="number" step="0.5" min="1.5" value="${num(a.d, 4.5)}" oninput="DISENO3D.acc('argolla','d',this.value)"></label>
        <label class="field">X (mm)<input type="number" step="0.5" value="${num(a.x, 0)}" oninput="DISENO3D.acc('argolla','x',this.value)"></label>
        <label class="field">Y (mm)<input type="number" step="0.5" value="${num(a.y, 0)}" oninput="DISENO3D.acc('argolla','y',this.value)"></label>
      </div>` : ''}
      <label class="row" style="gap:8px;font-size:13px;margin-top:10px"><input type="checkbox" style="width:auto" ${m.activa ? 'checked' : ''} onchange="DISENO3D.acc('montaje','activa',this.checked)"><span>Orificios para colgar en la pared</span></label>
      ${m.activa ? `<div class="formgrid" style="margin-top:8px"><label class="field">Diámetro (mm)<input type="number" step="0.5" min="1.5" value="${num(m.d, 4.5)}" oninput="DISENO3D.acc('montaje','d',this.value)"></label></div>` : ''}`;
  }

  function panelLed() {
    const l = P.led || {};
    return `<label class="field">Luz LED<select onchange="DISENO3D.led('modo',this.value)">
        <option value="ninguno" ${l.modo === 'ninguno' ? 'selected' : ''}>Sin luz</option>
        <option value="difusion" ${l.modo === 'difusion' ? 'selected' : ''}>Retroiluminado (tira pegada por detrás)</option>
        <option value="caja" ${l.modo === 'caja' ? 'selected' : ''}>Caja de luz (marco + frente + tapa)</option>
      </select></label>
      ${l.modo === 'caja' ? `<div class="formgrid" style="margin-top:8px">
        <label class="field">Grosor del muro (mm)<input type="number" step="0.5" min="1.2" value="${num(l.muro, 3)}" oninput="DISENO3D.led('muro',this.value)"></label>
        <label class="field">Profundidad (mm)<input type="number" step="1" min="6" value="${num(l.alto, 22)}" oninput="DISENO3D.led('alto',this.value)"></label>
        <label class="field">Grosor de la tapa (mm)<input type="number" step="0.2" min="0.8" value="${num(l.fondo, 2)}" oninput="DISENO3D.led('fondo',this.value)"></label>
        <label class="field">Salida del cable (mm)<input type="number" step="0.5" min="2" value="${num(l.cable, 6)}" oninput="DISENO3D.led('cable',this.value)"></label>
      </div>` : ''}
      ${(compilado && compilado.bom && compilado.bom.length) ? `<div class="sectiontitle">Qué comprar</div><ul class="d3d-bom">${compilado.bom.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  }

  function pintarPanel() {
    const el = $('#d3d-panel'); if (!el) return;
    const capas = P.capas || [];
    el.innerHTML = `
      <div class="card">
        <div class="row between"><div class="sectiontitle" style="margin:0">Capas</div>
          <div class="row" style="gap:4px">
            <button class="btn ghost sm" onclick="DISENO3D.addTexto()">+ Texto</button>
            <button class="btn ghost sm" onclick="DISENO3D.addFigura()">+ Figura</button>
            <button class="btn ghost sm" onclick="DISENO3D.addImagen()">+ Imagen</button>
          </div></div>
        <div class="d3d-capas">${capas.length ? capas.map((c, i) => filaCapa(c, i, capas.length)).join('') : '<div class="muted" style="padding:6px 0">Sin capas todavía. Agrega texto, una figura o sube una imagen.</div>'}</div>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="sectiontitle" style="margin-top:0">${sel ? 'Capa seleccionada' : 'Propiedades'}</div>
        ${propsCapa(capaSel())}
      </div>
      <div class="card" style="margin-top:12px"><div class="sectiontitle" style="margin-top:0">Base</div>${panelBase()}</div>
      <div class="card" style="margin-top:12px"><div class="sectiontitle" style="margin-top:0">Agujeros</div>${panelAccesorios()}</div>
      <div class="card" style="margin-top:12px"><div class="sectiontitle" style="margin-top:0">Luz</div>${panelLed()}</div>`;
  }

  // Actualiza solo los números que cambian al arrastrar, sin repintar (y sin robar el foco).
  function sincronizarCampos() {
    const c = capaSel(); if (!c) return;
    const el = $('#d3d-panel'); if (!el) return;
    el.querySelectorAll('input[type=number]').forEach(inp => {
      if (document.activeElement === inp) return;
      const h = inp.getAttribute('oninput') || '';
      const m = h.match(/DISENO3D\.prop\('(\w+)'/);
      if (!m || c[m[1]] == null) return;
      // los campos de estirado se muestran en porcentaje, el modelo guarda el factor
      inp.value = /\/\s*100/.test(h) ? Math.round(c[m[1]] * 100) : c[m[1]];
    });
  }

  function pintarAvisos() {
    const el = $('#d3d-avisos'); if (!el || !compilado) return;
    const d = compilado.dims;
    el.innerHTML = `<div class="row between" style="align-items:flex-start;gap:8px">
        <span class="muted">${d.ancho.toFixed(0)} × ${d.alto.toFixed(0)} × ${d.espesor.toFixed(1)} mm · ${compilado.solidos.length} sólido(s) · ${compilado.colores.length} color(es)</span>
      </div>
      ${compilado.avisos.length ? `<div class="d3d-avisos">${compilado.avisos.map(a => `<div class="pill warn" style="display:block;white-space:normal;margin-top:6px">${esc(a)}</div>`).join('')}</div>` : ''}`;
  }

  /* ---------- vista ---------- */
  function view() {
    const presets = B().PRESETS_INFO;
    return `<div class="row between" style="align-items:flex-start">
        <div><h1 class="page">Diseño 3D</h1>
        <p class="sub">Arma llaveros, letreros con luz, letras con nombre y recuerdos — y los mandas a la K2 Combo.</p></div>
        <div class="row" style="gap:6px">
          <button class="btn ghost sm" onclick="DISENO3D.abrirGuardados()">Mis diseños</button>
          <button class="btn ghost sm" onclick="DISENO3D.exportar()">Exportar STL</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="sectiontitle" style="margin-top:0">Empezar con</div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          ${presets.map(p => `<button class="subtab" title="${esc(p.desc)}" onclick="DISENO3D.preset('${escJs(p.id)}')">${esc(p.label)}</button>`).join('')}
        </div>
        <label class="field" style="margin-top:10px">Nombre del diseño<input id="d3d-nombre" value="${esc(P ? P.nombre : '')}" oninput="DISENO3D.nombre(this.value)"></label>
      </div>
      <div class="grid d3d-layout">
        <div id="d3d-panel"></div>
        <div>
          <div class="card">
            <div class="row between" style="align-items:center">
              <div class="row" style="gap:6px">
                <button class="subtab ${vista === '2d' ? 'active' : ''}" onclick="DISENO3D.vista('2d')">Componer</button>
                <button class="subtab ${vista === '3d' ? 'active' : ''}" onclick="DISENO3D.vista('3d')">Ver en 3D</button>
              </div>
              <button class="btn ghost sm" onclick="DISENO3D.encuadrar()">Centrar</button>
            </div>
            <div class="d3d-lienzo" style="margin-top:10px">
              <canvas id="d3d-2d" data-h="420" style="${vista === '2d' ? '' : 'display:none'};touch-action:none;border-radius:12px;width:100%"></canvas>
              <div id="d3d-3d" data-h="420" style="${vista === '3d' ? '' : 'display:none'};height:420px;background:#ECE6DA;border-radius:12px"></div>
            </div>
            <div class="muted" style="margin-top:6px">${vista === '2d'
              ? 'Arrastra para mover · los cuadritos cambian el tamaño (los del medio estiran solo un lado) · la perilla de arriba gira · rueda para acercar y arrastra el fondo para correr la vista.<br>'
                + 'Con <b>Shift</b>: gira de 15° en 15° y el tamaño mantiene la proporción. Flechas para mover fino, <b>[</b> y <b>]</b> para girar, <b>Supr</b> para quitar.'
              : 'Arrastra para girar · rueda para acercar.'}</div>
            <div id="d3d-avisos" style="margin-top:10px"></div>
          </div>
          <div class="card muted" style="font-size:13px;margin-top:12px">
            <b>Para la K2 Combo:</b> capa 0.2 mm y PLA. El relieve conviene de 0.8 mm para arriba
            o casi no se nota. Al exportar «por color» sale un STL por cada color: los cargas
            juntos en Creality Print y le asignas a cada uno su carrete del CFS.
          </div>
        </div>
      </div>`;
  }

  /* ---------- acciones ---------- */
  function cambio(estructura) {
    if (estructura) pintarPanel();
    dibujar(); agendar3D(); guardarSuave();
  }
  const API = {
    view,
    async init() {
      three = null; compilado = null; cacheFigs = new Map(); cacheBase = { clave: null, figs: [] };
      if (!P) {
        const DB = window.DB;
        P = (DB && DB.disenos3d && DB.disenos3d.length) ? JSON.parse(JSON.stringify(DB.disenos3d[DB.disenos3d.length - 1])) : B().PRESETS.llavero();
      }
      pintarPanel();
      const cv = $('#d3d-2d');
      if (cv) {
        cv.addEventListener('pointerdown', onDown);
        cv.addEventListener('pointermove', onMove);
        cv.addEventListener('pointerup', onUp);
        cv.addEventListener('pointercancel', onUp);
        cv.addEventListener('wheel', onRueda, { passive: false });
        cv.addEventListener('dblclick', () => {   // doble clic en un texto: al grano
          const c = capaSel(); if (!c || c.tipo !== 'texto') return;
          const ta = $('#d3d-panel textarea'); if (ta) { ta.focus(); ta.select(); }
        });
      }
      // Al volver a entrar a la pestaña se vuelve a montar todo: hay que soltar los
      // oyentes de la vez anterior o se van apilando y cada tecla se procesa N veces.
      if (API._rs) window.removeEventListener('resize', API._rs);
      if (API._kd) window.removeEventListener('keydown', API._kd);
      window.addEventListener('resize', API._rs = () => { dibujar(true); if (three) { const W = three.cont.clientWidth || 400; three.camera.aspect = W / 420; three.camera.updateProjectionMatrix(); three.renderer.setSize(W, 420); } });
      window.addEventListener('keydown', API._kd = onTecla);
      try { await window.D3DFuentes.cargar((P.capas.find(c => c.tipo === 'texto') || {}).fuente || 'poppins'); } catch (e) { toast('No pude cargar las tipografías (¿sin internet?)'); }
      await dibujar(true);
      refrescar3D();
      ensureThree().then(() => { if (vista === '3d') refrescar3D(); }).catch(() => {});
    },
    vista(v) {
      vista = v;
      const c2 = $('#d3d-2d'), c3 = $('#d3d-3d');
      if (c2) c2.style.display = v === '2d' ? '' : 'none';
      if (c3) c3.style.display = v === '3d' ? '' : 'none';
      document.querySelectorAll('.d3d-lienzo').forEach(() => {});
      const btns = document.querySelectorAll('#d3d-panel');
      if (v === '3d') { ensureThree().then(() => refrescar3D()); } else dibujar();
      // marcar el botón activo sin repintar todo
      const cont = c2 && c2.closest('.card');
      if (cont) cont.querySelectorAll('.subtab').forEach(b => b.classList.toggle('active', b.textContent.trim() === (v === '2d' ? 'Componer' : 'Ver en 3D')));
    },
    encuadrar() { if (vista === '3d') { three && (three.encuadrado = false); encuadrar(); } else dibujar(true); },
    preset(id) {
      if (P && (P.capas || []).length && !confirm('Se reemplaza lo que tienes en pantalla por la plantilla «' + id + '». ¿Seguir?\n\nLo anterior queda guardado en «Mis diseños».')) return;
      persistir();
      P = B().PRESETS[id] ? B().PRESETS[id]() : B().proyectoVacio();
      sel = null; cacheFigs = new Map(); cacheBase = { clave: null, figs: [] };
      if (three) three.encuadrado = false;
      const n = $('#d3d-nombre'); if (n) n.value = P.nombre;
      pintarPanel(); dibujar(true); agendar3D();   // sin guardar: todavía no lo tocó
    },
    nombre(v) { P.nombre = v; guardarSuave(); },
    sel(id) { sel = (sel === id ? null : id); pintarPanel(); dibujar(); },
    prop(k, v) {
      const c = capaSel(); if (!c) return;
      c[k] = (typeof v === 'boolean' || ['txt', 'fuente', 'align', 'figura', 'modo'].includes(k)) ? v : num(v, 0);
      if (k === 'txt') c.nombre = String(v).split('\n')[0].slice(0, 24) || 'Texto';
      if (k === 'figura') { c.params = {}; c.nombre = (G().FIGURAS[v] || {}).label || v; }
      cacheFigs.delete(c.id);
      cambio(k === 'figura' || k === 'txt' || k === 'modo');
    },
    param(k, v) { const c = capaSel(); if (!c) return; c.params = c.params || {}; c.params[k] = num(v, 0); cacheFigs.delete(c.id); cambio(); },
    sinEstirar() { const c = capaSel(); if (!c) return; c.escalaX = 1; c.escalaY = 1; cambio(true); },
    // Con una base gruesa (una letra de 40 mm) el relieve queda flotando arriba de
    // todo. Estos dos atajos lo meten dentro de la cara sin pelear con el número.
    zMedio() { const c = capaSel(); if (!c) return; c.z = -Math.round(num(P.base.grosor, 3) / 2 * 10) / 10; cambio(true); },
    zHundir() {
      const c = capaSel(); if (!c) return;
      const alt = num(c.altura, 1.2);
      c.z = -Math.round(Math.max(0, alt - 0.6) * 10) / 10;   // deja 0,6 mm asomando
      cambio(true);
    },
    girar(g) { const c = capaSel(); if (!c) return; c.rot = Math.round(((num(c.rot, 0) + g) % 360 + 360) % 360 * 10) / 10; cambio(true); },
    enderezar() { const c = capaSel(); if (!c) return; c.rot = 0; cambio(true); },
    centrarCapa(eje) {
      const c = capaSel(); if (!c) return;
      if (eje !== 'y') c.x = 0;
      if (eje !== 'x') c.y = 0;
      cambio(true);
    },
    color(i) { const c = capaSel(); if (!c) return; c.color = i; cambio(true); },
    colorBase(i) { P.base.color = i; cambio(true); },
    tinte(i, hex) {
      P.paleta = (P.paleta || B().COLORES.map(c => Object.assign({}, c)));
      const c = P.paleta.find(x => x.i === i); if (c) c.hex = hex;
      cambio(true);
    },
    visible(id) { const c = P.capas.find(x => x.id === id); if (!c) return; c.visible = c.visible === false; cambio(true); },
    mover(id, d) {
      const i = P.capas.findIndex(x => x.id === id); if (i < 0) return;
      const j = i + d; if (j < 0 || j >= P.capas.length) return;
      const [c] = P.capas.splice(i, 1); P.capas.splice(j, 0, c); cambio(true);
    },
    duplicar(id) {
      const c = P.capas.find(x => x.id === id); if (!c) return;
      const n = JSON.parse(JSON.stringify(c)); n.id = B().uid(); n.x = num(c.x, 0) + 5; n.y = num(c.y, 0) - 5;
      P.capas.push(n); sel = n.id; cambio(true);
    },
    quitar(id) {
      const i = P.capas.findIndex(x => x.id === id); if (i < 0) return;
      P.capas.splice(i, 1); cacheFigs.delete(id); if (sel === id) sel = null; cambio(true);
    },
    addTexto() { const c = B().capaTexto('Texto'); P.capas.push(c); sel = c.id; cambio(true); },
    addFigura() { const c = B().capaFigura('estrella'); P.capas.push(c); sel = c.id; cambio(true); },
    base(k, v) {
      P.base = P.base || {};
      P.base[k] = ['origen', 'figura', 'txt', 'fuente'].includes(k) ? v : num(v, 0);
      if (k === 'figura') P.base.params = {};
      cacheBase = { clave: null, figs: [] };
      cambio(['origen', 'figura'].includes(k));
    },
    acc(g, k, v) { P[g] = P[g] || {}; P[g][k] = (typeof v === 'boolean') ? v : num(v, 0); cambio(k === 'activa'); },
    led(k, v) { P.led = P.led || {}; P.led[k] = k === 'modo' ? v : num(v, 0); cambio(true); },

    /* --- imagen --- */
    addImagen(destino) {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
      i.onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const img = new Image();
        img.onload = () => {
          // Se reduce a 420 px de lado: más resolución no mejora el contorno y sí
          // multiplica los puntos del STL.
          const max = 420, k = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
          imgTmp = { imageData: cx.getImageData(0, 0, w, h), nombre: f.name.replace(/\.[^.]+$/, ''), umbral: 0.5, invertir: false, detalle: 0.6, soloMayor: false, ancho: destino === 'base' ? 80 : 30, destino: destino === 'base' ? 'base' : 'capa' };
          URL.revokeObjectURL(img.src);
          API._modalImg();
        };
        img.onerror = () => toast('No pude leer esa imagen');
        img.src = URL.createObjectURL(f);
      };
      i.click();
    },
    _modalImg() {
      const t = imgTmp; if (!t) return;
      const prev = G().trazarImagen(t.imageData, { umbral: t.umbral, invertir: t.invertir, detalle: t.detalle, soloMayor: t.soloMayor, ancho: 100, alto: 100 });
      t._figs = prev.figs;
      const svg = figsASvg(prev.figs, 240, 240);
      $('#modal-root').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)DISENO3D.cerrarImg()"><div class="modal">
        <h2>${t.destino === 'base' ? 'Usar la imagen como forma de la base' : 'Convertir imagen en relieve'}</h2>
        <div class="muted" style="margin-bottom:10px">Se busca la silueta. Mueve el umbral hasta que se vea la forma que quieres; lo negro es lo que se imprime.</div>
        <div style="background:#ECE6DA;border-radius:12px;padding:8px;text-align:center;min-height:150px">${prev.figs.length ? svg : `<div class="muted" style="padding:40px">${esc(prev.aviso || 'Sin contorno')}</div>`}</div>
        <div class="formgrid" style="margin-top:12px">
          <label class="field">Umbral<input type="range" min="0.05" max="0.95" step="0.01" value="${t.umbral}" oninput="DISENO3D.img('umbral',this.value)"></label>
          <label class="field">Detalle<input type="range" min="0" max="1" step="0.05" value="${t.detalle}" oninput="DISENO3D.img('detalle',this.value)"></label>
          <label class="field">Ancho en el diseño (mm)<input type="number" min="3" step="1" value="${t.ancho}" oninput="DISENO3D.img('ancho',this.value)"></label>
        </div>
        <label class="row" style="gap:8px;margin-top:8px;font-size:13px"><input type="checkbox" style="width:auto" ${t.invertir ? 'checked' : ''} onchange="DISENO3D.img('invertir',this.checked)"><span>Invertir (si salió al revés)</span></label>
        <label class="row" style="gap:8px;margin-top:6px;font-size:13px"><input type="checkbox" style="width:auto" ${t.soloMayor ? 'checked' : ''} onchange="DISENO3D.img('soloMayor',this.checked)"><span>Solo la forma más grande (descarta manchitas)</span></label>
        <div class="muted" style="margin-top:8px">${prev.figs.length ? prev.figs.length + ' pieza(s) · ' + prev.figs.reduce((a, f) => a + f.holes.length, 0) + ' hueco(s)' : ''}</div>
        <div class="row between" style="margin-top:14px">
          <button class="btn ghost" onclick="DISENO3D.cerrarImg()">Cancelar</button>
          <button class="btn primary" ${prev.figs.length ? '' : 'disabled'} onclick="DISENO3D.usarImg()">Agregar al diseño</button>
        </div></div></div>`;
    },
    img(k, v) { if (!imgTmp) return; imgTmp[k] = (typeof v === 'boolean') ? v : num(v, 0); API._modalImg(); },
    cerrarImg() { imgTmp = null; $('#modal-root').innerHTML = ''; },
    usarImg() {
      const t = imgTmp; if (!t || !t._figs || !t._figs.length) return;
      const bb = G().bboxDe(t._figs);
      const alto = bb.w ? t.ancho * (bb.h / bb.w) : t.ancho;
      if (t.destino === 'base') {
        P.base = P.base || {};
        P.base.origen = 'imagen'; P.base.figs = t._figs;
        P.base.ancho = t.ancho; P.base.alto = Math.max(1, Math.round(alto * 10) / 10);
        cacheBase = { clave: null, figs: [] };
        API.cerrarImg(); pintarPanel(); dibujar(true); agendar3D(); guardarSuave();
        toast('La base ahora tiene la forma de tu imagen');
        return;
      }
      const c = B().capaImagen(t._figs, t.nombre, { ancho: t.ancho, alto: Math.max(1, Math.round(alto * 10) / 10), altura: 1.2, color: 2 });
      P.capas.push(c); sel = c.id;
      API.cerrarImg(); cambio(true);
      toast('Imagen agregada · ajústala arrastrándola');
    },

    /* --- guardados --- */
    abrirGuardados() {
      const DB = window.DB; const list = (DB && DB.disenos3d) || [];
      $('#modal-root').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)A.closeModal()"><div class="modal">
        <h2>Mis diseños</h2>
        ${list.length ? list.slice().reverse().map(d => `<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)">
            <div><b>${esc(d.nombre || 'Sin nombre')}</b><div class="muted">${esc((d.tipo || 'libre'))} · ${(d.capas || []).length} capa(s)</div></div>
            <div class="row" style="gap:6px">
              <button class="btn ghost sm" onclick="DISENO3D.cargar('${escJs(d.id)}')">Abrir</button>
              <button class="linkish" onclick="DISENO3D.borrar('${escJs(d.id)}')">borrar</button>
            </div></div>`).join('') : '<div class="muted">Todavía no has guardado ninguno. Se guardan solos mientras trabajas.</div>'}
        <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="A.closeModal()">Cerrar</button></div>
      </div></div>`;
    },
    cargar(id) {
      const DB = window.DB; const d = (DB.disenos3d || []).find(x => x.id === id); if (!d) return;
      persistir();
      P = JSON.parse(JSON.stringify(d)); sel = null;
      cacheFigs = new Map(); cacheBase = { clave: null, figs: [] };
      if (three) three.encuadrado = false;
      window.A.closeModal();
      const n = $('#d3d-nombre'); if (n) n.value = P.nombre;
      pintarPanel(); dibujar(true); agendar3D();   // abrir no es editar
    },
    borrar(id) {
      const DB = window.DB; const i = (DB.disenos3d || []).findIndex(x => x.id === id); if (i < 0) return;
      if (!confirm('¿Borrar este diseño?')) return;
      DB.disenos3d.splice(i, 1); window.saveDB(); API.abrirGuardados();
    },

    /* --- exportar --- */
    async exportar() {
      if (!compilado) { try { compilado = await B().compilar(P); } catch (e) { toast('No pude generar el modelo'); return; } }
      const c = compilado;
      $('#modal-root').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)A.closeModal()"><div class="modal">
        <h2>Exportar para imprimir</h2>
        <div class="muted" style="margin-bottom:12px">${c.dims.ancho.toFixed(0)} × ${c.dims.alto.toFixed(0)} × ${c.dims.espesor.toFixed(1)} mm · ${c.colores.length} color(es) · ${c.piezas.length} pieza(s)</div>
        ${c.avisos.length ? `<div style="margin-bottom:12px">${c.avisos.map(a => `<div class="pill warn" style="display:block;white-space:normal;margin-top:6px">${esc(a)}</div>`).join('')}</div>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn primary" onclick="DISENO3D.bajar3mf()">3MF con los colores puestos</button>
        </div>
        <div class="muted" style="margin-top:8px"><b>Usa este.</b> El 3MF guarda los colores: al abrirlo en Creality Print cada parte ya viene asignada a su carrete del CFS. El STL no guarda color — por eso la pieza sale de uno solo.</div>
        <div class="sectiontitle">STL (si lo necesitas)</div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn ghost" onclick="DISENO3D.bajar('color')">Un STL por color</button>
          <button class="btn ghost" onclick="DISENO3D.bajar('pieza')">Un STL por pieza</button>
          <button class="btn ghost" onclick="DISENO3D.bajar('todo')">Todo en uno</button>
        </div>
        <div class="muted" style="margin-top:8px">Con «un STL por color» hay que cargar <b>todos</b> los archivos juntos en el laminador: quedan alineados y a cada uno le asignas su carrete. Si cargas uno solo, sale una parte suelta.</div>
        ${c.bom.length ? `<div class="sectiontitle">Qué comprar</div><ul class="d3d-bom">${c.bom.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="row between" style="margin-top:16px">
          <button class="btn ghost" onclick="A.closeModal()">Cerrar</button>
          <button class="btn ghost" onclick="DISENO3D.guardarProducto()">Guardar como producto</button>
        </div></div></div>`;
    },
    bajar3mf() {
      if (!compilado) return;
      if (!window.D3D3MF) { toast('El exportador 3MF no cargó'); return; }
      let r;
      try { r = window.D3D3MF.exportar3MF(compilado, P.nombre); }
      catch (e) { console.error(e); toast('Error al generar el 3MF: ' + (e.message || e)); return; }
      if (!r) { toast('No hay nada que exportar'); return; }
      const blob = new Blob([r.datos], { type: 'model/3mf' });
      const u = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = u; a.download = r.nombre; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      toast('3MF listo · ' + r.colores.length + ' color(es) ya asignados');
    },
    bajar(modo) {
      if (!compilado) return;
      let files;
      try { files = B().exportarSTL(compilado, modo, P.nombre); } catch (e) { toast('Error al generar el STL: ' + (e.message || e)); return; }
      if (!files.length) { toast('No hay nada que exportar'); return; }
      files.forEach((f, i) => setTimeout(() => {
        const blob = new Blob([f.buffer], { type: 'model/stl' });
        const u = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = u; a.download = f.nombre; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
      }, i * 300));
      toast(files.length === 1 ? 'STL descargado' : files.length + ' archivos descargados');
    },
    async guardarProducto() {
      if (!compilado) return;
      if (!window.Supa || !window.Supa.configured()) { toast('Configura el almacenamiento en Ajustes para poder guardarlo'); return; }
      try {
        toast('Subiendo archivos…');
        const files = B().exportarSTL(compilado, 'color', P.nombre);
        const subidos = [];
        for (const f of files) subidos.push({ name: f.nombre, url: await window.Supa.upload(new Blob([f.buffer], { type: 'model/stl' }), f.nombre) });
        const DB = window.DB;
        DB.products.push({
          id: window.uid(), name: P.nombre || 'Diseño 3D', material: 'PLA', grams: 0, timeH: 0,
          colors: Math.max(1, compilado.colores.length), postMin: 5, packOverride: null, price: null,
          stock: 0, filamentId: null, imageId: null, imageUrl: null, files: subidos, linea: '3D'
        });
        window.saveDB();
        window.A.closeModal();
        toast('Producto creado · pon los gramos y el tiempo reales tras la primera impresión');
        window.A.go('productos');
      } catch (e) { toast('Error al guardar: ' + (e.message || e)); }
    }
  };

  /* SVG de vista previa para el modal de imagen (no se usa Three ahí: es plano). */
  function figsASvg(figs, w, h) {
    if (!figs.length) return '';
    const b = G().bboxDe(figs);
    const s = Math.min(w / (b.w || 1), h / (b.h || 1)) * 0.92;
    const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
    const P2 = (x, y) => [(x - cx) * s + w / 2, h / 2 - (y - cy) * s];
    const d = figs.map(f => [f.outer].concat(f.holes || []).map(a =>
      'M' + a.map((p, i) => { const q = P2(p[0], p[1]); return (i ? 'L' : '') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + 'Z').join(' ')).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="#2F3A40" fill-rule="evenodd"/></svg>`;
  }

  window.DISENO3D = API;
})();
