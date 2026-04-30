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

const conexionRedis = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
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

  try {
    console.log(`Descargando ${fileId} desde R2...`);
    await descargarDesdeR2(fileId, rutaEntrada);

    const extension = path.extname(fileId).toLowerCase().replace('.', '');
    
    // 1. IMÁGENES
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(targetFormat) && ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) {
      await sharp(rutaEntrada).toFile(rutaSalida);
    }
    // 2. AUDIO/VIDEO
    else if (['mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'webm'].includes(targetFormat)) {
      await new Promise((resolve, reject) => {
        ffmpeg(rutaEntrada)
          .toFormat(targetFormat)
          .on('end', () => resolve(nombreArchivoSalida))
          .on('error', (err) => reject(err))
          .save(rutaSalida);
      });
    }
    // 3. CASOS ESPECIALES (PDF y DOCUMENTOS)
    else if (extension === 'pdf' && targetFormat === 'docx') {
       console.log('Usando pdf2docx...');
       await ejecutarComando(`python3 -c "from pdf2docx import Converter; cv = Converter('${rutaEntrada}'); cv.convert('${rutaSalida}'); cv.close()"`);
    }
    else if (extension === 'pdf' && targetFormat === 'txt') {
       console.log('Usando pdftotext...');
       await ejecutarComando(`pdftotext "${rutaEntrada}" "${rutaSalida}"`);
    }
    else if (extension === 'pdf' && targetFormat === 'epub') {
       console.log('Conversión compleja: PDF -> EPUB (vía DOCX temporal)...');
       const rutaTemporalDocx = path.join(carpetaSalidas, `${jobId}_temp.docx`);
       
       // Paso A: PDF a Word temporal
       await ejecutarComando(`python3 -c "from pdf2docx import Converter; cv = Converter('${rutaEntrada}'); cv.convert('${rutaTemporalDocx}'); cv.close()"`);
       
       // Paso B: Word temporal a EPUB
       await ejecutarComando(`pandoc "${rutaTemporalDocx}" -o "${rutaSalida}"`);
       
       // Limpieza del archivo temporal
       if (fs.existsSync(rutaTemporalDocx)) fs.unlinkSync(rutaTemporalDocx);
    }
    else if (targetFormat === 'epub') {
       console.log('Usando Pandoc para EPUB...');
       await ejecutarComando(`pandoc "${rutaEntrada}" -o "${rutaSalida}"`);
    }
    // 4. DOCUMENTOS GENERALES (LibreOffice)
    else if (['pdf', 'docx', 'txt', 'xlsx', 'csv', 'pptx'].includes(targetFormat)) {
       let comandoLibreOffice = 'libreoffice';
       try { await ejecutarComando('libreoffice --version'); } catch (e) { comandoLibreOffice = 'soffice'; }

       const comando = `${comandoLibreOffice} --headless --convert-to ${targetFormat} "${rutaEntrada}" --outdir "${carpetaSalidas}"`;
       console.log(`Ejecutando LibreOffice: ${comando}`);
       await ejecutarComando(comando);
       
       const baseOriginal = path.basename(fileId, path.extname(fileId));
       const salidaLibreOffice = path.join(carpetaSalidas, `${baseOriginal}.${targetFormat}`);
       
       if (fs.existsSync(salidaLibreOffice)) {
         fs.renameSync(salidaLibreOffice, rutaSalida);
       } else {
         throw new Error('La conversión de documentos falló');
       }
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

    console.log(`Subiendo resultado ${nombreArchivoSalida} a R2...`);
    await subirArchivo(rutaSalida, nombreArchivoSalida);

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
