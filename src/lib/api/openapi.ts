/**
 * OpenAPI 3.0 Specification for SonBirSöz SaaS API
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SonBirSöz SaaS API",
    description: `
# SonBirSöz SaaS Platform API

Bu API, SonBirSöz SaaS platformunun public REST API'sidir. 
Enterprise plan aboneleri bu API üzerinden içerik yönetimi yapabilir.

## Kimlik Doğrulama

Tüm API istekleri için \`Authorization\` header'ında Bearer token olarak API key gönderilmelidir:

\`\`\`
Authorization: Bearer sbs_live_xxxxxxxxxxxxxxxxxxxx
\`\`\`

API key'inizi admin panelinden **API Anahtarları** bölümünden oluşturabilirsiniz.

## Rate Limiting

| Plan | Limit |
|------|-------|
| Enterprise | 1000 istek/dakika |
| Professional | 100 istek/dakika |
| Starter | 10 istek/dakika |

Rate limit aşıldığında \`429 Too Many Requests\` yanıtı döner.

## Hata Yanıtları

Tüm hatalar aşağıdaki formatta döner:

\`\`\`json
{
  "success": false,
  "error": "Hata mesajı"
}
\`\`\`
    `,
    version: "1.0.0",
    contact: {
      name: "SonBirSöz Destek",
      email: "destek@sonbirsoz-saas.com",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "https://{tenant}.sonbirsoz-saas.com/api/v1",
      description: "Production API",
      variables: {
        tenant: {
          default: "demo",
          description: "Tenant subdomain",
        },
      },
    },
    {
      url: "http://localhost:3000/api/v1",
      description: "Development API",
    },
  ],
  tags: [
    {
      name: "Articles",
      description: "Makale yönetimi",
    },
    {
      name: "Categories",
      description: "Kategori yönetimi",
    },
    {
      name: "Authors",
      description: "Yazar yönetimi",
    },
    {
      name: "Media",
      description: "Medya dosyaları yönetimi",
    },
  ],
  paths: {
    "/articles": {
      get: {
        tags: ["Articles"],
        summary: "Makale listesi",
        description: "Tenant'a ait makaleleri listeler. Pagination ve filtreleme destekler.",
        operationId: "listArticles",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Sayfa numarası",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Sayfa başına kayıt sayısı",
            schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
          },
          {
            name: "status",
            in: "query",
            description: "Makale durumu filtresi",
            schema: {
              type: "string",
              enum: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"],
            },
          },
          {
            name: "categoryId",
            in: "query",
            description: "Kategori ID filtresi",
            schema: { type: "string" },
          },
          {
            name: "authorId",
            in: "query",
            description: "Yazar ID filtresi",
            schema: { type: "string" },
          },
          {
            name: "sort",
            in: "query",
            description: "Sıralama (field:order)",
            schema: { type: "string", default: "createdAt:desc" },
          },
        ],
        responses: {
          "200": {
            description: "Başarılı",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ArticleListResponse",
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Articles"],
        summary: "Yeni makale oluştur",
        description: "Yeni bir makale oluşturur.",
        operationId: "createArticle",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ArticleCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Makale oluşturuldu",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/articles/{id}": {
      get: {
        tags: ["Articles"],
        summary: "Makale detayı",
        description: "ID veya slug ile makale detayını getirir.",
        operationId: "getArticle",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Makale ID veya slug",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Başarılı",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Articles"],
        summary: "Makale güncelle",
        description: "Mevcut bir makaleyi günceller.",
        operationId: "updateArticle",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Makale ID",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ArticleUpdate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Makale güncellendi",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Articles"],
        summary: "Makale sil",
        description: "Bir makaleyi siler.",
        operationId: "deleteArticle",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Makale ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Makale silindi",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "Kategori listesi",
        description: "Tenant'a ait kategorileri listeler.",
        operationId: "listCategories",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
          {
            name: "isActive",
            in: "query",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          "200": {
            description: "Başarılı",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Yeni kategori oluştur",
        operationId: "createCategory",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CategoryCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Kategori oluşturuldu",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/authors": {
      get: {
        tags: ["Authors"],
        summary: "Yazar listesi",
        description: "Tenant'a ait yazarları listeler.",
        operationId: "listAuthors",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
          {
            name: "isActive",
            in: "query",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          "200": {
            description: "Başarılı",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthorListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Authors"],
        summary: "Yeni yazar oluştur",
        operationId: "createAuthor",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthorCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Yazar oluşturuldu",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthorResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/media": {
      get: {
        tags: ["Media"],
        summary: "Medya listesi",
        description: "Tenant'a ait medya dosyalarını listeler.",
        operationId: "listMedia",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
          {
            name: "type",
            in: "query",
            description: "Medya tipi filtresi",
            schema: { type: "string", enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] },
          },
        ],
        responses: {
          "200": {
            description: "Başarılı",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MediaListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Media"],
        summary: "Medya kaydı oluştur",
        description: "Yeni bir medya kaydı oluşturur. Not: Dosya yükleme ayrı bir endpoint gerektirir.",
        operationId: "createMedia",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MediaCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Medya kaydı oluşturuldu",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MediaResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "API Key formatı: sbs_live_xxxxxxxxxxxxxxxxxxxx",
      },
    },
    schemas: {
      // Article Schemas
      Article: {
        type: "object",
        properties: {
          id: { type: "string", example: "clx1234567890" },
          title: { type: "string", example: "Örnek Haber Başlığı" },
          slug: { type: "string", example: "ornek-haber-basligi" },
          spot: { type: "string", nullable: true, example: "Haberin kısa özeti..." },
          content: { type: "string", example: "<p>Haber içeriği...</p>" },
          coverImage: { type: "string", nullable: true, example: "https://..." },
          status: {
            type: "string",
            enum: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"],
            example: "PUBLISHED",
          },
          viewCount: { type: "integer", example: 1250 },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          category: { $ref: "#/components/schemas/CategorySummary" },
          author: { $ref: "#/components/schemas/AuthorSummary" },
        },
      },
      ArticleCreate: {
        type: "object",
        required: ["title", "content", "categoryId"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          slug: { type: "string", description: "Otomatik oluşturulur" },
          spot: { type: "string", maxLength: 500 },
          content: { type: "string" },
          coverImage: { type: "string", format: "uri" },
          categoryId: { type: "string" },
          authorId: { type: "string" },
          status: {
            type: "string",
            enum: ["DRAFT", "REVIEW", "PUBLISHED"],
            default: "DRAFT",
          },
          seoTitle: { type: "string", maxLength: 70 },
          seoDescription: { type: "string", maxLength: 160 },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      ArticleUpdate: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          spot: { type: "string", maxLength: 500 },
          content: { type: "string" },
          coverImage: { type: "string", format: "uri" },
          categoryId: { type: "string" },
          authorId: { type: "string" },
          status: { type: "string", enum: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] },
          seoTitle: { type: "string", maxLength: 70 },
          seoDescription: { type: "string", maxLength: 160 },
        },
      },
      ArticleListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Article" },
          },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      ArticleResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/Article" },
        },
      },
      // Category Schemas
      Category: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Gündem" },
          slug: { type: "string", example: "gundem" },
          description: { type: "string", nullable: true },
          color: { type: "string", example: "#4F46E5" },
          icon: { type: "string", nullable: true },
          order: { type: "integer" },
          isActive: { type: "boolean" },
          articleCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CategorySummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
        },
      },
      CategoryCreate: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          slug: { type: "string" },
          description: { type: "string", maxLength: 500 },
          color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          icon: { type: "string" },
          order: { type: "integer", minimum: 0 },
          isActive: { type: "boolean", default: true },
        },
      },
      CategoryListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "array", items: { $ref: "#/components/schemas/Category" } },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      CategoryResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { $ref: "#/components/schemas/Category" },
        },
      },
      // Author Schemas
      Author: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Ahmet Yılmaz" },
          slug: { type: "string", example: "ahmet-yilmaz" },
          email: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          expertise: { type: "array", items: { type: "string" } },
          socialLinks: { type: "object" },
          isActive: { type: "boolean" },
          articleCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthorSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          avatar: { type: "string", nullable: true },
        },
      },
      AuthorCreate: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          slug: { type: "string" },
          email: { type: "string", format: "email" },
          bio: { type: "string", maxLength: 1000 },
          avatar: { type: "string", format: "uri" },
          expertise: { type: "array", items: { type: "string" } },
          socialLinks: {
            type: "object",
            properties: {
              twitter: { type: "string" },
              linkedin: { type: "string" },
              website: { type: "string" },
            },
          },
          isActive: { type: "boolean", default: true },
        },
      },
      AuthorListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "array", items: { $ref: "#/components/schemas/Author" } },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      AuthorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { $ref: "#/components/schemas/Author" },
        },
      },
      // Media Schemas
      Media: {
        type: "object",
        properties: {
          id: { type: "string" },
          filename: { type: "string" },
          url: { type: "string" },
          type: { type: "string", enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] },
          mimeType: { type: "string" },
          size: { type: "integer", description: "Bytes" },
          width: { type: "integer", nullable: true },
          height: { type: "integer", nullable: true },
          alt: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MediaCreate: {
        type: "object",
        required: ["filename", "url", "type", "mimeType", "size"],
        properties: {
          filename: { type: "string" },
          url: { type: "string", format: "uri" },
          type: { type: "string", enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] },
          mimeType: { type: "string" },
          size: { type: "integer" },
          width: { type: "integer" },
          height: { type: "integer" },
          alt: { type: "string", maxLength: 200 },
        },
      },
      MediaListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "array", items: { $ref: "#/components/schemas/Media" } },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      MediaResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { $ref: "#/components/schemas/Media" },
        },
      },
      // Common Schemas
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 150 },
          totalPages: { type: "integer", example: 8 },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Hata mesajı" },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Geçersiz istek",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, error: "Geçersiz veri formatı" },
          },
        },
      },
      Unauthorized: {
        description: "Kimlik doğrulama gerekli",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, error: "Authorization header gerekli" },
          },
        },
      },
      Forbidden: {
        description: "Yetkisiz erişim",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, error: "Bu işlem için yetkiniz yok" },
          },
        },
      },
      NotFound: {
        description: "Kaynak bulunamadı",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, error: "Kayıt bulunamadı" },
          },
        },
      },
      RateLimited: {
        description: "Rate limit aşıldı",
        headers: {
          "Retry-After": {
            description: "Kaç saniye sonra tekrar denenebilir",
            schema: { type: "integer" },
          },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, error: "Çok fazla istek. Lütfen bekleyin." },
          },
        },
      },
    },
  },
};

export function getOpenApiSpec() {
  return openApiSpec;
}
