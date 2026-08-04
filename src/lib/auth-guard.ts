/**
 * Admin auth bypass (demo/no-DB modu) yalnızca ÜRETİM DIŞINDA geçerlidir.
 * NODE_ENV === "production" iken ADMIN_AUTH_DISABLED değeri ne olursa olsun
 * yok sayılır; böylece yanlışlıkla bırakılan bir env değişkeni tüm admin
 * panelini herkese açamaz. Tek kaynak (single source of truth) burasıdır.
 */
export function isAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_AUTH_DISABLED === "true"
  );
}
