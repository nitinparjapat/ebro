import Navbar from "../../components/layout/Navbar";
import ProductGrid from "../../components/product/ProductGrid";
import { useWishlist } from "../../context/WishlistContext";

export default function WishlistPage(){

  const { wishlist } = useWishlist();

  return(

    <div className="min-h-screen">

      <Navbar/>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
        <div className="mb-5 paper-stack">
          <div className="genz-paper paper-panel rounded-[2rem] px-5 py-5 md:px-6">
            <p className="genz-kicker">Saved For Later</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">
              My Wishlist
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {wishlist.length === 0
                ? "Add items you love so you can find them fast later."
                : `${wishlist.length} item${wishlist.length === 1 ? "" : "s"} saved right now.`}
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 text-slate-700">
              Your wishlist is empty.
            </div>
          </div>
        ) : (
          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-4 md:p-6">
              <ProductGrid products={wishlist}/>
            </div>
          </div>
        )}
      </div>

    </div>

  );

}
