
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAuthenticated(true);
        setChecking(false);
      } else if (
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION"
      ) {
        setAuthenticated(false);
        setChecking(false);
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Checking your account...
      </div>
    );
  }

  return <>{children}</>;
}
