import { Item, SortKey } from "../types/types";

export const valueFor = (it: Item, key: SortKey): number | string => {
  if (key === "rank") return it.rank;
  if (key === "score") return it.score;
  if (key === "num_comments") return it.num_comments;
  if (key === "title") return it.title;
  return it.subreddit;
};

export function downloadJSON(rows: Item[]) {
  const blob = new Blob([JSON.stringify({ items: rows }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ideas.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(rows: Item[]) {
  const header = [
    "subreddit",
    "title",
    "score",
    "comments",
    "rank",
    "hits",
    "permalink",
  ];
  const data = rows.map((i) => [
    i.subreddit,
    i.title.replace(/\s+/g, " ").replace(/"/g, '""'),
    String(i.score),
    String(i.num_comments),
    String(i.rank),
    i.keywords_hit.join("|"),
    i.permalink,
  ]);
  const csv = [
    header.join(","),
    ...data.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ideas.csv";
  a.click();
  URL.revokeObjectURL(url);
}
