"use client"

import * as React from "react"

interface ModalProviderProps {
  children: React.ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  return (
    <div className="relative">
      {children}
      <div id="modal-root" className="fixed inset-0 z-[100] pointer-events-none">
        <div className="modal-container" />
      </div>
    </div>
  )
} 