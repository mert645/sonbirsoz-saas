-- RAG AI arama: pgvector uzantısı + makale embedding tablosu
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "article_embeddings" (
    "articleId" TEXT NOT NULL,
    "embedding" vector(512) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_embeddings_pkey" PRIMARY KEY ("articleId")
);

ALTER TABLE "article_embeddings"
  ADD CONSTRAINT "article_embeddings_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cosine benzerlik araması için HNSW indeksi
CREATE INDEX "article_embeddings_embedding_idx"
  ON "article_embeddings" USING hnsw ("embedding" vector_cosine_ops);
