"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getQuickAccess, listTemplates, saveQuickAccess, type QuickAccessTemplate, type Template } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

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

function QuickAccessCards() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getQuickAccess>> | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getQuickAccess().then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return null;

  const cards: QuickAccessTemplate[] = data.preferred ?? data.frequent;
  const max = data.max;

  const openEditor = () => {
    setSelectedIds((data.preferred ?? data.frequent).map(card => card.id));
    setEditing(true);
  };

  const toggle = (id: string) => {
    setSelectedIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : current.length < max ? [...current, id] : current);
  };

  const save = async (templateIds: string[]) => {
    setSaving(true);
    try {
      await saveQuickAccess(templateIds);
      setEditing(false);
      load();
    } catch {
      toast.error("Could not save quick access cards");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {data.preferred ? "Your quick access" : "Your most used"}
        </h2>
        <button type="button" onClick={openEditor} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
          Customise
        </button>
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">
          Scorecards you use will appear here. <button type="button" onClick={openEditor} className="text-indigo-600 hover:underline">Pick your own</button>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(card => (
            <Link key={card.id} href={`/history/new?template=${encodeURIComponent(card.id)}`}
              className="card-hover p-4 flex items-center gap-3">
              <span className="text-2xl">{card.game_icon || "🎲"}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 truncate">{card.name}</span>
                {card.game_name && <span className="block text-xs text-slate-400 truncate">{card.game_name}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Quick access cards">
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">Choose up to {max} scorecards to show on your home page. Leave all unchecked to show your most used instead.</p>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {data.options.map(option => {
              const checked = selectedIds.includes(option.id);
              const disabled = !checked && selectedIds.length >= max;
              return (
                <label key={option.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${disabled ? "opacity-50" : "hover:bg-slate-50 cursor-pointer"}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(option.id)} />
                  <span>{option.game_icon || "🎲"} {option.name}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <button type="button" onClick={() => save([])} disabled={saving} className="btn-secondary text-sm">Use most used</button>
            <button type="button" onClick={() => save(selectedIds)} disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, isGuest, signIn } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const signedIn = !authLoading && !!user && !isGuest;

  const handleJoinGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();

    if (!code) return;

    router.push(`/join/${encodeURIComponent(code)}`);
  };

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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/scorecards" className="btn-primary text-base px-6 py-3 rounded-xl shadow-lg shadow-indigo-200">
              Browse Scorecards
            </Link>
            {!authLoading && (signedIn ? (
              <Link href="/dashboard" className="btn-secondary text-base px-6 py-3 rounded-xl">
                My Dashboard
              </Link>
            ) : (
              <button type="button" onClick={signIn} className="btn-secondary text-base px-6 py-3 rounded-xl">
                Sign in with Google
              </button>
            ))}
          </div>

          <form
            onSubmit={handleJoinGame}
            className="mt-8 max-w-md mx-auto rounded-2xl border border-indigo-100 bg-white/90 p-3 shadow-sm backdrop-blur"
          >
            <label htmlFor="join-code" className="block text-sm font-semibold text-slate-800 mb-2">
              Join a game
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={event => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Enter join code"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={10}
                className="input-field min-w-0 flex-1 font-mono font-semibold tracking-widest uppercase"
                aria-describedby="join-code-help"
              />
              <button type="submit" className="btn-primary shrink-0 px-4">
                Join Game
              </button>
            </div>
            <p id="join-code-help" className="mt-2 text-xs text-slate-500">
              Enter the code shared by your game host.
            </p>
          </form>
        </div>
      </section>

      {signedIn && <QuickAccessCards />}

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
              <span className="text-xs font-bold text-indigo-400 tracking-wider">Step 1</span>
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
                <span className="text-xs font-bold text-indigo-400 tracking-wider">Step {f.step}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEO: visually hidden but crawlable */}
      {!authLoading && !signedIn && <Link href="/login" className="sr-only">Get Started Free — free online scorecard maker for any game</Link>}
    </div>
  );
}
