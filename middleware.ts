// Middleware for Clerk authentication
// Uncomment and configure when Clerk is set up
// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// const isPublicRoute = createRouteMatcher([
//   "/",
//   "/api/webhooks(.*)",
// ]);

// export default clerkMiddleware(async (auth, request) => {
//   if (!isPublicRoute(request)) {
//     await auth.protect();
//   }
// });

// Temporary middleware until Clerk is configured
export function middleware(request: any) {
  // No-op middleware for now
  return;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
