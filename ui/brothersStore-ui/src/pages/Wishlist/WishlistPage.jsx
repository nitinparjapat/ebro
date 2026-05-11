import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import { useWishlist } from "../../context/WishlistContext";

export default function WishlistPage(){

  const { wishlist } = useWishlist();

  return(

    <div className="bg-gray-100 min-h-screen">

      <Navbar/>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
        <div className="mb-5 rounded-2xl bg-white px-5 py-5 shadow-sm md:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Saved For Later</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">My Wishlist</h1>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {wishlist.length === 0
                ? "Add items you love so you can find them fast later."
                : `${wishlist.length} item${wishlist.length === 1 ? "" : "s"} saved right now.`}
            </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">Your wishlist is empty.</div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <ProductGrid products={wishlist}/>
          </div>
        )}
      </div>

    </div>

  );

}
