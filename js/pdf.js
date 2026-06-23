/* Ayünka Studio — cotización PDF profesional con marca Ayünka */
(function(){
  const CLP=n=>'$'+Math.round(+n||0).toLocaleString('es-CL');
  let _logo=null;
  function loadLogo(){
    if(_logo) return Promise.resolve(_logo);
    return fetch('img/logo.png').then(r=>r.blob()).then(b=>new Promise(res=>{
      const fr=new FileReader(); fr.onload=()=>{const i=new Image(); i.onload=()=>{_logo={data:fr.result,w:i.naturalWidth,h:i.naturalHeight};res(_logo);}; i.onerror=()=>{_logo={data:null};res(_logo);}; i.src=fr.result;}; fr.readAsDataURL(b);
    })).catch(()=>({data:null}));
  }
  async function genQuotePDF(q){
    const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'pt',format:'a4'});
    const P=window.DB.params,B=P.business,W=doc.internal.pageSize.getWidth(),M=46;
    const CR=[236,230,218],PZ=[95,124,142],CB=[47,58,64],CO=[203,90,82];
    const logo=await loadLogo();
    doc.setFillColor(...CR); doc.rect(0,0,W,112,'F');
    doc.setTextColor(...CB);
    if(logo&&logo.data){const lw=150,lh=lw*logo.h/logo.w; doc.addImage(logo.data,'PNG',M,(112-lh)/2,lw,lh);}
    else {doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('Ayünka',M,58);}
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('COTIZACIÓN',W-M,52,{align:'right'});
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(...PZ);
    doc.text('N° '+q.number,W-M,70,{align:'right'}); doc.text(q.date,W-M,84,{align:'right'});

    let y=142; doc.setTextColor(...CB);
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Para:',M,y);
    doc.setFont('helvetica','normal');doc.text(q.client.name||'Cliente',M+32,y);
    let cy=y+14; if(q.client.phone){doc.text(q.client.phone,M+32,cy);cy+=14;} if(q.client.email){doc.text(q.client.email,M+32,cy);cy+=14;}
    doc.setFont('helvetica','bold');doc.text(B.name,W-M,y,{align:'right'});doc.setFont('helvetica','normal');
    let by=y+14; if(B.ig){doc.text(B.ig,W-M,by,{align:'right'});by+=14;} if(B.phone){doc.text(B.phone,W-M,by,{align:'right'});by+=14;} if(B.email){doc.text(B.email,W-M,by,{align:'right'});by+=14;}

    y=Math.max(cy,by)+14; const cX=[M,W-M-200,W-M-105,W-M];
    doc.setFillColor(...PZ);doc.rect(M-6,y-14,W-2*M+12,22,'F');doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');doc.setFontSize(9.5);
    doc.text('DETALLE',cX[0],y);doc.text('CANT.',cX[1],y,{align:'right'});doc.text('UNITARIO',cX[2],y,{align:'right'});doc.text('SUBTOTAL',cX[3],y,{align:'right'});
    y+=22;doc.setTextColor(...CB);doc.setFont('helvetica','normal');doc.setFontSize(10);
    let net=0;
    q.items.forEach(it=>{const sub=(+it.qty||0)*(+it.unitPrice||0);net+=sub;
      if(y>700){doc.addPage();y=60;}
      doc.text(String(it.name||'Ítem').slice(0,52),cX[0],y);doc.text(String(it.qty),cX[1],y,{align:'right'});
      doc.text(CLP(it.unitPrice),cX[2],y,{align:'right'});doc.text(CLP(sub),cX[3],y,{align:'right'});
      doc.setDrawColor(225,219,205);doc.line(M-6,y+7,W-M+6,y+7);y+=24;});
    y+=8; const iva=q.ivaIncluded?net*P.iva:0,tot=net+iva;
    if(q.ivaIncluded){doc.setFontSize(10.5);doc.text('Neto',W-M-120,y,{align:'right'});doc.text(CLP(net),W-M,y,{align:'right'});y+=18;doc.text('IVA 19%',W-M-120,y,{align:'right'});doc.text(CLP(iva),W-M,y,{align:'right'});y+=20;}
    doc.setFillColor(...CO);doc.rect(W-M-200,y-15,200,28,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(13);
    doc.text('TOTAL',W-M-120,y+3,{align:'right'});doc.text(CLP(tot),W-M-8,y+3,{align:'right'});doc.setTextColor(...CB);y+=44;

    // Condiciones: abono + tiempo de producción
    const abonoPct=P.abonoPct||0.5, abono=tot*abonoPct, saldo=tot-abono;
    const ph=window.calc.printHoursOfQuote(q.items), days=window.calc.productionDays(ph);
    doc.setDrawColor(...PZ);doc.setFillColor(246,242,233);doc.roundedRect(M,y-2,W-2*M,86,6,6,'FD');
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.text('Condiciones',M+14,y+16);
    doc.setFont('helvetica','normal');doc.setFontSize(9.8);
    doc.text('• Forma de pago: '+Math.round(abonoPct*100)+'% de abono para iniciar ('+CLP(abono)+'), saldo de '+CLP(saldo)+' contra entrega.',M+14,y+32);
    const tline = ph>0 ? ('• Tiempo estimado de producción: '+days+' día(s) hábil(es) desde el abono ('+window.calc.hm(ph)+' de impresión).')
                       : ('• Tiempo de producción: se confirma al encargar.');
    doc.text(tline,M+14,y+48);
    doc.text('• Los pedidos grandes pueden requerir más días; el plazo se confirma al momento de encargar.',M+14,y+64);
    doc.text('• Cotización válida por '+(q.validDays||P.quoteValidDays)+' días.',M+14,y+80);
    y+=104;
    if(q.note){doc.setFont('helvetica','italic');doc.setFontSize(9.5);doc.text(doc.splitTextToSize('Nota: '+q.note,W-2*M),M,y);}
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...PZ);
    doc.text(B.name,M,812);doc.text('Bordamos. Creamos. Siempre con cariño.',W-M,812,{align:'right'});
    doc.save('Cotizacion-'+q.number+'.pdf');
  }
  window.genQuotePDF=genQuotePDF; window.CLP=CLP;
})();
