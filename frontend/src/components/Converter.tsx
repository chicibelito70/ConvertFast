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
const STORAGE_KEY = "convertfast_session"

interface SesionGuardada {
  idTarea: string
  estado: Estado
  formatoDestino: string
  nombreArchivo: string
  urlDescarga?: string
  timestamp: number
}

const guardarSesion = (datos: SesionGuardada) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datos)) } catch {}
}

const cargarSesion = (): SesionGuardada | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const datos: SesionGuardada = JSON.parse(raw)
    // Expirar sesiones de más de 30 minutos
    if (Date.now() - datos.timestamp > 30 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return datos
  } catch { return null }
}

const limpiarSesion = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

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

type Estado = "INACTIVO" | "SUBIENDO" | "CONVIRTIENDO" | "LISTO" | "DESCARGANDO" | "ERROR"

export default function Convertidor() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [formatoDestino, setFormatoDestino] = useState<string>("")
  const [estado, setEstado] = useState<Estado>("INACTIVO")
  const [progreso, setProgreso] = useState(0)
  const [progresoDescarga, setProgresoDescarga] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [idTarea, setIdTarea] = useState<string | null>(null)
  const [urlDescarga, setUrlDescarga] = useState<string | null>(null)
  const [nombreRecuperado, setNombreRecuperado] = useState<string | null>(null)

  // Restaurar sesión guardada al montar (cuando el usuario desbloquea el móvil)
  useEffect(() => {
    const sesion = cargarSesion()
    if (!sesion) return

    setFormatoDestino(sesion.formatoDestino)
    setNombreRecuperado(sesion.nombreArchivo)
    setIdTarea(sesion.idTarea)

    if (sesion.estado === "LISTO" && sesion.urlDescarga) {
      setUrlDescarga(sesion.urlDescarga)
      setEstado("LISTO")
    } else if (sesion.estado === "CONVIRTIENDO") {
      setEstado("CONVIRTIENDO")
    }
  }, [])

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

      // Guardar sesión para recuperar si el móvil se bloquea
      guardarSesion({
        idTarea: resConvertir.data.jobId,
        estado: "CONVIRTIENDO",
        formatoDestino,
        nombreArchivo: archivo.name,
        timestamp: Date.now(),
      })
    } catch (err: any) {
      setError("Error en el servidor. Inténtalo de nuevo.")
      setEstado("ERROR")
    }
  }

  // Polling de estado con soporte para reanudar tras bloqueo de pantalla
  useEffect(() => {
    let intervalo: NodeJS.Timeout

    const consultarEstado = async () => {
      if (!idTarea) return
      try {
        const res = await axios.get(`${BASE_API}/convert/status/${idTarea}`)
        if (res.data.status === "completed") {
          setUrlDescarga(res.data.downloadUrl)
          setEstado("LISTO")
          // Actualizar sesión con la URL de descarga
          const sesion = cargarSesion()
          if (sesion) {
            guardarSesion({ ...sesion, estado: "LISTO", urlDescarga: res.data.downloadUrl })
          }
          clearInterval(intervalo)
        } else if (res.data.status === "failed") {
          setError(res.data.error || "Fallo en la conversión")
          setEstado("ERROR")
          limpiarSesion()
          clearInterval(intervalo)
        } else {
          setProgreso(res.data.progress || 0)
        }
      } catch (err) {
        // No limpiar el intervalo en errores de red temporales (móvil reconectando)
      }
    }

    if (estado === "CONVIRTIENDO" && idTarea) {
      // Consultar inmediatamente (por si ya terminó mientras el móvil estaba bloqueado)
      consultarEstado()
      intervalo = setInterval(consultarEstado, 2000)
    }

    // Reanudar polling cuando el usuario vuelve a la app
    const alVolverVisible = () => {
      if (document.visibilityState === "visible" && estado === "CONVIRTIENDO" && idTarea) {
        consultarEstado()
      }
    }
    document.addEventListener("visibilitychange", alVolverVisible)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener("visibilitychange", alVolverVisible)
    }
  }, [estado, idTarea])

  const descargarArchivo = async () => {
    if (!urlDescarga) return
    try {
      setEstado("DESCARGANDO")
      setProgresoDescarga(0)

      const nombreBase = nombreMostrar.split(".").slice(0, -1).join(".") || "archivo"
      const nombreFinal = `${nombreBase}.${formatoDestino}`

      const respuesta = await fetch(urlDescarga)
      if (!respuesta.ok) throw new Error("Error al descargar el archivo")

      // Fallback para iOS Safari u otros navegadores sin soporte de ReadableStream
      if (!respuesta.body?.getReader) {
        const blob = await respuesta.blob()
        const urlBlob = window.URL.createObjectURL(blob)
        const enlace = document.createElement("a")
        enlace.href = urlBlob
        enlace.download = nombreFinal
        enlace.style.display = "none"
        document.body.appendChild(enlace)
        enlace.click()
        setTimeout(() => {
          document.body.removeChild(enlace)
          window.URL.revokeObjectURL(urlBlob)
        }, 100)
        setEstado("LISTO")
        return
      }

      const tamanoTotal = Number(respuesta.headers.get("content-length")) || 0
      const lector = respuesta.body.getReader()

      const fragmentos: BlobPart[] = []
      let bytesRecibidos = 0

      while (true) {
        const { done, value } = await lector.read()
        if (done) break
        fragmentos.push(value)
        bytesRecibidos += value.length
        if (tamanoTotal > 0) {
          setProgresoDescarga(Math.round((bytesRecibidos / tamanoTotal) * 100))
        } else {
          // Sin content-length: progreso indeterminado (avanza suavemente hasta 90%)
          setProgresoDescarga(Math.min(90, Math.round(bytesRecibidos / 1024)))
        }
      }

      setProgresoDescarga(100)

      const blob = new Blob(fragmentos)
      const urlBlob = window.URL.createObjectURL(blob)
      const enlace = document.createElement("a")
      enlace.href = urlBlob
      enlace.download = nombreFinal
      enlace.style.display = "none"
      document.body.appendChild(enlace)
      enlace.click()
      setTimeout(() => {
        document.body.removeChild(enlace)
        window.URL.revokeObjectURL(urlBlob)
      }, 100)

      setEstado("LISTO")
    } catch (err: any) {
      // Fallback final: abrir URL directamente (funciona en cualquier navegador/móvil)
      if (urlDescarga) {
        window.open(urlDescarga, "_blank")
        setEstado("LISTO")
      } else {
        setError("Error al descargar el archivo. Inténtalo de nuevo.")
        setEstado("ERROR")
      }
    }
  }

  const reiniciar = () => {
    setArchivo(null)
    setFormatoDestino("")
    setEstado("INACTIVO")
    setProgreso(0)
    setProgresoDescarga(0)
    setIdTarea(null)
    setUrlDescarga(null)
    setError(null)
    setNombreRecuperado(null)
    limpiarSesion()
  }

  // Nombre para mostrar: del archivo real o de la sesión recuperada
  const nombreMostrar = archivo?.name || nombreRecuperado || "Archivo"

  return (
    <div className="w-full max-w-3xl mx-auto p-3 sm:p-6">
      <div className="bg-card border border-border/50 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-8">
          <AnimatePresence mode="wait">
            {estado === "INACTIVO" && !archivo && (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center cursor-pointer", 
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

            {(estado === "INACTIVO" || estado === "SUBIENDO" || estado === "CONVIRTIENDO") && (archivo || nombreRecuperado) && (
              <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <File className="h-6 w-6 text-primary" />
                  <p className="flex-grow font-medium truncate">{nombreMostrar}</p>
                  {estado === "INACTIVO" && <button onClick={() => { setArchivo(null); setNombreRecuperado(null) }}><XCircle className="h-5 w-5" /></button>}
                </div>
                {estado === "INACTIVO" && (
                  <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                    <select value={formatoDestino} onChange={(e) => setFormatoDestino(e.target.value)} className="bg-background border p-2 rounded-lg">
                      {CONVERSIONES_SOPORTADAS[archivo.name.split(".").pop()?.toLowerCase() || ""]?.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                    </select>
                    <button onClick={iniciarConversion} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Convertir</button>
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

            {(estado === "LISTO" || estado === "DESCARGANDO") && (
              <motion.div key="listo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
                {estado === "DESCARGANDO" ? (
                  <>
                    <Download className="h-12 w-12 text-primary mx-auto animate-bounce" />
                    <h3 className="text-2xl font-bold">Descargando...</h3>
                    <div className="space-y-2 max-w-md mx-auto">
                      <p className="text-sm font-medium">{progresoDescarga}%</p>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div className="h-full bg-primary" animate={{ width: `${progresoDescarga}%` }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="text-2xl font-bold">¡Listo!</h3>
                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                      <button onClick={descargarArchivo} className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Download className="h-5 w-5" /> Descargar
                      </button>
                      <button onClick={reiniciar} className="bg-secondary px-8 py-3 rounded-xl font-bold">Otro</button>
                    </div>
                  </>
                )}
              </motion.div>
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
