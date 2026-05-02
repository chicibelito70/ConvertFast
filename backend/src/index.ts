import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rutasSubida from './routes/uploadRoutes';
import rutasConversion from './routes/conversionRoutes';
import './workers/conversion.worker';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PUERTO = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Carpetas estáticas para descargas (opcional si se usa R2)
app.use('/descargas', express.static(path.join(__dirname, 'outputs')));

// Rutas
app.use('/api/upload', rutasSubida);
app.use('/api/convert', rutasConversion);

// Verificación de estado del servidor
app.get('/salud', (req, res) => {
  res.status(200).json({ estado: 'ok', mensaje: 'La API de ConvertFast está funcionando' });
});

const servidor = app.listen(PUERTO, () => {
  console.log(`El servidor está corriendo en el puerto ${PUERTO}`);
});

const apagarServidor = (senal: string) => {
  console.log(`${senal} recibido, deteniendo servidor Express...`);
  servidor.close(() => {
    console.log('Servidor HTTP detenido.');
  });
};

process.on('SIGTERM', () => apagarServidor('SIGTERM'));
process.on('SIGINT', () => apagarServidor('SIGINT'));
