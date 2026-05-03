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

    <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:justify-center">

      {products.map(product => (
        <div key={product.id} className="md:w-60 lg:w-64">
          <ProductCard product={product} />
        </div>
      ))}

    </div>

  );

}
