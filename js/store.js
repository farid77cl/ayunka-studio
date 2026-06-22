/* Ayünka Studio — estado y persistencia (localStorage) */
(function(){
  const KEY = 'ayunka-studio-db-v1';
  const uid = () => Math.random().toString(36).slice(2,9);

  function p(name,material,grams,timeH,colors,postMin){
    return { id: uid(), name, material, grams, timeH, colors, postMin, packOverride:null, price:null, stock:0,
             filamentId:null, imageId:null, files:[] };
  }

  const DEFAULTS = {
    params: {
      plaPrice: 15000, petgPrice: 20000, kwh: 160, powerKw: 0.12,
      printerCost: 779990, amortYears: 3, daysYear: 300, hoursDay: 8,
      failRate: 0.10, laborH: 4000, prepMin: 6, pack: 350, markup: 3.5,
      iva: 0.19, ivaEnQuote: false, quoteValidDays: 15, dayCapacityH: 13,
      abonoPct: 0.50,
      business: { name: 'Ayünka Borda Crea', ig: '@Ayunka.Borda.Crea', phone: '', email: '', city: 'Chile' }
    },
    filaments: [
      { id: uid(), marca:'Cicla', material:'PLA', color:'Rosa coral', hex:'#E39B96', rollPrice:15000, rollGrams:1000, gramsLeft:1000 },
      { id: uid(), marca:'Winkle', material:'PLA', color:'Azul niebla', hex:'#9FB6C4', rollPrice:17990, rollGrams:1000, gramsLeft:1000 },
      { id: uid(), marca:'Creality', material:'PLA', color:'Crema lino', hex:'#ECE6DA', rollPrice:12990, rollGrams:1000, gramsLeft:850 },
      { id: uid(), marca:'Generico', material:'PLA', color:'Carbón', hex:'#2F3A40', rollPrice:11990, rollGrams:1000, gramsLeft:600 },
      { id: uid(), marca:'Cicla', material:'PETG', color:'Azul pizarra', hex:'#5F7C8E', rollPrice:20000, rollGrams:1000, gramsLeft:1000 }
    ],
    products: [
      p('Llavero porta-tijeras','PLA',8,0.5,2,2), p('Cajita para agujas','PLA',15,1.0,1,3),
      p('Cajita bobinas/prensatelas','PLA',25,1.5,1,3), p('Organizador de escritorio','PLA',40,3.0,2,5),
      p('Porta-ovillos de lana','PLA',120,6.0,1,8), p('Cajita costurera','PLA',90,5.0,2,8),
      p('Portaconos de hilo','PLA',50,3.0,1,5), p('Mini estantería','PLA',110,6.0,1,8),
      p('Saca-costura decorativo','PLA',10,0.6,2,2), p('Exhibidor aro de bordado','PLA',45,3.0,1,5),
      p('Letras/nombres personalizados','PLA',20,1.5,2,5), p('Soporte para celular','PETG',35,2.5,1,3)
    ],
    clients: [],
    plates: [],
    quotes: [],
    schedule: seedSchedule(),
    seq: { quote: 1 }
  };

  function seedSchedule(){
    if(window.AYUNKA_PLAN) return JSON.parse(JSON.stringify(window.AYUNKA_PLAN));
    const J=(name,hours,status='pendiente')=>({id:uid(),name,hours,status});
    const D=(week,day,jobs,prep)=>({id:uid(),week,day,jobs,prep});
    return [
      D('Sem 0','Prep',[J('Descargar 12 STL + licencias',0),J('Laminar todo en OrcaSlicer',0),J('Test de calibración',0.5)],'Confirmar colores de filamento en stock'),
      D('Sem 1','Lun',[J('Organizador escritorio #1',3),J('Cajita bobinas ×2',3),J('Llaveros ×3 (batch)',1.5)],'Fotografiar piezas de prueba'),
      D('Sem 1','Mar',[J('Organizador #2-3',6),J('Cajita agujas ×3',3),J('Saca-costura ×3 (batch)',1.8)],'Post "Nace Ayünka Crea"'),
      D('Sem 1','Mié',[J('Cajita bobinas #3',1.5),J('Letras de prueba ×2',3),J('Llaveros restock',1.5)],'Reel timelapse de impresión'),
      D('Sem 1','Jue',[J('Organizador color 2',3),J('Portaconos #1',3),J('Cajita agujas extra',1)],'Post producto + uso real'),
      D('Sem 1','Vie',[J('Letras personalizadas',4.5),J('Saca-costura color 2',1.8),J('Llavero multicolor',1)],'Subir catálogo a WhatsApp'),
      D('Sem 1','Sáb',[J('Buffer / reimpresión',3)],'Revisar qué generó más interés'),
      D('Sem 2','Lun',[J('Portaconos #2-3',6),J('Exhibidor aro #1',3)],'Laminar piezas de Sem 2'),
      D('Sem 2','Mar',[J('Exhibidor aro #2-3',6),J('Soporte celular PETG #1',2.5)],'Cambiar a filamento PETG'),
      D('Sem 2','Mié',[J('Soporte celular #2-3',5),J('Restock Sem 1',3),J('Llaveros',1.5)],'Reel antes/después'),
      D('Sem 2','Jue',[J('Organizador extra colores',3),J('Portaconos restock',3),J('Saca-costura',1.8)],'Post producto Crea'),
      D('Sem 2','Vie',[J('Exhibidor color 2',3),J('Letras a pedido',3),J('Batch chicos',1.5)],'Difusión WhatsApp'),
      D('Sem 2','Sáb',[J('Buffer / reimpresión',3)],'Resumen de ventas'),
      D('Sem 3','Lun',[J('Porta-ovillos #1',6),J('Cajita agujas restock',1)],'Laminar anclas grandes'),
      D('Sem 3','Mar',[J('Cajita costurera #1',5),J('Cajita bobinas restock',1.5),J('Llaveros',1.5)],'Reel ancla grande'),
      D('Sem 3','Mié',[J('Mini estantería #1',6),J('Saca-costura',1.8)],'Post pieza premium'),
      D('Sem 3','Jue',[J('Porta-ovillos #2',6),J('Batch chicos',1.5)],'Fotos en contexto'),
      D('Sem 3','Vie',[J('Cajita costurera #2',5),J('Organizador restock',3)],'Cierre de catálogo'),
      D('Sem 3','Sáb',[J('Mini estantería #2',6)],'Encuesta próximos SKUs')
    ];
  }

  let DB;
  try { DB = JSON.parse(localStorage.getItem(KEY)) || null; } catch(e){ DB = null; }
  let _fresh=false;
  if (!DB) { DB = JSON.parse(JSON.stringify(DEFAULTS)); _fresh=true; }
  for (const k in DEFAULTS){ if (!(k in DB)) DB[k] = JSON.parse(JSON.stringify(DEFAULTS[k])); }
  for (const k in DEFAULTS.params){ if (!(k in DB.params)) DB.params[k] = DEFAULTS.params[k]; }
  (DB.products||[]).forEach(pr=>{ if(!('filamentId' in pr))pr.filamentId=null; if(!('imageId' in pr))pr.imageId=null; if(!('files' in pr))pr.files=[]; });
  (DB.products||[]).forEach(pr=>{ if(!('stock' in pr))pr.stock=0; if(!('postMin' in pr))pr.postMin=0; });
  if(_fresh && !('_seed' in DB)) DB._seed=true;

  window.DB = DB;
  window.uid = uid;
  const BKEY='ayunka-studio-backups';
  function loadBackups(){ try{return JSON.parse(localStorage.getItem(BKEY))||[];}catch(e){return [];} }
  function snapshot(reason){
    try{ const arr=loadBackups(); const last=arr[arr.length-1];
      if(reason!=='antes de restaurar' && last && (Date.now()-last.t)<60000) return;
      arr.push({t:Date.now(),reason:reason||'auto',db:JSON.parse(JSON.stringify(DB))});
      while(arr.length>12) arr.shift();
      localStorage.setItem(BKEY,JSON.stringify(arr));
    }catch(e){}
  }
  window.snapshotDB=snapshot;
  window.listBackups=()=>loadBackups().map(b=>({t:b.t,reason:b.reason,n:(b.db&&b.db.products?b.db.products.length:0),f:(b.db&&b.db.filaments?b.db.filaments.length:0)}));
  window.restoreBackup=function(t){ const arr=loadBackups(); const b=arr.find(x=>x.t===t); if(!b) return false; snapshot('antes de restaurar'); const d=JSON.parse(JSON.stringify(b.db)); d._seed=false; d._updatedAt=Date.now(); localStorage.setItem(KEY,JSON.stringify(d)); location.reload(); return true; };
  window.saveDB = function(){ DB._seed=false; snapshot('edicion'); try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){ alert('No se pudo guardar (almacenamiento lleno).'); } if(window.Sync&&window.Sync.pushSoon)window.Sync.pushSoon(); };
  window.resetDB = function(){ localStorage.removeItem(KEY); location.reload(); };
  window.exportDB = function(){ return JSON.stringify(DB,null,2); };
  window.importDB = function(json){ const d=JSON.parse(json); d._seed=false; d._updatedAt=Date.now(); localStorage.setItem(KEY, JSON.stringify(d)); location.reload(); };
})();
