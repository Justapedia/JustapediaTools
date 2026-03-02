"use client";

import { Suspense } from "react";
import CitationGenerator from "@/components/CitationGenerator";

export default function CitationToolPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Suspense fallback={<div className="text-center py-20 text-zinc-500">Loading tool...</div>}>
        <CitationGenerator />
      </Suspense>
    </div>
  );
}
