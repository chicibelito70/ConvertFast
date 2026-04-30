import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { obtenerUrlDescarga } from '../services/storage.service';

const router = Router();

const conexionRedis = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

const colaConversion = new Queue('conversion-queue', { connection: conexionRedis });

// Iniciar una nueva conversión
router.post('/', async (req, res) => {
  const { fileId, targetFormat } = req.body;

  if (!fileId || !targetFormat) {
    return res.status(400).json({ error: 'Faltan datos requeridos (fileId, targetFormat)' });
  }

  const idTarea = uuidv4();

  try {
    await colaConversion.add('convertir', {
      fileId,
      targetFormat,
      jobId: idTarea,
    }, { jobId: idTarea });

    res.json({ mensaje: 'Conversión iniciada', jobId: idTarea });
  } catch (error) {
    console.error('Error al añadir a la cola:', error);
    res.status(500).json({ error: 'No se pudo iniciar la conversión' });
  }
});

// Consultar el estado de una conversión
router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const tarea = await colaConversion.getJob(jobId);

    if (!tarea) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const estado = await tarea.getState();
    
    if (estado === 'completed') {
        const nombreArchivoSalida = tarea.returnvalue;
        const urlDescarga = await obtenerUrlDescarga(nombreArchivoSalida);
        
        return res.json({
            status: 'completed',
            downloadUrl: urlDescarga
        });
    }

    res.json({
      status: estado,
      progress: tarea.progress,
      error: tarea.failedReason,
    });
  } catch (error) {
    console.error('Error al consultar estado:', error);
    res.status(500).json({ error: 'Error al consultar el estado de la tarea' });
  }
});

export default router;
