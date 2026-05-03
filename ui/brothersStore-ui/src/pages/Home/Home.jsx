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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_42%,#f8fafc_100%)]">
      <Navbar />
      <HeroBanner />

      {categories.length > 1 && (
        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Store picks
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {selectedCategory === "All"
                ? "Trending Products"
                : `${selectedCategory} Products`}
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} available
          </p>
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
          <div className="rounded-2xl border border-slate-200/70 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur md:p-6">
            <ProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
