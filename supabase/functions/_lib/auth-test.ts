// Test-mode authentication for Supabase Edge Functions
// This file mocks Clerk's verifyToken function for testing purposes

export interface MockTokenPayload {
  sub: string; // Clerk user ID
  email?: string;
  primary_email?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  nbf: number;
  azp?: string;
  sid?: string;
}

/**
 * Mock implementation of Clerk's verifyToken function
 * Parses and validates the structure of mock JWTs without cryptographic verification
 */
export async function verifyToken(token: string, options: { secretKey: string }): Promise<MockTokenPayload> {
  console.info('🧪 [auth-test] Using mock verifyToken for testing');
  
  try {
    // Parse the JWT structure (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format: expected 3 parts');
    }

    const [header, payload, signature] = parts;
    
    // Decode header
    let decodedHeader;
    try {
      decodedHeader = JSON.parse(atob(header));
    } catch (e) {
      throw new Error('Invalid JWT header: not valid base64 JSON');
    }

    // Decode payload with URL-safe base64 handling
    let decodedPayload;
    try {
      // Handle URL-safe base64
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      decodedPayload = JSON.parse(atob(normalizedPayload));
    } catch (e) {
      throw new Error('Invalid JWT payload: not valid base64 JSON');
    }

    // Validate required fields
    if (!decodedPayload.sub) {
      throw new Error('Invalid JWT: missing sub (subject) field');
    }

    if (!decodedPayload.exp || typeof decodedPayload.exp !== 'number') {
      throw new Error('Invalid JWT: missing or invalid exp (expiration) field');
    }

    if (!decodedPayload.iat || typeof decodedPayload.iat !== 'number') {
      throw new Error('Invalid JWT: missing or invalid iat (issued at) field');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp < now) {
      throw new Error('JWT has expired');
    }

    // Check not before time
    if (decodedPayload.nbf && decodedPayload.nbf > now + 5) { // 5 second clock skew tolerance
      throw new Error('JWT not yet valid (nbf claim)');
    }

    // Validate issuer (should look like a Clerk issuer)
    if (!decodedPayload.iss || !decodedPayload.iss.includes('clerk') && !decodedPayload.iss.includes('test')) {
      throw new Error('Invalid JWT: invalid issuer');
    }

    console.info('✅ [auth-test] Mock JWT validation successful', {
      sub: decodedPayload.sub,
      email: decodedPayload.email || decodedPayload.primary_email,
      exp: new Date(decodedPayload.exp * 1000).toISOString()
    });

    return decodedPayload as MockTokenPayload;
    
  } catch (error) {
    console.error('❌ [auth-test] Mock JWT validation failed:', error.message);
    throw error;
  }
}