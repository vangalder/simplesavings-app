"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function ConvexWrapper({ children }: { children: React.ReactNode }) {
  if (!convex) return <>{children}</>;
  const useAuthAny = useAuth as unknown as Parameters<typeof ConvexProviderWithClerk>[0]["useAuth"];
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuthAny}>
      {children}
    </ConvexProviderWithClerk>
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
