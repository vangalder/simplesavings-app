// Convex JWT auth via Clerk. Without this file, ctx.auth.getUserIdentity()
// always returns null. `domain` is the Clerk issuer URL (set in Convex env as
// CLERK_JWT_ISSUER_DOMAIN); `applicationID` must match the Clerk JWT template
// name ("convex") whose `aud` claim Convex validates.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
