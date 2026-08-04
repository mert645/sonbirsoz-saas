export interface FacebookPostInput {
  message: string;
  link?: string;
  imageUrl?: string;
}

async function callFacebookAPI(
  endpoint: string,
  body: Record<string, string>
): Promise<{ id: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID!;
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN!;

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: pageToken }),
    }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }
  return data;
}

export async function postToFacebook(input: FacebookPostInput): Promise<{ id: string }> {
  if (input.imageUrl) {
    return callFacebookAPI("photos", {
      url: input.imageUrl,
      caption: input.message,
    });
  }

  return callFacebookAPI("feed", {
    message: input.message,
    ...(input.link && { link: input.link }),
  });
}

export function formatFacebookContent(
  title: string,
  spot: string,
  url: string
): string {
  return `${title}\n\n${spot}\n\n👉 ${url}`;
}
