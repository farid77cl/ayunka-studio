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

Para que la app se actualice en todos tus dispositivos, usa Firebase (gratis):
1. Crea un proyecto en https://console.firebase.google.com
2. Activa **Firestore Database** (modo producción) y **Authentication → Anonymous**.
3. En Configuración del proyecto copia el objeto `firebaseConfig`.
4. En la app: **Ajustes → Sincronización en la nube**, pega el config, define un nombre de espacio y pulsa Activar.
5. Repite el paso 4 (mismo config y espacio) en el celular. Los cambios se sincronizan solos.

La app debe estar publicada en https (GitHub Pages) para sincronizar. Las fotos y archivos STL no se sincronizan por ahora (quedan en cada dispositivo).


## Seguridad (importante)

La app publicada es pública (cualquiera puede abrir la página), pero **no contiene tus datos**: viven en tu navegador y, al sincronizar, en tu Firebase protegido por tu cuenta. Para que **solo tú** accedas a tus datos:

1. **Firebase → Authentication → Sign-in method:** activa **Email/Password**.
2. **Firebase → Firestore → Rules:** pega el contenido de `firestore.rules` (reemplaza el email por el tuyo) y pulsa **Publish**. Esto bloquea el acceso a cualquiera que no sea tu cuenta.
3. **En la app (Ajustes → Sincronización):** pega el firebaseConfig, tu **email** y una **contraseña**, y activa. Usa el **mismo email y contraseña** en el celular y el PC para que se sincronicen entre sí.
4. (Opcional, recomendado) En Google Cloud → Credenciales, **restringe la API key** por "Referentes HTTP" a tu dominio `https://TU-USUARIO.github.io/*`.

GitHub Pages sirve la app por **HTTPS** automáticamente. El `firebaseConfig` no es secreto (la seguridad real son las reglas + tu login); aun así, tu email/contraseña se guardan solo en tu dispositivo.

