import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * Amazon SES gönderim katmanı.
 * EMAIL_FROM + AWS kimlik bilgileri tanımlı değilse sessizce devre dışı kalır
 * (best-effort — e-posta hiçbir akışı bloklamaz).
 */

let client: SESv2Client | null = null;

function getClient(): SESv2Client | null {
  const accessKeyId = process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  if (!client) {
    client = new SESv2Client({
      region:
        process.env.SES_REGION ||
        process.env.CUSTOM_AWS_REGION ||
        process.env.AWS_REGION ||
        "eu-central-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return !!process.env.EMAIL_FROM && !!getClient();
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Tek e-posta gönderir. Başarısızlıkta false döner, hata fırlatmaz. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const ses = getClient();
  const from = process.env.EMAIL_FROM;
  if (!ses || !from) return false;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [input.to] },
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: input.html, Charset: "UTF-8" },
              ...(input.text
                ? { Text: { Data: input.text, Charset: "UTF-8" } }
                : {}),
            },
          },
        },
      })
    );
    return true;
  } catch (error) {
    console.error("SES send failed:", error);
    return false;
  }
}

/**
 * Toplu gönderim — SES rate limitine takılmamak için küçük gruplar halinde.
 * Döndürdüğü sayı başarılı gönderim adedidir.
 */
export async function sendEmailBatch(
  inputs: SendEmailInput[],
  concurrency = 5
): Promise<number> {
  let sent = 0;
  for (let i = 0; i < inputs.length; i += concurrency) {
    const chunk = inputs.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((input) => sendEmail(input)));
    sent += results.filter(Boolean).length;
  }
  return sent;
}
