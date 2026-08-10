// Public sayfalar kendi Header/Footer'larını kullanıyor
// Bu layout sadece children'ı render ediyor

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public sayfalar kendi Header/Footer'larını kullanıyor
  // Bu layout sadece children'ı render ediyor
  return <>{children}</>;
}
