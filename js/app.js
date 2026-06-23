/* Ayünka Studio — UI, router y módulos */
(function(){
  const DB=window.DB, save=window.saveDB, calc=window.calc, fmt=window.CLP, IDB=window.IDB;
  const $=s=>document.querySelector(s);
  const pct=x=>(Math.round((x||0)*1000)/10)+'%';
  const num=v=>{const n=parseFloat(v);return isNaN(n)?0:n;};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MATERIALS=['PLA','PLA+','PLA Silk','PLA Mate','PETG','ABS','ASA','TPU','Nylon','PC','PVA','HIPS','Madera (PLA)','Fibra de carbono'];
  function matOptions(sel){return MATERIALS.map(m=>`<option ${m===sel?'selected':''}>${m}</option>`).join('');}
  function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1900);}
  function hydrate(){document.querySelectorAll('img[data-img-id]:not([data-done])').forEach(async img=>{img.setAttribute('data-done','1');try{const url=await IDB.urlFor(img.getAttribute('data-img-id'));if(url)img.src=url;}catch(e){}});}
  function modal(html){$('#modal-root').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)A.closeModal()"><div class="modal">${html}</div></div>`;hydrate();}
  function closeModal(){$('#modal-root').innerHTML='';}
  function fileToBlobStore(file,kind){return IDB.putFile(file,{name:file.name,type:file.type,kind});}

  const TABS=[{id:'inicio',label:'Inicio'},{id:'productos',label:'Productos'},{id:'placas',label:'Placas'},
    {id:'filamentos',label:'Filamentos'},{id:'clientes',label:'Clientes'},{id:'cotizaciones',label:'Cotizaciones'},{id:'pedidos',label:'Producción'},
    {id:'plan',label:'Planificación'},{id:'ajustes',label:'Ajustes'}];
  function renderTabs(a){$('#tabs').innerHTML=TABS.map(t=>`<button class="tab ${t.id===a?'active':''}" onclick="A.go('${t.id}')">${t.label}</button>`).join('');}
  function go(id){location.hash='#/'+id;$('#tabs').classList.remove('open');}

  /* ---------- INICIO ---------- */
  function vInicio(){
    const prods=DB.products,fils=DB.filaments;
    const margins=prods.map(p=>calc.marginPct(calc.priceOf(p),calc.costPiece(p).total));
    const avgM=margins.length?margins.reduce((a,b)=>a+b,0)/margins.length:0;
    const totalG=fils.reduce((a,f)=>a+(+f.gramsLeft||0),0);
    const low=fils.filter(f=>(+f.gramsLeft||0)<150);
    const today=DB.schedule.find(d=>d.jobs.some(j=>j.status!=='listo'))||DB.schedule[0];
    const usedH=today?today.jobs.reduce((a,j)=>a+(+j.hours||0),0):0,cap=DB.params.dayCapacityH;
    return `<h1 class="page">Hola, Ayünka 🌿</h1><p class="sub">Resumen del taller</p>
      <div class="grid cards">
        <div class="card kpi"><span>Productos</span><b>${prods.length}</b></div>
        <div class="card kpi"><span>Clientes</span><b>${DB.clients.length}</b></div>
        <div class="card kpi"><span>Margen promedio</span><b>${pct(avgM)}</b></div>
        <div class="card kpi"><span>Filamento en stock</span><b>${totalG.toLocaleString('es-CL')} g</b></div>
      </div>
      <div class="sectiontitle">Próxima jornada — ${today?esc(today.week+' · '+today.day):''}</div>
      <div class="card">${today?today.jobs.map(j=>`<div class="row between" style="padding:4px 0"><span>${esc(j.name)} ${j.hours?`<span class="tag">${j.hours} h</span>`:''}</span><span class="pill ${j.status==='listo'?'ok':j.status==='imprimiendo'?'warn':'bad'}">${j.status}</span></div>`).join(''):''}
        <div class="muted" style="margin-top:8px">Carga del día: ${usedH.toFixed(1)} h de ${cap} h</div>
        <div class="capacity ${usedH>cap?'over':''}"><i style="width:${Math.min(100,usedH/cap*100)}%"></i></div>
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" onclick="A.go('plan')">Ver planificación →</button></div></div>
      ${low.length?`<div class="sectiontitle">Reponer filamento</div><div class="card">${low.map(f=>`<div class="row between" style="padding:3px 0"><span><span class="swatch" style="background:${f.hex}"></span>${esc(f.color)} · ${esc(f.marca)}</span><span class="pill bad">${f.gramsLeft} g</span></div>`).join('')}</div>`:''}`;
  }

  /* ---------- PRODUCTOS ---------- */
  function vProductos(){
    const rows=DB.products.map(p=>{
      const c=calc.costPiece(p),price=calc.priceOf(p),m=calc.marginPct(price,c.total);
      const fil=p.filamentId?DB.filaments.find(f=>f.id===p.filamentId):null;
      const thumb=p.imageUrl?`<img class="thumb" src="${esc(p.imageUrl)}" alt="">`:(p.imageId?`<img class="thumb" data-img-id="${p.imageId}" alt="">`:`<div class="thumb ph"><i>🧵</i></div>`);
      return `<tr>
        <td><div class="row" style="gap:10px;flex-wrap:nowrap">${thumb}<div><b>${esc(p.name)}</b><div class="muted">${esc(p.material)} · ${p.grams}g · ${calc.hm(p.timeH)} · ${p.colors}c${fil?` · ${esc(fil.color)}/${esc(fil.marca)}`:''}</div><div class="row" style="gap:6px;margin-top:4px"><span class="pill ${(p.imageId||p.imageUrl)?'ok':'bad'}">${(p.imageId||p.imageUrl)?'📷 foto':'sin foto'}</span><span class="pill ${(p.files&&p.files.length)?'ok':'bad'}">${(p.files&&p.files.length)?'📄 STL':'sin STL'}</span><span class="tag">stock: ${p.stock||0}</span></div></div></div></td>
        <td class="num">${fmt(c.total)}</td><td class="num">${fmt(price)}</td>
        <td class="num"><span class="pill ${m>=0.6?'ok':m>=0.4?'warn':'bad'}">${pct(m)}</span></td>
        <td class="num"><button class="btn ghost sm" onclick="A.editProduct('${p.id}')">Editar</button></td></tr>`;}).join('');
    return `<div class="row between"><h1 class="page">Productos</h1><div class="row">${window.AYUNKA_DESIGNS?`<button class="btn ghost" onclick="A.addDesigns()">+ Diseños Ayünka</button>`:''}<button class="btn ghost" onclick="A.delProductsNoFile()">Limpiar sin archivo</button><button class="btn primary" onclick="A.editProduct()">+ Nuevo</button></div></div>
      <p class="sub">Costo de producción y precio sugerido por pieza</p>
      <div class="tablewrap"><table><thead><tr><th>Pieza</th><th class="num">Costo</th><th class="num">Precio</th><th class="num">Margen</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Sin productos</td></tr>'}</tbody></table></div>`;
  }
  function editProduct(id){
    A._prod=id?JSON.parse(JSON.stringify(DB.products.find(x=>x.id===id))):{name:'',material:'PLA',grams:'',timeH:'',colors:1,postMin:0,packOverride:null,price:null,filamentId:null,imageId:null,files:[]};
    renderProductModal();
  }
  function renderProductModal(){
    const p=A._prod;
    const filOpts=`<option value="">— precio material por defecto —</option>`+DB.filaments.map(f=>`<option value="${f.id}" ${p.filamentId===f.id?'selected':''}>${esc(f.color)} · ${esc(f.marca)} (${fmt(f.rollPrice/f.rollGrams*1000)}/kg)</option>`).join('');
    const c=calc.costPiece(p),pr=calc.priceOf(p);
    const img=p.imageUrl?`<img class="thumb big" src="${esc(p.imageUrl)}" alt="">`:(p.imageId?`<img class="thumb big" data-img-id="${p.imageId}" alt="">`:`<div class="thumb big ph"><i>🧵</i></div>`);
    const files=(p.files||[]).map(f=>{const v=f.url?`A.viewUrl('${f.url}','${esc(f.name)}')`:`A.viewFile('${f.id}','${esc(f.name)}')`;const k=f.id||f.url;return `<div class="row between" style="margin:3px 0"><span>📄 ${esc(f.name)} <span class="tag">${f.url?'nube':'local'}</span></span><span class="row"><button class="btn ghost sm" onclick="${v}">Ver</button><button class="linkish" onclick="A.prodDelFile('${esc(k)}')">quitar</button></span></div>`;}).join('');
    modal(`<h2>${p.id?'Editar':'Nuevo'} producto</h2>
      <div class="row" style="gap:14px;align-items:flex-start">${img}
        <div style="flex:1"><label class="field">Nombre<input id="f-name" value="${esc(p.name)}" oninput="A._prod.name=this.value"></label>
        <label class="field" style="margin-top:8px">Foto del producto<input type="file" accept="image/*" onchange="A.prodImg(this)"></label></div></div>
      <div class="formgrid" style="margin-top:10px">
        <label class="field">Material<select id="f-mat" onchange="A._prod.material=this.value;A.prodRefresh()">${matOptions(p.material)}</select></label>
        <label class="field">Filamento (marca/precio)<select id="f-fil" onchange="A._prod.filamentId=this.value||null;A.prodRefresh()">${filOpts}</select></label>
        <label class="field">Peso (g)<input id="f-grams" type="number" value="${p.grams}" oninput="A._prod.grams=this.value;A.prodRefresh()"></label>
        <label class="field">Tiempo impresión<div class="row" style="gap:6px"><input id="f-th" type="number" min="0" value="${Math.floor((+p.timeH||0)+1e-9)}" oninput="A.prodTime()" style="width:62px"><span class="muted">h</span><input id="f-tm" type="number" min="0" max="59" value="${Math.round((((+p.timeH||0)%1))*60)}" oninput="A.prodTime()" style="width:62px"><span class="muted">min</span></div></label>
        <label class="field">N° de colores<input id="f-colors" type="number" min="1" value="${p.colors}" oninput="A._prod.colors=this.value;A.prodRefresh()"></label>
        <label class="field">Postproducción (min)<input id="f-post" type="number" value="${p.postMin}" oninput="A._prod.postMin=this.value;A.prodRefresh()"></label>
        <label class="field">Stock actual (u)<input id="f-stock" type="number" value="${p.stock||0}" oninput="A._prod.stock=+this.value"></label>
        <label class="field">Empaque (CLP, opcional)<input id="f-pack" type="number" value="${p.packOverride??''}" placeholder="por defecto" oninput="A._prod.packOverride=this.value===''?null:+this.value;A.prodRefresh()"></label>
        <label class="field">Precio manual (CLP, opcional)<input id="f-price" type="number" value="${p.price??''}" placeholder="vacío = sugerido" oninput="A._prod.price=this.value===''?null:+this.value;A.prodRefresh()"></label>
      </div>
      <div class="sectiontitle">Archivos STL / 3MF <span class="muted">(uno o varios)</span></div>
      ${files||'<div class="muted">Sin archivos asociados</div>'}
      <label class="field" style="margin-top:6px">Agregar archivo(s)<input type="file" multiple accept=".stl,.3mf,.obj,.gcode,.step,.stp,.amf" onchange="A.prodAddFiles(this)"></label>
      <div class="muted" style="margin-top:4px">«Abrir» descarga el archivo; si tu PC asocia .stl/.3mf con el laminador, se abre ahí.</div>
      <div class="card" style="margin:12px 0"><div class="row between"><span>Costo total</span><b id="pp-tot">${fmt(c.total)}</b></div><div class="row between"><span>Precio sugerido</span><b id="pp-pr" style="color:var(--coral)">${fmt(pr)}</b></div><div class="row between"><span>Margen</span><b id="pp-mg">${pct(calc.marginPct(pr,c.total))}</b></div></div>
      <div class="row between"><div>${p.id?`<button class="linkish" onclick="A.delProduct('${p.id}')">Eliminar</button>`:''}</div>
        <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.saveProduct()">Guardar</button></div></div>`);
  }
  function prodTime(){A._prod.timeH=calc.toHours(document.getElementById('f-th').value,document.getElementById('f-tm').value);prodRefresh();}
  function prodRefresh(){const p=A._prod,c=calc.costPiece(p),pr=calc.priceOf(p);const s=(i,v)=>{const e=document.getElementById(i);if(e)e.innerHTML=v;};s('pp-tot',fmt(c.total));s('pp-pr',fmt(pr));s('pp-mg',pct(calc.marginPct(pr,c.total)));}
  async function prodImg(inp){const f=inp.files[0];if(!f)return;try{if(A._prod.imageId)await IDB.delFile(A._prod.imageId);A._prod.imageId=await fileToBlobStore(f,'image');renderProductModal();}catch(e){toast('No se pudo guardar la imagen');}}
  async function prodAddFiles(inp){try{for(const f of inp.files){const fid=await fileToBlobStore(f,'stl');A._prod.files.push({id:fid,name:f.name});}renderProductModal();}catch(e){toast('No se pudo adjuntar');}}
  function prodOpenFile(fid){IDB.openFile(fid).then(ok=>{if(!ok)toast('Archivo no encontrado');});}
  function viewUrl(url,name){ window.STLViewer.openUrl(url,name); }
  async function viewFile(fid,name){ try{ const f=await IDB.getFile(fid); if(!f){toast('Archivo local: se subió en otro dispositivo. Para verlo en todos lados, usa el catálogo «+ Diseños Ayünka».');return;} window.STLViewer.open(f.blob,name||f.name); }catch(e){ toast('No se pudo abrir el visor'); } }
  async function prodDelFile(key){const f=(A._prod.files||[]).find(x=>(x.id||x.url)===key);if(f&&f.id)await IDB.delFile(f.id);A._prod.files=A._prod.files.filter(x=>(x.id||x.url)!==key);renderProductModal();}
  function saveProduct(){const p=A._prod;p.name=( $('#f-name').value||'Pieza').trim();p.grams=num(p.grams);p.timeH=num(p.timeH);p.colors=num(p.colors)||1;p.postMin=num(p.postMin);
    if(p.id){Object.assign(DB.products.find(x=>x.id===p.id),p);}else{p.id=window.uid();p.stock=0;DB.products.push(p);}save();closeModal();render();toast('Producto guardado');}
  function delProduct(id){DB.products=DB.products.filter(x=>x.id!==id);save();closeModal();render();toast('Producto eliminado');}

  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  function lookupFilHex(marca,color){
    const FC=window.FIL_COLORS; if(!FC)return null; const m=norm(marca),c=norm(color); if(!c)return null;
    let e=FC.exact.find(x=>norm(x.m)===m&&norm(x.c)===c); if(e)return e.hex;
    if(FC.names[c])return FC.names[c];
    let best=null,bl=0; for(const k in FC.names){ if(c.includes(k)&&k.length>bl){best=FC.names[k];bl=k.length;} } if(best)return best;
    e=FC.exact.find(x=>norm(x.c)===c); if(e)return e.hex; return null;
  }
  function filAuto(manual){
    const hex=lookupFilHex(document.getElementById('g-marca').value,document.getElementById('g-color').value);
    const hint=document.getElementById('g-hint');
    if(hex){ document.getElementById('g-hex').value=hex; if(hint)hint.innerHTML='<span class="swatch" style="background:'+hex+'"></span>Color detectado · '+hex; }
    else if(manual&&hint){ hint.textContent='No reconocí ese color; ponlo a mano o pídeme que lo agregue.'; }
  }

  /* ---------- FILAMENTOS ---------- */
  function vFilamentos(){
    const rows=DB.filaments.map(f=>{const cg=f.rollPrice/Math.max(1,f.rollGrams);const low=(+f.gramsLeft||0)<150;
      return `<tr><td><span class="swatch" style="background:${f.hex}"></span>${esc(f.color)}<div class="muted">${esc(f.marca)} · ${esc(f.material)}</div></td>
        <td class="num">${fmt(f.rollPrice)}/${f.rollGrams}g</td><td class="num">${fmt(cg)}/g</td>
        <td class="num"><span class="pill ${low?'bad':'ok'}">${(+f.gramsLeft||0).toLocaleString('es-CL')} g</span></td>
        <td class="num"><button class="btn ghost sm" onclick="A.editFil('${f.id}')">Editar</button></td></tr>`;}).join('');
    return `<div class="row between"><h1 class="page">Filamentos</h1><button class="btn primary" onclick="A.editFil()">+ Rollo</button></div>
      <p class="sub">Inventario por marca y color — cada rollo con su propio precio</p>
      <div class="tablewrap"><table><thead><tr><th>Color</th><th class="num">Rollo</th><th class="num">Costo/g</th><th class="num">Restante</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Sin rollos</td></tr>'}</tbody></table></div>`;
  }
  function editFil(id){const f=id?DB.filaments.find(x=>x.id===id):{marca:'',material:'PLA',color:'',hex:'#E39B96',rollPrice:15000,rollGrams:1000,gramsLeft:1000};
    modal(`<h2>${id?'Editar':'Nuevo'} rollo</h2><div class="formgrid">
      <label class="field">Color<input id="g-color" value="${esc(f.color)}" oninput="A.filAuto()"></label>
      <label class="field">Color (hex)<input id="g-hex" type="color" value="${f.hex}"></label>
      <label class="field">Marca<input id="g-marca" value="${esc(f.marca)}" oninput="A.filAuto()"></label>
      <label class="field">Material<select id="g-mat">${matOptions(f.material)}</select></label>
      <label class="field">Precio rollo (CLP)<input id="g-price" type="number" value="${f.rollPrice}"></label>
      <label class="field">Gramos por rollo<input id="g-tot" type="number" value="${f.rollGrams}"></label>
      <label class="field">Gramos restantes<input id="g-left" type="number" value="${f.gramsLeft}"></label></div>
      <div class="row" style="margin-top:8px;gap:8px"><button class="btn ghost sm" onclick="A.filAuto(true)">✨ Detectar color</button><span class="muted" id="g-hint"></span></div>
      <div class="row between" style="margin-top:12px"><div>${id?`<button class="linkish" onclick="A.delFil('${id}')">Eliminar</button>`:''}</div>
      <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.saveFil('${id||''}')">Guardar</button></div></div>`);}
  function saveFil(id){const o={color:$('#g-color').value.trim()||'Color',hex:$('#g-hex').value,marca:$('#g-marca').value,material:$('#g-mat').value,rollPrice:num($('#g-price').value),rollGrams:num($('#g-tot').value)||1000,gramsLeft:num($('#g-left').value)};
    if(id){Object.assign(DB.filaments.find(x=>x.id===id),o);}else{o.id=window.uid();DB.filaments.push(o);}save();closeModal();render();toast('Filamento guardado');}
  function delFil(id){DB.filaments=DB.filaments.filter(x=>x.id!==id);save();closeModal();render();toast('Rollo eliminado');}

  /* ---------- PLACAS ---------- */
  function vPlacas(){const list=DB.plates.map(pl=>{const c=calc.costPlate(pl);
      return `<div class="card"><div class="row between"><h3>${esc(pl.name)}</h3><button class="btn ghost sm" onclick="A.editPlate('${pl.id}')">Editar</button></div>
        <div class="muted">${c.units} piezas · ${(pl.plateTimeH||0)}h · ${Math.round(c.grams)}g</div>
        <div class="row between" style="margin-top:8px"><span>Costo placa</span><b>${fmt(c.total)}</b></div>
        <div class="row between"><span>Precio sugerido</span><b style="color:var(--coral)">${fmt(c.sugerido)}</b></div>
        <div class="row" style="margin-top:10px"><button class="btn ghost sm" onclick="A.printPlate('${pl.id}')">Registrar impresión (descontar filamento)</button></div></div>`;}).join('');
    return `<div class="row between"><h1 class="page">Placas</h1><button class="btn primary" onclick="A.editPlate()">+ Placa</button></div>
      <p class="sub">Costea una placa completa con varias piezas</p><div class="grid cards">${list||'<div class="empty">Aún no has armado placas</div>'}</div>`;}
  function editPlate(id){A._plate=id?JSON.parse(JSON.stringify(DB.plates.find(x=>x.id===id))):{name:'',items:[],plateTimeH:''};renderPlateModal();}
  function renderPlateModal(){const pl=A._plate,opts=DB.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    const rows=pl.items.map((it,i)=>{const p=DB.products.find(x=>x.id===it.productId);return `<div class="row" style="margin:4px 0"><span style="flex:1">${esc(p?p.name:'?')}</span><input type="number" min="1" value="${it.qty}" style="width:70px" onchange="A.plateQty(${i},this.value)"><button class="linkish" onclick="A.plateDel(${i})">quitar</button></div>`;}).join('');
    const c=calc.costPlate(pl);
    modal(`<h2>${pl.id?'Editar':'Nueva'} placa</h2><label class="field">Nombre<input id="pl-name" value="${esc(pl.name)}" oninput="A._plate.name=this.value"></label>
      <div class="sectiontitle">Piezas en la placa</div>${rows||'<div class="muted">Agrega piezas</div>'}
      <div class="row" style="margin-top:8px"><select id="pl-add" style="flex:1">${opts}</select><button class="btn ghost sm" onclick="A.plateAdd()">+ Agregar</button></div>
      <label class="field" style="margin-top:12px">Tiempo de impresión de la placa (h)<input id="pl-time" type="number" step="0.1" value="${pl.plateTimeH}" oninput="A._plate.plateTimeH=this.value;A.plateRefresh()"></label>
      <div class="card" style="margin-top:12px"><div class="row between"><span>Filamento</span><b id="pc-fil">${fmt(c.filament)}</b></div><div class="row between"><span>Luz + máquina</span><b id="pc-mac">${fmt(c.luz+c.maquina)}</b></div><div class="row between"><span>Mano obra + empaque</span><b id="pc-mo">${fmt(c.mano+c.empaque)}</b></div><div class="row between"><span>Costo total</span><b id="pc-tot">${fmt(c.total)}</b></div><div class="row between"><span>Precio sugerido</span><b id="pc-sug" style="color:var(--coral)">${fmt(c.sugerido)}</b></div></div>
      <div class="row between" style="margin-top:12px"><div>${pl.id?`<button class="linkish" onclick="A.delPlate('${pl.id}')">Eliminar</button>`:''}</div>
        <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.savePlate()">Guardar</button></div></div>`);}
  function plateRefresh(){const c=calc.costPlate(A._plate),s=(i,v)=>{const e=document.getElementById(i);if(e)e.innerHTML=v;};s('pc-fil',fmt(c.filament));s('pc-mac',fmt(c.luz+c.maquina));s('pc-mo',fmt(c.mano+c.empaque));s('pc-tot',fmt(c.total));s('pc-sug',fmt(c.sugerido));}
  function plateAdd(){const id=$('#pl-add').value;if(!id)return;A._plate.items.push({productId:id,qty:1});renderPlateModal();}
  function plateQty(i,v){A._plate.items[i].qty=num(v);plateRefresh();}
  function plateDel(i){A._plate.items.splice(i,1);renderPlateModal();}
  function savePlate(){const pl=A._plate;pl.name=$('#pl-name').value.trim()||'Placa';pl.plateTimeH=num($('#pl-time').value);if(pl.id){Object.assign(DB.plates.find(x=>x.id===pl.id),pl);}else{pl.id=window.uid();DB.plates.push(pl);}save();closeModal();render();toast('Placa guardada');}
  function delPlate(id){DB.plates=DB.plates.filter(x=>x.id!==id);save();closeModal();render();toast('Placa eliminada');}
  function printPlate(id){const pl=DB.plates.find(x=>x.id===id),c=calc.costPlate(pl);const mats=[...new Set(pl.items.map(it=>{const p=DB.products.find(x=>x.id===it.productId);return p?(p.filamentId||p.material):'PLA';}))];
    pl.items.forEach(it=>{const p=DB.products.find(x=>x.id===it.productId);if(!p)return;let roll=p.filamentId?DB.filaments.find(f=>f.id===p.filamentId):DB.filaments.find(f=>f.material===p.material&&f.gramsLeft>0);if(roll){roll.gramsLeft=Math.max(0,roll.gramsLeft-(+p.grams||0)*calc.purgeFactor(p.colors)*(+it.qty||0));}});
    save();render();toast('Impresión registrada · filamento descontado');}

  /* ---------- CLIENTES (CRM) ---------- */
  function vClientes(){
    const rows=DB.clients.map(cl=>{const qn=DB.quotes.filter(q=>q.clientId===cl.id).length;
      return `<div class="card"><div class="row between"><h3>${esc(cl.name)}</h3><button class="btn ghost sm" onclick="A.editClient('${cl.id}')">Editar</button></div>
        <div class="muted">${cl.phone?'📞 '+esc(cl.phone)+'  ':''}${cl.email?'✉ '+esc(cl.email):''}</div>
        ${cl.note?`<div class="muted" style="margin-top:4px">${esc(cl.note)}</div>`:''}
        <div class="row between" style="margin-top:8px"><span class="tag">${qn} cotización(es)</span><button class="btn coral sm" onclick="A.quoteForClient('${cl.id}')">Nueva cotización</button></div></div>`;}).join('');
    return `<div class="row between"><h1 class="page">Clientes</h1><button class="btn primary" onclick="A.editClient()">+ Cliente</button></div>
      <p class="sub">Tu cartera de clientes — sus datos quedan guardados para cotizar más rápido</p>
      <div class="grid cards">${rows||'<div class="empty">Aún no tienes clientes. Se guardan solos al cotizar, o agrégalos aquí.</div>'}</div>`;}
  function editClient(id){const c=id?DB.clients.find(x=>x.id===id):{name:'',phone:'',email:'',note:''};
    modal(`<h2>${id?'Editar':'Nuevo'} cliente</h2><div class="formgrid">
      <label class="field" style="grid-column:1/3">Nombre<input id="c-name" value="${esc(c.name)}"></label>
      <label class="field">Teléfono<input id="c-phone" value="${esc(c.phone)}"></label>
      <label class="field">Email<input id="c-email" value="${esc(c.email)}"></label>
      <label class="field" style="grid-column:1/3">Notas<input id="c-note" value="${esc(c.note||'')}" placeholder="preferencias, dirección, etc."></label></div>
      <div class="row between" style="margin-top:14px"><div>${id?`<button class="linkish" onclick="A.delClient('${id}')">Eliminar</button>`:''}</div>
      <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.saveClient('${id||''}')">Guardar</button></div></div>`);}
  function saveClient(id){const o={name:$('#c-name').value.trim()||'Cliente',phone:$('#c-phone').value.trim(),email:$('#c-email').value.trim(),note:$('#c-note').value.trim()};
    if(id){Object.assign(DB.clients.find(x=>x.id===id),o);}else{o.id=window.uid();o.createdAt=Date.now();DB.clients.push(o);}save();closeModal();render();toast('Cliente guardado');}
  function delClient(id){DB.clients=DB.clients.filter(x=>x.id!==id);save();closeModal();render();toast('Cliente eliminado');}
  function upsertClient(cl){ // por nombre+teléfono
    let f=DB.clients.find(x=>x.name.toLowerCase()===(cl.name||'').toLowerCase()&&(x.phone||'')===(cl.phone||''));
    if(!f && cl.name){f={id:window.uid(),createdAt:Date.now(),name:cl.name,phone:cl.phone||'',email:cl.email||'',note:''};DB.clients.push(f);}
    else if(f){f.phone=cl.phone||f.phone;f.email=cl.email||f.email;}
    return f?f.id:null;}
  function quoteForClient(id){const cl=DB.clients.find(x=>x.id===id);go('cotizaciones');setTimeout(()=>{editQuote();A._quote.clientId=id;A._quote.client={name:cl.name,phone:cl.phone,email:cl.email};renderQuoteModal();},30);}

  /* ---------- COTIZACIONES ---------- */
  function vCotiz(){const list=DB.quotes.map(q=>{const tot=q.items.reduce((a,i)=>a+(+i.qty||0)*(+i.unitPrice||0),0)*(q.ivaIncluded?(1+DB.params.iva):1);
      return `<div class="card"><div class="row between"><h3>N° ${esc(q.number)} · ${esc(q.client.name||'Cliente')}</h3><span class="muted">${esc(q.date)}</span></div>
        <div class="muted">${q.items.length} ítem(s)</div><div class="row between" style="margin-top:6px"><b>${fmt(tot)}</b>
        <span class="row"><button class="btn ghost sm" onclick="A.editQuote('${q.id}')">Editar</button><button class="btn coral sm" onclick="A.pdfQuote('${q.id}')">PDF</button>${q.estado==='aprobada'?'<span class="pill ok">en producción</span>':`<button class="btn primary sm" onclick="A.approveQuote('${q.id}')">✓ Aprobar</button>`}</span></div></div>`;}).join('');
    return `<div class="row between"><h1 class="page">Cotizaciones</h1><button class="btn primary" onclick="A.editQuote()">+ Nueva</button></div>
      <p class="sub">Arma una cotización (productos o ítems libres) y expórtala en PDF</p><div class="grid cards">${list||'<div class="empty">Sin cotizaciones</div>'}</div>`;}
  function editQuote(id){A._quote=id?JSON.parse(JSON.stringify(DB.quotes.find(x=>x.id===id))):{number:String(DB.seq.quote).padStart(4,'0'),date:new Date().toLocaleDateString('es-CL'),clientId:null,client:{name:'',phone:'',email:''},items:[],note:'',ivaIncluded:DB.params.ivaEnQuote,validDays:DB.params.quoteValidDays};renderQuoteModal();}
  function renderQuoteModal(){const q=A._quote;
    const clientOpts=`<option value="">— nuevo / escribir —</option>`+DB.clients.map(c=>`<option value="${c.id}" ${q.clientId===c.id?'selected':''}>${esc(c.name)}${c.phone?' · '+esc(c.phone):''}</option>`).join('');
    const prodOpts='<option value="">+ producto…</option>'+DB.products.map(p=>`<option value="${p.id}">${esc(p.name)} (${fmt(calc.priceOf(p))})</option>`).join('');
    const rows=q.items.map((it,i)=>`<div class="row" style="margin:4px 0"><input value="${esc(it.name)}" style="flex:1" onchange="A.qItem(${i},'name',this.value)" placeholder="descripción"><input type="number" min="1" value="${it.qty}" style="width:56px" onchange="A.qItem(${i},'qty',this.value)"><input type="number" value="${it.unitPrice}" style="width:90px" onchange="A.qItem(${i},'unitPrice',this.value)"><button class="linkish" onclick="A.qEditItem(${i})" title="editar">✎</button><button class="linkish" onclick="A.qDel(${i})">x</button></div>`).join('');
    const net=q.items.reduce((a,i)=>a+(+i.qty||0)*(+i.unitPrice||0),0),tot=net*(q.ivaIncluded?(1+DB.params.iva):1);
    modal(`<h2>${q.id?'Editar':'Nueva'} cotización</h2>
      <label class="field">Cliente guardado<select id="q-sel" onchange="A.qPickClient(this.value)">${clientOpts}</select></label>
      <div class="formgrid" style="margin-top:8px"><label class="field">Nombre<input id="q-name" value="${esc(q.client.name)}" oninput="A._quote.client.name=this.value"></label>
        <label class="field">Teléfono<input id="q-phone" value="${esc(q.client.phone)}" oninput="A._quote.client.phone=this.value"></label>
        <label class="field" style="grid-column:1/3">Email<input id="q-email" value="${esc(q.client.email)}" oninput="A._quote.client.email=this.value"></label></div>
      <div class="sectiontitle">Ítems <span class="muted">(descripción · cant · precio)</span></div>${rows||'<div class="muted">Agrega ítems</div>'}
      <div class="row" style="margin-top:8px"><select id="q-add" onchange="A.qAdd(this.value)" style="flex:1">${prodOpts}</select><button class="btn ghost sm" onclick="A.qAddFree()">+ Ítem libre</button><button class="btn ghost sm" onclick="A.qCalcOpen()">+ Calcular pieza</button></div>
      <label class="field" style="margin-top:12px">Nota<input id="q-note" value="${esc(q.note)}" oninput="A._quote.note=this.value"></label>
      <label class="row" style="margin-top:10px;gap:8px"><input type="checkbox" style="width:auto" ${q.ivaIncluded?'checked':''} onchange="A._quote.ivaIncluded=this.checked;A.qRefresh()"> Incluir IVA 19%</label>
      <div class="row between" style="margin-top:10px"><span>Total</span><b id="q-tot" style="font-size:20px">${fmt(tot)}</b></div>
      <div class="muted" id="q-prod" style="margin-top:4px">${(()=>{const ph=calc.printHoursOfQuote(q.items);return ph>0?'⏱ Producción ≈ '+calc.hm(ph)+' de impresión · '+calc.productionDays(ph)+' día(s) hábiles':'';})()}</div>
      <div class="row between" style="margin-top:12px"><div>${q.id?`<button class="linkish" onclick="A.delQuote('${q.id}')">Eliminar</button>`:''}</div>
        <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.saveQuote(false)">Guardar</button><button class="btn coral" onclick="A.saveQuote(true)">Guardar + PDF</button></div></div>`);}
  function qPickClient(id){const c=DB.clients.find(x=>x.id===id);A._quote.clientId=id||null;if(c){A._quote.client={name:c.name,phone:c.phone,email:c.email};}renderQuoteModal();}
  function qRefresh(){const q=A._quote,net=q.items.reduce((a,i)=>a+(+i.qty||0)*(+i.unitPrice||0),0),tot=net*(q.ivaIncluded?(1+DB.params.iva):1);const e=$('#q-tot');if(e)e.textContent=fmt(tot);const pe=$('#q-prod');if(pe){const ph=calc.printHoursOfQuote(q.items);pe.textContent=ph>0?('⏱ Producción ≈ '+calc.hm(ph)+' de impresión · '+calc.productionDays(ph)+' día(s) hábiles'):'';}}
  function qAdd(pid){if(!pid)return;const p=DB.products.find(x=>x.id===pid);A._quote.items.push({name:p.name,qty:1,unitPrice:calc.priceOf(p),productId:p.id});renderQuoteModal();}
  function qAddFree(){A._quote.items.push({name:'',qty:1,unitPrice:0,productId:null});renderQuoteModal();}
  function qItem(i,k,v){A._quote.items[i][k]=(k==='name')?v:num(v);qRefresh();}
  function qDel(i){A._quote.items.splice(i,1);renderQuoteModal();}
  function saveQuote(andPdf){const q=A._quote;q.clientId=upsertClient(q.client)||q.clientId;
    if(q.id){Object.assign(DB.quotes.find(x=>x.id===q.id),q);}else{q.id=window.uid();DB.quotes.unshift(q);DB.seq.quote++;}
    save();const saved=DB.quotes.find(x=>x.id===q.id);closeModal();render();toast('Cotización guardada');
    if(andPdf){try{window.genQuotePDF(saved);}catch(e){toast('Error al generar PDF');}}}
  function delQuote(id){DB.quotes=DB.quotes.filter(x=>x.id!==id);save();closeModal();render();toast('Cotización eliminada');}
  function pdfQuote(id){try{window.genQuotePDF(DB.quotes.find(x=>x.id===id));}catch(e){toast('Error al generar PDF');}}

  function qEditItem(i){ const it=A._quote.items[i]; if(it.calc){ qCalcEdit(i); return; }
    modal(`<h2>Editar ítem</h2>
      <label class="field">Descripción<input id="ei-name" value="${esc(it.name)}"></label>
      <div class="formgrid" style="margin-top:8px"><label class="field">Cantidad<input id="ei-qty" type="number" min="1" value="${it.qty}"></label><label class="field">Precio unitario<input id="ei-price" type="number" value="${it.unitPrice}"></label></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" onclick="A.qToCalc(${i})">Calcular precio con detalle →</button></div>
      <div class="row between" style="margin-top:14px"><button class="linkish" onclick="A.qDel(${i});A.renderQuoteModal()">Eliminar</button><div class="row"><button class="btn ghost" onclick="A.renderQuoteModal()">Volver</button><button class="btn primary" onclick="A.qSaveItem(${i})">Guardar</button></div></div>`);
  }
  function qSaveItem(i){ const it=A._quote.items[i]; it.name=$('#ei-name').value.trim()||it.name; it.qty=num($('#ei-qty').value)||1; it.unitPrice=num($('#ei-price').value); renderQuoteModal(); }
  function qToCalc(i){ const it=A._quote.items[i]; A._calc={name:it.name||'',segments:[{filamentId:null,grams:''}],timeH:0,postMin:5,qty:it.qty||1,unitsPerPlate:1,empaque:null,priceOverride:(it.unitPrice||null),_editIdx:i}; renderCalcModal(); }
  function qCalcOpen(){ A._calc={name:'',segments:[{filamentId:null,grams:''}],timeH:0,postMin:5,qty:1,unitsPerPlate:1,empaque:null,priceOverride:null,_editIdx:-1}; renderCalcModal(); }
  function qCalcEdit(i){ const it=A._quote.items[i]; A._calc=JSON.parse(JSON.stringify(it.calc)); A._calc._editIdx=i; if(A._calc.qty==null)A._calc.qty=it.qty||1; renderCalcModal(); }
  function renderCalcModal(){
    const t=A._calc;
    const filSel=(sel)=>`<option value="">PLA por defecto</option>`+DB.filaments.map(f=>`<option value="${f.id}" ${sel===f.id?'selected':''}>${esc(f.color)} · ${esc(f.marca)} (${fmt(f.rollPrice/f.rollGrams*1000)}/kg)</option>`).join('');
    const segs=t.segments.map((s,i)=>`<div class="row" style="gap:6px;margin:3px 0"><select onchange="A.qcSeg(${i},'filamentId',this.value)" style="flex:1">${filSel(s.filamentId)}</select><input type="number" placeholder="g" value="${s.grams}" style="width:74px" oninput="A.qcSeg(${i},'grams',this.value)">${t.segments.length>1?`<button class="linkish" onclick="A.qcSegDel(${i})">x</button>`:''}</div>`).join('');
    const c=calc.costCustom(t), qty=+t.qty||1, sug=calc.round500(calc.suggestPrice(c.total)), eff=(t.priceOverride!=null&&t.priceOverride!=='')?+t.priceOverride:sug, marg=eff>0?(eff-c.total)/eff:0;
    modal(`<h2>${t._editIdx>=0?'Editar':'Calcular'} pieza</h2>
      <label class="field">Descripción<input id="qc-name" value="${esc(t.name)}" oninput="A._calc.name=this.value" placeholder="ej: Llavero personalizado"></label>
      <div class="sectiontitle">Filamento por color <span class="muted">(gramos TOTALES de la placa, como en el slicer)</span></div>${segs}
      <button class="btn ghost sm" onclick="A.qcSegAdd()">+ Agregar color/filamento</button>
      <div class="formgrid" style="margin-top:10px">
        <label class="field">Tiempo de impresión (de la placa)<div class="row" style="gap:6px"><input id="qc-th" type="number" min="0" value="${Math.floor((+t.timeH||0)+1e-9)}" oninput="A.qcTime()" style="width:60px"><span class="muted">h</span><input id="qc-tm" type="number" min="0" max="59" value="${Math.round(((+t.timeH||0)%1)*60)}" oninput="A.qcTime()" style="width:60px"><span class="muted">min</span></div></label>
        <label class="field">Postproducción (min/unidad)<input type="number" value="${t.postMin}" oninput="A._calc.postMin=this.value;A.qcRefresh()"></label>
        <label class="field">Unidades por placa<input type="number" min="1" value="${t.unitsPerPlate||1}" oninput="A._calc.unitsPerPlate=this.value;A.qcRefresh()"></label>
        <label class="field">Cantidad total<input type="number" min="1" value="${qty}" oninput="A._calc.qty=this.value;A.qcRefresh()"></label>
      </div>
      <label class="row" style="gap:8px;margin-top:6px"><input type="checkbox" style="width:auto" ${(t.empaque==null)?'checked':''} onchange="A._calc.empaque=this.checked?null:0;A.qcRefresh()"> Incluir empaque (${fmt(DB.params.pack)})</label>
      <div class="card" style="margin:12px 0">
        <div class="muted" style="margin-bottom:4px">Detalle por pieza:</div>
        <div class="row between"><span>Filamento</span><b id="qd-fil">${fmt(c.plastico)}</b></div>
        <div class="row between"><span>Electricidad</span><b id="qd-luz">${fmt(c.electricidad)}</b></div>
        <div class="row between"><span>Máquina (amortización)</span><b id="qd-maq">${fmt(c.amortizacion)}</b></div>
        <div class="row between"><span>Mano de obra</span><b id="qd-op">${fmt(c.operario)}</b></div>
        <div class="row between"><span>Empaque</span><b id="qd-emp">${fmt(c.empaque)}</b></div>
        <div class="row between"><span>Margen por fallas</span><b id="qd-fal">${fmt(c.fallos)}</b></div>
        <div class="row between" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Costo unitario</span><b id="qd-cost">${fmt(c.total)}</b></div>
        <div class="row between"><span>Precio sugerido (unidad)</span><b id="qd-sug" style="color:var(--coral)">${fmt(sug)}</b></div>
        <div class="row between" style="align-items:center;margin-top:2px"><span>Precio de venta (unidad)</span><input id="qd-price" type="number" value="${eff}" oninput="A.qcPrice(this.value)" style="width:110px;text-align:right"></div>
        <div class="row between"><span>Margen</span><b id="qd-marg" style="color:${marg>=0.4?'var(--ok)':marg>=0.2?'var(--terra)':'var(--coral)'}">${pct(marg)} · ${fmt(eff-c.total)}/u</b></div>
        <div class="row between" style="font-size:17px"><span>Total (× <span id="qd-q">${qty}</span>)</span><b id="qd-tot" style="color:var(--coral)">${fmt(eff*qty)}</b></div>
        <div class="muted" id="qd-placas">Placas necesarias: ${Math.ceil(qty/Math.max(1,+t.unitsPerPlate||1))} · ${calc.hm((+t.timeH||0)*Math.ceil(qty/Math.max(1,+t.unitsPerPlate||1)))} de impresión total</div>
      </div>
      <div class="row between"><button class="btn ghost" onclick="A.renderQuoteModal()">Volver</button><button class="btn coral" onclick="A.qCalcAdd()">${t._editIdx>=0?'Guardar cambios':'Agregar a la cotización'}</button></div>`);
  }
  function qcSeg(i,f,v){ A._calc.segments[i][f]=(f==='filamentId')?(v||null):v; qcRefresh(); }
  function qcSegAdd(){ A._calc.segments.push({filamentId:null,grams:''}); renderCalcModal(); }
  function qcSegDel(i){ A._calc.segments.splice(i,1); renderCalcModal(); }
  function qcTime(){ A._calc.timeH=calc.toHours(document.getElementById('qc-th').value,document.getElementById('qc-tm').value); qcRefresh(); }
  function qcRefresh(){ const t=A._calc,c=calc.costCustom(t),qty=+t.qty||1,sug=calc.round500(calc.suggestPrice(c.total)),eff=(t.priceOverride!=null&&t.priceOverride!=='')?+t.priceOverride:sug,marg=eff>0?(eff-c.total)/eff:0; const s=(i,v)=>{const e=document.getElementById(i);if(e)e.innerHTML=v;};
    s('qd-fil',fmt(c.plastico));s('qd-luz',fmt(c.electricidad));s('qd-maq',fmt(c.amortizacion));s('qd-op',fmt(c.operario));s('qd-emp',fmt(c.empaque));s('qd-fal',fmt(c.fallos));s('qd-cost',fmt(c.total));s('qd-sug',fmt(sug));s('qd-q',qty);s('qd-tot',fmt(eff*qty));
    const mg=document.getElementById('qd-marg'); if(mg){mg.style.color=marg>=0.4?'var(--ok)':marg>=0.2?'var(--terra)':'var(--coral)'; mg.innerHTML=pct(marg)+' · '+fmt(eff-c.total)+'/u';}
    const pe=document.getElementById('qd-price'); if(pe&&(t.priceOverride==null||t.priceOverride==='')) pe.value=sug;
    const N=Math.max(1,+t.unitsPerPlate||1),pl=Math.ceil(qty/N); s('qd-placas','Placas necesarias: '+pl+' · '+calc.hm((+t.timeH||0)*pl)+' de impresión total'); }
  function qcPrice(v){ A._calc.priceOverride=(v===''?null:+v); qcRefresh(); }
  function qCalcAdd(){ const t=A._calc; const sug=calc.round500(calc.suggestPrice(calc.costCustom(t).total)); const unit=(t.priceOverride!=null&&t.priceOverride!=='')?+t.priceOverride:sug; const qty=+t.qty||1;
    const spec={name:t.name,segments:JSON.parse(JSON.stringify(t.segments)),timeH:t.timeH,postMin:t.postMin,qty:qty,unitsPerPlate:t.unitsPerPlate||1,empaque:t.empaque,priceOverride:t.priceOverride};
    const item={name:t.name||'Pieza personalizada',qty:qty,unitPrice:unit,productId:null,calc:spec};
    if(t._editIdx>=0){ A._quote.items[t._editIdx]=item; } else { A._quote.items.push(item); }
    renderQuoteModal(); }
  /* ---------- PLANIFICACIÓN ---------- */
  function vPlan(){
    const cap=DB.params.dayCapacityH, weeks=[...new Set(DB.schedule.map(d=>d.week))];
    let html=`<div class="row between"><h1 class="page">Planificación</h1><button class="btn ghost sm" onclick="A.planSync()">↻ Sincronizar plan</button></div><p class="sub">Toca «Ver detalle» en cada día para ver qué imprimir y qué hacer.</p>`;
    html+=`<div class="card" style="margin-bottom:14px"><b>Rutina del día (8:00–21:00)</b><div class="muted" style="margin-top:6px">① 8:00 inicia la impresión más larga (debe partir antes de las 10:00 para terminar a tiempo). ② ~13:00 una impresión media. ③ ~17:00 un batch corto que cierre antes de las 21:00. ④ Antes de cerrar, retira las piezas y deja la placa lista para mañana.</div></div>`;
    const pend=(DB.orders||[]).filter(o=>o.estado!=='listo'); if(pend.length) html+=`<div class="card" style="border-left:4px solid var(--coral);margin-bottom:14px"><b>Tienes ${pend.length} pedido(s) en cola</b><div class="muted" style="margin-top:4px">Tienen prioridad sobre la reposición de stock. <button class="linkish" onclick="A.go('pedidos')">Ver pedidos →</button></div></div>`;
    weeks.forEach(w=>{
      html+=`<div class="sectiontitle">${esc(w)}</div><div class="grid cards">`;
      DB.schedule.filter(d=>d.week===w).forEach(d=>{
        const used=d.jobs.reduce((a,j)=>a+(+j.hours||0),0), done=d.jobs.filter(j=>j.status==='listo').length;
        html+=`<div class="card"><div class="row between"><h3>${esc(d.day)}</h3><span class="tag">${used.toFixed(1)} h</span></div>
          ${d.jobs.map(j=>`<div class="row between" style="padding:3px 0"><span>${esc(j.name)} ${j.hours?`<span class="muted">(${j.hours}h)</span>`:''}</span><span class="pill ${j.status==='listo'?'ok':j.status==='imprimiendo'?'warn':'bad'}">${j.status}</span></div>`).join('')}
          <div class="capacity ${used>cap?'over':''}"><i style="width:${Math.min(100,used/cap*100)}%"></i></div>
          ${d.prep?`<div class="muted" style="margin-top:8px">📋 ${esc(d.prep)}</div>`:''}
          <div class="row between" style="margin-top:10px"><span class="muted">${done}/${d.jobs.length} listos</span><button class="btn primary sm" onclick="A.dayDetail('${d.id}')">Ver detalle →</button></div></div>`;
      });
      html+=`</div>`;
    });
    return html;
  }
  function planSync(){ if(!window.AYUNKA_PLAN){toast("No hay plan para sincronizar");return;} if(confirm("¿Traer la planificación gestionada por Claude? Reemplaza el cronograma actual (no afecta productos, clientes ni filamentos).")){ DB.schedule=JSON.parse(JSON.stringify(window.AYUNKA_PLAN)); save(); render(); toast("Planificación sincronizada"); } }
  function dayDetail(did){ A._day=JSON.parse(JSON.stringify(DB.schedule.find(x=>x.id===did))); renderDayModal(); }
  function renderDayModal(){
    const d=A._day, cap=DB.params.dayCapacityH;
    const used=d.jobs.reduce((a,j)=>a+(+j.hours||0),0);
    const prodOpts=p=>'<option value="">— sin vincular —</option>'+DB.products.map(x=>`<option value="${x.id}" ${p===x.id?'selected':''}>${esc(x.name)}</option>`).join('');
    const jobs=d.jobs.map((j,i)=>{
      const pr=j.productId?DB.products.find(x=>x.id===j.productId):null;
      const fil=pr&&pr.filamentId?DB.filaments.find(f=>f.id===pr.filamentId):null;
      const files=pr&&pr.files&&pr.files.length?pr.files.map(f=>`<button class="btn ghost sm" onclick="${f.url?`A.viewUrl('${f.url}','${esc(f.name)}')`:`A.viewFile('${f.id}','${esc(f.name)}')`}">📄 Ver ${esc(f.name)}</button>`).join(' '):'';
      return `<div class="card" style="margin-bottom:10px">
        <div class="row" style="gap:8px"><input value="${esc(j.name)}" style="flex:1" oninput="A._day.jobs[${i}].name=this.value"><input type="number" step="0.1" value="${j.hours}" style="width:64px" oninput="A._day.jobs[${i}].hours=+this.value;A.dayHours()" title="horas"><button class="pill ${j.status==='listo'?'ok':j.status==='imprimiendo'?'warn':'bad'}" style="border:none;cursor:pointer" onclick="A.dayJobStatus(${i})">${j.status}</button></div>
        <textarea placeholder="¿Qué hacer? color, unidades, ajustes de laminado…" style="margin-top:8px;min-height:46px" oninput="A._day.jobs[${i}].desc=this.value">${esc(j.desc||'')}</textarea>
        <label class="field" style="margin-top:4px">Vincular producto (para abrir su STL)<select onchange="A.dayJobLink(${i},this.value)">${prodOpts(j.productId)}</select></label>
        ${pr?`<div class="muted" style="margin-top:6px">${fil?`<span class="swatch" style="background:${fil.hex}"></span>${esc(fil.color)} · ${esc(fil.marca)} · `:''}${esc(pr.material)} · ${pr.grams}g · ${pr.colors} color(es)</div>${files?`<div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">${files}</div>`:'<div class="muted" style="margin-top:6px">Este producto aún no tiene STL adjunto (agrégalo en Productos).</div>'}`:''}
        <div class="row" style="margin-top:6px"><button class="linkish" onclick="A.dayJobDel(${i})">quitar trabajo</button></div></div>`;
    }).join('');
    modal(`<h2>${esc(d.week)} · ${esc(d.day)}</h2>
      <div class="muted" style="margin-bottom:10px">Carga del día: <b id="day-h">${used.toFixed(1)}</b> h de ${cap} h disponibles. Recuerda: la impresión más larga parte temprano.</div>
      ${jobs||'<div class="muted">Sin trabajos este día</div>'}
      <button class="btn ghost sm" onclick="A.dayJobAdd()">+ Agregar trabajo</button>
      <label class="field" style="margin-top:12px">Preparación / tareas del día (fotos, laminar, contenido)<input value="${esc(d.prep||'')}" oninput="A._day.prep=this.value"></label>
      <div class="row between" style="margin-top:14px"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.daySave()">Guardar</button></div>`);
  }
  function dayHours(){const e=document.getElementById('day-h');if(e)e.textContent=A._day.jobs.reduce((a,j)=>a+(+j.hours||0),0).toFixed(1);}
  function dayJobStatus(i){const c={'pendiente':'imprimiendo','imprimiendo':'listo','listo':'pendiente'};A._day.jobs[i].status=c[A._day.jobs[i].status];renderDayModal();}
  function dayJobLink(i,pid){A._day.jobs[i].productId=pid||null;renderDayModal();}
  function dayJobAdd(){A._day.jobs.push({id:window.uid(),name:'Nuevo trabajo',hours:1,status:'pendiente',desc:'',productId:null});renderDayModal();}
  function dayJobDel(i){A._day.jobs.splice(i,1);renderDayModal();}
  function dayOpenFile(fid){IDB.openFile(fid).then(ok=>{if(!ok)toast('Archivo no encontrado');});}
  function daySave(){const idx=DB.schedule.findIndex(x=>x.id===A._day.id);DB.schedule[idx]=A._day;save();closeModal();render();toast('Día actualizado');}

  /* ---------- PRODUCCIÓN (cola única) ---------- */
  function orderHours(o){ if(o.items&&o.items.length) return o.items.reduce((a,it)=>a+(+it.hoursEach||0)*(+it.qty||0),0);
    const hEach=(o.hoursEach!=null&&o.hoursEach!=='')?+o.hoursEach:(o.productId?((DB.products.find(p=>p.id===o.productId)||{}).timeH||0):0); return hEach*(+o.qty||0); }
  function orderTitle(o){ return o.tipo==='stock'?'Reposición de stock':(o.cliente||'Cliente'); }
  function orderDesc(o){ if(o.items&&o.items.length) return o.items.map(it=>esc(it.name)+' ×'+it.qty).join(', '); return esc(o.productName||(o.productId?((DB.products.find(p=>p.id===o.productId)||{}).name||''):'')||'Producto')+' × '+o.qty; }
  function orderCard(o,cap,today){
    const hours=orderHours(o), days=Math.max(1,Math.ceil(hours/cap));
    let dueTxt='sin fecha', startTxt='', risk='ok', dleft=null;
    if(o.fecha){ const due=new Date(o.fecha+'T00:00:00'); dleft=Math.round((due-today)/86400000); const start=new Date(due); start.setDate(start.getDate()-days);
      dueTxt=due.toLocaleDateString('es-CL'); startTxt='Empezar antes del '+start.toLocaleDateString('es-CL');
      risk=(o.estado!=='listo'&&start<today)?'bad':((o.estado!=='listo'&&dleft<=3)?'warn':'ok'); }
    const col=o.tipo==='stock'?'var(--mostaza)':(risk==='bad'?'var(--coral)':risk==='warn'?'var(--terra)':'var(--niebla)');
    return `<div class="card" style="border-left:4px solid ${col}"><div class="row between"><h3>${esc(orderTitle(o))}${o.quoteId?' <span class="tag">cotización</span>':''}</h3><span class="muted">${dueTxt}</span></div>
      <div class="muted">${orderDesc(o)}</div>
      <div class="row between" style="margin-top:6px"><span class="tag">${calc.hm(hours)} · ${days} día(s)</span><button class="pill ${o.estado==='listo'?'ok':o.estado==='en producción'?'warn':'bad'}" style="border:none;cursor:pointer" onclick="A.orderCycle('${o.id}')">${esc(o.estado||'pendiente')}</button></div>
      ${o.fecha?`<div class="muted" style="margin-top:6px;color:${risk==='bad'?'var(--coral)':'var(--pizarra)'}">${risk==='bad'?'⚠ ':''}${startTxt}${dleft!=null?` · faltan ${dleft} día(s)`:''}</div>`:(o.tipo!=='stock'?'<div class="muted" style="margin-top:6px;color:var(--terra)">⚠ Falta la fecha de entrega</div>':'')}
      <div class="row" style="margin-top:8px"><button class="btn ghost sm" onclick="A.editOrder('${o.id}')">Editar</button></div></div>`;
  }
  function vPedidos(){
    const cap=DB.params.dayCapacityH; const today=new Date(); today.setHours(0,0,0,0);
    const all=DB.orders||[];
    const peds=all.filter(o=>o.tipo!=='stock').sort((x,y)=>(x.fecha||'9999').localeCompare(y.fecha||'9999'));
    const stock=all.filter(o=>o.tipo==='stock');
    const committed=all.filter(o=>o.estado!=='listo').reduce((a,o)=>a+orderHours(o),0);
    return `<div class="row between"><h1 class="page">Producción</h1><div class="row"><button class="btn ghost" onclick="A.editOrder(null,'stock')">+ Stock</button><button class="btn primary" onclick="A.editOrder()">+ Pedido</button></div></div>
      <p class="sub">Cola única de producción. Los pedidos de clientes tienen prioridad sobre la reposición de stock.</p>
      <div class="card"><div class="row between"><span>Horas comprometidas (pendientes)</span><b>${calc.hm(committed)}</b></div><div class="row between"><span>≈ días de producción (${cap} h/día)</span><b>${Math.ceil(committed/cap)}</b></div></div>
      <div class="sectiontitle">Pedidos de clientes (prioridad)</div>
      <div class="grid cards">${peds.length?peds.map(o=>orderCard(o,cap,today)).join(''):'<div class="empty">Sin pedidos. Se crean al aprobar una cotización o con "+ Pedido".</div>'}</div>
      <div class="sectiontitle">Reposición de stock</div>
      <div class="grid cards">${stock.length?stock.map(o=>orderCard(o,cap,today)).join(''):'<div class="empty">Sin tareas de stock. Agrega con "+ Stock".</div>'}</div>`;
  }
  function editOrder(id,tipo){
    const o=id?JSON.parse(JSON.stringify(DB.orders.find(x=>x.id===id))):{tipo:tipo||'pedido',cliente:'',productId:'',productName:'',qty:1,hoursEach:'',fecha:'',estado:'pendiente',items:null};
    const hasItems=o.items&&o.items.length;
    const prodOpts=`<option value="">— producto libre —</option>`+DB.products.map(p=>`<option value="${p.id}" ${o.productId===p.id?'selected':''}>${esc(p.name)} (${calc.hm(p.timeH)})</option>`).join('');
    modal(`<h2>${id?'Editar':'Nuevo'} ${o.tipo==='stock'?'stock':'pedido'}</h2>
      <input id="o-tipo" type="hidden" value="${o.tipo||'pedido'}">
      ${o.tipo!=='stock'?`<label class="field">Cliente<input id="o-cli" list="o-clilist" value="${esc(o.cliente)}"><datalist id="o-clilist">${DB.clients.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist></label>`:'<input id="o-cli" type="hidden" value="">'}
      ${hasItems?`<div class="card" style="margin-top:8px"><div class="muted">Ítems (de la cotización):</div>${o.items.map(it=>`<div class="row between"><span>${esc(it.name)} ×${it.qty}</span><span class="muted">${calc.hm((+it.hoursEach||0)*it.qty)}</span></div>`).join('')}</div><input id="o-prod" type="hidden" value=""><input id="o-pname" type="hidden" value=""><input id="o-qty" type="hidden" value="1"><input id="o-h" type="hidden" value="">`:`<label class="field" style="margin-top:8px">Producto del catálogo<select id="o-prod" onchange="A.orderProd(this.value)">${prodOpts}</select></label>
      <label class="field" style="margin-top:8px">…o nombre libre<input id="o-pname" value="${esc(o.productName)}" placeholder="ej: Llavero personalizado"></label>
      <div class="formgrid" style="margin-top:8px"><label class="field">Cantidad<input id="o-qty" type="number" min="1" value="${o.qty}"></label><label class="field">Horas por unidad<input id="o-h" type="number" step="0.1" value="${o.hoursEach}" placeholder="auto"></label></div>`}
      <div class="formgrid" style="margin-top:8px">
        ${o.tipo!=='stock'?`<label class="field">Fecha de entrega<input id="o-fecha" type="date" value="${o.fecha||''}"></label>`:'<input id="o-fecha" type="hidden" value="">'}
        <label class="field">Estado<select id="o-estado"><option ${(o.estado||'pendiente')==='pendiente'?'selected':''}>pendiente</option><option ${o.estado==='en producción'?'selected':''}>en producción</option><option ${o.estado==='listo'?'selected':''}>listo</option></select></label>
      </div>
      <div class="row between" style="margin-top:14px"><div>${id?`<button class="linkish" onclick="A.delOrder('${id}')">Eliminar</button>`:''}</div>
        <div class="row"><button class="btn ghost" onclick="A.closeModal()">Cancelar</button><button class="btn primary" onclick="A.saveOrder('${id||''}')">Guardar</button></div></div>`);
  }
  function orderProd(pid){ const p=DB.products.find(x=>x.id===pid); if(p){ const h=document.getElementById('o-h'); if(h&&!h.value)h.value=p.timeH; const pn=document.getElementById('o-pname'); if(pn&&!pn.value)pn.value=p.name; } }
  function saveOrder(id){ const g=i=>{const e=document.getElementById(i);return e?e.value:'';}; const ex=id?DB.orders.find(x=>x.id===id):null;
    const o={tipo:g('o-tipo')||'pedido',cliente:g('o-cli').trim(),productId:g('o-prod')||'',productName:g('o-pname').trim(),qty:num(g('o-qty'))||1,hoursEach:g('o-h')===''?'':num(g('o-h')),fecha:g('o-fecha'),estado:g('o-estado')};
    if(o.tipo!=='stock'&&!o.cliente)o.cliente='Cliente';
    if(ex){ o.items=ex.items; o.quoteId=ex.quoteId; Object.assign(ex,o); } else { o.id=window.uid(); o.createdAt=Date.now(); DB.orders.push(o); }
    save();closeModal();render();toast('Guardado'); }
  function delOrder(id){DB.orders=DB.orders.filter(x=>x.id!==id);save();closeModal();render();toast('Eliminado');}
  function orderCycle(id){const c={'pendiente':'en producción','en producción':'listo','listo':'pendiente'};const o=DB.orders.find(x=>x.id===id);o.estado=c[o.estado||'pendiente'];save();render();}
  function hoursForItem(it){ if(it.productId){const p=DB.products.find(x=>x.id===it.productId);return p?+p.timeH||0:0;} if(it.calc){return (+it.calc.timeH||0)/Math.max(1,+it.calc.unitsPerPlate||1);} return 0; }
  function approveQuote(id){ const q=DB.quotes.find(x=>x.id===id); if(!q) return;
    if((DB.orders||[]).some(o=>o.quoteId===id)){ q.estado='aprobada'; save(); render(); toast('Esta cotización ya está en producción'); return; }
    const items=q.items.map(it=>({name:it.name,qty:+it.qty||1,hoursEach:hoursForItem(it)}));
    DB.orders.push({id:window.uid(),tipo:'pedido',cliente:q.client.name||'Cliente',quoteId:id,items:items,fecha:'',estado:'pendiente',createdAt:Date.now()});
    q.estado='aprobada'; save(); toast('Cotización aprobada → cola de producción'); go('pedidos'); }

  /* ---------- AJUSTES ---------- */
  function vAjustes(){const p=DB.params,b=p.business;const f=(id,lbl,val,step)=>`<label class="field">${lbl}<input id="${id}" type="number" ${step?`step="${step}"`:''} value="${val}"></label>`;const bks=(window.listBackups?window.listBackups():[]).slice().reverse();
    return `<h1 class="page">Ajustes</h1><p class="sub">Parámetros de costeo y datos del negocio</p>
      <div class="card"><div class="sectiontitle" style="margin-top:0">Costos</div><div class="formgrid">
        ${f('s-pla','PLA por defecto (CLP/kg)',p.plaPrice)}${f('s-petg','PETG por defecto (CLP/kg)',p.petgPrice)}
        ${f('s-kwh','Tarifa luz (CLP/kWh)',p.kwh)}${f('s-pow','Consumo impresora (kW)',p.powerKw,'0.01')}
        ${f('s-pcost','Costo impresora (CLP)',p.printerCost)}${f('s-amyears','Amortización (años)',p.amortYears,'0.1')}
        ${f('s-days','Días activa al año',p.daysYear)}${f('s-hours','Horas activa por día',p.hoursDay,'0.5')}
        ${f('s-labor','Valor hora operario (CLP/h)',p.laborH)}${f('s-prep','Prep. por pieza (min)',p.prepMin)}
        ${f('s-pack','Empaque por pieza (CLP)',p.pack)}${f('s-fail','Tasa de fallos (0.10=10%)',p.failRate,'0.01')}
        ${f('s-markup','Multiplicador precio',p.markup,'0.1')}${f('s-cap','Horas planificación/día',p.dayCapacityH,'0.5')}
        ${f('s-abono','Abono inicial (0.50=50%)',p.abonoPct,'0.05')}</div>
      <div class="muted" style="margin-top:8px">El PLA/PETG por defecto se usa solo si un producto no tiene un filamento específico asociado.</div>
      <div class="sectiontitle">Negocio (para cotizaciones)</div><div class="formgrid">
        <label class="field" style="grid-column:1/3">Nombre<input id="s-bname" value="${esc(b.name)}"></label>
        <label class="field">Instagram<input id="s-big" value="${esc(b.ig)}"></label>
        <label class="field">Teléfono<input id="s-bphone" value="${esc(b.phone)}"></label>
        <label class="field">Email<input id="s-bemail" value="${esc(b.email)}"></label>
        <label class="field">Validez cotización (días)<input id="s-valid" type="number" value="${p.quoteValidDays}"></label></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" onclick="A.saveParams()">Guardar ajustes</button></div></div>
      <div class="card" style="margin-top:14px"><div class="sectiontitle" style="margin-top:0">Datos</div>
        <div class="row"><button class="btn ghost sm" onclick="A.expData()">Exportar (JSON)</button><button class="btn ghost sm" onclick="A.impData()">Importar</button><button class="btn ghost sm" onclick="if(confirm('¿Borrar todo y volver a los datos de ejemplo?'))A.reset()">Restablecer</button></div>
        <div class="muted" style="margin-top:8px">Tus datos viven en este dispositivo. Las fotos y STL se guardan aparte (no se incluyen en el respaldo JSON).</div></div>
      <div class="card" style="margin-top:14px"><div class="sectiontitle" style="margin-top:0">Sincronización en la nube (celular ⇄ PC)</div>
        <div class="muted" id="sync-status">Estado: ${window.Sync&&window.Sync.configured()?(window.Sync.isOn()?'conectada':'configurada'):'desactivada'}</div>
        <label class="field" style="margin-top:8px">Config de Firebase (pega el objeto firebaseConfig)<textarea id="sync-cfg" style="min-height:96px" placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'>${esc(window.__syncCfgRaw||'')}</textarea></label>
        <label class="field" style="margin-top:6px">Nombre del espacio (workspace)<input id="sync-ws" value="${esc((window.Sync&&JSON.parse(localStorage.getItem('ayunka-sync-cfg')||'{}').workspace)||'ayunka')}"></label>
        <div class="formgrid" style="margin-top:6px"><label class="field">Tu email (login de sync)<input id="sync-email" type="email" value="${esc((JSON.parse(localStorage.getItem('ayunka-sync-cfg')||'{}').email)||'')}" placeholder="tucorreo@ejemplo.com"></label>
        <label class="field">Contraseña de sync<input id="sync-pass" type="password" value="${esc((JSON.parse(localStorage.getItem('ayunka-sync-cfg')||'{}').password)||'')}" placeholder="elige una clave"></label></div>
        <div class="row" style="margin-top:10px"><button class="btn primary sm" onclick="A.syncSave()">Activar / guardar</button><button class="btn ghost sm" onclick="A.syncOff()">Desactivar</button></div>
        <div class="muted" style="margin-top:8px">Crea un proyecto gratis en Firebase, activa Firestore y Autenticación por Email/Contraseña, pega el firebaseConfig y usa el MISMO email y contraseña en el celular y el PC. Aplica las reglas de seguridad (archivo firestore.rules) para que solo tú accedas. La app debe estar publicada en https. Las fotos/STL no se sincronizan por ahora.</div></div>
      <div class="card" style="margin-top:14px"><div class="sectiontitle" style="margin-top:0">Copias de seguridad automáticas (este dispositivo)</div>
        <div class="muted">Se guarda una copia cada vez que editas o sincronizas. Puedes volver a cualquiera.</div>
        ${bks.length?bks.map(bk=>`<div class="row between" style="padding:5px 0;border-bottom:1px solid var(--line)"><span>${new Date(bk.t).toLocaleString('es-CL')} <span class="muted">· ${esc(bk.reason)} · ${bk.n} prod · ${bk.f} filam.</span></span><button class="btn ghost sm" onclick="A.restoreBk(${bk.t})">Restaurar</button></div>`).join(''):'<div class="muted" style="margin-top:6px">Aún no hay copias (se crean al usar la app).</div>'}
      </div>`;}
  function parseCfg(t){ t=(t||'').trim().replace(/^(export\s+)?const\s+\w+\s*=\s*/,'').replace(/;\s*$/,''); try{return JSON.parse(t);}catch(e){} try{return (new Function('return ('+t+')'))();}catch(e){} return null; }
  function syncSave(){ const fb=parseCfg(document.getElementById('sync-cfg').value); if(!fb||!fb.projectId){toast('No pude leer la config de Firebase (pega el objeto firebaseConfig completo)');return;} const ws=document.getElementById('sync-ws').value.trim()||'ayunka'; const em=document.getElementById('sync-email').value.trim(); const pw=document.getElementById('sync-pass').value; if(!em||!pw){toast('Ingresa tu email y una contraseña para la sincronización');return;} window.Sync.setCfg(fb,ws,em,pw); toast('Sincronización configurada · recargando'); setTimeout(()=>location.reload(),800); }
  function syncOff(){ if(confirm('¿Desactivar la sincronización en la nube?')){ window.Sync.clearCfg(); toast('Sincronización desactivada · recargando'); setTimeout(()=>location.reload(),600);} }
  function _syncNote(m){ const e=document.getElementById('sync-status'); if(e) e.textContent='Estado: '+m; }
  function restoreBk(t){ if(confirm("¿Restaurar esta copia? Tus datos actuales se reemplazan, pero quedan guardados en una copia nueva por si acaso.")) window.restoreBackup(t); }
  function saveParams(){const p=DB.params,g=id=>num($('#'+id).value);p.plaPrice=g('s-pla');p.petgPrice=g('s-petg');p.kwh=g('s-kwh');p.powerKw=g('s-pow');p.printerCost=g('s-pcost');p.amortYears=g('s-amyears')||1;p.daysYear=g('s-days')||300;p.hoursDay=g('s-hours')||8;p.laborH=g('s-labor');p.prepMin=g('s-prep');p.pack=g('s-pack');p.failRate=g('s-fail');p.markup=g('s-markup')||1;p.dayCapacityH=g('s-cap')||13;p.abonoPct=g('s-abono')||0.5;p.quoteValidDays=g('s-valid');p.business.name=$('#s-bname').value;p.business.ig=$('#s-big').value;p.business.phone=$('#s-bphone').value;p.business.email=$('#s-bemail').value;save();render();toast('Ajustes guardados');}
  function expData(){const blob=new Blob([window.exportDB()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ayunka-studio-backup.json';a.click();}
  function impData(){const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=e=>{const fr=new FileReader();fr.onload=()=>{try{window.importDB(fr.result);}catch(x){toast('Archivo inválido');}};fr.readAsText(e.target.files[0]);};i.click();}

  function dataURLtoBlob(durl){const i=durl.indexOf(',');const head=durl.slice(0,i),b=durl.slice(i+1);const mime=(head.match(/:(.*?);/)||[])[1]||'application/octet-stream';const bin=atob(b);const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);return new Blob([u],{type:mime});}
  function delProductsNoFile(){ const sinf=DB.products.filter(p=>!(p.files&&p.files.length)); if(!sinf.length){toast("Todos los productos tienen archivo");return;} if(confirm("¿Eliminar "+sinf.length+" producto(s) sin ningún STL/3MF asociado?")){ DB.products=DB.products.filter(p=>p.files&&p.files.length); save(); render(); toast(sinf.length+" producto(s) eliminados"); } }
  async function addDesigns(){
    const list=window.AYUNKA_DESIGNS||[]; let added=0,upd=0;
    for(const d of list){
      let prod=DB.products.find(p=>p.name===d.name);
      if(prod){
        if(d.files){ prod.files=d.files.map(f=>({name:f.name,url:f.url})); }
        if(d.imageUrl){ prod.imageUrl=d.imageUrl; prod.imageId=null; }
        upd++;
      } else {
        prod={id:window.uid(),name:d.name,material:d.material,grams:d.grams,timeH:d.timeH,colors:d.colors,postMin:d.postMin,packOverride:null,price:null,stock:0,filamentId:null,imageId:null,imageUrl:d.imageUrl||null,files:[]};
        if(d.files) d.files.forEach(f=>prod.files.push({name:f.name,url:f.url}));
        DB.products.push(prod); added++;
      }
    }
    save(); render(); toast('Diseños: '+added+' nuevos · '+upd+' actualizados');
  }

  /* ---------- ROUTER ---------- */
  const VIEWS={inicio:vInicio,productos:vProductos,placas:vPlacas,filamentos:vFilamentos,clientes:vClientes,cotizaciones:vCotiz,pedidos:vPedidos,plan:vPlan,ajustes:vAjustes};
  function render(){let id=(location.hash.replace('#/','')||'inicio');if(!VIEWS[id])id='inicio';renderTabs(id);$('#view').innerHTML=VIEWS[id]();hydrate();window.scrollTo(0,0);}
  window.addEventListener('hashchange',render);
  $('#menuBtn').addEventListener('click',()=>$('#tabs').classList.toggle('open'));

  window.A={go,closeModal,
    addDesigns,delProductsNoFile,editProduct,renderProductModal,prodRefresh,prodTime,prodImg,prodAddFiles,prodOpenFile,viewFile,viewUrl,prodDelFile,saveProduct,delProduct,
    editFil,saveFil,delFil,filAuto,editPlate,renderPlateModal,plateAdd,plateQty,plateDel,plateRefresh,savePlate,delPlate,printPlate,
    editClient,saveClient,delClient,quoteForClient,
    editQuote,renderQuoteModal,qPickClient,qEditItem,qSaveItem,qToCalc,qCalcOpen,qCalcEdit,renderCalcModal,qcSeg,qcSegAdd,qcSegDel,qcTime,qcRefresh,qcPrice,qCalcAdd,qAdd,qAddFree,qItem,qDel,qRefresh,saveQuote,delQuote,pdfQuote,
    planSync,editOrder,orderProd,saveOrder,delOrder,orderCycle,approveQuote,dayDetail,renderDayModal,dayHours,dayJobStatus,dayJobLink,dayJobAdd,dayJobDel,dayOpenFile,daySave,saveParams,syncSave,syncOff,_syncNote,restoreBk,expData,impData,reset:window.resetDB,_prod:null,_plate:null,_quote:null,_day:null,_calc:null};

  window.__render=render;
  try{ window.__syncCfgRaw = JSON.stringify((JSON.parse(localStorage.getItem('ayunka-sync-cfg')||'null')||{}).firebase||'',null,0); }catch(e){}
  if(window.Sync&&window.Sync.configured()){ window.Sync.init(); }
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
  render();
})();
