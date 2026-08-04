import { TwitterApi } from "twitter-api-v2";

let client: TwitterApi | null = null;

function getClient(): TwitterApi {
  if (!client) {
    client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
  }
  return client;
}

export interface TwitterPostInput {
  text: string;
  mediaUrl?: string;
}

export async function postToTwitter(input: TwitterPostInput): Promise<{ id: string; url: string }> {
  const twitter = getClient();

  let mediaId: string | undefined;

  if (input.mediaUrl) {
    try {
      const response = await fetch(input.mediaUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      mediaId = await twitter.v1.uploadMedia(buffer, { mimeType: "image/png" });
    } catch (err) {
      console.error("Twitter media upload failed:", err);
    }
  }

  const tweet = await twitter.v2.tweet({
    text: input.text,
    ...(mediaId && { media: { media_ids: [mediaId] } }),
  });

  return {
    id: tweet.data.id,
    url: `https://twitter.com/i/web/status/${tweet.data.id}`,
  };
}

export function formatTwitterContent(
  title: string,
  url: string,
  tags: string[]
): string {
  const hashtags = tags
    .slice(0, 3)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");

  const maxTitleLen = 240 - url.length - hashtags.length - 4;
  const truncatedTitle = title.length > maxTitleLen
    ? title.slice(0, maxTitleLen - 3) + "..."
    : title;

  return `${truncatedTitle}\n\n${url}\n\n${hashtags}`;
}
