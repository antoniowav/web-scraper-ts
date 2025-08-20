"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table"
import { Download, Link2, MessageSquare, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { Item } from "../types/types"

type HistoryEntry = {
  timestamp: number
  results: Item[]
}

const STORAGE_KEY = "scraperHistory"

function downloadJSON(filename: string, data: Item[]) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCSV(filename: string, data: Item[]) {
  const header = ["subreddit", "title", "score", "num_comments", "rank", "permalink"]
  const rows = data.map(d => [
    d.subreddit,
    d.title,
    String(d.score),
    String(d.num_comments),
    String(d.rank),
    d.permalink,
  ])
  const csv = [header, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: HistoryEntry[] = JSON.parse(raw)
        setHistory(parsed)
      }
    } catch {
      setHistory([])
    }
  }, [])

  const totalRuns = history.length
  const totalPosts = useMemo(
    () => history.reduce((sum, h) => sum + h.results.length, 0),
    [history]
  )

  const toggle = (idx: number) => setExpanded(s => ({ ...s, [idx]: !s[idx] }))
  const removeRun = (idx: number) => {
    const next = history.filter((_, i) => i !== idx)
    setHistory(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  const clearAll = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className={`transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-black to-gray-600" />
            <div>
              <div className="font-semibold">History</div>
              <div className="text-xs text-gray-500">Past scrapes stored locally</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-ghost">Back</Link>
            {history.length > 0 && (
              <Button onClick={clearAll} className="btn-ghost">Clear all</Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Runs</span>
              <Badge>{totalRuns}</Badge>
              <span className="text-sm text-gray-600">Posts</span>
              <Badge>{totalPosts}</Badge>
            </div>
            <div className="text-sm text-gray-500">
              Latest first • Stored in <code>localStorage</code>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="card p-6 text-gray-600">
            No history yet. Run a scrape on the <Link href="/" className="underline">home page</Link>.
          </div>
        ) : (
          history.map((entry, idx) => {
            const ts = new Date(entry.timestamp)
            const label = ts.toLocaleString()
            const count = entry.results.length
            const open = expanded[idx] ?? false

            return (
              <div key={entry.timestamp} className="card">
                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} />
                    <div className="font-medium">{label}</div>
                    <Badge>{count} posts</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button className="btn-ghost" onClick={() => downloadJSON(`scrape-${entry.timestamp}`, entry.results)}>
                      <Download size={16} /> JSON
                    </Button>
                    <Button className="btn-ghost" onClick={() => downloadCSV(`scrape-${entry.timestamp}`, entry.results)}>
                      <Download size={16} /> CSV
                    </Button>
                    <Button className="btn-ghost" onClick={() => removeRun(idx)}>Delete</Button>
                    <Button onClick={() => toggle(idx)}>{open ? "Hide" : "Show"}</Button>
                  </div>
                </div>

                {open && (
                  <div className="p-4 pt-0">
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <THead>
                          <TR>
                            <TH>Subreddit</TH>
                            <TH>Title</TH>
                            <TH>Score</TH>
                            <TH>Comments</TH>
                            <TH>Rank</TH>
                            <TH>Link</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {entry.results.map((it: Item) => (
                            <TR key={it.id} className="text-sm cursor-default hover:bg-gray-50 dark:hover:bg-neutral-800">
                              <TD><Badge>{it.subreddit}</Badge></TD>
                              <TD>
                                <div className="font-medium">{it.title}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {it.keywords_hit.slice(0, 4).map(k => <Badge key={k}>{k}</Badge>)}
                                  {it.keywords_hit.length > 4 && <Badge>+{it.keywords_hit.length - 4}</Badge>}
                                </div>
                              </TD>
                              <TD>{it.score}</TD>
                              <TD className="align-middle">
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare size={16} />
                                  {it.num_comments}
                                </span>
                              </TD>
                              <TD>{it.rank}</TD>
                              <TD>
                                <a
                                  className="inline-flex items-center gap-1 text-blue-600 underline"
                                  href={it.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Link2 size={16} /> Open
                                </a>
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
