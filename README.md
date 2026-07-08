# ConvertFast ⚡

ConvertFast es una plataforma premium y en la nube para la conversión de archivos diseñada para ser ultrarrápida, segura y fácil de usar. Transforma documentos, imágenes, audio y video en segundos, sin necesidad de registros y totalmente gratis.

Hecho con ❤️ para el mundo por [Carlos Villavizar](https://carlosvillavizar.netlify.app/).

---

## 🌟 Características Principales

- **Conversión de Alta Velocidad**: Procesamiento asíncrono avanzado respaldado por BullMQ y Redis.
- **Soporte Masivo de Formatos**: Soporta más de 50 combinaciones de conversión, incluyendo:
  - **Documentos:** PDF a Word (DOCX), PDF a TXT, PDF a EPUB, Word a PDF, Excel a CSV, etc.
  - **Imágenes:** JPG/JPEG a PNG, WEBP, SVG.
  - **Audio:** MP3 a WAV, OGG.
  - **Video:** MP4 a AVI, MOV, WEBM.
  - **Comprimidos:** ZIP a 7Z y viceversa.
- **Auditoría de Seguridad Integrada**: Defensas nativas contra ataques de *Remote Code Execution (RCE)* y *Path Traversal*. Validaciones estrictas de entradas (RegEx) para asegurar el entorno.
- **Arquitectura Cloud-Native**: Preparado para escalar con Cloudflare R2 (almacenamiento), Upstash (Redis sin servidor), y contenedores Docker en Render.
- **Diseño Premium**: Interfaz construida con Next.js 14, Tailwind CSS y Framer Motion para una experiencia interactiva asombrosa.

---

## 🚀 Arquitectura Tecnológica

- **Frontend:** Next.js 14 (App Router), React Dropzone, Tailwind CSS, Framer Motion, Axios.
- **Backend:** Node.js, Express, TypeScript, BullMQ (Colas de tareas).
- **Procesamiento de Archivos:** FFmpeg, LibreOffice (en entorno Docker aislado), Sharp, Pandoc, Poppler-utils (pdftotext), 7-Zip.
- **Infraestructura Cloud:**
  - **Almacenamiento:** Cloudflare R2 (compatible con S3, región `auto` con `forcePathStyle`).
  - **Bases de Datos en Memoria:** Upstash Redis (TLS configurado para máxima compatibilidad con Node.js en la nube).
- **CI/CD:** GitHub Actions configurado para construcción de imágenes Docker y validación automática de dependencias.

---

## 🛠️ Ejecución Local

Sigue estos pasos para poner en marcha el proyecto en tu máquina:

### 1. Requisitos Previos
Debes tener instalado en tu sistema:
- **Node.js** (v18 o superior)
- **Redis Server** (Corriendo en `localhost:6379`) o una cuenta de Upstash Redis.
- **Herramientas de sistema:** FFmpeg, LibreOffice, Pandoc, 7-Zip, Python3 (con la librería `pdf2docx`).
*(Nota: Si usas Docker, todas las herramientas del sistema vienen preinstaladas en la imagen del backend).*

### 2. Configuración del Backend

Renombra el archivo `.env.example` a `.env` (o créalo si no existe) e ingresa tus credenciales:
```env
PORT=4000
REDIS_URL=redis://localhost:6379 # O tu URL de Upstash (rediss://...)
R2_ENDPOINT=https://<tu_cuenta>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<tu_access_key>
R2_SECRET_ACCESS_KEY=<tu_secret_key>
R2_BUCKET_NAME=<nombre_del_bucket>
```

Levanta el servidor:
```bash
cd backend
npm install
npm run dev
```

### 3. Configuración del Frontend

Abre otra terminal y configura las variables de entorno para el Frontend en `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXXXXX
```

Levanta el cliente:
```bash
cd frontend
npm install
npm run dev
```
Accede a http://localhost:3000

---

## ☁️ Despliegue en Producción (Cloud)

### Desplegando el Backend (Vía Docker/Render)
El backend cuenta con un `Dockerfile` optimizado (`node:20-slim`) que incluye todas las dependencias necesarias de procesamiento de video y documentos. 
Para desplegar en servicios como Render o Railway:
1. Conecta tu repositorio.
2. Selecciona despliegue tipo **Docker**.
3. Asegúrate de inyectar correctamente la variable de entorno `REDIS_URL` sin comillas explícitas y configurar las llaves de Cloudflare R2.

### Desplegando el Frontend (Vía Vercel)
Simplemente importa el directorio `frontend` a Vercel, y automáticamente detectará Next.js. Asegúrate de configurar la variable `NEXT_PUBLIC_API_URL` apuntando al dominio de tu backend desplegado.

---

## 🔒 Privacidad y Seguridad Reforzada

ConvertFast toma en serio la seguridad:
- **No almacena datos personales.**
- **Archivos Efímeros:** Los archivos en Cloudflare R2 generan URLs firmadas de uso único. Los archivos temporales se borran instántaneamente del contenedor de procesamiento.
- **Sandboxing:** LibreOffice es ejecutado con perfiles temporales únicos en Docker (`-env:UserInstallation`) para prevenir problemas de permisos *root* y colisiones de estado concurrente.

---

## 📜 Licencia

© ConvertFast. Todos los derechos reservados.
