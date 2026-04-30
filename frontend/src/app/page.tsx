"use client"

import Converter from "@/components/Converter"
import AdSpace from "@/components/AdSpace"
import { Shield, Zap, Lock, Star, Check } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full pt-20 pb-12 px-4 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        </div>

        <motion_div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Star className="h-3 w-3 fill-current" />
            La herramienta #1 de conversión
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold font-outfit tracking-tight">
            Conversión de Archivos <br />
            <span className="text-primary italic">Ultra Rápida</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Convierte documentos, imágenes, audio y video de forma gratuita y segura. 
            Sin registros, sin límites complicados.
          </p>
        </motion_div>
      </section>

      {/* Converter Section */}
      <section id="convert" className="w-full pb-20 px-4">
        <AdSpace type="banner" className="max-w-4xl mx-auto mb-12" />
        <Converter />
        <AdSpace type="banner" className="max-w-4xl mx-auto mt-12" />
      </section>

      {/* Features Section */}
      <section className="w-full py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Velocidad Increíble"
              description="Nuestros servidores de alto rendimiento procesan tus archivos en segundos utilizando tecnología de punta."
            />
            <FeatureCard 
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="Seguridad Total"
              description="Tus archivos se procesan de forma privada y se eliminan automáticamente de nuestros servidores tras 1 hora."
            />
            <FeatureCard 
              icon={<Lock className="h-8 w-8 text-primary" />}
              title="Sin Registros"
              description="Privacidad absoluta. No pedimos correos, nombres ni contraseñas. Solo sube y convierte."
            />
          </div>
        </div>
      </section>

      {/* SEO / Info Section */}
      <section id="formats" className="w-full py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold font-outfit">Formatos Soportados</h2>
            <p className="text-muted-foreground">Más de 50 combinaciones de conversión disponibles para ti.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormatGroup title="Documentos" formats={["PDF a Word", "DOCX a PDF", "TXT a PDF", "PDF a TXT", "Excel a CSV"]} />
            <FormatGroup title="Imágenes" formats={["JPG a PNG", "PNG a JPG", "WEBP a PNG", "SVG a PNG", "PNG a WebP"]} />
            <FormatGroup title="Audio" formats={["MP3 a WAV", "WAV a MP3", "OGG a MP3", "MP3 a OGG"]} />
            <FormatGroup title="Video" formats={["MP4 a AVI", "MOV a MP4", "WebM a MP4", "AVI a MP4"]} />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm transition-transform hover:-translate-y-1">
      <div className="p-4 rounded-2xl bg-primary/5">{icon}</div>
      <h3 className="text-xl font-bold font-outfit">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FormatGroup({ title, formats }: { title: string, formats: string[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-bold flex items-center gap-2">
        <Check className="h-5 w-5 text-primary" />
        {title}
      </h4>
      <ul className="grid grid-cols-1 gap-2">
        {formats.map(f => (
          <li key={f} className="text-muted-foreground flex items-center gap-2">
            <span className="w-1 h-1 bg-primary rounded-full" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Client wrapper for Framer Motion since this is a Server Component by default
import { motion } from "framer-motion"
const motion_div = motion.div
