export interface InstagramPostInput {
  imageUrl: string;
  caption: string;
}

async function callInstagramAPI(
  endpoint: string,
  params: Record<string, string>
): Promise<{ id: string }> {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID!;
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN!;

  const url = new URL(`https://graph.facebook.com/v19.0/${accountId}/${endpoint}`);
  url.searchParams.set("access_token", pageToken);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), { method: "POST" });
  const data = await response.json();

  if (data.error) {
    throw new Error(`Instagram API error: ${data.error.message}`);
  }
  return data;
}

export async function postToInstagram(input: InstagramPostInput): Promise<{ id: string }> {
  const container = await callInstagramAPI("media", {
    image_url: input.imageUrl,
    caption: input.caption,
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const publish = await callInstagramAPI("media_publish", {
    creation_id: container.id,
  });

  return publish;
}

export function formatInstagramCaption(
  title: string,
  spot: string,
  tags: string[]
): string {
  const hashtags = tags
    .slice(0, 30)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");

  return `${title}\n\n${spot}\n\n${hashtags}\n\n📰 Link bio'da`;
}
