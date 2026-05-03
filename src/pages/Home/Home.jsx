import { useMemo } from "react";
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

  const filteredProducts = products.filter(
    (product) =>
      product.isActive &&
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "All" || product.category === selectedCategory)
  );

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

      <div className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-4 text-xl font-bold md:text-center">
          {selectedCategory === "All"
            ? "Trending Products"
            : `${selectedCategory} Products`}
        </h2>

        {loading ? (
          <p className="text-center text-gray-500">Loading products...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : (
          <ProductGrid products={filteredProducts} />
        )}
      </div>
    </div>
  );
}
