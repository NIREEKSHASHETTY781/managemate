
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
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setAuthenticated(false);
        setChecking(false);
        router.replace("/login");
      } else {
        setAuthenticated(true);
        setChecking(false);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session) {
        setAuthenticated(true);
        setChecking(false);
      } else if (event === "SIGNED_OUT") {
        setAuthenticated(false);
        setChecking(false);
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
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
