"use client"

import { Zap, Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary fill-current" />
              <span className="text-xl font-bold font-outfit tracking-tight">Convert<span className="text-primary">Fast</span></span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              La plataforma más rápida y segura para convertir tus archivos online. 
              Sin registros y totalmente gratuita.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold font-outfit">Enlaces</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Términos de Uso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold font-outfit">Herramientas</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">PDF a Word</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Imagen a JPG</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Video a MP4</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ConvertFast. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Hecho con <Heart className="h-3 w-3 text-destructive fill-current" /> para el mundo por{" "}
            <a href="https://carlosvillavizar.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Carlos Villavizar
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
