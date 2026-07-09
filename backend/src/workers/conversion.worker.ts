import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { descargarDesdeR2, subirArchivo } from '../services/storage.service';

const ejecutarComando = promisify(exec);

const redisUrl = process.env.REDIS_URL?.replace(/^["']|["']$/g, '');

const conexionRedis = redisUrl 
  ? new IORedis(redisUrl, { 
      maxRetriesPerRequest: null,
      family: 0,
      ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
    })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

const carpetaSubidas = path.join(__dirname, '../../uploads');
const carpetaSalidas = path.join(__dirname, '../../outputs');

if (!fs.existsSync(carpetaSubidas)) fs.mkdirSync(carpetaSubidas, { recursive: true });
if (!fs.existsSync(carpetaSalidas)) fs.mkdirSync(carpetaSalidas, { recursive: true });

const procesador = new Worker('conversion-queue', async (tarea: Job) => {
  const { fileId, targetFormat, jobId } = tarea.data;
  
  const rutaEntrada = path.join(carpetaSubidas, fileId);
  const nombreArchivoSalida = `${jobId}.${targetFormat}`;
  const rutaSalida = path.join(carpetaSalidas, nombreArchivoSalida);

  console.log(`Iniciando conversión: ${fileId} -> ${targetFormat}`);
  await tarea.updateProgress(10);

  try {
    console.log(`Descargando ${fileId} desde R2...`);
    await descargarDesdeR2(fileId, rutaEntrada);
    await tarea.updateProgress(30);

    const extension = path.extname(fileId).toLowerCase().replace('.', '');
    
    // 1. IMÁGENES
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(targetFormat) && ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) {
      await sharp(rutaEntrada).toFile(rutaSalida);
      await tarea.updateProgress(60);
    }
    // 2. AUDIO/VIDEO
    else if (['mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'webm'].includes(targetFormat)) {
      await new Promise((resolve, reject) => {
        ffmpeg(rutaEntrada)
          .toFormat(targetFormat)
          .on('progress', (prog: any) => {
            if (prog.percent) tarea.updateProgress(Math.round(30 + prog.percent * 0.5));
          })
          .on('end', () => {
            tarea.updateProgress(60);
            resolve(nombreArchivoSalida);
          })
          .on('error', (err) => reject(err))
          .save(rutaSalida);
      });
    }
    // 3. CASOS ESPECIALES (PDF y DOCUMENTOS)
    else if (extension === 'pdf' && targetFormat === 'docx') {
       console.log('Usando pdf2docx...');
       await tarea.updateProgress(40);
       await ejecutarComando(`python3 -c "from pdf2docx import Converter; cv = Converter('${rutaEntrada}'); cv.convert('${rutaSalida}'); cv.close()"`);
       await tarea.updateProgress(70);
    }
    else if (extension === 'pdf' && targetFormat === 'txt') {
       console.log('Usando pdftotext...');
       await tarea.updateProgress(40);
       await ejecutarComando(`pdftotext "${rutaEntrada}" "${rutaSalida}"`);
       await tarea.updateProgress(70);
    }
    else if (extension === 'pdf' && targetFormat === 'epub') {
       console.log('Conversión compleja: PDF -> EPUB (vía DOCX temporal)...');
       const rutaTemporalDocx = path.join(carpetaSalidas, `${jobId}_temp.docx`);
       
       await tarea.updateProgress(40);
       // Paso A: PDF a Word temporal
       await ejecutarComando(`python3 -c "from pdf2docx import Converter; cv = Converter('${rutaEntrada}'); cv.convert('${rutaTemporalDocx}'); cv.close()"`);
       await tarea.updateProgress(55);
       
       // Paso B: Word temporal a EPUB
       await ejecutarComando(`pandoc "${rutaTemporalDocx}" -o "${rutaSalida}"`);
       await tarea.updateProgress(70);
       
       // Limpieza del archivo temporal
       if (fs.existsSync(rutaTemporalDocx)) fs.unlinkSync(rutaTemporalDocx);
    }
    else if (targetFormat === 'epub') {
       console.log('Usando Pandoc para EPUB...');
       await tarea.updateProgress(40);
       await ejecutarComando(`pandoc "${rutaEntrada}" -o "${rutaSalida}"`);
       await tarea.updateProgress(70);
    }
    // 4. DOCUMENTOS GENERALES (LibreOffice)
    else if (['pdf', 'docx', 'txt', 'xlsx', 'csv', 'pptx'].includes(targetFormat)) {
       let comandoLibreOffice = 'libreoffice';
       try { await ejecutarComando('libreoffice --version'); } catch (e) { comandoLibreOffice = 'soffice'; }

       // AUDITORÍA: LibreOffice falla al ejecutarse como root en Docker. 
       // Solución: Aislar el perfil de usuario por cada tarea usando -env:UserInstallation
       const perfilTemp = `file:///tmp/LibreOffice_${jobId}`;
       const comando = `${comandoLibreOffice} -env:UserInstallation=${perfilTemp} --headless --convert-to ${targetFormat} "${rutaEntrada}" --outdir "${carpetaSalidas}"`;
       
       console.log(`Ejecutando LibreOffice: ${comando}`);
       // Tiempo límite de 5 minutos (300000 ms) para evitar que se quede colgado
       await ejecutarComando(comando, { timeout: 300000 });
       
       const baseOriginal = path.basename(fileId, path.extname(fileId));
       const salidaLibreOffice = path.join(carpetaSalidas, `${baseOriginal}.${targetFormat}`);
       
       if (fs.existsSync(salidaLibreOffice)) {
         fs.renameSync(salidaLibreOffice, rutaSalida);
       } else {
         throw new Error('La conversión de documentos falló (LibreOffice no generó salida)');
       }
       
       // Limpiar el perfil temporal
       try { await ejecutarComando(`rm -rf /tmp/LibreOffice_${jobId}`); } catch(e) {}
    }
    // 5. ARCHIVOS COMPRIMIDOS
    else if (['zip', '7z'].includes(targetFormat)) {
      if (extension === 'zip' && targetFormat === '7z') {
        await ejecutarComando(`7z a "${rutaSalida}" "${rutaEntrada}"`);
      } else if (extension === '7z' && targetFormat === 'zip') {
        const carpetaTemp = path.join(carpetaSubidas, `extract_${jobId}`);
        fs.mkdirSync(carpetaTemp, { recursive: true });
        await ejecutarComando(`7z x "${rutaEntrada}" -o"${carpetaTemp}"`);
        await ejecutarComando(`7z a -tzip "${rutaSalida}" "${carpetaTemp}/*"`);
        fs.rmSync(carpetaTemp, { recursive: true, force: true });
      }
    } else {
        throw new Error(`Conversión no soportada: ${extension} a ${targetFormat}`);
    }

    await tarea.updateProgress(80);
    console.log(`Subiendo resultado ${nombreArchivoSalida} a R2...`);
    await subirArchivo(rutaSalida, nombreArchivoSalida);
    await tarea.updateProgress(100);

    return nombreArchivoSalida;

  } catch (error: any) {
    console.error('Error en la conversión:', error);
    throw error;
  } finally {
    if (fs.existsSync(rutaEntrada)) fs.unlinkSync(rutaEntrada);
    if (fs.existsSync(rutaSalida)) fs.unlinkSync(rutaSalida);
  }
}, { connection: conexionRedis });

procesador.on('completed', (tarea) => console.log(`Tarea ${tarea.id} completada`));
procesador.on('failed', (tarea, err) => console.error(`Tarea ${tarea?.id} falló: ${err.message}`));

console.log('Worker listo con soporte inteligente de formatos...');

// Manejo de apagado seguro (Graceful Shutdown)
const apagarSuavemente = async (senal: string) => {
  console.log(`${senal} recibido, cerrando worker de manera segura...`);
  await procesador.close();
  console.log('Worker cerrado. Saliendo del proceso.');
  process.exit(0);
};

process.on('SIGTERM', () => apagarSuavemente('SIGTERM'));
process.on('SIGINT', () => apagarSuavemente('SIGINT'));
