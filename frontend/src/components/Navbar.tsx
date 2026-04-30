"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Zap className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
          <span className="text-xl font-bold font-outfit tracking-tight">Convert<span className="text-primary">Fast</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/#convert" className="transition-colors hover:text-primary">Convertir</Link>
          <Link href="/#formats" className="transition-colors hover:text-primary">Formatos</Link>
          <Link href="/#about" className="transition-colors hover:text-primary">Acerca de</Link>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            {mounted && (theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
          </button>
          <button className="hidden sm:flex bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
            Empezar Gratis
          </button>
        </div>
      </div>
    </header>
  )
}
