export default function CategorySlider({
  categories,
  selectedCategory,
  onSelectCategory,
}) {
  return (
    <section className="border-y border-slate-200/70 bg-white/82 px-4 py-2.5 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="hidden shrink-0 sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Categories
          </p>
          <h2 className="text-sm font-black text-slate-950">
            Quick browse
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
                className={`group flex min-w-[132px] snap-start items-center gap-2 rounded-xl border p-1.5 pr-3 text-left transition md:min-w-[150px] ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]"
                    : "border-slate-200 bg-slate-50/90 text-slate-800 hover:border-slate-300 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.07)]"
                }`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className={`h-10 w-10 rounded-lg object-cover ${
                    isSelected ? "opacity-90 ring-1 ring-white/30" : ""
                  }`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black leading-tight">
                    {category.name}
                  </span>
                  <span
                    className={`block text-[11px] font-semibold ${
                      isSelected ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    Browse picks
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
