/* Ayünka Studio — Calculadora de costos (Bordado y Costura) en CLP
   Se integra como pestaña "Costos". Recuerda tus precios en localStorage. */
(function(){
  const KEY='ayunka-costos-v1';
  const CLP = n => isFinite(n)? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Math.round(n)) : '–';
  const CLP4 = n => isFinite(n)? '$ '+(Math.round(n*10000)/10000).toLocaleString('es-CL',{maximumFractionDigits:4}) : '–';
  const $ = s => document.querySelector(s);
  const val = id => { const e=document.getElementById(id); return e? (parseFloat(e.value)||0):0; };

  const DEF = {
    b_punt:10000,b_uni:1,b_ta:30,b_tl:40,b_ea:15,b_el:20,b_ha:0,b_hl:0,b_edoble:0,
    b_p1000:900,b_tra:150,b_trl:100,b_trc:6000,b_era:150,b_erl:1000,b_erc:12000,
    b_hra:0,b_hrl:0,b_hrc:0,b_bam:20000,b_bac:6000,b_arm:4000,b_arc:3500,
    b_carr:5.1,b_cab:3.3,b_mult:2.55,
    c_uni:1,c_min:60,c_hora:4000,c_mult:2,c_extra:0
  };
  function load(){ try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return Object.assign({},DEF);} }
  function save(){
    const s={}; Object.keys(DEF).forEach(k=>{const e=document.getElementById(k); if(!e)return; s[k]= e.type==='checkbox'? (e.checked?1:0) : (parseFloat(e.value)||0);});
    s._mats = matRows().map(r=>({d:r.d,c:r.c,p:r.p}));
    try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}
  }

  const SUG=['Tela exterior','Tela panal','Gamuza','Forro','Cinta espiga','Cinta twill','Cinta de raso','Cinta bebé','Elástico','Cierre / cremallera','Velcro','Botón','Broche / snap','Sesgo (bies)','Encaje','Cordón','Guata / vellón','Relleno','Entretela','Entretela fusionable','Hilo','Hilo encerado','Borla','Pompón','Moño','Argolla / anilla','Mosquetón','Ojetillos','Imán','Etiqueta bordada','Etiqueta de marca'];
  const QUICK=['Cinta espiga','Elástico','Cierre / cremallera','Velcro','Botón','Sesgo (bies)','Guata / vellón','Cordón','Argolla / anilla','Borla','Moño','Etiqueta bordada'];

  function view(){
    const f=(id,ph)=>`value="${DEF[id]}"`; // defaults; real values set on init
    return `
    <div class="row between"><h1 class="page">Calculadora de costos</h1></div>
    <p class="sub">Bordado y costura · valores en pesos chilenos</p>
    <div class="row" style="gap:8px;margin:10px 0 4px">
      <button class="btn primary" id="cc_tabB" onclick="CalcCostos.tab('B')">🧵 Bordado</button>
      <button class="btn ghost" id="cc_tabC" onclick="CalcCostos.tab('C')">✂️ Costura</button>
    </div>

    <!-- BORDADO -->
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
        <label class="field">Precio a cobrar por 1.000 puntadas (CLP)<input type="number" id="b_p1000"></label>
        <div class="muted" style="margin-top:6px">Ya incluye tu tiempo de máquina y ganancia por el bordado.</div>
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
    </div>

    <!-- COSTURA -->
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
    </div>`;
  }

  // ---- Costura material rows ----
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
    div.innerHTML=`<input type="text" list="cc_sug" placeholder="Material" value="${d.replace(/"/g,'&quot;')}" style="flex:2">
      <input type="number" placeholder="Cant." value="${c}" min="0" step="0.01" style="flex:1">
      <input type="number" placeholder="Precio CLP" value="${p}" min="0" style="flex:1.3">
      <button class="btn ghost" style="padding:8px 12px" title="Quitar">×</button>`;
    div.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{calcC();save();}));
    div.querySelector('button').onclick=()=>{div.remove();calcC();save();};
    wrap.appendChild(div);
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
    const set=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
    set('r_tcm',CLP4(telaCm2)); set('r_ecm',CLP4(entreCm2)); set('r_bam',CLP(hiloAb)); set('r_arm',CLP(hiloAr));
    set('d_tela',CLP(cTela)); set('d_entre',CLP(cEntre)); set('d_hidro',CLP(cHidro));
    set('d_hab',CLP(cHab)); set('d_har',CLP(cHar)); set('d_sub',CLP(sub)); set('d_subg',CLP(subG));
    set('d_bord',CLP(bord)); set('d_uni',CLP(unidad)); set('d_total',CLP(total));
    const mv=document.getElementById('b_mult_v'); if(mv)mv.textContent='×'+mult.toFixed(2);
  }
  function calcC(){
    let mat=0; matRows().forEach(r=>mat+=r.c*r.p);
    const mo=val('c_min')/60*val('c_hora'), mult=val('c_mult'), extra=val('c_extra'), uni=Math.max(1,val('c_uni'));
    const matG=mat*mult, unidad=matG+mo+extra, total=unidad*uni;
    const set=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
    set('cr_mat',CLP(mat)); set('cr_mo',CLP(mo)); set('cr_gan',CLP(matG-mat));
    set('cd_extra',CLP(extra)); set('cd_uni',CLP(unidad)); set('cd_total',CLP(total));
    const mv=document.getElementById('c_mult_v'); if(mv)mv.textContent='×'+mult.toFixed(2);
  }

  function tab(which){
    document.getElementById('cc_bordado').style.display = which==='B'?'':'none';
    document.getElementById('cc_costura').style.display = which==='C'?'':'none';
    document.getElementById('cc_tabB').className='btn '+(which==='B'?'primary':'ghost');
    document.getElementById('cc_tabC').className='btn '+(which==='C'?'primary':'ghost');
  }

  function init(){
    const s=load();
    // set numeric/checkbox values
    Object.keys(DEF).forEach(k=>{const e=document.getElementById(k); if(!e)return;
      if(e.type==='checkbox')e.checked=!!s[k]; else e.value=s[k];});
    // bind bordado
    document.querySelectorAll('#cc_bordado input').forEach(i=>i.addEventListener('input',()=>{calcB();save();}));
    // costura quick-add
    const q=document.getElementById('cc_quick');
    QUICK.forEach(n=>{const b=document.createElement('button'); b.className='btn ghost sm'; b.style.cssText='padding:6px 12px;font-size:12px';
      b.textContent='+ '+n; b.onclick=()=>{addRow(n,1,0);calcC();save();}; q.appendChild(b);});
    // costura rows: saved or defaults
    const mats = (s._mats&&s._mats.length)? s._mats : [{d:'Tela exterior',c:0.5,p:4000},{d:'Forro',c:0.4,p:2500},{d:'Cierre / cremallera',c:1,p:900},{d:'Cinta espiga',c:1,p:600}];
    mats.forEach(m=>addRow(m.d,m.c,m.p));
    document.querySelectorAll('#cc_costura input').forEach(i=>i.addEventListener('input',()=>{calcC();save();}));
    tab('B'); calcB(); calcC();
  }

  window.CalcCostos={view,init,tab,addRow};
})();
