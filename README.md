# ConvertFast ⚡

ConvertFast es una plataforma premium de conversión de archivos diseñada para ser rápida, segura y fácil de usar.

## 🚀 Tecnologías
- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion.
- **Backend:** Node.js, Express, BullMQ.
- **Procesamiento:** FFmpeg, LibreOffice, Sharp.
- **Infraestructura:** Redis.

## 🛠️ Ejecución Local

Sigue estos pasos para poner en marcha el proyecto:

### 1. Requisitos Previos
Debes tener instalado en tu sistema:
- **Node.js** (v18 o superior)
- **Redis Server** (Corriendo en localhost:6379)
- **Herramientas de sistema:** FFmpeg, LibreOffice (añadido al PATH), ImageMagick, Pandoc y 7-Zip.

### 2. Configuración del Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Configuración del Frontend
```bash
cd frontend
npm install
npm run dev
```
Accede a http://localhost:3000

## 🔒 Privacidad y Seguridad
ConvertFast no almacena datos personales. Los archivos se procesan temporalmente y se eliminan automáticamente tras 1 hora de inactividad o después de la descarga exitosa.
