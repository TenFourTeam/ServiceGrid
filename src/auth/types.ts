// Core auth types for centralized state management
export type AuthPhase = 'loading' | 'authenticated' | 'signed_out';

export type TenantRole = 'owner' | 'worker';

export interface AuthSnapshot {
  phase: AuthPhase;
  userId?: string;
  email?: string;
  tenantId?: string;
  roles: TenantRole[];
  claimsVersion: number;          // bump to force refresh across app
  token?: string;                 // short-lived (memory only)
  // Business context data
  businessId?: string;
  businessName?: string;
  business?: {
    id: string;
    name: string;
    name_customized?: boolean;
    phone?: string;
    replyToEmail?: string;
    taxRateDefault?: number;
    estPrefix?: string;
    invPrefix?: string;
    estSeq?: number;
    invSeq?: number;
  };
}

export interface AuthBootstrapResult {
  tenantId: string;
  roles: TenantRole[];
  businessId: string;
  businessName: string;
}

export interface AuthContextValue {
  snapshot: AuthSnapshot;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}