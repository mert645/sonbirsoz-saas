import { prisma } from "@/lib/db";
import { signWebhookPayload, WEBHOOK_EVENTS, WebhookEvent } from "./keys";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Webhook'u tetikler ve delivery kaydı oluşturur
 */
export async function triggerWebhook(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  // Bu tenant için aktif webhook'ları bul
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);

  // Her webhook için async olarak gönder
  for (const webhook of webhooks) {
    deliverWebhook(webhook.id, webhook.url, webhook.secret, payloadString, event).catch(
      (error) => console.error(`Webhook delivery error for ${webhook.id}:`, error)
    );
  }
}

/**
 * Webhook'u gönderir ve sonucu kaydeder
 */
async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: string,
  event: string
): Promise<void> {
  const startTime = Date.now();
  let statusCode: number | null = null;
  let response: string | null = null;
  let success = false;

  try {
    const signature = signWebhookPayload(payload, secret);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body: payload,
      signal: AbortSignal.timeout(30000), // 30 saniye timeout
    });

    statusCode = res.status;
    response = await res.text().catch(() => null);
    success = res.ok;

    // Başarılı ise fail count'u sıfırla
    if (success) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          failCount: 0,
          lastSuccess: new Date(),
          lastTriedAt: new Date(),
        },
      });
    } else {
      await incrementFailCount(webhookId);
    }
  } catch (error) {
    response = error instanceof Error ? error.message : "Unknown error";
    await incrementFailCount(webhookId);
  }

  const duration = Date.now() - startTime;

  // Delivery kaydı oluştur
  await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      payload: JSON.parse(payload),
      statusCode,
      response: response?.slice(0, 1000), // Max 1000 karakter
      duration,
      success,
    },
  });
}

/**
 * Fail count'u artırır ve gerekirse webhook'u devre dışı bırakır
 */
async function incrementFailCount(webhookId: string): Promise<void> {
  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      failCount: { increment: 1 },
      lastTriedAt: new Date(),
    },
  });

  // 10 ardışık başarısızlıktan sonra devre dışı bırak
  if (webhook.failCount >= 10) {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    });
  }
}

/**
 * Makale yayınlandığında webhook tetikle
 */
export async function onArticlePublished(
  tenantId: string,
  article: {
    id: string;
    title: string;
    slug: string;
    categoryId: string;
    authorId?: string | null;
  }
): Promise<void> {
  await triggerWebhook(tenantId, "article.published", {
    article: {
      id: article.id,
      title: article.title,
      slug: article.slug,
      categoryId: article.categoryId,
      authorId: article.authorId,
    },
  });
}

/**
 * Makale güncellendiğinde webhook tetikle
 */
export async function onArticleUpdated(
  tenantId: string,
  article: {
    id: string;
    title: string;
    slug: string;
  }
): Promise<void> {
  await triggerWebhook(tenantId, "article.updated", {
    article: {
      id: article.id,
      title: article.title,
      slug: article.slug,
    },
  });
}

/**
 * Yorum oluşturulduğunda webhook tetikle
 */
export async function onCommentCreated(
  tenantId: string,
  comment: {
    id: string;
    articleId: string;
    authorName: string;
    content: string;
  }
): Promise<void> {
  await triggerWebhook(tenantId, "comment.created", {
    comment: {
      id: comment.id,
      articleId: comment.articleId,
      authorName: comment.authorName,
      content: comment.content.slice(0, 200),
    },
  });
}

/**
 * Medya yüklendiğinde webhook tetikle
 */
export async function onMediaUploaded(
  tenantId: string,
  media: {
    id: string;
    filename: string;
    url: string;
    type: string;
  }
): Promise<void> {
  await triggerWebhook(tenantId, "media.uploaded", {
    media: {
      id: media.id,
      filename: media.filename,
      url: media.url,
      type: media.type,
    },
  });
}

export { WEBHOOK_EVENTS };
