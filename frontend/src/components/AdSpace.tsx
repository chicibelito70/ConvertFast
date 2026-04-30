"use client"

import { motion } from "framer-motion"

interface AdSpaceProps {
  type: "banner" | "sidebar" | "native"
  className?: string
}

export default function AdSpace({ type, className }: AdSpaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-muted/20 border border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center overflow-hidden ${className}`}
    >
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
            Sidebar Banner (300x600)
          </div>
        </div>
      )}

      {type === "native" && (
        <div className="w-full p-6 flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-widest opacity-50">Contenido Patrocinado</span>
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-muted/30 rounded-lg shrink-0" />
            <div className="flex-grow space-y-2">
              <div className="h-4 w-3/4 bg-muted/30 rounded" />
              <div className="h-4 w-full bg-muted/30 rounded" />
              <div className="h-4 w-1/2 bg-muted/30 rounded" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
