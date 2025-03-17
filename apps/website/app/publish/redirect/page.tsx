"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Component that uses useSearchParams
function RedirectContent() {
  const searchParams = useSearchParams();
  const target = searchParams.get("target");
  const [status, setStatus] = useState("Preparing to publish...");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (target && !isRedirecting) {
      setIsRedirecting(true);

      // Create the URL for redirection
      let redirectTarget = target;

      // Add a return_url parameter so CLI can redirect back to success page
      try {
        const targetUrl = new URL(target);
        const origin = window.location.origin;
        const successUrl = `${origin}/publish/success`;
        targetUrl.searchParams.set("return_url", successUrl);
        redirectTarget = targetUrl.toString();
      } catch (error) {
        console.error("Error parsing target URL:", error);
      }

      // Set a short delay before redirecting to ensure the UI is rendered
      setTimeout(() => {
        setStatus("Redirecting to OpenKit CLI...");
        // Directly navigate to the CLI server
        window.location.href = redirectTarget;
      }, 500);
    }
  }, [target, isRedirecting]);

  return (
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Publishing to OpenKit</h1>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p>{status}</p>
      <p className="mt-4 text-sm text-gray-500">
        You&apos;ll be redirected to authorize the tool publication...
      </p>
    </div>
  );
}

// Main page component with Suspense
export default function RedirectPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          </div>
        }
      >
        <RedirectContent />
      </Suspense>
    </div>
  );
}
