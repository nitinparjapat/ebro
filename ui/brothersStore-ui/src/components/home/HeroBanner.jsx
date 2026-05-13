import { useNavigate } from "react-router-dom";

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <section className="paper-bg relative overflow-hidden px-4 py-3 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[1.12fr_0.88fr] md:gap-5">
        <div className="genz-tape paper-stack">
          <div className="genz-paper paper-panel rounded-[1.7rem] p-4 md:rounded-[2rem] md:p-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <span className="genz-sticker px-3 py-2 text-[11px] md:px-4 md:py-2">BrothersStore Drop</span>
              <span className="rounded-full bg-[#ffd60a] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900 md:px-3 md:text-[11px]">
                Home Decor + Utilities
              </span>
            </div>

            <p className="genz-kicker mt-3 md:mt-4">Curated For Indian Homes</p>

            <h2 className="mt-2 max-w-3xl text-[1.85rem] font-black leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-4xl md:mt-3 md:text-[3.6rem]">
              Your room
              <span className="genz-highlight ml-2 inline">deserves details</span>
              , not boring shopping.
            </h2>

            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-700 md:mt-3 md:text-base md:leading-7">
              Wall decor, organizers, and small upgrades that make a space feel cleaner, warmer, and more personal.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-5 md:gap-3">
              <button
                type="button"
                onClick={() => navigate("/?category=Home decor")}
                className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 md:px-6 md:py-3"
              >
                Explore Home Decor
              </button>
              <span className="genz-chip rounded-2xl px-3 py-2.5 text-[11px] font-black text-slate-900 md:px-4 md:py-3 md:text-xs">
                Cozy corners
              </span>
              <span className="genz-chip rounded-2xl px-3 py-2.5 text-[11px] font-black text-slate-900 md:px-4 md:py-3 md:text-xs">
                Everyday utility
              </span>
              <span className="genz-chip hidden rounded-2xl px-4 py-3 text-xs font-black text-slate-900 sm:inline-flex">
                Fresh drops
              </span>
            </div>

            <div className="genz-divider mt-6 hidden md:block" />

            <div className="mt-5 hidden grid-cols-3 gap-3 text-sm font-semibold text-slate-700 md:grid">
              <div className="rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm md:px-4 md:py-3">
                Decor that softens blank walls and shelves.
              </div>
              <div className="rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm md:px-4 md:py-3">
                Useful picks for kitchens, desks, and daily routines.
              </div>
              <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                Small upgrades that make homes feel styled.
              </div>
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[320px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_44px_rgba(15,23,42,0.08)] md:block">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.2))]" />

          <div className="absolute left-4 top-4 rotate-[-5deg] rounded-2xl bg-white/94 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <p className="genz-caption">Mood Board</p>
            <p className="mt-1 text-sm font-black text-slate-900">Warm lights. Soft textures. Useful corners.</p>
          </div>

          <div className="absolute bottom-4 right-4 max-w-[240px] rotate-[3deg] rounded-[1.5rem] bg-[#fff7db] px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
            <img
              src="/bs_logo_hd.png"
              alt="BrothersStore"
              loading="eager"
              decoding="async"
              className="mb-3 h-12 w-auto rounded-xl bg-white p-2 shadow-sm"
            />
            <p className="text-sm font-black leading-5 text-slate-900">
              Not a furniture-first store.
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">
              Think decor accents, small home upgrades, and practical lifestyle pieces.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
