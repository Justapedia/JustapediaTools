"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ToolsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/tools/admin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
    </div>
  );
}
