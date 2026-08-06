import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Account lockout ayarları
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 dakika

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 saat
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/giris",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Input sanitization
        const email = credentials.email.trim().toLowerCase();
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.warn(`[AUTH] Invalid email format attempt: ${email.slice(0, 20)}...`);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              passwordHash: true,
              failedLoginAttempts: true,
              lockedUntil: true,
            },
          });

          if (!user || !user.passwordHash) {
            // Timing attack koruması: Kullanıcı yoksa bile hash karşılaştırması yap
            await bcrypt.compare(credentials.password, "$2a$12$dummy.hash.for.timing.attack.protection");
            return null;
          }

          // Account lockout kontrolü
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMs = user.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            console.warn(`[AUTH] Locked account login attempt: ${email}, remaining: ${remainingMin}min`);
            return null;
          }

          // Lockout süresi dolmuşsa temizle
          if (user.lockedUntil && user.lockedUntil <= new Date()) {
            await prisma.user.update({
              where: { id: user.id },
              data: { lockedUntil: null, failedLoginAttempts: 0 },
            });
          }

          const validRoles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"];
          if (!validRoles.includes(user.role)) {
            console.warn(`[AUTH] Invalid role login attempt: ${email}, role: ${user.role}`);
            return null;
          }

          const valid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          
          if (!valid) {
            // Başarısız login kaydı
            const newAttempts = (user.failedLoginAttempts || 0) + 1;
            const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
            
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newAttempts,
                lockedUntil: shouldLock 
                  ? new Date(Date.now() + LOCKOUT_DURATION_MS) 
                  : null,
              },
            });
            
            if (shouldLock) {
              console.warn(`[AUTH] Account locked due to failed attempts: ${email}`);
            }
            
            return null;
          }

          // Başarılı login - sayaçları sıfırla
          const clientIp = req?.headers?.["x-forwarded-for"] || 
                          req?.headers?.["x-real-ip"] || 
                          "unknown";
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "unknown",
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { role: string }).role =
          token.role as string;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      // Logout audit log (opsiyonel)
      if (token?.id) {
        console.log(`[AUTH] User signed out: ${token.id}`);
      }
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}
