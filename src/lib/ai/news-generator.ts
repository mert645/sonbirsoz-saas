import { invokeBedrockJSON } from "./bedrock-client";

export interface GeneratedArticle {
  title: string;
  spot: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  category: string;
}

export interface NewsSource {
  title: string;
  description: string;
  link: string;
  pubDate?: string;
  source?: string;
}

const SYSTEM_PROMPT = `Sen profesyonel bir Türk haber editörüsün. Görevin, verilen kaynak haberlerden özgün, tarafsız ve SEO uyumlu Türkçe haberler yazmak.

KURALLAR:
- AP/Reuters haber yazım tarzını takip et: tarafsız, olgusal, piramit yapısı
- Başlık: 40-65 karakter, dikkat çekici ama clickbait değil
- Spot: 120-155 karakter, haberin özeti
- İçerik: HTML formatında, <p>, <h2>, <h3>, <ul>, <li> etiketleri kullan
- Minimum 3 paragraf, ideal 4-6 paragraf
- SEO başlık ve açıklama ayrıca ver
- İlgili etiketleri belirle (3-6 adet)
- Uygun kategoriyi seç: gundem, ekonomi, dunya, spor, teknoloji, saglik, kultur, yasam
- İçeriğin tamamen özgün olmalı, kaynak haberi birebir kopyalama
- "AI tarafından üretilmiştir" notu EKLEME, bunu sistem otomatik yapar

ÇIKTI FORMATI (JSON):
{
  "title": "...",
  "spot": "...",
  "content": "<p>...</p><h2>...</h2><p>...</p>",
  "seoTitle": "...",
  "seoDescription": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "gundem|ekonomi|dunya|spor|teknoloji|saglik|kultur|yasam"
}`;

export async function generateArticleFromSources(
  sources: NewsSource[]
): Promise<GeneratedArticle> {
  const sourceText = sources
    .map(
      (s, i) =>
        `[Kaynak ${i + 1}]\nBaşlık: ${s.title}\nÖzet: ${s.description || "Yok"}\nLink: ${s.link}\nTarih: ${s.pubDate || "Bilinmiyor"}\nKaynak: ${s.source || "Bilinmiyor"}`
    )
    .join("\n\n");

  const result = await invokeBedrockJSON<GeneratedArticle>(
    [
      {
        role: "user",
        content: `Aşağıdaki kaynak haberlerden özgün bir Türkçe haber yaz:\n\n${sourceText}`,
      },
    ],
    {
      system: SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.6,
    }
  );

  return result;
}

export async function rewriteText(
  text: string,
  instruction: string = "Daha güçlü ve etkili bir şekilde yeniden yaz"
): Promise<string> {
  const result = await invokeBedrockJSON<{ text: string }>(
    [
      {
        role: "user",
        content: `Aşağıdaki metni şu talimata göre yeniden yaz: "${instruction}"\n\nMeVcut metin:\n${text}\n\nJSON çıktı: {"text": "yeniden yazılmış metin"}`,
      },
    ],
    {
      system: "Sen profesyonel bir Türk haber editörüsün. Verilen metni talimata göre yeniden yaz.",
      temperature: 0.5,
    }
  );

  return result.text;
}

export async function generateSEOMeta(
  title: string,
  content: string
): Promise<{ seoTitle: string; seoDescription: string; tags: string[] }> {
  const result = await invokeBedrockJSON<{
    seoTitle: string;
    seoDescription: string;
    tags: string[];
  }>(
    [
      {
        role: "user",
        content: `Aşağıdaki haber için SEO meta bilgilerini oluştur:\n\nBaşlık: ${title}\nİçerik: ${content.slice(0, 1000)}\n\nJSON çıktı: {"seoTitle": "55-60 karakter", "seoDescription": "150-155 karakter", "tags": ["etiket1", "etiket2"]}`,
      },
    ],
    {
      system: "SEO uzmanısın. Google News ve Discover için optimize edilmiş meta bilgileri üret. Türkçe yaz.",
      temperature: 0.3,
    }
  );

  return result;
}

export async function categorizeContent(
  title: string,
  spot: string
): Promise<{ category: string; confidence: number }> {
  const result = await invokeBedrockJSON<{ category: string; confidence: number }>(
    [
      {
        role: "user",
        content: `Bu haberin kategorisini belirle:\nBaşlık: ${title}\nSpot: ${spot}\n\nKategoriler: gundem, ekonomi, dunya, spor, teknoloji, saglik, kultur, yasam\n\nJSON: {"category": "...", "confidence": 0.0-1.0}`,
      },
    ],
    {
      temperature: 0.1,
    }
  );

  return result;
}
