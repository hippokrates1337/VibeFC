"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

interface ModalProviderProps {
  children: React.ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <div className="relative">
        {children}
        <div id="modal-root" className="fixed inset-0 z-[100] pointer-events-none">
          <div className="modal-container" />
        </div>
      </div>
    </NextThemesProvider>
  )
} 