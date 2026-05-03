export default function CategorySlider({
  categories,
  selectedCategory,
  onSelectCategory,
}) {

  return (

    <div className="px-4 py-6">

      <div className="mx-auto max-w-5xl">

        <h2 className="mb-4 text-xl font-bold md:text-center">
          Shop by Category
        </h2>

        <div className="flex gap-4 overflow-x-auto scrollbar-hide md:justify-center">

          {categories.map((category) => {

            const isSelected = selectedCategory === category.name;

            return (

              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.name)}
                className={`min-w-[120px] shrink-0 rounded-lg border bg-white p-3 text-center shadow transition ${
                  isSelected
                    ? "border-black ring-1 ring-black"
                    : "border-transparent"
                }`}
              >

                <img
                  src={category.image}
                  alt={category.name}
                  className="h-20 w-full rounded object-cover"
                />

                <p className="mt-2 text-sm font-medium">
                  {category.name}
                </p>

              </button>

            );

          })}

        </div>

      </div>

    </div>

  );
}
