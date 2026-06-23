/* Ayünka Studio — motor de costo (modelo plástico+luz+operario+amortización+fallos) */
(function(){
  const P=()=>window.DB.params;
  const amortPerH=()=>P().printerCost/Math.max(1,(P().amortYears*P().daysYear*P().hoursDay));
  const elecPerH=()=>P().powerKw*P().kwh;
  const purgeFactor=(c)=>1+(Math.max(1,(c||1))-1)*0.5;
  function kgPriceFor(prod){
    if(prod.filamentId){const f=(window.DB.filaments||[]).find(x=>x.id===prod.filamentId); if(f&&f.rollGrams) return f.rollPrice/f.rollGrams*1000;}
    return prod.material==='PETG'?P().petgPrice:P().plaPrice;
  }
  function costPiece(prod){
    const grams=+prod.grams||0, h=+prod.timeH||0, colors=+prod.colors||1;
    const plastico=grams*purgeFactor(colors)/1000*kgPriceFor(prod);
    const electricidad=h*elecPerH();
    const prep=(P().prepMin||0), post=(+prod.postMin||0);
    const operario=(prep+post)/60*P().laborH;
    const amortizacion=h*amortPerH();
    const empaque=prod.packOverride!=null?+prod.packOverride:P().pack;
    const base=plastico+electricidad+operario+amortizacion+empaque;
    const fallos=base*P().failRate;
    const total=base+fallos;
    return {plastico,electricidad,operario,amortizacion,empaque,base,fallos,total,prep,post};
  }
  const suggestPrice=(t)=>t*P().markup;
  const round500=(x)=>Math.round(x/500)*500;
  function priceOf(prod){ if(prod.price!=null&&prod.price!=='') return +prod.price; return round500(suggestPrice(costPiece(prod).total)); }
  const marginPct=(price,total)=>price>0?(price-total)/price:0;
  // tiempo: decimal horas <-> "Xh Ym"
  function hm(h){h=+h||0; const H=Math.floor(h+1e-9); const M=Math.round((h-H)*60); return (H?H+'h ':'')+(M||!H?M+'m':'').trim()||'0m';}
  function toHours(H,M){return (+H||0)+(+M||0)/60;}
  function costPlate(plate){
    const prods=window.DB.products; let plastico=0,operario=0,empaque=0,grams=0,units=0;
    (plate.items||[]).forEach(it=>{const pr=prods.find(p=>p.id===it.productId);if(!pr)return;const q=+it.qty||0;units+=q;grams+=(+pr.grams||0)*purgeFactor(pr.colors)*q;const c=costPiece(pr);plastico+=c.plastico*q;operario+=c.operario*q;empaque+=c.empaque*q;});
    const h=+plate.plateTimeH||0; const electricidad=h*elecPerH(), amortizacion=h*amortPerH();
    const base=plastico+electricidad+operario+amortizacion+empaque; const total=base*(1+P().failRate);
    return {plastico,electricidad,operario,amortizacion,empaque,grams,units,base,total,sugerido:round500(suggestPrice(total))};
  }
  // tiempo total de impresión de un set de items [{productId, qty}] o de una cotización
  function printHoursOf(items){let h=0;(items||[]).forEach(it=>{const pr=window.DB.products.find(p=>p.id===it.productId);if(pr)h+=(+pr.timeH||0)*(+it.qty||0);});return h;}
  function productionDays(hours){const cap=P().dayCapacityH||13; return Math.max(1,Math.ceil(hours/cap));}
  function kgPrice(filamentId,material){ if(filamentId){const f=(window.DB.filaments||[]).find(x=>x.id===filamentId); if(f&&f.rollGrams) return f.rollPrice/f.rollGrams*1000;} return material==='PETG'?P().petgPrice:P().plaPrice; }
  function costCustom(o){
    const N=Math.max(1,+o.unitsPerPlate||1);
    // gramos y tiempo se ingresan TOTALES de la placa (las N unidades juntas), como los entrega el slicer
    let plastico=0; (o.segments||[]).forEach(s=>{ plastico += (+s.grams||0)/1000*kgPrice(s.filamentId,s.material||'PLA'); });
    const electricidad=(+o.timeH||0)*elecPerH();       // tiempo de la placa completa
    const amortizacion=(+o.timeH||0)*amortPerH();
    const operario=((P().prepMin||0)+N*(+o.postMin||0))/60*P().laborH; // preparación 1 vez por placa + post por unidad
    const empaque=N*(o.empaque!=null?+o.empaque:P().pack);
    const basePlate=plastico+electricidad+operario+amortizacion+empaque;
    const fallosPlate=basePlate*P().failRate, totalPlate=basePlate+fallosPlate;
    // valores POR UNIDAD (placa / N)
    return {plastico:plastico/N,electricidad:electricidad/N,amortizacion:amortizacion/N,operario:operario/N,empaque:empaque/N,fallos:fallosPlate/N,base:basePlate/N,total:totalPlate/N,N};
  }
  function printHoursOfQuote(items){ let h=0; (items||[]).forEach(it=>{
    if(it.calc){ const N=Math.max(1,+it.calc.unitsPerPlate||1); h+=Math.ceil((+it.qty||0)/N)*(+it.calc.timeH||0); }
    else if(it.productId){ const p=window.DB.products.find(x=>x.id===it.productId); if(p) h+=(+p.timeH||0)*(+it.qty||0); }
  }); return h; }
  function costOfQuoteItem(it){ if(it&&it.calc) return costCustom(it.calc).total; if(it&&it.productId){const p=window.DB.products.find(x=>x.id===it.productId); if(p) return costPiece(p).total;} return 0; }
  window.calc={costPiece,costCustom,costOfQuoteItem,kgPrice,printHoursOfQuote,suggestPrice,round500,priceOf,marginPct,costPlate,amortPerH,elecPerH,kgPriceFor,purgeFactor,hm,toHours,printHoursOf,productionDays};
})();
