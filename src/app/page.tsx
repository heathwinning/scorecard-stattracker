import Link from "next/link";

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
            <Link href="/templates" className="btn-primary text-base px-6 py-3 rounded-xl shadow-lg shadow-indigo-200">
              Browse Scorecards
            </Link>
            <Link href="/login" className="btn-secondary text-base px-6 py-3 rounded-xl">
              Sign in with Google
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">How it works</h2>
          <p className="text-slate-500 max-w-md mx-auto">Three simple steps from template to final score</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: "🎨", step: "1", title: "Build or Pick", desc: "Create a scorecard from scratch with the drag & drop editor, or choose one from the public gallery." },
            { icon: "🎮", step: "2", title: "Start a Game", desc: "Launch a scorecard from any design, add players, and start tracking scores as you play." },
            { icon: "📊", step: "3", title: "Auto-Calculate", desc: "Formula cells automatically sum, average, and compute results. No mental math needed." },
          ].map((f) => (
            <div key={f.step} className="card p-6 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
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

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="card bg-gradient-to-br from-indigo-600 to-violet-700 border-0 p-10 sm:p-14 text-center text-white shadow-xl shadow-indigo-200">
          <h2 className="text-3xl font-bold mb-3">Ready to play?</h2>
          <p className="text-indigo-100 mb-8 max-w-sm mx-auto">Sign in with your Google account and start tracking scores in under a minute.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
