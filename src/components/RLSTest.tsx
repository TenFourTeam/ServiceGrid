import { useSupabaseWithAuth } from '@/hooks/useSupabaseWithAuth';
import { useEffect, useState } from 'react';

interface TestResult {
  auth_uid: string | null;
  profile_id: string | null;
  clerk_user_id: string;
}

export function RLSTest() {
  const { createAuthenticatedClient } = useSupabaseWithAuth();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testRLS = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const client = await createAuthenticatedClient();
      
      // Test with a simple SQL query instead of RPC
      const { data, error: queryError } = await client
        .from('profiles')
        .select('id, clerk_user_id')
        .limit(1);

      if (queryError) {
        throw queryError;
      }

      setResult({
        auth_uid: 'Will test with SQL',
        profile_id: data?.[0]?.id || null,
        clerk_user_id: data?.[0]?.clerk_user_id || 'No clerk_user_id found'
      });
    } catch (err) {
      console.error('RLS test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">RLS Integration Test</h3>
      
      <button 
        onClick={testRLS}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test RLS Integration'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}