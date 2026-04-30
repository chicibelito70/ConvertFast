import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { subirArchivo } from '../services/storage.service';

const router = Router();

// Configuración de almacenamiento temporal (Multer)
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => {
    const rutaSubidas = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(rutaSubidas)) fs.mkdirSync(rutaSubidas, { recursive: true });
    cb(null, rutaSubidas);
  },
  filename: (req, file, cb) => {
    const idUnico = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${idUnico}${extension}`);
  },
});

const subida = multer({ 
    storage: almacenamiento,
    limits: { fileSize: 100 * 1024 * 1024 } // Límite de 100MB
});

// Ruta para subir archivos
router.post('/', subida.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const archivo = req.file;
    const rutaLocal = archivo.path;
    const nombreArchivo = archivo.filename;

    // Subir a Cloudflare R2
    await subirArchivo(rutaLocal, nombreArchivo);

    // Eliminar archivo local después de subirlo a la nube
    if (fs.existsSync(rutaLocal)) {
      fs.unlinkSync(rutaLocal);
    }

    res.json({
      mensaje: 'Archivo subido con éxito a la nube',
      file: {
        id: nombreArchivo,
        name: archivo.originalname,
        size: archivo.size,
      },
    });
  } catch (error) {
    console.error('Error en la subida:', error);
    res.status(500).json({ error: 'Error al procesar el archivo en la nube' });
  }
});

export default router;
