"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTemplates, type Template } from "@/lib/api-client";

function QuickPickTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    listTemplates().then(d => setTemplates(d.templates?.slice(0, 8) || [])).catch(() => {});
  }, []);

  if (templates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {templates.map(tpl => (
        <Link key={tpl.id} href={`/scorecards/${tpl.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
          {tpl.game_icon || "🎲"} {tpl.name}
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNjN2QyZmUiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 text-center relative">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
            Scorecards for{" "}
            <span className="gradient-text">any game</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Design custom scorecards with drag & drop. Track scores, tally points, and auto-calculate results for every game you play with friends.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/scorecards" className="btn-primary text-base px-6 py-3 rounded-xl shadow-lg shadow-indigo-200">
              Browse Scorecards
            </Link>
            <Link href="/login" className="btn-secondary text-base px-6 py-3 rounded-xl">
              Sign in with Google
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">How it works</h2>
          <p className="text-slate-500 max-w-md mx-auto">Three simple steps from scorecard to final score</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card p-6 sm:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-lg shadow-sm">🎨</div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 1</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Pick a Scorecard</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-3">Choose one to start scoring right away.</p>
            <QuickPickTemplates />
          </div>
          {[
            { icon: "🎮", step: "2", title: "Start a Game", desc: "Launch a scorecard, add players, and start tracking scores as you play." },
            { icon: "📊", step: "3", title: "Auto-Calculate", desc: "Formula cells automatically sum and compute results. No mental math needed." },
          ].map((f) => (
            <div key={f.step} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-lg shadow-sm">{f.icon}</div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step {f.step}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEO: visually hidden but crawlable */}
      <Link href="/login" className="sr-only">Get Started Free — free online scorecard maker for any game</Link>
    </div>
  );
}
