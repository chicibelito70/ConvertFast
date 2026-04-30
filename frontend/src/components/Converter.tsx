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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
const DOWNLOAD_BASE = API_BASE.replace('/api', '')

const SUPPORTED_CONVERSIONS: Record<string, string[]> = {
  // Documents
  pdf: ["docx", "txt", "epub", "pptx"],
  docx: ["pdf", "txt"],
  txt: ["pdf", "docx"],
  epub: ["pdf"],
  xlsx: ["csv"],
  csv: ["xlsx"],
  pptx: ["pdf"],
  // Images
  jpg: ["png", "webp"],
  jpeg: ["png", "webp"],
  png: ["jpg", "webp", "svg"],
  webp: ["jpg", "png"],
  svg: ["png"],
  // Audio
  mp3: ["wav", "ogg"],
  wav: ["mp3", "ogg"],
  ogg: ["mp3", "wav"],
  // Video
  mp4: ["avi", "mov", "webm"],
  avi: ["mp4"],
  mov: ["mp4"],
  webm: ["mp4"],
  // Archives
  zip: ["7z"],
  "7z": ["zip"],
}

type Status = "IDLE" | "UPLOADING" | "CONVERTING" | "READY" | "ERROR"

export default function Converter() {
  const [file, setFile] = useState<File | null>(null)
  const [targetFormat, setTargetFormat] = useState<string>("")
  const [status, setStatus] = useState<Status>("IDLE")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      const ext = acceptedFiles[0].name.split(".").pop()?.toLowerCase() || ""
      const possible = SUPPORTED_CONVERSIONS[ext] || []
      if (possible.length > 0) {
        setTargetFormat(possible[0])
      }
      setStatus("IDLE")
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

  const startConversion = async () => {
    if (!file || !targetFormat) return

    try {
      setStatus("UPLOADING")
      setProgress(0)

      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await axios.post(`${API_BASE}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
          setProgress(percent)
        },
      })

      const fileId = uploadRes.data.file.id
      setStatus("CONVERTING")
      setProgress(0)

      const convertRes = await axios.post(`${API_BASE}/convert`, {
        fileId,
        targetFormat,
      })

      setJobId(convertRes.data.jobId)
    } catch (err: any) {
      console.error(err)
      setError("Error al procesar el archivo. Inténtalo de nuevo.")
      setStatus("ERROR")
    }
  }

  // Polling for status
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (status === "CONVERTING" && jobId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/convert/status/${jobId}`)
          if (res.data.status === "completed") {
            setDownloadUrl(`${DOWNLOAD_BASE}${res.data.downloadUrl}`)
            setStatus("READY")
            clearInterval(interval)
          } else if (res.data.status === "failed") {
            setError(res.data.error || "Conversión fallida")
            setStatus("ERROR")
            clearInterval(interval)
          } else {
            setProgress(res.data.progress || 0)
          }
        } catch (err) {
          console.error(err)
          setError("Error consultando el estado")
          setStatus("ERROR")
          clearInterval(interval)
        }
      }, 2000)
    }

    return () => clearInterval(interval)
  }, [status, jobId])

  const reset = () => {
    setFile(null)
    setTargetFormat("")
    setStatus("IDLE")
    setProgress(0)
    setJobId(null)
    setDownloadUrl(null)
    setError(null)
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="bg-card border border-border/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            {status === "IDLE" && !file && (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                  isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">Arrastra archivos aquí</p>
                    <p className="text-muted-foreground mt-1">O haz clic para seleccionar (Máx. 100MB)</p>
                  </div>
                </div>
              </motion.div>
            )}

            {(status === "IDLE" || status === "UPLOADING" || status === "CONVERTING") && file && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <div className="p-2 bg-background rounded-lg">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  {status === "IDLE" && (
                    <button onClick={reset} className="p-2 hover:text-destructive transition-colors">
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {status === "IDLE" && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium uppercase px-2 py-1 bg-secondary rounded text-secondary-foreground">
                        {file.name.split(".").pop()}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="bg-background border border-input px-3 py-1.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {SUPPORTED_CONVERSIONS[file.name.split(".").pop()?.toLowerCase() || ""]?.map(fmt => (
                          <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={startConversion}
                      className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                      Convertir Ahora
                    </button>
                  </div>
                )}

                {(status === "UPLOADING" || status === "CONVERTING") && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>{status === "UPLOADING" ? "Subiendo archivo..." : "Convirtiendo..."}</span>
                      </div>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {status === "READY" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-green-500/10 rounded-full">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold">¡Archivo Listo!</h3>
                  <p className="text-muted-foreground">Tu archivo ha sido convertido exitosamente.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <a
                    href={downloadUrl!}
                    download
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                  >
                    <Download className="h-5 w-5" />
                    Descargar
                  </a>
                  <button
                    onClick={reset}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-80 transition-opacity"
                  >
                    <RefreshCcw className="h-5 w-5" />
                    Convertir Otro
                  </button>
                </div>
              </motion.div>
            )}

            {status === "ERROR" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-destructive/10 rounded-full">
                    <XCircle className="h-12 w-12 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold">Algo salió mal</h3>
                  <p className="text-destructive font-medium">{error}</p>
                </div>
                <button
                  onClick={reset}
                  className="bg-secondary text-secondary-foreground px-8 py-2.5 rounded-xl font-bold hover:opacity-80 transition-opacity"
                >
                  Reintentar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
