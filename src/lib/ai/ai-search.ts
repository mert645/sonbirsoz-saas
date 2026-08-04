import { invokeBedrockClaude } from "@/lib/ai/bedrock-client";
import {
  isEmbeddingConfigured,
  semanticSearch,
  type SemanticHit,
} from "@/lib/ai/embeddings";

/**
 * RAG tabanlı AI arama: arşivdeki en alakalı makaleleri bulur,
 * Bedrock Claude ile [1][2] biçiminde alıntılı kısa bir cevap üretir.
 */

export interface AiSearchSource {
  index: number;
  title: string;
  url: string;
  category: string;
  publishedAt: string | null;
  similarity: number;
}

export interface AiSearchResult {
  answer: string;
  sources: AiSearchSource[];
}

// Alakasız sonuçları eleyecek minimum cosine benzerliği
const MIN_SIMILARITY = 0.25;

function buildContext(hits: SemanticHit[]): string {
  return hits
    .map(
      (hit, i) =>
        `[${i + 1}] Başlık: ${hit.title}\nKategori: ${hit.categoryName}\nTarih: ${
          hit.publishedAt ? new Date(hit.publishedAt).toLocaleDateString("tr-TR") : "bilinmiyor"
        }\nÖzet: ${hit.spot ?? "(özet yok)"}`
    )
    .join("\n\n");
}

export function isAiSearchAvailable(): boolean {
  return isEmbeddingConfigured();
}

export async function aiSearch(query: string): Promise<AiSearchResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  const hits = (await semanticSearch(trimmed, 6)).filter(
    (h) => h.similarity >= MIN_SIMILARITY
  );
  if (hits.length === 0) return null;

  const system = `Sen Son Bir Söz haber sitesinin AI arama asistanısın. Kullanıcının sorusunu SADECE sana verilen haber arşivi bağlamını kullanarak Türkçe cevapla.
Kurallar:
- Her iddiada kaynağa [1], [2] biçiminde atıf yap.
- Bağlamda olmayan bilgi uydurma; bağlam yetersizse bunu açıkça söyle.
- 2-4 cümlelik, net ve haber diliyle yazılmış bir cevap ver.
- Cevap dışında hiçbir şey yazma (başlık, açıklama, madde listesi yok).`;

  try {
    const answer = await invokeBedrockClaude(
      [
        {
          role: "user",
          content: `Haber arşivi bağlamı:\n\n${buildContext(hits)}\n\nSoru: ${trimmed}`,
        },
      ],
      { system, maxTokens: 512, temperature: 0.2 }
    );

    const sources: AiSearchSource[] = hits.map((hit, i) => ({
      index: i + 1,
      title: hit.title,
      url: `/${hit.categorySlug}/${hit.slug}`,
      category: hit.categoryName,
      publishedAt: hit.publishedAt ? hit.publishedAt.toISOString() : null,
      similarity: Math.round(hit.similarity * 100) / 100,
    }));

    return { answer: answer.trim(), sources };
  } catch (error) {
    console.error("aiSearch failed:", error);
    return null;
  }
}
