import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface TestResult {
  auth_uid: string | null;
  profile_data: any;
  error?: string;
}

export function RLSTest() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testRLS = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test direct Supabase query with Clerk accessToken integration
      console.log('Testing RLS with Clerk accessToken callback...');
      
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .limit(1);

      if (queryError) {
        throw queryError;
      }

      setResult({
        auth_uid: 'Testing with accessToken callback',
        profile_data: data?.[0] || 'No profiles found',
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
      <h3 className="text-lg font-semibold mb-4">RLS Integration Test (accessToken)</h3>
      
      <button 
        onClick={testRLS}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test RLS with accessToken()'}
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