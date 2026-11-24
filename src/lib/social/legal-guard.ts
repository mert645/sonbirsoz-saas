/**
 * C2 — Türk Basın Hukuku Kapısı (legal-guard)
 *
 * Deterministik regex tabanlı; AI gerektirmez, her çağrıda sabit davranır.
 * Son Bir Söz'ün `legal-guard.ts`'inden uyarlandı ve SaaS mimarisine taşındı.
 *
 * Kullanım:
 *   const result = legalGuard({ title, text, contentPolicy: "CRIME" });
 *   if (result.action === "BLOCK") { ... }
 */

export type LegalAction = "PASS" | "REVIEW" | "BLOCK";

export interface LegalFinding {
  rule: string;        // hangi kural tetiklendi
  match: string;       // tetikleyen metin
  severity: "warn" | "block";
}

export interface LegalGuardResult {
  action: LegalAction;
  findings: LegalFinding[];
  note: string;        // rejectionNote'a yazılacak özet
}

export type ContentPolicyType = "STANDARD" | "NEWS" | "CRIME";

// ─── KURAL SETLERİ ───

/** Masumiyet karinesi — kesinleşmiş hüküm olmadan fail kabul eden ifadeler */
const PRESUMPTION_PATTERNS: RegExp[] = [
  /(?:katil|katilin|katletti|katlediyor)(?!\s+(?:araştırılıyor|şüpheli|sanık))/i,
  /(?:dolandırdı|dolandırıcı|hırsız|hırsızlık yaptı)(?!\s+(?:şüpheli|sanık|iddiası))/i,
  /(?:tecavüz etti|istismar etti)(?!\s+(?:şüpheli|sanık|iddiası|suçlaması))/i,
];

/** Suç haberinde yasaklı: şüpheli tam adı (baş harf değil, tam isim) */
const SUSPECT_FULLNAME_PATTERN = /\b[A-ZÇŞĞÜÖİ][a-zçşğüöı]+\s+[A-ZÇŞĞÜÖİ][A-ZÇŞĞÜÖİa-zçşğüöı]+(?:\s+[A-ZÇŞĞÜÖİ][A-ZÇŞĞÜÖİa-zçşğüöı]+)?\b/;

/** İntihar yöntem/yer/araç ifadeleri */
const SUICIDE_METHOD_PATTERNS: RegExp[] = [
  /(?:kendini|intihar).{0,30}(?:silah|ilaç|zehir|ipe|köprüden|binadan atl|asan)/i,
  /(?:silah|ilaç|zehir|ip|köprü|bina).{0,30}(?:intihar|hayatına son)/i,
];

/** İntihar haberi varlığı (yöntem olmasa bile Suç hesabına yasak) */
const SUICIDE_PRESENCE = /(?:intihar|hayatına son verdi|yaşamına son verdi)/i;

/** Cinsel suç ifadeleri */
const SEXUAL_CRIME_PATTERNS: RegExp[] = [
  /(?:cinsel istismar|cinsel saldırı|tecavüz)/i,
];

/** 18 yaş altı ifadeleri */
const MINOR_PATTERNS: RegExp[] = [
  /(?:çocuk|küçük|lise öğrencisi|ilkokul|ortaokul|reşit olmayan|\b1[0-7] yaş|\b[1-9] yaş)/i,
];

/** Ajans telifli görsel kaynak tespiti (URL'de) */
const AGENCY_IMAGE_DOMAINS = [
  "aa.com.tr", "dha.com.tr", "iha.com.tr",
  "hurriyet.com.tr", "milliyet.com.tr", "sabah.com.tr",
  "sozcu.com.tr", "cumhuriyet.com.tr", "haberturk.com",
];

/** Özel hayat — kaynaksız kulis/duyum ifadeleri */
const RUMOR_PATTERNS: RegExp[] = [
  /(?:kulislere göre|duyumlara göre|iddiaya göre).{0,80}(?:ayrıldı|evlendi|hasta|hastalık)/i,
];

/** Sağlık bilgisi — kişi açıklamadan */
const HEALTH_PATTERNS: RegExp[] = [
  /(?:amansız hastalık|kanser|alzheimer|parkinson|ms hastalığı).{0,60}(?:hastanede|tedavi|mücadele)/i,
];

// ─── ANA FONKSİYON ───

