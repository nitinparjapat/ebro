export default function CategorySlider({
  categories,
  selectedCategory,
  onSelectCategory,
}) {
  return (
    <section className="px-4 py-3 md:px-6 md:py-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-2 flex items-end justify-between gap-3 md:mb-3">
          <div>
            <p className="genz-kicker">Browse The Vibe</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950 md:text-2xl">
              Pick a corner of home life
            </h2>
          </div>
        </div>

        <div className="flex snap-x gap-2.5 overflow-x-auto pb-2 scrollbar-hide md:gap-3">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.name;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.name)}
                className={`group genz-paper min-w-[146px] snap-start rounded-[1.35rem] border p-2.5 text-left transition md:min-w-[198px] md:rounded-[1.6rem] md:p-3 ${
                  isSelected
                    ? "rotate-[-1deg] border-slate-900 bg-slate-900 text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
                    : "paper-panel rotate-[0.4deg] text-slate-900 hover:-translate-y-1 hover:rotate-[-0.4deg]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    className={`h-11 w-11 rounded-[0.9rem] object-cover md:h-14 md:w-14 md:rounded-[1rem] ${
                      isSelected ? "ring-1 ring-white/30" : "shadow-sm"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black tracking-[-0.02em] md:text-base">
                      {category.name}
                    </p>
                    <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.14em] ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                      Curated picks
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
