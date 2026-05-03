import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import { useWishlist } from "../../context/WishlistContext";

export default function WishlistPage(){

  const { wishlist } = useWishlist();

  return(

    <div className="bg-gray-100 min-h-screen">

      <Navbar/>

      <div className="max-w-7xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-6">
          My Wishlist
        </h1>

        {wishlist.length === 0 ? (

          <p className="text-gray-500">
            Your wishlist is empty
          </p>

        ) : (

          <ProductGrid products={wishlist}/>

        )}

      </div>

    </div>

  );

}