export function legalGuard(input: {
  title?: string;
  text?: string;
  imageUrl?: string;
  contentPolicy?: ContentPolicyType;
}): LegalGuardResult {
  const { title = "", text = "", imageUrl = "", contentPolicy = "NEWS" } = input;
  const full = `${title}\n${text}`;
  const findings: LegalFinding[] = [];

  // 1. Masumiyet karinesi (tüm politikalar)
  for (const re of PRESUMPTION_PATTERNS) {
    const m = full.match(re);
    if (m) {
      findings.push({ rule: "masumiyet_karinesi", match: m[0], severity: "block" });
    }
  }

  // 2. İntihar yöntemi (tüm politikalar — BLOCK)
  for (const re of SUICIDE_METHOD_PATTERNS) {
    const m = full.match(re);
    if (m) {
      findings.push({ rule: "intihar_yontem", match: m[0], severity: "block" });
    }
  }

  // 3. Suç politikası ek kurallar
  if (contentPolicy === "CRIME") {
    // 3a. İntihar varlığı (yöntem olmasa bile Suç hesabına yasak)
    const suicideMatch = full.match(SUICIDE_PRESENCE);
    if (suicideMatch) {
      findings.push({ rule: "intihar_crime_ban", match: suicideMatch[0], severity: "block" });
    }

    // 3b. Cinsel suç (Suç hesabına yasak)
    for (const re of SEXUAL_CRIME_PATTERNS) {
      const m = full.match(re);
      if (m) {
        findings.push({ rule: "cinsel_suc_ban", match: m[0], severity: "block" });
      }
    }

    // 3c. 18 yaş altı (Suç hesabına yasak)
    for (const re of MINOR_PATTERNS) {
      const m = full.match(re);
      if (m) {
        findings.push({ rule: "kucuk_ban", match: m[0], severity: "block" });
      }
    }

    // 3d. Şüpheli tam adı (REVIEW)
    const nameMatch = full.match(SUSPECT_FULLNAME_PATTERN);
    if (nameMatch) {
      findings.push({ rule: "suppheli_tam_ad", match: nameMatch[0], severity: "warn" });
    }
  }

  // 4. Özel hayat — kaynaksız kulis (tüm politikalar — REVIEW)
  for (const re of RUMOR_PATTERNS) {
    const m = full.match(re);
    if (m) {
      findings.push({ rule: "ozel_hayat_kulis", match: m[0], severity: "warn" });
    }
  }

  // 5. Sağlık bilgisi (tüm politikalar — REVIEW)
  for (const re of HEALTH_PATTERNS) {
    const m = full.match(re);
    if (m) {
      findings.push({ rule: "saglik_bilgisi", match: m[0], severity: "warn" });
    }
  }

  // 6. Telifli ajans görseli URL kontrolü (tüm politikalar — REVIEW)
  if (imageUrl) {
    const blocked_agency = AGENCY_IMAGE_DOMAINS.find((d) => imageUrl.includes(d));
    if (blocked_agency) {
      findings.push({ rule: "telif_gorsel", match: blocked_agency, severity: "warn" });
    }
  }

  // ─── Karar ───
  const hasBlock = findings.some((f) => f.severity === "block");
  const hasWarn = findings.some((f) => f.severity === "warn");

  let action: LegalAction = "PASS";
  if (hasBlock) action = "BLOCK";
  else if (hasWarn) action = "REVIEW";

  const note =
    findings.length === 0
      ? ""
      : findings
          .map((f) => `[${f.rule}] "${f.match}"`)
          .join("; ");

  return { action, findings, note };
}

/**
 * Suç hesabı (CRIME politikası) onay ekranında zorunlu 5 madde kontrol listesi.
 * API, bu 5 onayın hepsinin gönderildiğini doğrular; eksikse reddeder.
 */
export const CRIME_CHECKLIST_KEYS = [
  "no_guilt_before_verdict",   // suçu sabitleyen ifade yok
  "no_suspect_fullname",       // şüpheli tam adı yok
  "no_victim_detail",          // mağduru teşhis ettirecek ayrıntı yok
  "no_agency_image",           // telifli ya da şiddet içeren görsel yok
  "no_ethnic_generalization",  // etnik/dini gruba atıfla genelleme yok
] as const;

export type CrimeChecklistKey = (typeof CRIME_CHECKLIST_KEYS)[number];

export function validateCrimeChecklist(
  submitted: Partial<Record<CrimeChecklistKey, boolean>>
): { valid: boolean; missing: CrimeChecklistKey[] } {
  const missing = CRIME_CHECKLIST_KEYS.filter((k) => submitted[k] !== true);
  return { valid: missing.length === 0, missing };
}
