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
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <HeroBanner />

      {categories.length > 1 && (
        <CategorySlider
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-1 md:px-6 md:pb-10 md:pt-2">
        <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm md:min-w-[420px] md:px-5 md:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Latest Shelf Edit
            </p>
            <h2 className="mt-1.5 text-2xl font-bold text-gray-900 md:mt-2 md:text-3xl">
              {selectedCategory === "All"
                ? "Trending Home Finds"
                : `${selectedCategory} Finds`}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-gray-600 md:mt-2 md:leading-6">
              Decor touches and useful home pieces that make everyday spaces feel more styled, more lived in, and less plain.
            </p>
          </div>

          <div className="self-start rounded-2xl bg-black px-3.5 py-2.5 text-white shadow-sm md:self-auto md:px-4 md:py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">
              Now Showing
            </p>
            <p className="mt-1 text-sm font-bold">
              {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}
            </p>
          </div>
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
          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <ProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
