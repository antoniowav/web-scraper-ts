"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bell } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

type Props = {
  notifyEnabled: boolean
  setNotifyEnabled: (v: boolean) => void
  setNotifySinceJobId: (v: number | null) => void
  currentJobId: number
}

const STORAGE_KEY = "notifications-enabled"

export function FloatingControls({ notifyEnabled, setNotifyEnabled, setNotifySinceJobId, currentJobId }: Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Hydrate notification toggle from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "true") setNotifyEnabled(true)
    setMounted(true)
  }, [setNotifyEnabled])

  // Persist whenever it changes (after mounted)
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(STORAGE_KEY, String(notifyEnabled))
  }, [notifyEnabled, mounted])

  const ensurePermission = async () => {
    if (!notifyEnabled) return
    if (!("Notification" in window)) return
    if (Notification.permission === "default") {
      await Notification.requestPermission()
    }
  }

  return (
    <div className={`fixed bottom-6 right-6 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 shadow-lg rounded-full pl-3 pr-3 py-2">
        {/* Theme switch + label */}
        <div className="flex items-center gap-2">
          <Switch
            checked={mounted ? theme === "dark" : false}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
          {mounted && (
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          )}
        </div>

        <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Notifications toggle */}
        <Button
          onClick={async () => {
            const next = !notifyEnabled
            setNotifyEnabled(next)
            if (next) {
              await ensurePermission()
              setNotifySinceJobId(currentJobId + 1)
            } else {
              setNotifySinceJobId(null)
            }
          }}
          className={notifyEnabled ? "" : "btn-ghost"}
        >
          <Bell size={16} />
          {notifyEnabled ? "Notify: On" : "Notify: Off"}
        </Button>
      </div>
    </div>
  )
}
