/* Ayünka Studio — Calculadora de costos (Bordado, Costura y 3D) en CLP
   Recuerda tus parámetros y los precios que guardas, en localStorage.
   v2 (1 ago 2026): pestaña 3D, referencia de mercado chileno, cotización
   al revés (parto del precio que quiero cobrar) y precios guardados. */
(function(){
  const KEY ='ayunka-costos-v1';    // parámetros de la calculadora
  const KEYP='ayunka-precios-v1';   // precios guardados por producto

  const CLP  = n => isFinite(n)? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Math.round(n)) : '–';
  const CLP4 = n => isFinite(n)? '$ '+(Math.round(n*10000)/10000).toLocaleString('es-CL',{maximumFractionDigits:4}) : '–';
  const val  = id => { const e=document.getElementById(id); return e? (parseFloat(e.value)||0):0; };
  const txt  = id => { const e=document.getElementById(id); return e? String(e.value||'').trim() : ''; };
  const set  = (id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  const esc  = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------------------------------------------------------------
     Referencia de mercado — precios recogidos de tiendas chilenas
     el 1 de agosto de 2026. Detalle y fuentes en la raíz del proyecto:
     comparacion-precios-mercado-chile.md
     Para actualizarlos: cambia min/max y src, y sube la versión del
     service worker (sw.js) o no se va a ver el cambio en el teléfono.
  ----------------------------------------------------------------*/
  const MERCADO=[
    {id:'',    n:'— sin referencia —',                 min:0,     max:0,     src:''},
    {id:'ban', n:'Banderín de nombre (por letra)',     min:2500,  max:4000,  src:'Teepee: $14.990 las 5 letras'},
    {id:'nec', n:'Neceser / estuche personalizado',    min:8000,  max:15000, src:'estuches personalizados CL'},
    {id:'lla', n:'Llavero o fidget 3D',                min:1200,  max:3500,  src:'La Chica de los Guantes · Integrazul $2.800'},
    {id:'tag', n:'Tag / placa para mascotas',          min:3000,  max:4500,  src:'identificador con nombre $4.000'},
    {id:'alf', n:'Alfiletero magnético',               min:4000,  max:7500,  src:'Picadilloz $3.990 · Prym $7.490'},
    {id:'box', n:'Caja para bobinas / organizador',    min:8000,  max:12000, src:'My Kit $8.900 (108 bobinas)'},
    {id:'let', n:'Letra o nombre 3D decorativo',       min:10000, max:17000, src:'Energía 3D y similares'},
    {id:'rep', n:'Repisa / exhibidor 3D',              min:10000, max:19000, src:'Energía 3D'},
    {id:'her', n:'Herramienta de costura 3D (regla…)', min:2500,  max:5000,  src:'sin comparable directo, estimado'}
  ];
  const mkt = id => MERCADO.find(m=>m.id===id) || MERCADO[0];

  const DEF = {
    // bordado
    b_punt:10000,b_uni:1,b_ta:30,b_tl:40,b_ea:15,b_el:20,b_ha:0,b_hl:0,b_edoble:0,
    b_p1000:900,b_tra:150,b_trl:100,b_trc:6000,b_era:150,b_erl:1000,b_erc:12000,
    b_hra:0,b_hrl:0,b_hrc:0,b_bam:20000,b_bac:6000,b_arm:4000,b_arc:3500,
    b_carr:5.1,b_cab:3.3,b_mult:2.55,b_spm:700,b_obj:0,
    // costura
    c_uni:1,c_min:60,c_hora:4000,c_mult:2,c_extra:0,c_obj:0,
    // 3D
    t_peso:20,t_col:1,t_h:1.5,t_post:5,t_uni:1,t_extra:0,t_obj:0,
    t_filkg:15000,t_kwh:160,t_kw:0.12,t_maq:779990,t_vida:4000,t_mant:20,
    t_falla:8,t_hora:4000,t_emp:350,t_mult:3.5
  };
  const TXTKEYS=['b_mkt','c_mkt','t_mkt','b_nom','c_nom','t_nom','c_nombre'];

  function load(){ try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return Object.assign({},DEF);} }
  function save(){
    const s={};
    Object.keys(DEF).forEach(k=>{const e=document.getElementById(k); if(!e)return;
      s[k]= e.type==='checkbox' ? (e.checked?1:0) : (parseFloat(e.value)||0);});
    TXTKEYS.forEach(k=>{const e=document.getElementById(k); if(e) s[k]=e.value;});
    s._mats = matRows().map(r=>({d:r.d,c:r.c,p:r.p}));
    try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}
  }
  function loadPrecios(){ try{return JSON.parse(localStorage.getItem(KEYP)||'[]');}catch(e){return [];} }
  function savePrecios(a){ try{localStorage.setItem(KEYP,JSON.stringify(a));}catch(e){} }

  const SUG=['Tela exterior','Tela panal','Gamuza','Forro','Cinta espiga','Cinta twill','Cinta de raso','Cinta bebé','Elástico','Cierre / cremallera','Velcro','Botón','Broche / snap','Sesgo (bies)','Encaje','Cordón','Guata / vellón','Relleno','Entretela','Entretela fusionable','Hilo','Hilo encerado','Borla','Pompón','Moño','Argolla / anilla','Mosquetón','Ojetillos','Imán','Etiqueta bordada','Etiqueta de marca'];
  const QUICK=['Cinta espiga','Elástico','Cierre / cremallera','Velcro','Botón','Sesgo (bies)','Guata / vellón','Cordón','Argolla / anilla','Borla','Moño','Etiqueta bordada'];

  /* Panel compartido por las tres pestañas: mercado + precio objetivo + guardar */
  function panel(p,tipo){
    return `
    <div class="card"><div class="sectiontitle">¿Este precio se vende?</div>
      <label class="field">Producto parecido en el mercado
        <select id="${p}mkt">${MERCADO.map(m=>`<option value="${m.id}">${esc(m.n)}</option>`).join('')}</select>
      </label>
      <div class="row between" style="padding:4px 0"><span class="muted">En Chile se vende a</span><span id="${p}mkt_r" class="num">–</span></div>
      <div id="${p}mkt_v" class="muted" style="margin-top:4px"></div>
      <div id="${p}mkt_s" class="muted" style="margin-top:2px;font-size:12px"></div>

      <hr style="border:none;border-top:1px solid var(--line,#dcd3c4);margin:12px 0">
      <div class="sectiontitle">O parte del precio que quieres cobrar</div>
      <label class="field">Precio que quiero cobrar (CLP)<input type="number" id="${p}obj" min="0" placeholder="deja 0 para no usarlo"></label>
      <div class="row between" style="padding:4px 0"><span class="muted">Costo duro (lo que pagas)</span><span id="${p}duro" class="num">–</span></div>
      <div class="row between" style="padding:4px 0"><span>Te queda</span><span id="${p}gan" class="num">–</span></div>
      <div class="row between" style="padding:4px 0"><span>Tu hora sale en</span><span id="${p}hora_e" class="num">–</span></div>
      <div id="${p}obj_v" class="muted" style="margin-top:4px"></div>

      <hr style="border:none;border-top:1px solid var(--line,#dcd3c4);margin:12px 0">
      <div class="row" style="gap:8px;align-items:center">
        <input type="text" id="${p}nom" placeholder="Nombre del producto" style="flex:2">
        <button class="btn primary" onclick="CalcCostos.guardar('${tipo}')">Guardar precio</button>
      </div>
      <div class="muted" style="margin-top:6px;font-size:12px">Guarda el precio sugerido, o el tuyo si escribiste uno arriba.</div>
    </div>`;
  }

  function view(){
    return `
    <div class="row between"><h1 class="page">Calculadora de costos</h1></div>
    <p class="sub">Bordado, costura e impresión 3D · valores en pesos chilenos</p>
    <div class="row" style="gap:8px;margin:10px 0 4px;flex-wrap:wrap">
      <button class="btn primary" id="cc_tabB" onclick="CalcCostos.tab('B')">🧵 Bordado</button>
      <button class="btn ghost"   id="cc_tabC" onclick="CalcCostos.tab('C')">✂️ Costura</button>
      <button class="btn ghost"   id="cc_tabT" onclick="CalcCostos.tab('T')">🖨️ 3D</button>
      <button class="btn ghost sm" style="margin-left:auto" id="cc_pdf" onclick="CalcCostos.pdf()">📄 Exportar PDF</button>
    </div>

    <!-- ================= BORDADO ================= -->
    <div id="cc_bordado">
      <div class="card"><div class="sectiontitle">Datos del trabajo</div>
        <div class="formgrid">
          <label class="field">Puntadas del diseño<input type="number" id="b_punt"></label>
          <label class="field">Cantidad de unidades<input type="number" id="b_uni" min="1"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Tela y entretela usadas (por unidad)</div>
        <div class="formgrid">
          <label class="field">Ancho tela usada (cm)<input type="number" id="b_ta"></label>
          <label class="field">Largo tela usada (cm)<input type="number" id="b_tl"></label>
          <label class="field">Ancho entretela usada (cm)<input type="number" id="b_ea"></label>
          <label class="field">Largo entretela usada (cm)<input type="number" id="b_el"></label>
        </div>
        <label class="row between" style="margin-top:8px;cursor:pointer">Doble entretela <input type="checkbox" id="b_edoble"></label>
        <div class="formgrid" style="margin-top:8px">
          <label class="field">Hidrosoluble usada — ancho (cm)<input type="number" id="b_ha"></label>
          <label class="field">Hidrosoluble usada — largo (cm)<input type="number" id="b_hl"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Mano de obra / máquina</div>
        <div class="formgrid">
          <label class="field">Precio a cobrar por 1.000 puntadas (CLP)<input type="number" id="b_p1000"></label>
          <label class="field">Velocidad de la máquina (punt./min)<input type="number" id="b_spm"></label>
        </div>
        <div class="muted" style="margin-top:6px">El precio por 1.000 puntadas ya incluye tu tiempo de máquina y la ganancia por el bordado. La velocidad solo sirve para calcular cuánto te queda por hora.</div>
      </div>
      <div class="card"><div class="sectiontitle">Insumos (precios de compra)</div>
        <div class="muted" style="margin:-4px 0 8px">Tela — rollo</div>
        <div class="formgrid">
          <label class="field">Ancho rollo (cm)<input type="number" id="b_tra"></label>
          <label class="field">Largo rollo (cm)<input type="number" id="b_trl"></label>
          <label class="field">Costo rollo (CLP)<input type="number" id="b_trc"></label>
        </div>
        <div class="muted" style="margin:10px 0 8px">Entretela — rollo</div>
        <div class="formgrid">
          <label class="field">Ancho rollo (cm)<input type="number" id="b_era"></label>
          <label class="field">Largo rollo (cm)<input type="number" id="b_erl"></label>
          <label class="field">Costo rollo (CLP)<input type="number" id="b_erc"></label>
        </div>
        <div class="muted" style="margin:10px 0 8px">Hidrosoluble — rollo (0 si no usas)</div>
        <div class="formgrid">
          <label class="field">Ancho rollo (cm)<input type="number" id="b_hra"></label>
          <label class="field">Largo rollo (cm)<input type="number" id="b_hrl"></label>
          <label class="field">Costo rollo (CLP)<input type="number" id="b_hrc"></label>
        </div>
        <div class="formgrid" style="margin-top:10px">
          <label class="field">Cono hilo abajo — metros<input type="number" id="b_bam"></label>
          <label class="field">Cono hilo abajo — costo (CLP)<input type="number" id="b_bac"></label>
          <label class="field">Cono hilo arriba — metros<input type="number" id="b_arm"></label>
          <label class="field">Cono hilo arriba — costo (CLP)<input type="number" id="b_arc"></label>
        </div>
        <div class="formgrid" style="margin-top:10px">
          <label class="field">Consumo hilo arriba (m/1.000 punt.)<input type="number" id="b_carr" step="0.1"></label>
          <label class="field">Consumo hilo abajo (m/1.000 punt.)<input type="number" id="b_cab" step="0.1"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Ganancia sobre insumos</div>
        <div class="row" style="gap:14px;align-items:center">
          <input type="range" id="b_mult" min="1" max="4" step="0.05" style="flex:1">
          <b id="b_mult_v" class="num">×2.55</b>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Resultado</div>
        <div class="row between" style="padding:3px 0"><span class="muted">Costo tela × cm²</span><span id="r_tcm" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Costo entretela × cm²</span><span id="r_ecm" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Hilo abajo × metro</span><span id="r_bam" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Hilo arriba × metro</span><span id="r_arm" class="num"></span></div>
        <hr style="border:none;border-top:1px solid var(--line,#dcd3c4);margin:8px 0">
        <div class="row between" style="padding:3px 0"><span>Costo en tela</span><span id="d_tela" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Costo en entretela</span><span id="d_entre" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Costo en hidrosoluble</span><span id="d_hidro" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Hilo de abajo (Spun)</span><span id="d_hab" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Hilo de arriba</span><span id="d_har" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Subtotal insumos</span><span id="d_sub" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Insumos × ganancia</span><span id="d_subg" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Cargo por bordado</span><span id="d_bord" class="num"></span></div>
        <div class="row between" style="padding:6px 0"><b>Precio sugerido por unidad</b><b id="d_uni" class="num" style="color:var(--ok)"></b></div>
        <div class="row between" style="padding:3px 0"><b>Total (× unidades)</b><b id="d_total" class="num" style="color:var(--coral)"></b></div>
      </div>
      ${panel('b_','B')}
    </div>

    <!-- ================= COSTURA ================= -->
    <div id="cc_costura" style="display:none">
      <datalist id="cc_sug">${SUG.map(s=>`<option value="${s}">`).join('')}</datalist>
      <div class="card"><div class="sectiontitle">Datos del trabajo</div>
        <div class="formgrid">
          <label class="field">Nombre del proyecto<input type="text" id="c_nombre" placeholder="Ej: Neceser orejitas"></label>
          <label class="field">Cantidad de unidades<input type="number" id="c_uni" min="1"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Materiales e insumos (por unidad)</div>
        <div id="cc_quick" class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>
        <div id="cc_rows"></div>
        <button class="btn ghost" onclick="CalcCostos.addRow()">+ Agregar material</button>
        <div class="muted" style="margin-top:8px">Escribe y autocompleta, o usa los botones. Puedes agregar cualquier insumo (cinta espiga, elástico, cierre…).</div>
      </div>
      <div class="card"><div class="sectiontitle">Mano de obra</div>
        <div class="formgrid">
          <label class="field">Tiempo de confección (min)<input type="number" id="c_min"></label>
          <label class="field">Valor de tu hora (CLP)<input type="number" id="c_hora"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Ganancia y extras</div>
        <div class="row" style="gap:14px;align-items:center">
          <input type="range" id="c_mult" min="1" max="4" step="0.05" style="flex:1">
          <b id="c_mult_v" class="num">×2.00</b>
        </div>
        <label class="field" style="margin-top:10px">Extras por unidad (empaque, envío… CLP)<input type="number" id="c_extra"></label>
      </div>
      <div class="card"><div class="sectiontitle">Resultado</div>
        <div class="row between" style="padding:3px 0"><span class="muted">Costo de materiales</span><span id="cr_mat" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Mano de obra</span><span id="cr_mo" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Ganancia sobre insumos</span><span id="cr_gan" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Extras</span><span id="cd_extra" class="num"></span></div>
        <div class="row between" style="padding:6px 0"><b>Precio sugerido por unidad</b><b id="cd_uni" class="num" style="color:var(--ok)"></b></div>
        <div class="row between" style="padding:3px 0"><b>Total (× unidades)</b><b id="cd_total" class="num" style="color:var(--coral)"></b></div>
      </div>
      ${panel('c_','C')}
    </div>

    <!-- ================= 3D ================= -->
    <div id="cc_3d" style="display:none">
      <div class="card"><div class="sectiontitle">La pieza</div>
        <div class="formgrid">
          <label class="field">Peso de la pieza (g)<input type="number" id="t_peso" step="0.1"></label>
          <label class="field">N° de colores<input type="number" id="t_col" min="1" max="4"></label>
          <label class="field">Tiempo de impresión (h)<input type="number" id="t_h" step="0.1"></label>
          <label class="field">Post-proceso (min)<input type="number" id="t_post"></label>
          <label class="field">Cantidad de unidades<input type="number" id="t_uni" min="1"></label>
          <label class="field">Extras por unidad (imán, argolla… CLP)<input type="number" id="t_extra"></label>
        </div>
        <div class="muted" style="margin-top:6px">Peso y tiempo salen del OrcaSlicer. Cada color extra suma 50% de filamento por la purga.</div>
      </div>
      <div class="card"><div class="sectiontitle">Tus costos (se guardan, no hay que escribirlos cada vez)</div>
        <div class="formgrid">
          <label class="field">Filamento (CLP por kilo)<input type="number" id="t_filkg"></label>
          <label class="field">Empaque por pieza (CLP)<input type="number" id="t_emp"></label>
          <label class="field">Valor de tu hora (CLP)<input type="number" id="t_hora"></label>
          <label class="field">Tarifa eléctrica (CLP/kWh)<input type="number" id="t_kwh"></label>
          <label class="field">Consumo impresora (kW)<input type="number" id="t_kw" step="0.01"></label>
          <label class="field">Costo de la impresora (CLP)<input type="number" id="t_maq"></label>
          <label class="field">Vida útil de la impresora (h)<input type="number" id="t_vida"></label>
          <label class="field">Mantención y repuestos (CLP/h)<input type="number" id="t_mant"></label>
          <label class="field">Piezas falladas (%)<input type="number" id="t_falla"></label>
        </div>
      </div>
      <div class="card"><div class="sectiontitle">Ganancia</div>
        <div class="row" style="gap:14px;align-items:center">
          <input type="range" id="t_mult" min="1.5" max="5" step="0.05" style="flex:1">
          <b id="t_mult_v" class="num">×3.50</b>
        </div>
        <div class="muted" style="margin-top:6px">Multiplica el costo total. Entre 3 y 4 es lo habitual en este rubro; mira el semáforo de más abajo antes de decidir.</div>
      </div>
      <div class="card"><div class="sectiontitle">Resultado</div>
        <div class="row between" style="padding:3px 0"><span>Filamento</span><span id="t_d_fil" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Electricidad</span><span id="t_d_ele" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Desgaste de la impresora</span><span id="t_d_maq" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Tu tiempo (post-proceso)</span><span id="t_d_mo" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span>Empaque y extras</span><span id="t_d_emp" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Buffer por piezas falladas</span><span id="t_d_fal" class="num"></span></div>
        <hr style="border:none;border-top:1px solid var(--line,#dcd3c4);margin:8px 0">
        <div class="row between" style="padding:3px 0"><b>Costo total de producir</b><b id="t_d_costo" class="num"></b></div>
        <div class="row between" style="padding:6px 0"><b>Precio sugerido por unidad</b><b id="t_d_uni" class="num" style="color:var(--ok)"></b></div>
        <div class="row between" style="padding:3px 0"><span class="muted">Redondeado a $500</span><span id="t_d_red" class="num"></span></div>
        <div class="row between" style="padding:3px 0"><b>Total (× unidades)</b><b id="t_d_total" class="num" style="color:var(--coral)"></b></div>
      </div>
      ${panel('t_','T')}
    </div>

    <!-- ================= PRECIOS GUARDADOS ================= -->
    <div class="card" style="margin-top:14px"><div class="sectiontitle">Precios guardados</div>
      <div id="cc_precios"></div>
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn ghost sm" onclick="CalcCostos.exportar()">⬇️ Exportar CSV</button>
      </div>
      <div class="muted" style="margin-top:8px;font-size:12px">Quedan guardados en este teléfono. El CSV sirve para rellenar la columna PRECIO del catálogo.</div>
    </div>`;
  }

  // ---- Costura: filas de materiales ----
  function matRows(){
    return [...document.querySelectorAll('#cc_rows .cc_mrow')].map(r=>{
      const i=r.querySelectorAll('input');
      return {el:r,d:i[0].value,c:parseFloat(i[1].value)||0,p:parseFloat(i[2].value)||0};
    });
  }
  function addRow(d='',c=1,p=0){
    const wrap=document.getElementById('cc_rows'); if(!wrap)return;
    const div=document.createElement('div'); div.className='cc_mrow row';
    div.style.cssText='gap:8px;margin-bottom:8px;align-items:center';
    div.innerHTML=`<input type="text" list="cc_sug" placeholder="Material" value="${esc(d)}" style="flex:2">
      <input type="number" placeholder="Cant." value="${c}" min="0" step="0.01" style="flex:1">
      <input type="number" placeholder="Precio CLP" value="${p}" min="0" style="flex:1.3">
      <button class="btn ghost" style="padding:8px 12px" title="Quitar">×</button>`;
    div.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{calcC();save();}));
    div.querySelector('button').onclick=()=>{div.remove();calcC();save();};
    wrap.appendChild(div);
  }

  /* ---- El panel de decisión: mercado + precio objetivo ----
     sugerido = lo que da la calculadora
     duro     = plata que sale de tu bolsillo (no incluye tu tiempo)
     horas    = horas de trabajo tuyo en la pieza                     */
  function panelCalc(p,sugerido,duro,horas){
    const sel=document.getElementById(p+'mkt');
    const m = mkt(sel? sel.value : '');
    set(p+'duro', CLP(duro));

    // --- referencia de mercado ---
    const e=document.getElementById(p+'mkt_v');
    if(m.min>0){
      set(p+'mkt_r', CLP(m.min)+' – '+CLP(m.max));
      set(p+'mkt_s', m.src? 'Referencia: '+m.src : '');
      if(e){
        if(sugerido>m.max){
          e.textContent='🔴 Estás '+Math.round((sugerido/m.max-1)*100)+'% sobre el techo del mercado. Cuesta venderlo a este precio.';
          e.style.color='var(--coral,#CB5A52)';
        } else if(sugerido<m.min){
          e.textContent='🟡 Estás '+Math.round((1-sugerido/m.min)*100)+'% bajo el piso del mercado. Puedes cobrar más.';
          e.style.color='var(--terracota,#C27A4E)';
        } else {
          e.textContent='🟢 Estás dentro del rango en que se vende en Chile.';
          e.style.color='var(--ok,#5F7C8E)';
        }
      }
    } else {
      set(p+'mkt_r','–'); set(p+'mkt_s','');
      if(e){ e.textContent='Elige un producto parecido para ver si tu precio se vende.'; e.style.color=''; }
    }

    // --- cotizar al revés ---
    const obj=val(p+'obj');
    const base = obj>0 ? obj : sugerido;
    const gan  = base - duro;
    set(p+'gan', CLP(gan));
    set(p+'hora_e', horas>0 ? CLP(gan/horas)+' / h' : '–');
    const e2=document.getElementById(p+'obj_v');
    if(e2){
      if(gan<0){
        e2.textContent='⚠️ A ese precio pierdes plata: no alcanza ni para los materiales.';
        e2.style.color='var(--coral,#CB5A52)';
      } else if(obj>0 && sugerido>0){
        const dif=Math.round((obj/sugerido-1)*100);
        const cmp = dif>0 ? (dif+'% sobre el sugerido') : (dif<0 ? (-dif)+'% bajo el sugerido' : 'igual al sugerido');
        e2.textContent='Cobrando '+CLP(obj)+' estás '+cmp+'.'+(horas>0?' Tu hora queda en '+CLP(gan/horas)+'.':'');
        e2.style.color='';
      } else {
        e2.textContent='Estos números son al precio sugerido. Escribe uno arriba para probar otro.';
        e2.style.color='';
      }
    }
  }

  // ---- Cálculos ----
  function calcB(){
    const punt=val('b_punt'),uni=Math.max(1,val('b_uni'));
    const telaCm2=(val('b_tra')*val('b_trl'))>0?val('b_trc')/(val('b_tra')*val('b_trl')):0;
    const entreCm2=(val('b_era')*val('b_erl'))>0?val('b_erc')/(val('b_era')*val('b_erl')):0;
    const hidroCm2=(val('b_hra')*val('b_hrl'))>0?val('b_hrc')/(val('b_hra')*val('b_hrl')):0;
    const hiloAb=val('b_bam')>0?val('b_bac')/val('b_bam'):0;
    const hiloAr=val('b_arm')>0?val('b_arc')/val('b_arm'):0;
    const cTela=telaCm2*val('b_ta')*val('b_tl');
    const dob=document.getElementById('b_edoble');
    const cEntre=entreCm2*val('b_ea')*val('b_el')*((dob&&dob.checked)?2:1);
    const cHidro=hidroCm2*val('b_ha')*val('b_hl');
    const cHar=hiloAr*(punt/1000*val('b_carr'));
    const cHab=hiloAb*(punt/1000*val('b_cab'));
    const sub=cTela+cEntre+cHidro+cHar+cHab;
    const mult=val('b_mult'); const subG=sub*mult;
    const bord=val('b_p1000')*punt/1000;
    const unidad=subG+bord; const total=unidad*uni;
    set('r_tcm',CLP4(telaCm2)); set('r_ecm',CLP4(entreCm2)); set('r_bam',CLP(hiloAb)); set('r_arm',CLP(hiloAr));
    set('d_tela',CLP(cTela)); set('d_entre',CLP(cEntre)); set('d_hidro',CLP(cHidro));
    set('d_hab',CLP(cHab)); set('d_har',CLP(cHar)); set('d_sub',CLP(sub)); set('d_subg',CLP(subG));
    set('d_bord',CLP(bord)); set('d_uni',CLP(unidad)); set('d_total',CLP(total));
    const mv=document.getElementById('b_mult_v'); if(mv)mv.textContent='×'+mult.toFixed(2);
    const spm=val('b_spm'); const horas = spm>0 ? punt/spm/60 : 0;
    panelCalc('b_',unidad,sub,horas);
    return {tipo:'bordado',punt,uni,telaCm2,entreCm2,hiloAb,hiloAr,
            cTela,cEntre,cHidro,cHar,cHab,sub,mult,subG,bord,unidad,total,duro:sub,horas};
  }

  function calcC(){
    let mat=0; matRows().forEach(r=>mat+=r.c*r.p);
    const mo=val('c_min')/60*val('c_hora'), mult=val('c_mult'), extra=val('c_extra'), uni=Math.max(1,val('c_uni'));
    const matG=mat*mult, unidad=matG+mo+extra, total=unidad*uni;
    set('cr_mat',CLP(mat)); set('cr_mo',CLP(mo)); set('cr_gan',CLP(matG-mat));
    set('cd_extra',CLP(extra)); set('cd_uni',CLP(unidad)); set('cd_total',CLP(total));
    const mv=document.getElementById('c_mult_v'); if(mv)mv.textContent='×'+mult.toFixed(2);
    const horas=val('c_min')/60;
    panelCalc('c_',unidad,mat+extra,horas);
    return {tipo:'costura',uni,mats:matRows().map(r=>({d:r.d,c:r.c,p:r.p,sub:r.c*r.p})),
            mat,mo,mult,matG,extra,unidad,total,min:val('c_min'),hora:val('c_hora'),
            duro:mat+extra,horas};
  }

  function calcT(){
    const peso=val('t_peso'), col=Math.max(1,val('t_col')), h=val('t_h'), post=val('t_post');
    const uni=Math.max(1,val('t_uni')), extra=val('t_extra');
    const fil = peso*(val('t_filkg')/1000)*(1+0.5*(col-1));
    const ele = h*val('t_kw')*val('t_kwh');
    const vida= val('t_vida');
    const maq = h*((vida>0?val('t_maq')/vida:0)+val('t_mant'));
    const mo  = post/60*val('t_hora');
    const emp = val('t_emp')+extra;
    const base= fil+ele+maq+mo+emp;
    const fal = base*(val('t_falla')/100);
    const costo=base+fal;
    const mult=val('t_mult');
    const unidad=costo*mult;
    const red=Math.round(unidad/500)*500;
    const total=unidad*uni;
    set('t_d_fil',CLP(fil)); set('t_d_ele',CLP(ele)); set('t_d_maq',CLP(maq));
    set('t_d_mo',CLP(mo)); set('t_d_emp',CLP(emp)); set('t_d_fal',CLP(fal));
    set('t_d_costo',CLP(costo)); set('t_d_uni',CLP(unidad)); set('t_d_red',CLP(red)); set('t_d_total',CLP(total));
    const mv=document.getElementById('t_mult_v'); if(mv)mv.textContent='×'+mult.toFixed(2);
    // duro = todo lo que pagas de verdad, sin tu tiempo (el buffer de fallas
    // también hay que sacárselo al tiempo, o queda contado de más)
    const duro=costo-mo*(1+val('t_falla')/100);
    panelCalc('t_',unidad,duro,post/60);
    return {tipo:'3d',peso,col,h,post,uni,extra,fil,ele,maq,mo,emp,fal,costo,mult,unidad,red,total,duro,horas:post/60};
  }

  const calcAll = ()=>{ calcB(); calcC(); calcT(); };

  // ---- Precios guardados ----
  function guardar(which){
    const p = which==='B'?'b_' : which==='C'?'c_' : 't_';
    const d = which==='B'?calcB() : which==='C'?calcC() : calcT();
    let nombre = txt(p+'nom');
    if(!nombre && which==='C') nombre = txt('c_nombre');
    if(!nombre){ alert('Ponle un nombre al producto antes de guardarlo.'); return; }
    const obj=val(p+'obj');
    const precio = obj>0 ? obj : d.unidad;
    const tipo = which==='B'?'Bordado' : which==='C'?'Costura' : '3D';
    const arr=loadPrecios();
    const reg={n:nombre, t:tipo, p:Math.round(precio), c:Math.round(d.duro), f:new Date().toISOString().slice(0,10)};
    const i=arr.findIndex(x=>String(x.n).toLowerCase()===nombre.toLowerCase());
    if(i>=0) arr[i]=reg; else arr.push(reg);
    savePrecios(arr); renderPrecios();
  }
  function borrar(i){ const arr=loadPrecios(); arr.splice(i,1); savePrecios(arr); renderPrecios(); }
  function renderPrecios(){
    const wrap=document.getElementById('cc_precios'); if(!wrap)return;
    const arr=loadPrecios();
    if(!arr.length){ wrap.innerHTML='<div class="muted">Todavía no has guardado ningún precio. Cotiza un producto y toca «Guardar precio».</div>'; return; }
    wrap.innerHTML = arr.map((x,i)=>`
      <div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line,#dcd3c4)">
        <div style="flex:1">
          <div><b>${esc(x.n)}</b></div>
          <div class="muted" style="font-size:12px">${esc(x.t)} · costo ${CLP(x.c)} · ${esc(x.f)}</div>
        </div>
        <b class="num" style="margin-right:10px">${CLP(x.p)}</b>
        <button class="btn ghost" style="padding:6px 10px" onclick="CalcCostos.borrar(${i})">×</button>
      </div>`).join('');
  }
  function exportar(){
    const arr=loadPrecios();
    if(!arr.length){ alert('No hay precios guardados todavía.'); return; }
    const filas=[['producto','tipo','precio_clp','costo_clp','fecha']].concat(arr.map(x=>[x.n,x.t,x.p,x.c,x.f]));
    const csv='﻿'+filas.map(f=>f.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    try{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      a.download='precios-ayunka-'+new Date().toISOString().slice(0,10)+'.csv';
      document.body.appendChild(a); a.click(); a.remove();
    }catch(e){ alert('No se pudo exportar: '+e.message); }
  }

  function tab(which){
    const map={B:'cc_bordado',C:'cc_costura',T:'cc_3d'};
    Object.keys(map).forEach(k=>{
      const s=document.getElementById(map[k]); if(s) s.style.display=(k===which?'':'none');
      const b=document.getElementById('cc_tab'+k); if(b) b.className='btn '+(k===which?'primary':'ghost');
    });
    try{ localStorage.setItem('ayunka-costos-tab',which); }catch(e){}
  }
  const tabActual = ()=>{ try{ return localStorage.getItem('ayunka-costos-tab')||'B'; }catch(e){ return 'B'; } };

  function init(){
    const s=load();
    Object.keys(DEF).forEach(k=>{const e=document.getElementById(k); if(!e)return;
      if(e.type==='checkbox') e.checked=!!s[k]; else e.value=s[k];});
    TXTKEYS.forEach(k=>{const e=document.getElementById(k); if(e && s[k]!=null) e.value=s[k];});

    const q=document.getElementById('cc_quick');
    if(q) QUICK.forEach(n=>{const b=document.createElement('button'); b.className='btn ghost sm';
      b.style.cssText='padding:6px 12px;font-size:12px'; b.textContent='+ '+n;
      b.onclick=()=>{addRow(n,1,0);calcC();save();}; q.appendChild(b);});

    const mats = (s._mats&&s._mats.length)? s._mats
      : [{d:'Tela exterior',c:0.5,p:4000},{d:'Forro',c:0.4,p:2500},{d:'Cierre / cremallera',c:1,p:900},{d:'Cinta espiga',c:1,p:600}];
    mats.forEach(m=>addRow(m.d,m.c,m.p));

    ['#cc_bordado','#cc_costura','#cc_3d'].forEach(sel=>{
      document.querySelectorAll(sel+' input, '+sel+' select').forEach(i=>{
        i.addEventListener('input',()=>{calcAll();save();});
        i.addEventListener('change',()=>{calcAll();save();});
      });
    });

    renderPrecios();
    tab(tabActual());
    calcAll();
  }

  function pdf(which){
    try{
      const w = which || tabActual();
      const d = w==='C' ? calcC() : w==='T' ? calcT() : calcB();
      window.genCostoPDF(d);
    }catch(e){ alert('No se pudo generar el PDF: '+e.message); }
  }

  window.CalcCostos={view,init,tab,addRow,pdf,guardar,borrar,exportar};
})();
