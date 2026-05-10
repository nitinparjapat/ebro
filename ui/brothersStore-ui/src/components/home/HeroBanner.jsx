import { useNavigate } from "react-router-dom";

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <section className="paper-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,241,231,0.98)_0%,rgba(246,241,231,0.92)_34%,rgba(246,241,231,0.52)_58%,rgba(246,241,231,0.2)_100%),url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.18),transparent)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 py-6 md:grid-cols-[1.25fr_0.75fr] md:px-6 md:py-8">
        <div className="paper-panel rounded-[2rem] p-5 text-center md:p-7 md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="newspaper-kicker">BrothersStore Journal</span>
            <span className="rounded-full border border-slate-300/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              Decor and Daily Living
            </span>
          </div>

          <h2 className="font-masthead mx-auto mt-4 max-w-2xl text-3xl font-black leading-[1.05] text-slate-950 sm:text-4xl md:mx-0 md:text-[3.2rem]">
            Style notes for homes that feel lived in, warm, and thoughtfully kept.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-700 md:mx-0 md:text-[1rem]">
            Explore home decor accents, practical home utilities, and everyday pieces chosen to make Indian homes look calmer, softer, and more put together.
          </p>

          <div className="newspaper-rule mt-5" />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <button
              type="button"
              onClick={() => navigate("/?category=Home Decos")}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Explore Home Decor
            </button>
            <span className="newspaper-chip rounded-xl px-3 py-2 text-xs font-black text-slate-900">
              Utility picks
            </span>
            <span className="newspaper-chip rounded-xl px-3 py-2 text-xs font-black text-slate-900">
              Decor accents
            </span>
            <span className="newspaper-chip rounded-xl px-3 py-2 text-xs font-black text-slate-900">
              COD
            </span>
            <span className="newspaper-chip rounded-xl px-3 py-2 text-xs font-black text-slate-900">
              Fresh arrivals
            </span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="paper-panel rounded-[2rem] p-5">
            <p className="newspaper-kicker">This Week at Home</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="font-masthead text-2xl font-bold leading-tight text-slate-950">
                  Curated for corners, shelves, walls, kitchens, and everyday rituals.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  BrothersStore focuses on small home upgrades with big visual comfort, from wall decor and organizers to useful daily-living pieces.
                </p>
              </div>

              <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                <img
                  src="/bs_logo_hd.png"
                  alt="BrothersStore"
                  loading="eager"
                  decoding="async"
                  className="h-14 w-auto rounded-xl bg-white p-2 shadow-sm"
                />
                <div>
                  <p className="newspaper-caption">Editorial Pick</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Home decor and useful essentials, not bulky furniture-first shopping.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
