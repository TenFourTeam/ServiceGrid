// Centralized Clerk token retrieval with retries (no localStorage)
// Usage: const token = await getClerkTokenStrict(getToken)
export async function getClerkTokenStrict(
  getToken: () => Promise<string | null>,
  opts?: { attempts?: number; delayMs?: number }
): Promise<string> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  const delayMs = Math.max(0, opts?.delayMs ?? 200);
  let lastError: any = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const token = await getToken();
      if (token) return token;
    } catch (e: any) {
      lastError = e;
    }
    if (i < attempts - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }

  throw new Error(lastError?.message || "Not authenticated");
}
