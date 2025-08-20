"use client"

import { FloatingControls } from "@/components/ui/FloatingControls/FloatingControls";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

// Single source of truth (localStorage) for notifications
const STORAGE_KEY = "notifications-enabled"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(false)

  // Hydrate from localStorage once on client
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    setNotifyEnabled(saved === "true")
    setMounted(true)
  }, [])

  // Persist & broadcast to other tabs/pages
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(STORAGE_KEY, String(notifyEnabled))
  }, [notifyEnabled, mounted])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      {/* Global floating controls, fade in after mount */}
      <FloatingControls
        mounted={mounted}
        notifyEnabled={notifyEnabled}
        setNotifyEnabled={setNotifyEnabled}
      />
    </ThemeProvider>
  )
}
