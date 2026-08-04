"use client";

import { createContext, useContext, ReactNode } from "react";

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  settings: {
    siteName: string | null;
    tagline: string | null;
    aiGenerationEnabled: boolean;
    aiModerationEnabled: boolean;
    videoStudioEnabled: boolean;
    newsletterEnabled: boolean;
    pushEnabled: boolean;
    customDomainEnabled: boolean;
    apiAccessEnabled: boolean;
  } | null;
}

interface TenantContextValue {
  tenant: TenantData | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
});

export function TenantProvider({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: TenantData | null;
}) {
  return (
    <TenantContext.Provider value={{ tenant, isLoading: false }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function useRequiredTenant() {
  const { tenant, isLoading } = useTenant();
  if (isLoading) {
    throw new Error("Tenant is still loading");
  }
  if (!tenant) {
    throw new Error("Tenant not found");
  }
  return tenant;
}
