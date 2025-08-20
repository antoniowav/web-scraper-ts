import { NextResponse } from "next/server";
import { z } from "zod";
import pLimit from "p-limit";

const Input = z.object({
  subs: z.array(z.string()).min(1),
  query: z.string().min(1),
  limit: z.number().int().positive().max(100),
  time: z.enum(["hour", "day", "week", "month", "year", "all"]),
  sort: z.enum(["relevance", "hot", "top", "new", "comments"]),
  concurrency: z.number().int().positive().max(8),
  keywords: z.array(z.string()).min(1),
  comments: z.number().int().min(0).max(50),
});

type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  selftext?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  link_flair_text?: string;
  url?: string;
  permalink: string;
  author: string;
};

type RedditComment = {
  id: string;
  author: string;
  score: number;
  body?: string;
  stickied?: boolean;
  removed_by_category?: string | null;
};

type RedditListing<T> = { data: { children: { data: T }[] } };
type RedditCommentsPayload = [unknown, RedditListing<RedditComment>];

type IdeaPost = {
  id: string;
  url: string;
  permalink: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  flair?: string;
  selftext: string;
  keywords_hit: string[];
  comment_insights: {
    id: string;
    author: string;
    score: number;
    body: string;
  }[];
  rank: number;
};

let accessToken: { token: string; exp: number } | null = null;

async function getToken() {
  const now = Date.now();
  if (accessToken && now < accessToken.exp - 30000) return accessToken.token;
  const id = process.env.REDDIT_CLIENT_ID || "";
  const secret = process.env.REDDIT_CLIENT_SECRET || "";
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.USER_AGENT || "RedditSaaSIdeasWeb/1.0",
    },
    body,
  });
  if (!res.ok) throw new Error("oauth_failed");
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = {
    token: json.access_token,
    exp: Date.now() + json.expires_in * 1000,
  };
  return accessToken.token;
}

async function redditGet(
  path: string,
  params: Record<string, string | number | boolean> = {},
) {
  const token = await getToken();
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const url = `https://oauth.reddit.com${path}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": process.env.USER_AGENT || "RedditSaaSIdeasWeb/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`reddit_${res.status}`);
  return res.json() as Promise<unknown>;
}

const ascii = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function escapeRegex(s: string) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function keywordHits(text: string, keywords: string[]) {
  const hits: string[] = [];
  const t = ascii(text);
  for (const k of keywords) {
    const needle = ascii(k);
    if (!needle) continue;
    const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, "i");
    if (re.test(t)) hits.push(k);
  }
  return hits;
}

function looksLikeIdea(title: string) {
  const t = ascii(title);
  return /\b(idea|ideas|saas|b2b|b2c|api|automation|problem|pain|tool|script|build|validate|mvp|startup)\b/.test(
    t,
  );
}

function scorePost(opts: {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  hits: number;
  isIdeaPattern: boolean;
}) {
  const wTitle = 3;
  const wText = 1;
  const wVotes = 0.01;
  const wComments = 0.02;
  const wHits = 2;
  const wIdea = 5;
  const base =
    wTitle * Math.min(1, opts.title.length / 80) +
    wText * Math.min(1, opts.selftext.length / 400);
  const engagement = wVotes * opts.score + wComments * opts.num_comments;
  const topical = wHits * opts.hits + (opts.isIdeaPattern ? wIdea : 0);
  return +(base + engagement + topical).toFixed(3);
}

function isListing<T>(u: unknown): u is RedditListing<T> {
  return (
    typeof u === "object" &&
    u !== null &&
    "data" in u &&
    typeof (u as { data: unknown }).data === "object"
  );
}

async function searchSub(
  sub: string,
  q: string,
  sort: string,
  t: string,
  limit: number,
) {
  const raw = await redditGet(`/r/${sub}/search`, {
    q,
    restrict_sr: 1,
    sort,
    t,
    limit: Math.min(limit, 100),
  });
  if (!isListing<RedditPost>(raw)) return [];
  return raw.data.children.map((c) => c.data);
}

async function fetchComments(sub: string, id: string, limit: number) {
  if (limit <= 0) return [];
  const raw = await redditGet(`/r/${sub}/comments/${id}`, {
    limit,
    sort: "top",
  });
  const arr = raw as RedditCommentsPayload | unknown;
  if (!Array.isArray(arr) || arr.length < 2) return [];
  const listing = arr[1];
  if (!isListing<RedditComment>(listing)) return [];
  return listing.data.children
    .map((c) => c.data)
    .filter(
      (d) =>
        !d.stickied &&
        !d.removed_by_category &&
        d.author !== "[deleted]" &&
        d.body !== "[deleted]",
    )
    .slice(0, limit)
    .map((d) => ({
      id: d.id,
      author: d.author,
      score: d.score,
      body: d.body ?? "",
    }));
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const cfg = Input.parse(payload);
    const limiter = pLimit(cfg.concurrency);
    const rawArrays = await Promise.all(
      cfg.subs.map((s) =>
        limiter(() => searchSub(s, cfg.query, cfg.sort, cfg.time, cfg.limit)),
      ),
    );
    const postsRaw = rawArrays.flat();
    const seen = new Set<string>();
    const out: IdeaPost[] = [];
    for (const p of postsRaw) {
      if (!p || !p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      const sub = p.subreddit;
      const title = p.title;
      const selftext = p.selftext ?? "";
      const hits = keywordHits(`${title}\n\n${selftext}`, cfg.keywords);
      const ideaish = looksLikeIdea(title) || hits.length > 0;
      if (!ideaish) continue;
      const topComments = await fetchComments(sub, p.id, cfg.comments);
      const rank = scorePost({
        title,
        selftext,
        score: p.score ?? 0,
        num_comments: p.num_comments ?? 0,
        hits: hits.length,
        isIdeaPattern: ideaish,
      });
      out.push({
        id: p.id,
        url: p.url ?? "",
        permalink: `https://reddit.com${p.permalink}`,
        subreddit: sub,
        title,
        author: p.author,
        score: p.score ?? 0,
        num_comments: p.num_comments ?? 0,
        created_utc: p.created_utc ?? 0,
        flair: p.link_flair_text,
        selftext,
        keywords_hit: hits,
        comment_insights: topComments,
        rank,
      });
    }
    out.sort((a, b) => b.rank - a.rank);
    return NextResponse.json({ total: out.length, items: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
