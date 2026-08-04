export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: string;
  readingTime: number;
  viewCount: number;
  category: {
    name: string;
    slug: string;
    color: string;
  };
  author: {
    name: string;
    slug: string;
    avatar: string | null;
  };
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  shareCount: number;
  isFeatured: boolean;
  isBreaking: boolean;
  tags: { name: string; slug: string }[];
  updatedAt: string;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  _count: { articles: number };
}

export interface AuthorProfile {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar: string | null;
  expertise: string[];
  socialLinks: Record<string, string> | null;
  articles: ArticleListItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SiteStats {
  totalArticles: number;
  totalViews: number;
  totalAuthors: number;
  totalCategories: number;
}

export interface DovizRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
  change: number;
}
