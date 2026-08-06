/**
 * Password Policy & Account Security
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Password policy ayarları
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 dakika
  passwordHistoryCount: 5, // Son 5 şifre tekrar kullanılamaz
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
}

/**
 * Şifre politikasını kontrol eder
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;
  
  // Uzunluk kontrolü
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Şifre en az ${PASSWORD_POLICY.minLength} karakter olmalı`);
  } else {
    strengthScore += 1;
  }
  
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Şifre en fazla ${PASSWORD_POLICY.maxLength} karakter olabilir`);
  }
  
  // Büyük harf kontrolü
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Şifre en az bir büyük harf içermeli");
  } else if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  }
  
  // Küçük harf kontrolü
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Şifre en az bir küçük harf içermeli");
  } else if (/[a-z]/.test(password)) {
    strengthScore += 1;
  }
  
  // Rakam kontrolü
  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Şifre en az bir rakam içermeli");
  } else if (/[0-9]/.test(password)) {
    strengthScore += 1;
  }
  
  // Özel karakter kontrolü
  const specialCharRegex = new RegExp(
    `[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`
  );
  if (PASSWORD_POLICY.requireSpecialChars && !specialCharRegex.test(password)) {
    errors.push("Şifre en az bir özel karakter içermeli (!@#$%^&* vb.)");
  } else if (specialCharRegex.test(password)) {
    strengthScore += 1;
  }
  
  // Yaygın şifre kontrolü
  const commonPasswords = [
    "password", "123456", "12345678", "qwerty", "abc123",
    "password123", "admin123", "letmein", "welcome", "monkey",
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Bu şifre çok yaygın, lütfen daha güçlü bir şifre seçin");
    strengthScore = 0;
  }
  
  // Tekrarlayan karakter kontrolü
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Şifre ardışık tekrarlayan karakterler içermemeli");
    strengthScore = Math.max(0, strengthScore - 1);
  }
  
  // Strength hesaplama
  let strength: "weak" | "medium" | "strong" = "weak";
  if (strengthScore >= 4 && password.length >= 12) {
    strength = "strong";
  } else if (strengthScore >= 3) {
    strength = "medium";
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Şifreyi hashler
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Güvenlik için yüksek round
  return bcrypt.hash(password, saltRounds);
}

/**
 * Şifreyi doğrular
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Başarısız login denemesini kaydeder
 */
export async function recordFailedLogin(userId: string): Promise<{
  locked: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });
  
  if (!user) {
    return { locked: false, remainingAttempts: PASSWORD_POLICY.maxLoginAttempts };
  }
  
  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = newAttempts >= PASSWORD_POLICY.maxLoginAttempts;
  const lockoutUntil = shouldLock
    ? new Date(Date.now() + PASSWORD_POLICY.lockoutDuration)
    : null;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil: lockoutUntil,
    },
  });
  
  return {
    locked: shouldLock,
    remainingAttempts: Math.max(0, PASSWORD_POLICY.maxLoginAttempts - newAttempts),
    lockoutUntil: lockoutUntil || undefined,
  };
}

/**
 * Başarılı login sonrası sayaçları sıfırlar
 */
export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

/**
 * Hesabın kilitli olup olmadığını kontrol eder
 */
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  remainingTime?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });
  
  if (!user?.lockedUntil) {
    return { locked: false };
  }
  
  const now = new Date();
  if (user.lockedUntil > now) {
    return {
      locked: true,
      lockedUntil: user.lockedUntil,
      remainingTime: user.lockedUntil.getTime() - now.getTime(),
    };
  }
  
  // Kilit süresi dolmuş, temizle
  await prisma.user.update({
    where: { id: userId },
    data: {
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });
  
  return { locked: false };
}

/**
 * Şifre geçmişini kontrol eder (tekrar kullanım engelleme)
 */
export async function checkPasswordHistory(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PASSWORD_POLICY.passwordHistoryCount,
    select: { passwordHash: true },
  });
  
  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.passwordHash);
    if (isMatch) {
      return false; // Şifre daha önce kullanılmış
    }
  }
  
  return true; // Şifre kullanılabilir
}

/**
 * Şifre geçmişine yeni şifre ekler
 */
export async function addToPasswordHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  // Yeni şifreyi ekle
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });
  
  // Eski kayıtları temizle (limit aşımı)
  const oldEntries = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: PASSWORD_POLICY.passwordHistoryCount,
    select: { id: true },
  });
  
  if (oldEntries.length > 0) {
    await prisma.passwordHistory.deleteMany({
      where: {
        id: { in: oldEntries.map((e) => e.id) },
      },
    });
  }
}
