import webpush from "web-push";
import { prisma } from "@/lib/db";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@sonbirsoz.com";

function getWebPush() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return null;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const wp = getWebPush();
  if (!wp) return 0;

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return 0;

  const data = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await wp.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { auth: string; p256dh: string },
          },
          data
        );
        sent++;
      } catch (err: unknown) {
        // 410 Gone = subscription expired, clean up
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }

  return sent;
}
