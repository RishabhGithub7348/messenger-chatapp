"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip redirect for auth pages
    if (isLoading || pathname.startsWith("/auth/")) {
      return;
    }

    if (!user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router, pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-green-500"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // For auth pages, render children regardless of auth state
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  // For protected pages, only render children if authenticated
  return user ? <>{children}</> : null;
}
