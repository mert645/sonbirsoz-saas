/**
 * C6 — Ana Hesap Koruma
 *
 * Son Bir Söz'ün 247K takipçili ana Instagram/Facebook/YouTube hesabının
 * yanlışlıkla SaaS markalarına bağlanmasını önler.
 *
 * Tenant ayarlarındaki `protectedAccountIds` dizisine ana hesabın IG kimliği,
 * FB sayfa kimliği ve YT kanal kimliği girilir. Bu kimliklerden biri yeni
 * BrandSocialAccount kaydında gelirse bağlantı REDDEDİLİR.
 */

import { prisma } from "@/lib/db";

export interface AccountGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Verilen accountId/pageId'nin tenant'ın korunan listesinde olup olmadığını kontrol eder.
 * Hesap bağlama API'si çağrılmadan önce bu fonksiyon çağrılmalı.
 */
export async function guardMainAccount(
  tenantId: string,
  candidateIds: string[]
): Promise<AccountGuardResult> {
  if (!candidateIds.length) return { allowed: true };

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { protectedAccountIds: true },
    });

    if (!settings) return { allowed: true };

    const protected_ids = (settings.protectedAccountIds ?? []) as string[];
    if (!protected_ids.length) return { allowed: true };

    const blocked = candidateIds.find((id) => protected_ids.includes(id));
    if (blocked) {
      return {
        allowed: false,
        reason: `Hesap kimliği (${blocked}) bu tenant için korunmaktadır. Ana hesabı marka hesabına bağlayamazsınız.`,
      };
    }

    return { allowed: true };
  } catch (err) {
    // Hata durumunda güvenli taraf: izin ver (bağlantı başarısız olursa yine de engellenir)
    console.error("guardMainAccount hata:", err);
    return { allowed: true };
  }
}

/**
 * Tenant ayarlarına korunan hesap kimliği ekler (admin tarafından çağrılır).
 * Mevcut listeye duplicate eklemez.
 */
export async function addProtectedAccountId(
  tenantId: string,
  accountId: string
): Promise<void> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { id: true, protectedAccountIds: true },
  });

  if (!settings) {
    await prisma.tenantSettings.create({
      data: { tenantId, protectedAccountIds: [accountId] },
    });
    return;
  }

  const current = (settings.protectedAccountIds ?? []) as string[];
  if (current.includes(accountId)) return; // zaten var

  await prisma.tenantSettings.update({
    where: { tenantId },
    data: { protectedAccountIds: [...current, accountId] },
  });
}

/**
 * Tenant ayarlarından korunan hesap kimliğini kaldırır.
 */
export async function removeProtectedAccountId(
  tenantId: string,
  accountId: string
): Promise<void> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { protectedAccountIds: true },
  });

  if (!settings) return;

  const current = (settings.protectedAccountIds ?? []) as string[];
  await prisma.tenantSettings.update({
    where: { tenantId },
    data: { protectedAccountIds: current.filter((id) => id !== accountId) },
  });
}
