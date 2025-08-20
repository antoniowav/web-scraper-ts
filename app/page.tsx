"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table"
import { ArrowDownUp, Bell, Download, Link2, MessageSquare, Play, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState } from "react"
import type { ApiSort, Item, SortKey, TimeWindow } from "../app/types/types"
import { downloadCSV, downloadJSON, valueFor } from "../app/utils/utils"

export default function Page() {
  const [subs, setSubs] = useState("SaaS,startup_ideas,Entrepreneur,SideProject,startups")
  const [query, setQuery] = useState("SaaS OR startup idea OR automation OR API")
  const [limit, setLimit] = useState<number>(60)
  const [time, setTime] = useState<TimeWindow>("year")
  const [apiSort, setApiSort] = useState<ApiSort>("top")
  const [concurrency, setConcurrency] = useState<number>(4)
  const [keywords, setKeywords] = useState("saas,api,automation,b2b,b2c,chrome extension,plugin,pain,problem,ops,etl,crm,ai,ml,workflow,analytics,monitoring,compliance")
  const [comments, setComments] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState(0)
  const [lastCompletedJobId, setLastCompletedJobId] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(false)
  const [, setNotifyPermission] = useState<NotificationPermission>("default")

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifyPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    setExpanded({})
  }, [items])

  useEffect(() => {
    if (!lastCompletedJobId) return
    if (lastCompletedJobId !== jobId) return
    const audio = new Audio("/sounds/confirmation-sound.wav")
    audio.play().catch(() => {})
    if (!notifyEnabled) return
    if (!("Notification" in window)) return
    if (Notification.permission !== "granted") return
    const count = items.length
    new Notification("Scraping complete", { body: `${count} posts found` })
  }, [lastCompletedJobId, jobId, notifyEnabled, items.length])

  const rows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...items].sort((a, b) => {
      const av = valueFor(a, sortKey)
      const bv = valueFor(b, sortKey)
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [items, sortKey, sortDir])

  const totals = useMemo(() => {
    const bySub = rows.reduce<Record<string, number>>((acc, it) => {
      acc[it.subreddit] = (acc[it.subreddit] || 0) + 1
      return acc
    }, {})
    return { bySub, total: rows.length }
  }, [rows])

  async function ensureNotifyPermissionInteractive() {
    if (!notifyEnabled) return
    if (!("Notification" in window)) return
    if (Notification.permission === "default") {
      const res = await Notification.requestPermission()
      setNotifyPermission(res)
    } else {
      setNotifyPermission(Notification.permission)
    }
  }

  async function runScrape() {
    await ensureNotifyPermissionInteractive()
    const nextId = jobId + 1
    setJobId(nextId)
    setLoading(true)
    setError(null)
    setItems([])
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subs: subs.split(",").map(s => s.trim()).filter(v => v.length > 0),
          query,
          limit,
          time,
          sort: apiSort,
          concurrency,
          keywords: keywords.split(",").map(s => s.trim()).filter(v => v.length > 0),
          comments
        })
      })
      const json: { items?: Item[]; error?: string } = await res.json()
      if (!res.ok || !json.items) throw new Error(json.error || "failed")
      setItems(json.items)
      const historyRaw = typeof window !== "undefined" ? localStorage.getItem("scraperHistory") : null
      const history: Array<{ timestamp: number; results: Item[] }> = historyRaw ? JSON.parse(historyRaw) : []
      const entry = { timestamp: Date.now(), results: json.items }
      localStorage.setItem("scraperHistory", JSON.stringify([entry, ...history].slice(0, 25)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown_error"
      setError(msg)
    } finally {
      setLoading(false)
      setLastCompletedJobId(nextId)
    }
  }

  function changeSortKey(next: SortKey) {
    if (sortKey === next) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(next)
      setSortDir(next === "title" || next === "subreddit" ? "asc" : "desc")
    }
  }

  function Row({ it }: { it: Item }) {
    const isOpen = !!expanded[it.id]
    return (
      <>
        <TR
          className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800"
          onClick={() => setExpanded(s => ({ ...s, [it.id]: !s[it.id] }))}
        >
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
            <a className="inline-flex items-center gap-1 text-blue-600 underline" href={it.permalink} target="_blank" rel="noreferrer">
              <Link2 size={16} /> Open
            </a>
          </TD>
        </TR>
        {isOpen && (
          <TR>
            <TD colSpan={6} className="p-0">
              <div className="p-4 bg-gray-50 dark:bg-neutral-900">
                <div className="font-semibold mb-2">Top comments</div>
                <div className="grid gap-2">
                  {it.comment_insights.length ? it.comment_insights.map(c => (
                    <div key={c.id} className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 dark:text-gray-300">@{c.author}</span>
                        <span className="text-gray-500">↑ {c.score}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  )) : <div className="text-gray-600 dark:text-gray-400">No comments fetched</div>}
                </div>
              </div>
            </TD>
          </TR>
        )}
      </>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-black to-gray-600" />
            <div>
              <div className="font-semibold">Reddit SaaS Ideas</div>
              <div className="text-xs text-gray-500">Scrape, rank, export</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                const next = !notifyEnabled
                setNotifyEnabled(next)
                if (next) await ensureNotifyPermissionInteractive()
              }}
              className={notifyEnabled ? "" : "btn-ghost"}
            >
              <Bell size={16} />
              {notifyEnabled ? "Notify: On" : "Notify: Off"}
            </Button>
            <Button onClick={() => downloadJSON(rows)} className="btn-ghost"><Download size={16} />JSON</Button>
            <Button onClick={() => downloadCSV(rows)} className="btn-ghost"><Download size={16} />CSV</Button>
            <Button onClick={runScrape} disabled={loading} className="btn-primary">
              <Play size={16} />
              {loading ? "Running…" : "Run"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search configuration</h2>
              <div className="flex items-center gap-3">
                <Button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} className="btn-ghost">
                  <ArrowDownUp size={16} />
                  {sortDir === "asc" ? "Asc" : "Desc"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Subreddits</Label>
                <Input value={subs} onChange={e => setSubs(e.target.value)} placeholder="comma,separated,subs" />
              </div>
              <div>
                <Label>Query</Label>
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="query string" />
              </div>
              <div>
                <Label>Limit per subreddit</Label>
                <Input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} />
              </div>
              <div>
                <Label>Time window</Label>
                <Select value={time} onChange={e => setTime(e.target.value as TimeWindow)}>
                  <option value="hour">hour</option>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                  <option value="all">all</option>
                </Select>
              </div>
              <div>
                <Label>Sort</Label>
                <Select value={apiSort} onChange={e => setApiSort(e.target.value as ApiSort)}>
                  <option value="relevance">relevance</option>
                  <option value="hot">hot</option>
                  <option value="top">top</option>
                  <option value="new">new</option>
                  <option value="comments">comments</option>
                </Select>
              </div>
              <div>
                <Label>Concurrency</Label>
                <Input type="number" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <Label>Keywords</Label>
                <Input value={keywords} onChange={e => setKeywords(e.target.value)} />
              </div>
              <div>
                <Label>Top comments per post</Label>
                <Input type="number" value={comments} onChange={e => setComments(Number(e.target.value))} />
              </div>
            </div>
            {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Total</span>
                <Badge>{totals.total}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => changeSortKey("rank")} className={sortKey === "rank" ? "" : "btn-ghost"}><Sparkles size={16} />Rank</Button>
                <Button onClick={() => changeSortKey("score")} className={sortKey === "score" ? "" : "btn-ghost"}>Score</Button>
                <Button onClick={() => changeSortKey("num_comments")} className={sortKey === "num_comments" ? "" : "btn-ghost"}>Comments</Button>
                <Button onClick={() => changeSortKey("title")} className={sortKey === "title" ? "" : "btn-ghost"}>Title</Button>
                <Button onClick={() => changeSortKey("subreddit")} className={sortKey === "subreddit" ? "" : "btn-ghost"}>Subreddit</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className={"text-sm"}>
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
                  {!loading && rows.map(it => <Row key={it.id} it={it} />)}
                </TBody>
              </Table>
              {loading && (
                <div className="flex flex-col items-center justify-center p-8 text-gray-600">
                  <div className="h-8 w-8 rounded-full border-4 border-gray-300 border-t-black animate-spin" />
                  <p className="mt-3">Scraping data… this might take a while</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      {mounted && (
        <div className="fixed bottom-6 right-6 animate-fade-in">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-full px-4 py-2">
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
