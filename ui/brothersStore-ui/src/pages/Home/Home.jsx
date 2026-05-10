import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import CategorySlider from "../../components/home/CategorySlider";
import HeroBanner from "../../components/home/HeroBanner";
import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import { useProducts } from "../../context/ProductsContext";
import { useSearch } from "../../context/SearchContext";

export default function Home() {
  const { categories, error, loading, products } = useProducts();
  const { searchTerm } = useSearch();
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = useMemo(() => {
    const categoryFromUrl = searchParams.get("category") ?? "All";
    const categoryExists = categories.some(
      (category) => category.name === categoryFromUrl
    );

    return categoryExists ? categoryFromUrl : "All";
  }, [categories, searchParams]);

  const handleSelectCategory = (categoryName) => {
    if (categoryName === "All") {
      setSearchParams({});
      return;
    }

    setSearchParams({ category: categoryName });
  };

  const filteredProducts = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.isActive &&
        product.title.toLowerCase().includes(normalizedSearch) &&
        (selectedCategory === "All" || product.category === selectedCategory)
    );
  }, [deferredSearchTerm, products, selectedCategory]);

  return (
    <div className="paper-bg min-h-screen">
      <Navbar />
      <HeroBanner />

      {categories.length > 1 && (
        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="paper-panel mb-5 rounded-[2rem] px-5 py-5 md:px-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="newspaper-kicker">
                House Notes
              </p>
              <h2 className="font-masthead mt-2 text-3xl font-black leading-tight text-slate-950">
                {selectedCategory === "All"
                  ? "Trending Home Finds"
                  : `${selectedCategory} Selections`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Decor details, useful home touches, and everyday essentials chosen for modern homes instead of furniture-heavy browsing.
              </p>
            </div>
            <div className="md:text-right">
              <p className="newspaper-caption">Current Shelf</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} available
              </p>
            </div>
          </div>

          <div className="newspaper-rule mt-5" />
        </div>

        {error && products.length > 0 && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Loading products...</p>
        ) : error && products.length === 0 ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
            {error}
          </p>
        ) : (
          <div className="paper-panel rounded-[2rem] p-4 md:p-6">
            <ProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
