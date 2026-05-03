import ProductCard from "./ProductCard";

export default function ProductGrid({ products }) {

  if (products.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No products found
      </p>
    );
  }

  return (

    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6 md:grid-cols-3 xl:grid-cols-4">

      {products.map(product => (
        <div key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}

    </div>

  );

}
