"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search } from "lucide-react";
import type { TenantData } from "@/lib/tenant";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface PublicHeaderProps {
  tenant: TenantData;
  categories: Category[];
}

export function PublicHeader({ tenant, categories }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const siteName = tenant.settings?.siteName || tenant.name;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top Bar */}
      <div className="border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-sm">
            <div className="text-gray-500">
              {new Date().toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/iletisim" className="text-gray-500 hover:text-gray-700">
                İletişim
              </Link>
              <Link href="/kunye" className="text-gray-500 hover:text-gray-700">
                Künye
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span 
              className="text-2xl font-bold"
              style={{ color: "var(--primary-color, #4F46E5)" }}
            >
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/${category.slug}`}
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                {category.name}
              </Link>
            ))}
            {categories.length > 6 && (
              <div className="relative group">
                <button className="text-gray-700 hover:text-primary font-medium">
                  Daha Fazla
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {categories.slice(6).map((category) => (
                    <Link
                      key={category.id}
                      href={`/${category.slug}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen && (
        <div className="border-t border-gray-100 py-4">
          <div className="container mx-auto px-4">
            <form action="/arama" method="GET" className="flex gap-2">
              <input
                type="text"
                name="q"
                placeholder="Haber ara..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                style={{ backgroundColor: "var(--primary-color, #4F46E5)" }}
              >
                Ara
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${category.slug}`}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
