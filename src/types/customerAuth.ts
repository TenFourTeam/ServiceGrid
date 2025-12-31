// Customer Portal Authentication Types

export interface CustomerAccount {
  id: string;
  customer_id: string;
  email: string;
  auth_method: 'password' | 'magic_link' | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerSession {
  id: string;
  customer_account_id: string;
  session_token: string;
  expires_at: string;
  auth_method: 'magic_link' | 'password';
  active_customer_id?: string;
  active_business_id?: string;
  created_at: string;
}

export interface CustomerPortalInvite {
  id: string;
  customer_id: string;
  business_id: string;
  email: string;
  invite_token: string;
  expires_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface CustomerBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  light_logo_url?: string | null;
  customer_id: string;
  customer_name?: string;
  is_primary?: boolean;
}

export interface CustomerWithBusiness {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  business_id: string;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface CustomerAuthState {
  customer: CustomerAccount | null;
  customerDetails: CustomerWithBusiness | null;
  authMethod: 'password' | 'magic_link' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  // Multi-business support
  availableBusinesses: CustomerBusiness[];
  activeBusinessId: string | null;
  activeCustomerId: string | null;
}

export interface MagicLinkRequest {
  email: string;
  redirect_url?: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

export interface CustomerLoginRequest {
  email: string;
  password: string;
}

export interface CustomerRegisterRequest {
  email: string;
  password: string;
  invite_token?: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  session_token?: string;
  customer_account?: CustomerAccount;
  customer?: CustomerWithBusiness;
  available_businesses?: CustomerBusiness[];
  error?: string;
}
