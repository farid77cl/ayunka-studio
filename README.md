# Ayünka Studio

App web (PWA) para gestionar la producción de **Ayünka Crea** — accesorios 3D para costura. Consolida costeo de impresión, inventario, cotizaciones y planificación en una sola herramienta que funciona en el navegador, **offline**, y es instalable en el celular.

## Qué hace

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

