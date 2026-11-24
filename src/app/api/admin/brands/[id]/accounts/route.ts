/**
 * Marka sosyal hesap yönetimi
 * GET  /api/admin/brands/[id]/accounts       — hesapları listele
 * POST /api/admin/brands/[id]/accounts       — yeni hesap bağla (guardMainAccount kontrolüyle)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/data/article-mutations";
import { requireTenantId } from "@/lib/tenant";
import { guardMainAccount } from "@/lib/social/guard-main-account";
import { createCipheriv, randomBytes, createDecipheriv } from "crypto";

// ─── Token şifreleme (SOCIAL_ENCRYPTION_KEY ile AES-256-GCM) ───

function encryptToken(plaintext: string): string {
  const key = Buffer.from(process.env.SOCIAL_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("SOCIAL_ENCRYPTION_KEY 64 hex karakter olmalı (32 byte)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${encrypted.toString("hex")}.${tag.toString("hex")}`;
}

export function decryptToken(encToken: string): string {
  const key = Buffer.from(process.env.SOCIAL_ENCRYPTION_KEY || "", "hex");
  const [ivHex, encHex, tagHex] = encToken.split(".");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

const connectSchema = z.object({
  platform: z.enum(["TWITTER", "INSTAGRAM", "FACEBOOK", "TELEGRAM", "YOUTUBE"]),
  accountId: z.string().min(1),
  pageId: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  token: z.string().min(1), // ham token — şifrelenecek
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: brandId } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const accounts = await prisma.brandSocialAccount.findMany({
    where: { brandId },
    select: {
      id: true,
      platform: true,
      accountId: true,
      pageId: true,
      username: true,
      verified: true,
      lastError: true,
      lastVerifiedAt: true,
      createdAt: true,
      // encToken döndürülmez
    },
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireEditor();
  if (!user) return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

  const { id: brandId } = await params;
  const tenantId = await requireTenantId();

  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } });
  if (!brand) return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.issues }, { status: 400 });
  }

  // C6: Ana hesap kimlik koruması
  const candidateIds = [parsed.data.accountId, parsed.data.pageId].filter(Boolean) as string[];
  const guard = await guardMainAccount(tenantId, candidateIds);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 403 });
  }

  // Aynı platform zaten bağlıysa güncelle
  const existing = await prisma.brandSocialAccount.findUnique({
    where: { brandId_platform: { brandId, platform: parsed.data.platform } },
  });

  // Token'ı şifrele
  let encToken: string;
  try {
    encToken = encryptToken(parsed.data.token);
  } catch (err) {
    return NextResponse.json({ error: `Token şifrelenemedi: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }

  if (existing) {
    const updated = await prisma.brandSocialAccount.update({
      where: { id: existing.id },
      data: {
        accountId: parsed.data.accountId,
        pageId: parsed.data.pageId ?? null,
        username: parsed.data.username ?? null,
        encToken,
        verified: false,
        lastError: null,
      },
      select: { id: true, platform: true, accountId: true, username: true, verified: true },
    });
    return NextResponse.json({ data: updated });
  }

  const account = await prisma.brandSocialAccount.create({
    data: {
      brandId,
      platform: parsed.data.platform,
      accountId: parsed.data.accountId,
      pageId: parsed.data.pageId ?? null,
      username: parsed.data.username ?? null,
      encToken,
    },
    select: { id: true, platform: true, accountId: true, username: true, verified: true },
  });

  return NextResponse.json({ data: account }, { status: 201 });
}
