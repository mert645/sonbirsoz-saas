import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure"],
  },
});

export interface ParsedFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | undefined;
  content: string | undefined;
  imageUrl: string | undefined;
  guid: string;
}

export interface ParsedFeed {
  title: string;
  description: string | undefined;
  items: ParsedFeedItem[];
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(url);

  const items: ParsedFeedItem[] = (feed.items || []).map((item) => {
    let imageUrl: string | undefined;

    const mediaContent = item["media:content"] as { $?: { url?: string } } | undefined;
    if (mediaContent?.$?.url) {
      imageUrl = mediaContent.$.url;
    } else if (item.enclosure?.url) {
      imageUrl = item.enclosure.url;
    }

    return {
      title: item.title || "",
      link: item.link || "",
      description: item.contentSnippet || item.content || "",
      pubDate: item.pubDate,
      content: item.content,
      imageUrl,
      guid: item.guid || item.link || item.title || "",
    };
  });

  return {
    title: feed.title || "",
    description: feed.description,
    items,
  };
}

export async function parseMultipleFeeds(urls: string[]): Promise<ParsedFeedItem[]> {
  const results = await Promise.allSettled(
    urls.map((url) => parseFeed(url))
  );

  const allItems: ParsedFeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
    }
  }

  allItems.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  return allItems;
}
