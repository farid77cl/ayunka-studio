# Ayünka Studio

App web (PWA) para gestionar la producción de **Ayünka Crea** — accesorios 3D para costura. Consolida costeo de impresión, inventario, cotizaciones y planificación en una sola herramienta que funciona en el navegador, **offline**, y es instalable en el celular.

## Qué hace

- **Diseño 3D** — crea llaveros publicitarios, letreros con luz LED, letras con nombre y
  recuerdos de nacimiento sin salir de la app, y exporta el **3MF con los colores puestos**
  para el CFS de la K2 Combo.
  Ver «[Diseño 3D](#diseño-3d-taller--diseño-3d)» más abajo.
- **Productos** — costo de producción por pieza (filamento, luz, amortización, mano de obra, empaque y **merma**) y **precio sugerido** con tu margen. Cada producto puede tener **foto**, un **filamento asociado** (usa el precio real de esa marca/rollo, no un promedio) y uno o varios **archivos STL/3MF** que se abren con un clic para laminar.
- **Filamentos** — inventario por marca y color; cada rollo con su propio precio y costo por gramo, con alertas de stock bajo. Como tienes PLA de distintas marcas, cada producto toma el costo del filamento que le asocies.
- **Placas** — costea una placa completa con varias piezas (tiempo de impresión compartido) y descuenta filamento del inventario.
- **Clientes (CRM)** — tu cartera de clientes con datos guardados; se crean solos al cotizar y quedan para reutilizar.
- **Cotizaciones** — arma una cotización con productos **o ítems libres** (cualquier cosa fuera del catálogo), asociada a un cliente, y **expórtala en PDF** con el logo y la marca Ayünka. El precio de cada producto refleja el costo de su filamento específico.
- **Planificación** — cronograma por día con barra de capacidad (ventana de 13 h) y estados (pendiente / imprimiendo / listo).
- **Ajustes** — parámetros de costeo y datos del negocio. Respaldo por exportación/importación JSON.

Los datos se guardan en el dispositivo: textos y parámetros en `localStorage`; las **fotos y archivos STL** en `IndexedDB` (soportan archivos grandes). No requiere servidor ni conexión.

### Abrir un STL para laminar
En un producto, «Abrir» descarga el archivo guardado; si tu computador asocia `.stl`/`.3mf` con OrcaSlicer (u otro laminador), se abre directamente ahí. En la versión nativa Android (Capacitor) puede integrarse apertura nativa.

## Usar en el computador

Abre `index.html` en el navegador (doble clic), o sírvelo localmente:

```bash
npx serve .
```

## Publicar gratis en GitHub Pages

1. Crea un repositorio en GitHub (ej. `ayunka-studio`) y sube esta carpeta:
   ```bash
   git init && git add -A && git commit -m "Ayünka Studio v1"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/ayunka-studio.git
   git push -u origin main
   ```
2. En GitHub → **Settings → Pages** → Source: `main` / `/ (root)` → Save.
3. En 1-2 minutos queda en `https://TU-USUARIO.github.io/ayunka-studio/`.

## Instalar en Android (sin programar)

Es una **PWA**: abre la URL de GitHub Pages en **Chrome del celular** → menú ⋮ → **Agregar a pantalla de inicio**. Queda como una app, funciona offline y se actualiza sola.

## Migrar a app nativa Android (APK con Capacitor)

El proyecto ya viene configurado (`capacitor.config.json`). Con Node y Android Studio instalados:

```bash
npm run android:add     # instala Capacitor y agrega la plataforma Android
npm run android:open    # sincroniza y abre Android Studio para generar el APK
```

Como toda la app es web estática, el mismo código corre dentro del contenedor nativo sin reescribir nada.

## Estructura

```
index.html              · interfaz
css/styles.css          · estilos (paleta Ayünka)
js/store.js             · estado, persistencia y datos semilla
js/calc.js              · motor de costeo (filamento, luz, merma, margen)
js/pdf.js               · generación de cotizaciones PDF (jsPDF)
js/app.js               · router y módulos de la interfaz
js/d3d-formas.js        · Diseño 3D: figuras paramétricas y vectorizador de imágenes
js/d3d-fuentes.js       · Diseño 3D: texto a contornos (opentype.js)
js/d3d-build.js         · Diseño 3D: proyecto → sólidos → STL
js/d3d-3mf.js           · Diseño 3D: exportar 3MF multicolor (ZIP propio)
js/design3d.js          · Diseño 3D: lienzo 2D, capas y vista 3D
manifest.webmanifest    · PWA
sw.js                   · service worker (offline)
capacitor.config.json   · configuración para wrap nativo Android
```

## Respaldo

Ajustes → **Exportar (JSON)** descarga todos tus datos. Guárdalo de vez en cuando; con **Importar** los restauras en cualquier dispositivo.

---
*Bordamos. Creamos. Siempre con cariño.*


## Modelo de costo

El costo de cada pieza se calcula como: **plástico** (gramos × precio del filamento asociado, con recargo por multicolor) + **electricidad** (horas × consumo × tarifa) + **operario** (prep + postproducción × valor hora) + **amortización** de la impresora (costo ÷ años × días × horas) + **empaque**, y sobre ese subtotal se suma la **tasa de fallos**. El precio sugerido = costo × multiplicador. Todo es editable en Ajustes. El tiempo de impresión se ingresa en **horas y minutos**.

## Cotización (PDF)

El PDF lleva el logo y la paleta Ayünka, e incluye automáticamente las **condiciones de pago** (50% de abono para iniciar, saldo contra entrega) y el **tiempo estimado de producción** en días, calculado a partir de las horas de impresión de los productos cotizados — para que un pedido que tarda varios días en imprimirse quede especificado y no se prometa en menos tiempo.

## Sincronización en la nube (celular ⇄ PC)

La app está configurada para sincronizarse de forma automática y transparente en todos tus dispositivos mediante **Firebase** (inicio de sesión anónimo):

1. **Configuración centralizada (`js/config.js`):** La app lee el objeto `firebaseConfig` y la configuración de Supabase desde `window.AYUNKA_CONFIG` en el archivo [config.js](file:///c:/Users/loren/OneDrive/Documentos/negocio-accesorios-3d-costura/ayunka-studio/js/config.js). Esto evita tener que introducir claves en cada dispositivo manualmente.
2. **Sincronización silenciosa:** Al abrir la app en tu PC o celular, esta iniciará una sesión anónima en Firebase y se conectará automáticamente al espacio (`workspace`) configurado (por defecto, `"ayunka"`). Cualquier cambio en productos, filamentos o pedidos se reflejará al instante en todos tus dispositivos.
3. **Almacenamiento de fotos y STL (Supabase):** Las imágenes y archivos 3D se suben automáticamente a tu bucket de Supabase si está configurado en `js/config.js`, lo que permite que se vean en cualquier celular o PC sincronizado. Puedes migrar archivos que hayan quedado guardados localmente desde **Ajustes -> Migración de Archivos**.

## Seguridad y Reglas de Firestore

Dado que la aplicación web es pública (en GitHub Pages), los datos están protegidos por las reglas de seguridad de tu base de datos de Firebase:

1. **Reglas de Acceso (`firestore.rules`):** La base de datos solo permite leer y escribir datos a usuarios autenticados mediante las siguientes reglas:
   ```javascript
   match /studios/{doc} {
     allow read, write: if request.auth != null;
   }
   ```
   Esto asegura que solo las conexiones originadas desde tu app (que inicia sesión de forma anónima automáticamente) puedan consultar o modificar tus colecciones.
2. **Acceso exclusivo:** Cualquiera que abra tu URL web compartirá el mismo espacio si está configurado en el código, por lo que se recomienda mantener tu URL de GitHub Pages e ID de proyecto privada o cambiar el nombre del `workspace` en `js/config.js` a un valor único y secreto (ej. `"ayunka-secreto-123"`).
3. **Inactividad de Supabase (Importante):** En la versión gratuita de Supabase, los servidores se pausan automáticamente tras 7 días de inactividad. Si las fotos o STL no cargan, ve a tu panel de Supabase y haz clic en **Restore Project** (Restaurar proyecto) para encenderlo de nuevo.

## Pestaña Impresiones (Taller → Impresiones)

Lo que sale de la **Creality K2** llega aquí como pendiente, con los **gramos y horas reales**
que midió la máquina — no los estimados del rebanador — y un precio sugerido calculado con la
fórmula de la calculadora.

- **Aprobar** abre el formulario de producto prellenado. Ahí le agregas el **costo extra**
  (el LED de la caja de luz, un imán, una borla), la foto y el archivo para reimprimir.
- **Descartar** lo saca de la lista. Se puede devolver a pendientes.
- Las decisiones viven en `DB.bandeja`, así que aguantan una recarga de la bandeja.

La lista sale de `impresion/bandeja.json` en Supabase, que escribe el flujo de n8n
*Recibir historial de la K2*. Como la impresora está en otra red que n8n, el dato lo lleva el
navegador: ver `../sesion-log.md`, sesión 17 y 18.

**El extra entra antes del markup**, igual que el empaque: un LED de $2.500 suma $2.822 al
costo (por el buffer de fallas) y unos $10.000 al precio sugerido con el ×3,5 actual.

## Diseño 3D (Taller → Diseño 3D)

Un compositor por **capas**, no un molde cerrado: se parte de una plantilla y se le
agrega o quita lo que sea. Todo — texto, figuras y las imágenes que subas — termina
siendo un contorno, así que se trata igual y se puede mezclar sin límite.

**Cómo se trabaja.** En «Componer» se arma con el mouse; en «Ver en 3D» se revisa
girándolo. Se guarda solo mientras editas, y los diseños quedan en «Mis diseños».

| Con el mouse | |
|---|---|
| Arrastrar la pieza | La mueve (se imanta al centro) |
| Cuadritos de las esquinas | Cambian el tamaño |
| Cuadritos del medio | Estiran **un solo lado** |
| Perilla de arriba | **Gira** la pieza |
| Rueda | Acerca y aleja, hacia donde apunta el cursor |
| Arrastrar el fondo | Corre la vista · un clic sin mover suelta la selección |
| **Shift** | Al girar va de 15° en 15°; al escalar mantiene la proporción |

En **Ver en 3D** también se edita: arrastra una pieza para moverla, con **Shift** la subes
y la bajas (altura Z), y arrastrando el fondo giras la cámara.

| Con el teclado | |
|---|---|
| Flechas | Mueven 0,5 mm (con **Shift**, 5 mm) |
| `[` y `]` | Giran 1° (con **Shift**, 15°) |
| **Supr** | Quita la capa · **Esc** suelta la selección |
| **Ctrl+D** | Duplica |

Los tiradores **giran junto con la pieza**, así que estirar algo torcido sigue siendo
natural, y la esquina contraria se queda clavada donde estaba en vez de irse sola.

El encuadre **no se recalcula mientras trabajas**: si dependiera del contenido, arrastrar
una pieza hacia afuera reescalaría toda la vista y se sentiría como que el diseño huye del
dedo. Se reencuadra al abrir, al cambiar de plantilla y con el botón «Centrar».

### Qué se puede poner

- **Texto** — 14 tipografías reales (cursivas como Pacifico o Great Vibes, palo seco,
  redondeadas). Acentos y ñ salen bien. Varias líneas, alineación, separación de letras y
  **estirado** (letras condensadas o altas) sin tocar el tamaño nominal.
- **Figuras** — 39 formas en dos grupos, con parámetros propios (las puntas de la
  estrella, los pétalos de la flor):
  - *Formas y adornos*: nube, luna, estrella, flor, corazón, osito, conejo, huellita,
    mariposa, moño, carrete de hilo, botón, hueso…
  - *Escolar*: lápiz, libro, manzana, mochila, regla, pizarra, birrete, campana, bus,
    cohete, paleta de pintura, avión de papel, nota musical, tijeras.
- **Imágenes** — subes un PNG o JPG (un logo, un dibujo) y se convierte en relieve. El
  control de **umbral** decide qué parte es sólida; conserva los huecos (la contraforma
  de una «O», el centro de una dona) y descarta las manchitas sueltas.

Cada capa lleva su color, su posición, su giro y **cómo se apoya**:

- **En relieve** — sobresale. Con **Altura Z** se sube o se hunde respecto de la cara de la
  base: es lo que hace falta cuando la base es una letra de 40 mm y el nombre tiene que
  quedar metido en su cara y no flotando arriba de todo. Los atajos «A media altura» y
  «Hundir» lo resuelven sin pelear con el número.
- **Grabada** — hundida en la base, a la profundidad que elijas. Deja las contraformas
  (el centro de la «o») **apoyadas en el fondo**, así que no se caen.
- **Calada** — atraviesa de lado a lado, para que pase la luz. Aquí las contraformas sí
  quedan sueltas y la app avisa cuántas son.

La **base** puede ser una figura, una letra o palabra, **una imagen tuya** o nada (piezas
sueltas). Si una capa se sale del contorno de la base, la app avisa de que esa parte queda
al aire y pedirá soportes.

### Plantillas de partida

| | |
|---|---|
| Llavero publicitario | Placa con la marca y el agujero de la argolla |
| Llavero con imagen | Para subir un logo y volverlo 3D |
| Letra con nombre | Letra gruesa, con el nombre en cursiva por delante |
| Letrero con nombre | Placa con orificios para colgar |
| Caja de luz LED | Frente difusor + marco + tapa |
| Recuerdo de nacimiento | Nube con nombre, fecha, medidas y adornos |
| Desde cero | Una placa vacía |

### La luz

Dos caminos, según lo que quieras:

- **Retroiluminado** — no agrega piezas. La gracia está en imprimir en PLA **blanco o
  translúcido** con 2 paredes y 15-20 % de relleno, y pegar la tira LED por detrás.
- **Caja de luz** — genera tres piezas que se imprimen por separado: el **frente**
  (difusor), el **marco** (con el reborde donde apoya el frente) y la **tapa trasera**
  con su salida de cable. Además calcula **cuánta tira LED comprar** a partir del
  contorno real.

### Exportar para la K2 Combo

**Usa 3MF.** El STL *no guarda color* — es una lista de triángulos y nada más — así que
una pieza pensada en cuatro colores llega al laminador como un bloque de uno solo. El 3MF
sí lo guarda: al abrirlo en **Creality Print**, cada parte ya viene asignada a su carrete
del CFS.

El archivo se escribe con el formato de **Creality Print / OrcaSlicer / Bambu Studio**:
cada color es un objeto con su propia malla, un objeto contenedor los junta con
`<components>`, y `Metadata/model_settings.config` le da a cada `<part>` su número de
extrusor. **Ojo con esto**: PrusaSlicer usa otra variante (una sola malla con los colores
como rangos de triángulos en `<volume firstid lastid>`). Son incompatibles — si se escribe
la de PrusaSlicer, Creality Print carga la pieza entera de un solo color sin avisar de nada.
Aquí se usa la de Creality a propósito.

Quedan también las salidas en STL, por si hacen falta:

- **Un STL por color** — hay que cargar **todos** los archivos juntos; quedan alineados y
  a cada uno le asignas su carrete. Si cargas uno solo, sale una parte suelta.
- **Un STL por pieza** — para la caja de luz, que se imprime en tandas distintas.
- **Todo en uno** — solo si vas a imprimir en un color.

También puede **guardarse como producto**, que sube los archivos y crea la ficha para costearlo.

### Trampas de esta pestaña

- **El relieve bajo 0.8 mm casi no se ve** con boquilla de 0.4. La app avisa.
- **Calar texto suelta las contraformas**: el centro de la «o» se cae, porque no queda
  unido a nada. La app lo advierte y cuenta cuántas son.
- **Las tipografías se bajan de internet** la primera vez y quedan guardadas en el
  dispositivo; después funciona sin conexión. Sin internet y sin haberlas usado antes,
  no hay texto.
- **No hay booleanas 3D** a propósito. Los huecos se hacen en 2D y las cajas se arman
  por partes; los laminadores unen sólidos que se solapan. Es menos vistoso por dentro
  y mucho menos frágil.
- **Las medidas mandan sobre la proporción**: si pones 65 × 28 la placa mide eso, aunque
  la figura se estire. Las imágenes son la excepción — nunca se deforman.
- **El STL no lleva color, nunca.** Si la pieza sale de un solo color en el laminador, es
  que se exportó en STL: usa el 3MF.
