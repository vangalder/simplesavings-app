"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useCallback, useMemo } from "react";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

// Custom Clerk→Convex auth adapter.
//
// The modern Clerk↔Convex integration adds the `aud: "convex"` claim to the
// DEFAULT Clerk session token and creates NO named JWT template. But
// convex/react-clerk (1.39) only uses the default token when
// `sessionClaims.aud === "convex"` — a value Clerk does not surface in
// sessionClaims — otherwise it requests a `convex` template that doesn't exist
// ("JWT template not found") and sends no token, so every authenticated call
// fails with "Not authenticated".
//
// We sidestep that by always fetching the default session token, which carries
// `aud: "convex"` and validates against convex/auth.config.ts.
function useConvexAuthFromClerk() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getToken({ skipCache: forceRefreshToken });
      } catch {
        return null;
      }
    },
    [getToken]
  );
  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: !!isSignedIn,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken]
  );
}

function ConvexWrapper({ children }: { children: React.ReactNode }) {
  if (!convex) return <>{children}</>;
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromClerk}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexWrapper>{children}</ConvexWrapper>
    </ClerkProvider>
  );
}
