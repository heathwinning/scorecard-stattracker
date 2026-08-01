"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToConfiguration() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const templateId = searchParams.get("template");
    router.replace(templateId ? `/history/new?template=${encodeURIComponent(templateId)}` : "/scores");
  }, [router, searchParams]);

  return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-slate-400">Opening scorecard configuration…</div>;
}

export default function NewScorecardPage() {
  return <Suspense fallback={null}><RedirectToConfiguration /></Suspense>;
}
