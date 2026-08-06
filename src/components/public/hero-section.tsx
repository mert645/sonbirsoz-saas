"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  spot: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  category: { name: string; slug: string; color: string } | null;
  author: { name: string; slug: string } | null;
}

interface HeroSectionProps {
  articles: Article[];
}

export function HeroSection({ articles }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mainArticle = articles[currentIndex];
  const sideArticles = articles.filter((_, i) => i !== currentIndex).slice(0, 4);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [articles.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % articles.length);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <section className="bg-gray-900 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Featured Article */}
          <div className="lg:col-span-2 relative group">
            <Link href={`/${mainArticle.category?.slug}/${mainArticle.slug}`}>
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
                {mainArticle.coverImage ? (
                  <Image
                    src={mainArticle.coverImage}
                    alt={mainArticle.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800" />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {mainArticle.category && (
                    <span
                      className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full mb-3"
                      style={{ backgroundColor: mainArticle.category.color }}
                    >
                      {mainArticle.category.name}
                    </span>
                  )}
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                    {mainArticle.title}
                  </h2>
                  {mainArticle.spot && (
                    <p className="text-gray-300 text-sm md:text-base line-clamp-2 mb-3">
                      {mainArticle.spot}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-gray-400 text-sm">
                    {mainArticle.author && (
                      <span>{mainArticle.author.name}</span>
                    )}
                    <span>•</span>
                    <span>{formatDate(mainArticle.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Navigation Arrows */}
            {articles.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Dots */}
            {articles.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {articles.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Side Articles */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {sideArticles.map((article) => (
              <Link
                key={article.id}
                href={`/${article.category?.slug}/${article.slug}`}
                className="group"
              >
                <div className="relative aspect-[16/9] lg:aspect-[16/7] rounded-lg overflow-hidden">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800" />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {article.category && (
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-semibold text-white rounded mb-1"
                        style={{ backgroundColor: article.category.color }}
                      >
                        {article.category.name}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {article.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
