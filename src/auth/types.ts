// Core auth types for centralized state management
export type AuthPhase = 'loading' | 'authenticated' | 'locked' | 'signed_out';

export type TenantRole = 'owner' | 'worker';

export interface AuthSnapshot {
  phase: AuthPhase;
  userId?: string;
  email?: string;
  tenantId?: string;
  roles: TenantRole[];
  claimsVersion: number;          // bump to force refresh across app
  lastActivityAt: number;         // for idle/lock
  token?: string;                 // short-lived (memory only)
  // Business context data
  businessId?: string;
  businessName?: string;
  business?: {
    id: string;
    name: string;
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
  lockAuth: () => void;
  signOut: () => Promise<void>;
  emit: (event: string, data?: any) => void;
}

export type AuthEvent = 
  | 'auth:loaded'
  | 'auth:bootstrap_ok' 
  | 'auth:bootstrap_fail'
  | 'auth:phase_changed'
  | 'auth:token_refreshed'
  | 'auth:idle_locked'
  | 'auth:error'
  | 'auth:signed_out';