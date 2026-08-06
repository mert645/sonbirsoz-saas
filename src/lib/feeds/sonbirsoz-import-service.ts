import type { PrismaClient } from "@/generated/prisma/client";
import type { ImportOptions, ArchiveUrlOptions } from "./sonbirsoz-importer";

export interface ImportResult {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ArchiveImportOptions extends ArchiveUrlOptions {
  userId?: string;
  tenantId?: string;
  concurrency?: number;
  batchSize?: number;
  onBatch?: (info: {
    batch: number;
    totalBatches: number;
    result: ImportResult;
  }) => void;
}

/**
 * sonbirsoz.com import service - Multi-tenant yapıya geçiş nedeniyle devre dışı.
 * TODO: tenantId parametresi ile yeniden implemente edilmeli.
 */
export async function importSonbirsozArticles(
  _prisma: PrismaClient,
  _opts: ImportOptions & { userId?: string; tenantId?: string } = {},
): Promise<ImportResult> {
  return {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: ["Import service is disabled in multi-tenant mode. Will be re-implemented per tenant."],
  };
}

export async function importSonbirsozArchive(
  _prisma: PrismaClient,
  _opts: ArchiveImportOptions = {},
): Promise<ImportResult & { totalUrls: number }> {
  return {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: ["Archive import is disabled in multi-tenant mode."],
    totalUrls: 0,
  };
}

export async function importSonbirsozByUrls(
  _prisma: PrismaClient,
  _urls: string[],
  _opts: { userId?: string; tenantId?: string; concurrency?: number; batchSize?: number } = {},
): Promise<ImportResult> {
  return {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: ["URL import is disabled in multi-tenant mode."],
  };
}
