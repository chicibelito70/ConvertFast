"use client"

import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"

interface AdSpaceProps {
  type: "banner" | "sidebar" | "native"
  className?: string
}

export default function AdSpace({ type, className }: AdSpaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-muted/20 border border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center overflow-hidden relative group ${className}`}
    >
      {/* Botón de "Publicítate aquí" */}
      <a 
        href="mailto:anuncios@convertfast.com" 
        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
      >
        ¿Tu anuncio aquí? <ExternalLink className="h-2 w-2" />
      </a>

      {type === "banner" && (
        <div className="w-full h-full min-h-[90px] flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-[10px] uppercase tracking-widest mb-1 opacity-50">Publicidad</span>
          <div className="w-full max-w-[728px] h-[90px] bg-muted/30 flex items-center justify-center italic text-sm">
            Banner Horizontal (728x90)
          </div>
        </div>
      )}

      {type === "sidebar" && (
        <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
          <span className="text-[10px] uppercase tracking-widest mb-2 opacity-50">Publicidad</span>
          <div className="w-[300px] h-[600px] bg-muted/30 flex items-center justify-center italic text-sm">
            Banner Lateral (300x600)
          </div>
        </div>
      )}

      {type === "native" && (
        <div className="w-full p-4 flex items-center gap-4 text-muted-foreground">
          <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center italic text-[10px]">Icono</div>
          <div className="flex-grow">
            <div className="h-4 w-24 bg-muted/30 rounded mb-2" />
            <div className="h-3 w-full bg-muted/30 rounded" />
          </div>
        </div>
      )}
    </motion.div>
  )
}
