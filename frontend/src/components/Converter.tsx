"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, File, ArrowRight, CheckCircle, XCircle, Loader2, Download, RefreshCcw } from "lucide-react"
import axios from "axios"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

const CONVERSIONES_SOPORTADAS: Record<string, string[]> = {
  // Documentos (Según imagen + EPUB)
  pdf: ["docx", "txt", "epub"],
  docx: ["pdf", "txt"],
  txt: ["pdf", "docx"],
  xlsx: ["csv"],
  csv: ["xlsx"],
  // Imágenes (Según imagen)
  jpg: ["png", "webp"],
  jpeg: ["png", "webp"],
  png: ["jpg", "webp", "svg"],
  webp: ["jpg", "png"],
  svg: ["png"],
  // Audio (Según imagen)
  mp3: ["wav", "ogg"],
  wav: ["mp3", "ogg"],
  ogg: ["mp3", "wav"],
  // Video (Según imagen)
  mp4: ["avi", "mov", "webm"],
  avi: ["mp4"],
  mov: ["mp4"],
  webm: ["mp4"],
}

type Estado = "INACTIVO" | "SUBIENDO" | "CONVIRTIENDO" | "LISTO" | "ERROR"

export default function Convertidor() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [formatoDestino, setFormatoDestino] = useState<string>("")
  const [estado, setEstado] = useState<Estado>("INACTIVO")
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [idTarea, setIdTarea] = useState<string | null>(null)
  const [urlDescarga, setUrlDescarga] = useState<string | null>(null)

  const alSoltar = useCallback((archivosAceptados: File[]) => {
    if (archivosAceptados.length > 0) {
      setArchivo(archivosAceptados[0])
      const ext = archivosAceptados[0].name.split(".").pop()?.toLowerCase() || ""
      const posibles = CONVERSIONES_SOPORTADAS[ext] || []
      if (posibles.length > 0) setFormatoDestino(posibles[0])
      setEstado("INACTIVO")
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: alSoltar, multiple: false })

  const iniciarConversion = async () => {
    if (!archivo || !formatoDestino) return
    try {
      setEstado("SUBIENDO")
      setProgreso(0)
      const datosForm = new FormData()
      datosForm.append("file", archivo)
      const resSubida = await axios.post(`${BASE_API}/upload`, datosForm, {
        onUploadProgress: (ev) => setProgreso(Math.round((ev.loaded * 100) / (ev.total || 1))),
      })
      setEstado("CONVIRTIENDO")
      setProgreso(0)
      const resConvertir = await axios.post(`${BASE_API}/convert`, { fileId: resSubida.data.file.id, targetFormat: formatoDestino })
      setIdTarea(resConvertir.data.jobId)
    } catch (err: any) {
      setError("Error en el servidor. Inténtalo de nuevo.")
      setEstado("ERROR")
    }
  }

  useEffect(() => {
    let intervalo: NodeJS.Timeout
    if (estado === "CONVIRTIENDO" && idTarea) {
      intervalo = setInterval(async () => {
        try {
          const res = await axios.get(`${BASE_API}/convert/status/${idTarea}`)
          if (res.data.status === "completed") {
            setUrlDescarga(res.data.downloadUrl)
            setEstado("LISTO")
            clearInterval(intervalo)
          } else if (res.data.status === "failed") {
            setError(res.data.error || "Fallo en la conversión")
            setEstado("ERROR")
            clearInterval(intervalo)
          } else {
            setProgreso(res.data.progress || 0)
          }
        } catch (err) {
          clearInterval(intervalo)
        }
      }, 2000)
    }
    return () => clearInterval(intervalo)
  }, [estado, idTarea])

  const reiniciar = () => {
    setArchivo(null)
    setFormatoDestino("")
    setEstado("INACTIVO")
    setProgreso(0)
    setIdTarea(null)
    setUrlDescarga(null)
    setError(null)
  }

  const archivoExtension = archivo?.name.split(".").pop()?.toLowerCase() || ""
  const opcionesConversion = CONVERSIONES_SOPORTADAS[archivoExtension] || []

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            {estado === "INACTIVO" && !archivo && (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer", 
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full"><Upload className="h-10 w-10 text-primary" /></div>
                    <p className="text-xl font-semibold">Arrastra archivos aquí</p>
                  </div>
                </div>
              </motion.div>
            )}

            {(estado === "INACTIVO" || estado === "SUBIENDO" || estado === "CONVIRTIENDO") && archivo && (
              <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <File className="h-6 w-6 text-primary" />
                  <p className="flex-grow font-medium truncate">{archivo.name}</p>
                  {estado === "INACTIVO" && <button onClick={() => setArchivo(null)}><XCircle className="h-5 w-5" /></button>}
                </div>
                {estado === "INACTIVO" && (
                  <div className="flex gap-4 justify-center">
                    <select value={formatoDestino} onChange={(e) => setFormatoDestino(e.target.value)} className="bg-background border p-2 rounded-lg">
                      {opcionesConversion.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                    </select>
                    <button onClick={iniciarConversion} className="bg-primary text-white px-6 py-2 rounded-xl font-bold" disabled={!opcionesConversion.length}>Convertir</button>
                  </div>
                )}
                {(estado === "SUBIENDO" || estado === "CONVIRTIENDO") && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{estado === "SUBIENDO" ? "Subiendo..." : "Convirtiendo..."} {progreso}%</p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden"><motion.div className="h-full bg-primary" animate={{ width: `${progreso}%` }} /></div>
                  </div>
                )}
              </motion.div>
            )}

            {estado === "LISTO" && (
              <div className="text-center space-y-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold">¡Listo!</h3>
                <div className="flex gap-4 justify-center">
                  <a href={urlDescarga!} download className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Descargar</a>
                  <button onClick={reiniciar} className="bg-secondary px-8 py-3 rounded-xl font-bold">Otro</button>
                </div>
              </div>
            )}

            {estado === "ERROR" && (
              <div className="text-center space-y-6">
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="text-destructive font-bold">{error}</p>
                <button onClick={reiniciar} className="bg-secondary px-8 py-2 rounded-xl">Reintentar</button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
