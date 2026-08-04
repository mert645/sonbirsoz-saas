export interface TelegramPostInput {
  text: string;
  imageUrl?: string;
  parseMode?: "HTML" | "Markdown";
}

const API_BASE = "https://api.telegram.org/bot";

async function callTelegramAPI(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const response = await fetch(`${API_BASE}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  return data.result;
}

export async function postToTelegram(input: TelegramPostInput): Promise<{ messageId: number }> {
  const chatId = process.env.TELEGRAM_CHANNEL_ID!;

  if (input.imageUrl) {
    const result = await callTelegramAPI("sendPhoto", {
      chat_id: chatId,
      photo: input.imageUrl,
      caption: input.text,
      parse_mode: input.parseMode || "HTML",
    }) as { message_id: number };

    return { messageId: result.message_id };
  }

  const result = await callTelegramAPI("sendMessage", {
    chat_id: chatId,
    text: input.text,
    parse_mode: input.parseMode || "HTML",
    disable_web_page_preview: false,
  }) as { message_id: number };

  return { messageId: result.message_id };
}

export function formatTelegramContent(
  title: string,
  spot: string,
  url: string,
  tags: string[]
): string {
  const hashtags = tags
    .slice(0, 5)
    .map((t) => `#${t.replace(/\s+/g, "_")}`)
    .join(" ");

  return `<b>${title}</b>\n\n${spot}\n\n🔗 <a href="${url}">Haberi Oku</a>\n\n${hashtags}`;
}
