export default function CategorySlider({
  categories,
  selectedCategory,
  onSelectCategory,
}) {
  return (
    <section className="paper-bg border-y border-slate-300/50 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="hidden shrink-0 sm:block">
          <p className="newspaper-kicker">
            Home Desk
          </p>
          <h2 className="font-masthead text-lg font-bold text-slate-950">
            Browse by story
          </h2>
        </div>

        <div className="flex flex-1 snap-x gap-2 overflow-x-auto py-1 scrollbar-hide">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.name;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.name)}
                className={`group flex min-w-[148px] snap-start items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition md:min-w-[176px] ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]"
                    : "paper-panel text-slate-800 hover:-translate-y-0.5 hover:border-slate-400"
                }`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className={`h-12 w-12 rounded-xl object-cover ${
                    isSelected ? "opacity-90 ring-1 ring-white/30" : "shadow-sm"
                  }`}
                />
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-black leading-tight ${isSelected ? "" : "font-masthead text-[1rem]"}`}>
                    {category.name}
                  </span>
                  <span
                    className={`block text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      isSelected ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    Browse collection
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
