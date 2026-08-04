interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.warn("OneSignal credentials not configured");
    return false;
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["Subscribed Users"],
        headings: { en: payload.title, tr: payload.title },
        contents: { en: payload.body, tr: payload.body },
        url: payload.url,
        chrome_web_icon: payload.icon,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("Push notification failed:", error);
    return false;
  }
}
