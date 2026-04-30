import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const uploadDir = path.join(__dirname, '../../uploads');
const outputDir = path.join(__dirname, '../../outputs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const worker = new Worker('conversion-queue', async (job: Job) => {
  const { fileId, targetFormat, jobId } = job.data;
  const inputPath = path.join(uploadDir, fileId);
  const outputFileName = `${jobId}.${targetFormat}`;
  const outputPath = path.join(outputDir, outputFileName);

  console.log(`Starting conversion: ${fileId} -> ${targetFormat}`);

  const ext = path.extname(fileId).toLowerCase().replace('.', '');
  
  try {
    // 1. IMAGE CONVERSIONS (Sharp)
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(targetFormat) && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await sharp(inputPath).toFile(outputPath);
      return outputFileName;
    }

    // 2. AUDIO/VIDEO CONVERSIONS (FFmpeg)
    if (['mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'webm'].includes(targetFormat)) {
      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat(targetFormat)
          .on('progress', (progress) => {
            job.updateProgress(progress.percent || 0);
          })
          .on('end', () => resolve(outputFileName))
          .on('error', (err) => reject(err))
          .save(outputPath);
      });
    }

    // 3. DOCUMENT CONVERSIONS (LibreOffice)
    // Requires libreoffice installed on the system
    if (['pdf', 'docx', 'txt', 'xlsx', 'csv', 'pptx'].includes(targetFormat)) {
       // Check if we should use 'soffice' (Windows) or 'libreoffice' (Linux/Docker)
       let libreOfficeCmd = 'libreoffice';
       try {
         await execPromise('libreoffice --version');
       } catch (e) {
         libreOfficeCmd = 'soffice';
       }

       const command = `${libreOfficeCmd} --headless --convert-to ${targetFormat} "${inputPath}" --outdir "${outputDir}"`;
       await execPromise(command);
       
       // LibreOffice keeps the original filename but changes extension
       const originalBase = path.basename(fileId, path.extname(fileId));
       const libreOfficeOutput = path.join(outputDir, `${originalBase}.${targetFormat}`);
       
       if (fs.existsSync(libreOfficeOutput)) {
         fs.renameSync(libreOfficeOutput, outputPath);
         return outputFileName;
       } else {
         throw new Error('LibreOffice conversion failed to produce file');
       }
    }

    // 4. ARCHIVE CONVERSIONS (7-Zip)
    if (['zip', '7z'].includes(targetFormat)) {
      if (ext === 'zip' && targetFormat === '7z') {
        await execPromise(`7z a "${outputPath}" "${inputPath}"`);
      } else if (ext === '7z' && targetFormat === 'zip') {
        // Extract 7z then zip
        const tempExtractDir = path.join(uploadDir, `extract_${jobId}`);
        fs.mkdirSync(tempExtractDir, { recursive: true });
        await execPromise(`7z x "${inputPath}" -o"${tempExtractDir}"`);
        await execPromise(`7z a -tzip "${outputPath}" "${tempExtractDir}/*"`);
        // Cleanup temp
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      return outputFileName;
    }

    throw new Error(`Unsupported conversion: ${ext} to ${targetFormat}`);
  } catch (error: any) {
    console.error('Conversion error:', error);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

console.log('Conversion worker is running...');
