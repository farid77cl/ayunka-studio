/* Ayünka Studio — Nuevo producto: genera los posts con marca sin salir de la app.
   Portado de la receta original en Pillow. Regla clave: el producto NUNCA se recorta;
   los costados se rellenan con la misma foto desenfocada mezclada con crema. */
(function(){
  /* ---------- paleta Acuarela Silvestre ---------- */
  const C={ crema:'#ECE6DA', carbon:'#2F3A40', pizarra:'#5F7C8E',
            terracota:'#C27A4E', rosa:'#E39B96', coral:'#CB5A52' };
  const HANDLE='@Ayunka.Borda.Crea';
  const BASE='https://ncuvdpydwnepbysadoux.supabase.co/storage/v1/object/';

  /* ---------- formatos ---------- */
  const FMT={
    feed:     {w:1080,h:1350, logo:{y:46,h:84}, panel:{x:72,y:168,w:936,h:806},
               tit:1052, sep:1098, sub:1146, hnd:1212, cta:null},
    reel:     {w:1080,h:1920, logo:{y:196,h:96}, panel:{x:72,y:376,w:936,h:900},
               tit:1392, sep:1444, sub:1494, hnd:null, cta:1600},
    tiktok:   {w:1080,h:1920, logo:{y:150,h:92}, panel:{x:60,y:288,w:890,h:860},
               tit:1246, sep:1296, sub:1344, hnd:1416, cta:null},
    whatsapp: {w:1080,h:1080, logo:{y:36,h:70}, panel:{x:90,y:146,w:900,h:700},
               tit:906, sep:948, sub:992, hnd:1046, cta:null}
  };

  let LOGO=null, fuentesOK=false;
  const D={ fotos:[], listo:[] };

  /* ---------- utilidades ---------- */
  function cfg(){
    try{ const c=JSON.parse(localStorage.getItem('ayunka-supa-cfg')); if(c&&c.url&&c.key) return c; }catch(e){}
    return (window.AYUNKA_CONFIG&&window.AYUNKA_CONFIG.supabase)||null;
  }
  const slug = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'producto';
  const esc = s => (s||'').toString().replace(/</g,'&lt;');

  async function fuentes(){
    if(fuentesOK) return;
    if(!document.getElementById('poppins-css')){
      const l=document.createElement('link'); l.id='poppins-css'; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;0,700;1,300&display=swap';
      document.head.appendChild(l);
    }
    try{
      await Promise.all([
        document.fonts.load('700 64px Poppins'),
        document.fonts.load('500 40px Poppins'),
        document.fonts.load('italic 300 38px Poppins')
      ]);
      await document.fonts.ready;
    }catch(e){}
    fuentesOK=true;
  }

  function cargarLogo(){
    if(LOGO) return Promise.resolve(LOGO);
    return new Promise(res=>{
      const i=new Image();
      i.onload=()=>{ LOGO=i; res(i); };
      i.onerror=()=>res(null);
      i.src='img/logo.png';
    });
  }

  const leer = file => new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=r.result; };
    r.onerror=rej; r.readAsDataURL(file);
  });

  /* ---------- dibujo ---------- */
  function fondo(ctx,img,w,h){
    // foto desenfocada que cubre todo, mezclada con crema (nunca deja bordes vacíos)
    const e=Math.max(w/img.width,h/img.height)*1.25;
    const dw=img.width*e, dh=img.height*e;
    ctx.save(); ctx.filter='blur(30px)';
    ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
    ctx.restore();
    ctx.fillStyle=C.crema; ctx.globalAlpha=0.30;
    ctx.fillRect(0,0,w,h); ctx.globalAlpha=1;
  }

  function panel(ctx,img,p,acento){
    const r=28;
    ctx.save();
    ctx.shadowColor='rgba(47,58,64,.28)'; ctx.shadowBlur=34; ctx.shadowOffsetY=10;
    ctx.fillStyle=C.crema;
    ctx.beginPath(); ctx.roundRect(p.x,p.y,p.w,p.h,r); ctx.fill();
    ctx.restore();
    // producto COMPLETO dentro del panel (contain, jamás recortado)
    ctx.save();
    ctx.beginPath(); ctx.roundRect(p.x,p.y,p.w,p.h,r); ctx.clip();
    // relleno interior con la misma foto difuminada, para que no queden franjas vacías
    const ec=Math.max(p.w/img.width,p.h/img.height)*1.2;
    ctx.save(); ctx.filter='blur(24px)'; ctx.globalAlpha=.55;
    ctx.drawImage(img,p.x+(p.w-img.width*ec)/2,p.y+(p.h-img.height*ec)/2,img.width*ec,img.height*ec);
    ctx.restore();
    const e=Math.min(p.w/img.width,p.h/img.height);
    const dw=img.width*e, dh=img.height*e;
    ctx.drawImage(img,p.x+(p.w-dw)/2,p.y+(p.h-dh)/2,dw,dh);
    ctx.restore();
    ctx.strokeStyle=acento; ctx.lineWidth=5;
    ctx.beginPath(); ctx.roundRect(p.x+2.5,p.y+2.5,p.w-5,p.h-5,r); ctx.stroke();
  }

  function texto(ctx,f,w,titulo,sub,acento){
    ctx.textAlign='center';
    ctx.fillStyle=C.carbon; ctx.font='700 62px Poppins, sans-serif';
    let t=titulo; while(ctx.measureText(t).width>w-140 && t.length>4){ t=t.slice(0,-1); }
    ctx.fillText(t+(t.length<titulo.length?'…':''),w/2,f.tit);
    ctx.strokeStyle=acento; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(w/2-70,f.sep); ctx.lineTo(w/2+70,f.sep); ctx.stroke();
    ctx.fillStyle=C.pizarra; ctx.font='italic 300 38px Poppins, sans-serif';
    let s=sub; while(ctx.measureText(s).width>w-160 && s.length>4){ s=s.slice(0,-1); }
    ctx.fillText(s+(s.length<sub.length?'…':''),w/2,f.sub);
    if(f.hnd){
      ctx.fillStyle=C.terracota; ctx.font='500 36px Poppins, sans-serif';
      ctx.fillText(HANDLE,w/2,f.hnd);
    }
    if(f.cta){
      const txt='Encarga por DM · '+HANDLE;
      ctx.font='500 34px Poppins, sans-serif';
      const pw=ctx.measureText(txt).width+72, ph=88;
      ctx.fillStyle=acento;
      ctx.beginPath(); ctx.roundRect((w-pw)/2,f.cta-ph/2,pw,ph,ph/2); ctx.fill();
      ctx.fillStyle=C.crema; ctx.textBaseline='middle';
      ctx.fillText(txt,w/2,f.cta+2); ctx.textBaseline='alphabetic';
    }
  }

  async function componer(img,formato,titulo,sub,acento){
    const f=FMT[formato];
    const cv=document.createElement('canvas'); cv.width=f.w; cv.height=f.h;
    const ctx=cv.getContext('2d');
    fondo(ctx,img,f.w,f.h);
    panel(ctx,img,f.panel,acento);
    const lg=await cargarLogo();
    if(lg){
      const lh=f.logo.h, lw=lg.width*(lh/lg.height);
      ctx.drawImage(lg,(f.w-lw)/2,f.logo.y,lw,lh);
    }
    texto(ctx,f,f.w,titulo,sub,acento);
    return new Promise(r=>cv.toBlob(r,'image/jpeg',0.92));
  }

  async function subir(blob,ruta){
    const c=cfg(); if(!c) throw new Error('Almacenamiento no configurado');
    const r=await fetch(BASE+(c.bucket||'archivos')+'/'+ruta,{
      method:'POST',
      headers:{ apikey:c.key, Authorization:'Bearer '+c.key,
                'Content-Type':'image/jpeg','x-upsert':'true' },
      body:blob
    });
    if(!r.ok) throw new Error('No se pudo subir ('+r.status+')');
    return c.url+'/storage/v1/object/public/'+(c.bucket||'archivos')+'/'+ruta;
  }

  async function colaAgregar(items){
    const c=cfg();
    const url=c.url+'/storage/v1/object/public/'+(c.bucket||'archivos')+'/cola/posts-aprobados.json';
    let cola=[];
    try{ const r=await fetch(url+'?v='+Date.now()); if(r.ok) cola=await r.json(); }catch(e){}
    if(!Array.isArray(cola)) cola=[];
    const max=cola.reduce((m,p)=>Math.max(m,p.orden||0),0);
    items.forEach((it,i)=> cola.push(Object.assign({orden:max+i+1},it)));
    const w=await fetch(BASE+(c.bucket||'archivos')+'/cola/posts-aprobados.json',{
      method:'POST',
      headers:{ apikey:c.key, Authorization:'Bearer '+c.key,
                'Content-Type':'application/json','x-upsert':'true' },
      body:JSON.stringify(cola,null,2)
    });
    if(!w.ok) throw new Error('No se pudo guardar la cola ('+w.status+')');
    return cola.length;
  }

  /* ---------- vista ---------- */
  function view(){
    return `
    <div class="row between"><h1 class="page">Nuevo producto</h1></div>
    <p class="sub">Sube las fotos y la app arma los posts con la marca. El texto lo escribe Claude solo.</p>
    <div class="card">
      <label class="lbl">Nombre del producto</label>
      <input id="np_nom" class="inp" placeholder="Ej: Neceser orejitas" />
      <label class="lbl" style="margin-top:10px">Bajada (opcional)</label>
      <input id="np_sub" class="inp" placeholder="Ej: Modelo denim · moño vichy azul" />
      <label class="lbl" style="margin-top:10px">Línea</label>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn primary" id="np_l3" onclick="NUEVO.linea('3D')">🖨️ Impresión 3D</button>
        <button class="btn ghost"   id="np_lc" onclick="NUEVO.linea('costura')">🧵 Costura</button>
      </div>
      <label class="lbl" style="margin-top:14px">Fotos — una por cada modelo o variante</label>
      <input id="np_file" class="inp" type="file" accept="image/*" multiple onchange="NUEVO.pick(this)" />
      <p class="muted" style="margin-top:6px">Cada foto genera su set de 4: feed, reel, TikTok y WhatsApp.</p>
    </div>
    <div id="np_prev" class="grid cards"></div>
    <div class="card" style="position:sticky;bottom:8px">
      <div class="row between" style="flex-wrap:wrap;gap:8px">
        <span class="muted" id="np_estado">Elige al menos una foto.</span>
        <button class="btn primary" id="np_go" onclick="NUEVO.generar()">✨ Generar y encolar</button>
      </div>
    </div>`;
  }

  function init(){ fuentes(); cargarLogo(); pintar(); }

  function pintar(){
    const g=document.getElementById('np_prev'); if(!g) return;
    if(!D.fotos.length){ g.innerHTML=''; return; }
    g.innerHTML=D.fotos.map((f,i)=>`
      <div class="card">
        <img src="${f.url}" style="width:100%;border-radius:10px;display:block">
        <div class="row between" style="margin-top:8px">
          <b>Modelo ${i+1}</b>
          <button class="btn ghost sm" onclick="NUEVO.quitar(${i})">Quitar</button>
        </div>
      </div>`).join('');
  }

  function estado(t){ const e=document.getElementById('np_estado'); if(e) e.textContent=t; }

  let linea='3D';

  window.NUEVO={
    view, init,
    linea(l){
      linea=l;
      const a=document.getElementById('np_l3'), b=document.getElementById('np_lc');
      if(a) a.className='btn '+(l==='3D'?'primary':'ghost');
      if(b) b.className='btn '+(l==='costura'?'primary':'ghost');
    },
    async pick(inp){
      for(const file of inp.files){
        try{ const img=await leer(file); D.fotos.push({img,url:img.src,nombre:file.name}); }catch(e){}
      }
      inp.value=''; pintar();
      estado(D.fotos.length+' foto(s) lista(s).');
    },
    quitar(i){ D.fotos.splice(i,1); pintar(); },
    async generar(){
      const nom=(document.getElementById('np_nom')||{}).value||'';
      if(!nom.trim()) return estado('⚠️ Ponle nombre al producto.');
      if(!D.fotos.length) return estado('⚠️ Falta al menos una foto.');
      const sub=((document.getElementById('np_sub')||{}).value||'').trim()
             || (linea==='3D'?'Impreso en 3D · personalizable':'Hecho a mano · personalizable');
      const b=document.getElementById('np_go'); if(b) b.disabled=true;
      const base=slug(nom);
      const acentos=[C.coral,C.pizarra,C.terracota,C.rosa];
      const nuevos=[];
      try{
        await fuentes();
        for(let i=0;i<D.fotos.length;i++){
          const ac=acentos[i%acentos.length];
          const sl=D.fotos.length>1 ? base+'-'+(i+1) : base;
          const subM=D.fotos.length>1 ? sub+' · modelo '+(i+1) : sub;
          const urls={};
          for(const fm of ['feed','reel','tiktok','whatsapp']){
            estado(`Generando ${sl} · ${fm}…`);
            const blob=await componer(D.fotos[i].img,fm,nom.trim(),subM,ac);
            urls[fm]=await subir(blob,'posts/'+sl+'-'+fm+'.jpg');
          }
          nuevos.push({ slug:sl, linea, aprobado:false, caption:'',
                        titulo:nom.trim(), bajada:subM,
                        image_url:urls.feed, formatos:urls,
                        creado:new Date().toISOString() });
        }
        estado('Guardando en la cola…');
        const total=await colaAgregar(nuevos);
        D.fotos=[]; pintar();
        estado(`✅ ${nuevos.length} listo(s). Claude les escribe el texto y aparecen en Aprobar. (${total} en la cola)`);
      }catch(e){
        estado('⚠️ '+e.message);
      }finally{ if(b) b.disabled=false; }
    }
  };
})();
