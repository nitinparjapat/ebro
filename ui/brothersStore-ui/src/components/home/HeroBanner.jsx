import { useNavigate } from "react-router-dom";

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-[#f7f8f4]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.76)_46%,rgba(255,255,255,0.3)_100%),url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-4 py-5 md:grid-cols-[1fr_auto] md:px-6 md:py-7">
        <div className="text-center md:text-left">
          <span className="inline-flex rounded-full border border-slate-200 bg-white/84 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
            Crafted living
          </span>

          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl md:mx-0 md:text-4xl">
            Bring warmth and style into every corner.
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700 md:mx-0">
            Discover decor pieces, statement furniture, and everyday essentials
            curated for modern Indian homes.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <button
              type="button"
              onClick={() => navigate("/?category=Decor")}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Explore Decor
            </button>
            <span className="rounded-xl bg-white/86 px-3 py-2 text-xs font-black text-slate-900 shadow-sm ring-1 ring-black/5">
              70% offers
            </span>
            <span className="rounded-xl bg-white/86 px-3 py-2 text-xs font-black text-slate-900 shadow-sm ring-1 ring-black/5">
              COD
            </span>
            <span className="rounded-xl bg-white/86 px-3 py-2 text-xs font-black text-slate-900 shadow-sm ring-1 ring-black/5">
              Fast updates
            </span>
          </div>
        </div>

        <div className="hidden justify-end md:flex">
          <img
            src="/bs_logo_hd.png"
            alt="BrothersStore"
            loading="eager"
            decoding="async"
            className="h-16 w-auto rounded-xl bg-white/82 p-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.1)]"
          />
        </div>
      </div>
    </section>
  );
}
