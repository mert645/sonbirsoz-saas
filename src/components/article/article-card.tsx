import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  title: string;
  slug: string;
  spot?: string | null;
  coverImage?: string | null;
  publishedAt: string;
  readingTime: number;
  category: {
    name: string;
    slug: string;
    color: string;
  };
  author: {
    name: string;
    slug: string;
  };
  variant?: "default" | "featured" | "compact" | "horizontal";
  isBreaking?: boolean;
}

export function ArticleCard({
  title,
  slug,
  spot,
  coverImage,
  publishedAt,
  readingTime,
  category,
  author,
  variant = "default",
  isBreaking = false,
}: ArticleCardProps) {
  if (variant === "featured") {
    return (
      <Link
        href={`/${category.slug}/${slug}`}
        className="group relative block overflow-hidden rounded-xl"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 800px"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            {isBreaking && <Badge variant="breaking">SON DAKİKA</Badge>}
            <Badge
              variant="category"
              style={{ backgroundColor: category.color + "20", color: category.color }}
            >
              {category.name}
            </Badge>
          </div>
          <h2 className="text-lg font-bold leading-tight text-white md:text-2xl lg:text-3xl">
            {title}
          </h2>
          {spot && (
            <p className="mt-2 line-clamp-2 text-sm text-white/80 md:text-base">
              {spot}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
            <span>{author.name}</span>
            <span>·</span>
            <time dateTime={publishedAt}>{formatRelativeTime(publishedAt)}</time>
            <span>·</span>
            <span>{readingTime} dk okuma</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link
        href={`/${category.slug}/${slug}`}
        className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
      >
        {coverImage && (
          <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="112px"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center">
          <Badge
            variant="category"
            className="mb-1 w-fit text-[10px]"
            style={{ backgroundColor: category.color + "15", color: category.color }}
          >
            {category.name}
          </Badge>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
            {title}
          </h3>
          <time
            dateTime={publishedAt}
            className="mt-1 text-xs text-muted-foreground"
          >
            {formatRelativeTime(publishedAt)}
          </time>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/${category.slug}/${slug}`}
        className="group flex items-start gap-3 border-b border-border py-3 last:border-0"
      >
        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground group-hover:text-primary">
            {title}
          </h3>
          <time
            dateTime={publishedAt}
            className="mt-1 block text-xs text-muted-foreground"
          >
            {formatRelativeTime(publishedAt)}
          </time>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${category.slug}/${slug}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 400px"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
        )}
        {isBreaking && (
          <div className="absolute left-2 top-2">
            <Badge variant="breaking">SON DAKİKA</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="category"
            className={cn("text-[10px]")}
            style={{ backgroundColor: category.color + "15", color: category.color }}
          >
            {category.name}
          </Badge>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground group-hover:text-primary">
          {title}
        </h3>
        {spot && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {spot}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{author.name}</span>
          <span>·</span>
          <time dateTime={publishedAt}>{formatRelativeTime(publishedAt)}</time>
        </div>
      </div>
    </Link>
  );
}
