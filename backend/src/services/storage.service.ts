import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Limpiar el endpoint para quitar la barra final si existe
const endpoint = process.env.R2_ENDPOINT?.replace(/\/$/, '');

const clienteR2 = new S3Client({
  region: 'auto', 
  endpoint: endpoint,
  forcePathStyle: true, // ¡CRÍTICO para Cloudflare R2!

  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const NOMBRE_BUCKET = process.env.R2_BUCKET_NAME;

/**
 * Sube un archivo local a Cloudflare R2
 */
export const subirArchivo = async (rutaArchivo: string, nombreArchivo: string): Promise<string> => {
  const flujoArchivo = fs.createReadStream(rutaArchivo);
  
  const parametrosSubida = {
    Bucket: NOMBRE_BUCKET,
    Key: nombreArchivo,
    Body: flujoArchivo,
  };

  await clienteR2.send(new PutObjectCommand(parametrosSubida));
  return nombreArchivo;
};

/**
 * Genera una URL firmada para descargar un archivo de R2
 */
export const obtenerUrlDescarga = async (nombreArchivo: string): Promise<string> => {
  const comando = new GetObjectCommand({
    Bucket: NOMBRE_BUCKET,
    Key: nombreArchivo,
    ResponseContentDisposition: `attachment; filename="${nombreArchivo}"`
  });

  // URL válida por 1 hora (3600 segundos)
  const url = await getSignedUrl(clienteR2, comando, { expiresIn: 3600 });
  console.log('URL de descarga generada:', url);
  return url;
};

/**
 * Descarga un archivo de R2 a la ruta local especificada
 */
export const descargarDesdeR2 = async (nombreArchivo: string, rutaDestino: string): Promise<void> => {
    const comando = new GetObjectCommand({
        Bucket: NOMBRE_BUCKET,
        Key: nombreArchivo,
    });

    const respuesta = await clienteR2.send(comando);
    const cuerpo = respuesta.Body as any;

    return new Promise((resolve, reject) => {
        const escritor = fs.createWriteStream(rutaDestino);
        cuerpo.pipe(escritor);
        escritor.on('finish', resolve);
        escritor.on('error', reject);
    });
};
