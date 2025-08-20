export type Item = {
  id: string;
  permalink: string;
  subreddit: string;
  title: string;
  score: number;
  num_comments: number;
  rank: number;
  keywords_hit: string[];
  comment_insights: {
    id: string;
    author: string;
    score: number;
    body: string;
  }[];
};

export type SortKey = "rank" | "score" | "num_comments" | "title" | "subreddit";
export type ApiSort = "relevance" | "hot" | "top" | "new" | "comments";
export type TimeWindow = "hour" | "day" | "week" | "month" | "year" | "all";
