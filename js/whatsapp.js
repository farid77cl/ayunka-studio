/* WhatsApp — los textos de atención, con botón para copiar.
   Vive en la app porque es donde Farid los necesita: en el teléfono, al lado de WhatsApp.
   El archivo de referencia es whatsapp/mensajes-automaticos.md; si cambias uno, cambia el otro.

   Los tres datos variables (plazo, envío, retiro) se guardan en localStorage: sin ellos
   las respuestas rápidas quedan con huecos y no sirven para pegar. */
(function(){
  const KEY='ayunka-wsp-cfg';
  const DEF={ plazo:'', envio:'', retiro:'' };
  const load=()=>{ try{ return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return Object.assign({},DEF); } };
  const save=c=>{ try{ localStorage.setItem(KEY,JSON.stringify(c)); }catch(e){ console.warn('No se pudo guardar en el navegador (¿sin espacio?)',e); } };
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* Los dos automáticos topan en 200 caracteres: el campo de WhatsApp los corta.
     La cuenta se muestra en pantalla para que se note al editarlos. */
  const AUTO=[
    { id:'bienvenida', tope:200,
      titulo:'Mensaje de bienvenida',
      cuando:'Sale solo la primera vez que alguien te escribe (o tras 14 días sin hablar)',
      texto:'¡Hola! 🌿 Gracias por escribir a Ayünka 💛 Cuéntame qué te gustó y te paso precio y plazo al tiro. El banderín de nombre es $5.000 por letra (5 letras = $25.000). Respondo de 9 a 19 h ✨',
      nota:'El precio va aquí a propósito: todas las consultas de julio preguntaban precio. Si el primer mensaje ya lo trae, la conversación arranca en “quiero uno”.' },
    { id:'bienvenida-corta', tope:200,
      titulo:'Bienvenida — versión corta',
      cuando:'Por si la app te corta la de arriba',
      texto:'¡Hola! 🌿 Gracias por escribir a Ayünka 💛 Cuéntame qué te gustó y te paso precio y plazo. Banderín de nombre: $5.000 por letra. Respondo de 9 a 19 h ✨' },
    { id:'ausencia', tope:200,
      titulo:'Mensaje de ausencia',
      cuando:'Prográmalo de 19:00 a 09:00',
      texto:'¡Hola! 🌿 Gracias por escribir 💛 Ahora no estoy conectada, pero mañana temprano te respondo. Déjame el nombre y los colores que quieres y te llego con el presupuesto listo ✨',
      nota:'No dice solo “te respondo mañana”: pide algo. Quien deja el nombre y los colores ya está medio decidido.' }
  ];

  /* Las rápidas no tienen tope de 200 (un mensaje de WhatsApp llega a 4.096).
     El que es corto es el atajo: máximo 25 caracteres. */
  const RAPIDAS=[
    { atajo:'banderin', titulo:'Precio del banderín',
      texto:c=>`El banderín de nombre en tela va así 🌿\n\n$5.000 por letra. Un nombre de 5 letras queda en $25.000.\n¿Quieres un bordado extra (un barquito, una estrellita, un animalito)? $5.000 más.\n\nCada letra la coso en su propia tela, en los colores que elijas 💛\nCuéntame el nombre y te lo armo ✨` },
    { atajo:'plazo', titulo:'Cuánto demora', usa:['plazo'],
      texto:c=>`Lo hago a pedido, así que me tomo ${c.plazo||'___'} días hábiles desde que confirmas 🌿\nSi lo necesitas para una fecha, dime cuál y te digo al tiro si llego 💛` },
    { atajo:'envio', titulo:'Envío y retiro', usa:['envio','retiro'],
      texto:c=>`Te lo puedo enviar a todo Chile por ${c.envio||'___'} 📦\nEl despacho lo pagas tú y sale una vez que esté listo.\nSi estás en ${c.retiro||'___'}, también puedes retirarlo y te ahorras el envío 🌿` },
    { atajo:'pedir', titulo:'Cómo se pide',
      texto:c=>`Para dejarlo andando necesito tres cosas 🌿\n1. El nombre tal como quieres que se lea\n2. Los colores o el estilo que te gusta (mándame una foto de referencia si tienes)\n3. Si lo necesitas para una fecha\n\nCon eso te confirmo el total y el plazo 💛` },
    { atajo:'gracias', titulo:'Después de entregar',
      texto:c=>`¡Gracias a ti! 💛 Cualquier cosa me escribes.\nSi te gusta cómo quedó, una foto o una historia etiquetándome me ayuda muchísimo 🌿\n@Ayunka.Borda.Crea` }
  ];

  const ETIQUETAS=[
    ['🆕','Nuevo','Escribió y no le has respondido','Esta es la lista que revisas primero. Más de un día aquí y se enfría'],
    ['💬','Cotizado','Le pasaste precio y plazo','La pelota está en su cancha. A los 3 días, un “¿alcanzaste a verlo?” recupera harto'],
    ['✅','Confirmado','Dijo que sí','Va a la lista de trabajo'],
    ['🧵','En proceso','Lo estás haciendo','Aquí ves cuánto tienes encima antes de prometer plazos nuevos'],
    ['📦','Por entregar','Listo, esperando entrega o pago','Lo que no puede quedarse olvidado'],
    ['💛','Entregado','Cerrado','De aquí salen los clientes a los que ofreces algo nuevo']
  ];

  function bloque(id,titulo,cuando,texto,tope,nota){
    const n=[...texto].length;
    const cuenta = tope
      ? `<span class="pill ${n<=tope?'ok':'bad'}">${n} / ${tope} caracteres</span>`
      : '';
    return `<div class="card" style="margin-bottom:10px">
      <div class="row between" style="align-items:flex-start;gap:8px">
        <div><strong>${esc(titulo)}</strong><br><small class="sub">${esc(cuando)}</small></div>
        ${cuenta}
      </div>
      <pre class="wsp-txt" id="wsp_${id}">${esc(texto)}</pre>
      ${nota?`<small class="sub">${nota}</small>`:''}
      <div class="row" style="gap:8px;margin-top:8px">
        <button class="btn primary" onclick="WSP.copiar('wsp_${id}')">📋 Copiar</button>
      </div>
    </div>`;
  }

  const WSP={
    view(){
      const c=load();
      const faltan=['plazo','envio','retiro'].filter(k=>!c[k]);
      return `
      <div class="row between"><h1 class="page">WhatsApp</h1></div>
      <p class="sub">Los textos de atención, listos para copiar y pegar en WhatsApp Business.</p>

      ${faltan.length?`<div class="card">
        <span class="pill warn">Ojo</span><br>
        <strong>Faltan ${faltan.length} dato${faltan.length>1?'s':''} tuyo${faltan.length>1?'s':''}.</strong>
        Las respuestas de plazo y envío quedan con huecos hasta que los llenes aquí abajo.
      </div>`:''}

      <div class="card" style="margin-bottom:14px">
        <strong>Tus datos</strong>
        <label class="field" style="margin-top:6px">Plazo en días hábiles
          <input id="wsp_plazo" value="${esc(c.plazo)}" placeholder="por ejemplo: 5 a 7" inputmode="text"></label>
        <label class="field" style="margin-top:6px">Costo del envío
          <input id="wsp_envio" value="${esc(c.envio)}" placeholder="por ejemplo: $4.500 por Starken"></label>
        <label class="field" style="margin-top:6px">Dónde se puede retirar
          <input id="wsp_retiro" value="${esc(c.retiro)}" placeholder="por ejemplo: Renca"></label>
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn primary" onclick="WSP.guardar()">Guardar</button>
        </div>
      </div>

      <h2 class="page" style="font-size:19px">Mensajes automáticos</h2>
      <p class="sub">Ajustes ⋮ → Herramientas para la empresa → Mensaje de bienvenida / de ausencia</p>
      ${AUTO.map(a=>bloque(a.id,a.titulo,a.cuando,a.texto,a.tope,a.nota)).join('')}

      <h2 class="page" style="font-size:19px;margin-top:18px">Respuestas rápidas</h2>
      <p class="sub">Herramientas para la empresa → Respuestas rápidas → + · el atajo va sin la barra</p>
      ${RAPIDAS.map(r=>bloque('r-'+r.atajo,'/'+r.atajo+' — '+r.titulo,
          r.usa?('usa: '+r.usa.join(' y ')):'—', r.texto(c), 0)).join('')}

      <h2 class="page" style="font-size:19px;margin-top:18px">Etiquetas</h2>
      <div class="card">
        <p class="sub" style="margin-top:0">Una sola etiqueta por chat. Si un chat tiene dos o ninguna, el sistema deja de servir en una semana.</p>
        ${ETIQUETAS.map(([e,n,cuando,para])=>`<div style="padding:8px 0;border-top:1px solid var(--line)">
          <strong>${e} ${esc(n)}</strong> — ${esc(cuando)}<br><small class="sub">${esc(para)}</small></div>`).join('')}
      </div>

      <div class="card empty" style="margin-top:14px">
        n8n no toca WhatsApp: no hay API conectada. Lo que sí llega es el aviso por Telegram
        cuando hay mensajes de Instagram o Facebook sin responder.
      </div>`;
    },

    guardar(){
      const g=id=>{ const el=document.getElementById(id); return el?el.value.trim():''; };
      save({ plazo:g('wsp_plazo'), envio:g('wsp_envio'), retiro:g('wsp_retiro') });
      if(window.toast) toast('Datos guardados');
      if(window.__render) window.__render();
    },

    async copiar(id){
      const el=document.getElementById(id);
      if(!el) return;
      const txt=el.textContent;
      try{
        await navigator.clipboard.writeText(txt);
        if(window.toast) toast('Copiado — pégalo en WhatsApp');
      }catch(e){
        /* Sin permiso de portapapeles (pasa en algunos navegadores): al menos lo dejamos
           seleccionado para que baste un toque largo → Copiar. */
        const r=document.createRange(); r.selectNodeContents(el);
        const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
        if(window.toast) toast('Seleccionado: mantén apretado y Copiar');
      }
    }
  };

  window.WSP=WSP;
})();
