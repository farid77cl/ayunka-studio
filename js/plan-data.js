/* Ayünka Studio — Planificación gestionada por Claude.
   Edita este archivo para reorganizar el cronograma; en la app usa
   "Sincronizar planificación" para aplicar los cambios. */
(function(){
  const J=(id,name,hours,desc)=>({id,name,hours,status:'pendiente',desc:desc||'',productId:null});
  const D=(week,day,jobs,prep)=>({id:week.replace(/\s/g,'').toLowerCase()+'-'+day.toLowerCase(),week,day,jobs,prep});
  window.AYUNKA_PLAN=[
    D('Sem 0','Prep',[
      J('p1','Descargar 12 STL + verificar licencias',0,'Baja los 12 modelos de Printables/Cults3D y confirma que la licencia permita vender. Adjunta cada STL a su producto en la pestaña Productos.'),
      J('p2','Laminar todo en OrcaSlicer',0,'Lamina cada pieza y anota PESO (g) y TIEMPO (h). Cárgalos en cada producto para que el costo y el precio queden exactos.'),
      J('p3','Test de calibración',0.5,'Imprime 1 pieza chica para ajustar primera capa y temperatura del filamento.')
    ],'Confirmar colores de filamento en stock'),
    D('Sem 0','Calibración',[
      J('cal1','Calibrar vibración / input shaping (una vez)',0.4,'Una sola vez (no depende del filamento). En la K2: Configuración → Calibración → compensación de vibración/resonancia. Repetir solo si mueves o cambias algo mecánico de la impresora.'),
      J('cal2','Calibrar ESUN PLA — temp + flujo',0.8,'Torre de temperatura (probar 195–225°C) para hallar la mejor; luego calibración de flujo. Anota los GRAMOS y TIEMPO reales de la placa de prueba y cárgalos en la app (costeo exacto).'),
      J('cal3','Calibrar Creality PLA — temp + flujo',0.8,'Igual que ESUN: torre de temp + flujo. Cada marca imprime distinto aunque sea PLA.'),
      J('cal4','Calibrar Ender PLA (blanco y negro) — temp + flujo',0.8,'Torre de temp + flujo. El negro suele necesitar un poco más de temperatura que el blanco.'),
      J('cal5','Calibrar ESUN Mate (lila / verde)',0.6,'Los mate fluyen distinto: ajusta temperatura, flujo y velocidad volumétrica máxima.'),
      J('cal6','Guardar perfiles en OrcaSlicer',0.3,'Crea un perfil por marca (ej. "PLA ESUN Mate") con la temp y flujo ya calibrados. Reúsalo: NO recalibres por cada rollo, solo cuando estrenes una marca/tipo/color nuevo.')
    ],'Regla de oro: calibrar 1 vez por marca de filamento, no por rollo. La nivelación de cama la K2 la hace sola antes de cada impresión.'),
    D('Sem 1','Lun',[
      J('s1l1','Organizador escritorio #1',3,'1 unidad en crema con acento coral. 0.2mm, 15% relleno.'),
      J('s1l2','Cajita bobinas ×2',3,'2 unidades: una azul niebla, una crema.'),
      J('s1l3','Llaveros ×3 (batch)',1.5,'3 en una sola placa, colores surtidos. Agrupa por color para no cambiar filamento.')
    ],'Fotografiar piezas de prueba (letra personalizada, caja/organizador, llavero) para el reel de anuncio'),
    D('Sem 1','Mar',[
      J('s1m1','Organizador #2-3',6,'2 unidades más en otros colores de la paleta.'),
      J('s1m2','Cajita agujas ×3',3,'3 unidades; una con iniciales de prueba.'),
      J('s1m3','Saca-costura ×3 (batch)',1.8,'3 en placa, rosa coral/azul/mostaza.')
    ],'IG+FB+TikTok: Post + Reel "Nace Ayünka Crea 🌿" (espejo en las 3 redes, solo orgánico, sin pauta aún)'),
    D('Sem 1','Mié',[
      J('s1x1','Cajita bobinas #3',1.5,'1 unidad, color terracota.'),
      J('s1x2','Letras de prueba ×2',3,'2 nombres cortos multicolor (CFS) para mostrar personalización.'),
      J('s1x3','Llaveros restock',1.5,'Reponer los que más gusten.')
    ],'TikTok/Reels: timelapse de impresión + Stories detrás de cámara'),
    D('Sem 1','Jue',[
      J('s1j1','Organizador color 2',3,'Variante de color para fotos de catálogo.'),
      J('s1j2','Portaconos #1',3,'1 unidad azul niebla.'),
      J('s1j3','Cajita agujas extra',1,'1 unidad de respaldo.')
    ],'IG+FB: post producto + personalización (antes/después)'),
    D('Sem 1','Vie',[
      J('s1v1','Letras personalizadas',4.5,'Tanda de nombres a pedido (CFS).'),
      J('s1v2','Saca-costura color 2',1.8,'Variante de color.'),
      J('s1v3','Llavero multicolor',1,'1 llavero a dos colores como muestra.')
    ],'Cargar catálogo de WhatsApp por categoría (letras, cajas, llaveros)'),
    D('Sem 1','Sáb',[ J('s1s1','Buffer / reimpresión',3,'Reimprime fallas y rellena faltantes de la semana.') ],'Revisar qué generó más interés (alcance/guardados) antes de iniciar la pauta paga'),
    D('Sem 2','Lun',[ J('s2l1','Portaconos #2-3',6,'2 unidades.'), J('s2l2','Exhibidor aro #1',3,'1 unidad crema.') ],'Laminar piezas de Sem 2 · Iniciar Meta Ads (IG+FB), tráfico al catálogo de WhatsApp'),
    D('Sem 2','Mar',[ J('s2m1','Exhibidor aro #2-3',6,'2 unidades.'), J('s2m2','Soporte celular PETG #1',2.5,'Cambiar a PETG; azul pizarra.') ],'Cambiar a filamento PETG · Grabar timelapse para TikTok'),
    D('Sem 2','Mié',[ J('s2x1','Soporte celular #2-3',5,'2 unidades PETG.'), J('s2x2','Restock Sem 1',3,'Reponer top ventas.'), J('s2x3','Llaveros',1.5,'Batch chico.') ],'Reel antes/después (IG + espejo TikTok)'),
    D('Sem 2','Jue',[ J('s2j1','Organizador extra colores',3,'Más variantes.'), J('s2j2','Portaconos restock',3,''), J('s2j3','Saca-costura',1.8,'') ],'Post producto Crea (IG+FB)'),
    D('Sem 2','Vie',[ J('s2v1','Exhibidor color 2',3,''), J('s2v2','Letras a pedido',3,''), J('s2v3','Batch chicos',1.5,'') ],'Difusión WhatsApp · Revisar CPC/alcance de la pauta paga'),
    D('Sem 2','Sáb',[ J('s2s1','Buffer / reimpresión',3,'') ],'Resumen de ventas semanal · ajustar pauta según resultados'),
    D('Sem 3','Lun',[ J('s3l1','Porta-ovillos #1',6,'Ancla grande; parte a las 8:00. Rosa coral.'), J('s3l2','Cajita agujas restock',1,'') ],'Laminar anclas grandes'),
    D('Sem 3','Mar',[ J('s3m1','Cajita costurera #1',5,'Ancla; crema con acento coral.'), J('s3m2','Cajita bobinas restock',1.5,''), J('s3m3','Llaveros',1.5,'') ],'Reel ancla grande (IG + TikTok)'),
    D('Sem 3','Mié',[ J('s3x1','Mini estantería #1',6,'Ancla; parte temprano.'), J('s3x2','Saca-costura',1.8,'') ],'Post pieza premium (IG+FB) · iniciar boost de TikTok Ads sobre el timelapse top'),
    D('Sem 3','Jue',[ J('s3j1','Porta-ovillos #2',6,'2da unidad.'), J('s3j2','Batch chicos',1.5,'') ],'Fotos en contexto'),
    D('Sem 3','Vie',[ J('s3v1','Cajita costurera #2',5,''), J('s3v2','Organizador restock',3,'') ],'Cierre de catálogo · revisar costo por resultado de la pauta'),
    D('Sem 3','Sáb',[ J('s3s1','Mini estantería #2',6,'') ],'Preparar contenido de cierre (Semana 4): recopilatorio + encuesta'),
    D('Sem 4','Lun',[ J('s4l1','Restock top ventas #1',3,'Reponer los productos con más pedidos de Sem 1-3.') ],'Grabar reel recopilatorio "lo que más gustó"'),
    D('Sem 4','Mar',[ J('s4m1','Restock top ventas #2',3,'') ],'IG+FB: post-resumen del lanzamiento + encuesta en Stories (próximos productos a producir)'),
    D('Sem 4','Mié',[ J('s4x1','Batch chicos (llaveros/letras)',1.5,'') ],'TikTok: video recopilatorio de la campaña'),
    D('Sem 4','Jue',[ J('s4j1','Restock según encuesta',3,'Ajustar según lo que pidió la encuesta de Stories.') ],'Último refuerzo de pauta paga (Meta + TikTok) sobre la pieza de mejor desempeño'),
    D('Sem 4','Vie',[ J('s4v1','Buffer / reimpresión',3,'') ],'Cerrar informe de resultados de campaña: ventas por producto, alcance, costo por resultado')
  ];
})();
