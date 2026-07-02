type GetToken = (opts?: { template?: string }) => Promise<string | null>;

// Returns a Convex-acceptable Clerk token from a Next.js server route.
//
// The modern Clerk↔Convex integration adds the `aud: "convex"` claim to the
// DEFAULT session token and creates no named JWT template, so `getToken({
// template: "convex" })` throws/returns null. Older setups used a named
// "convex" template. This tries the template first and falls back to the
// default session token, so it works under either model.
export async function getConvexToken(getToken: GetToken): Promise<string | null> {
  try {
    const templated = await getToken({ template: "convex" });
    if (templated) return templated;
  } catch {
    // No named "convex" template — fall through to the default session token.
  }
  return await getToken();
}
