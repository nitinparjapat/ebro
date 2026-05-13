import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

const Home = lazy(() => import("../pages/Home/Home"));
const ProductDetails = lazy(() => import("../pages/Product/ProductDetails"));
const CartPage = lazy(() => import("../pages/Cart/CartPage"));
const OrdersPage = lazy(() => import("../pages/Orders/OrdersPage"));
const TrackOrderPage = lazy(() => import("../pages/Orders/TrackOrderPage"));
const OwnerDashboard = lazy(() => import("../pages/Owner/OwnerDashboard"));
const WishlistPage = lazy(() => import("../pages/Wishlist/WishlistPage"));
const AboutPage = lazy(() => import("../pages/About/AboutPage"));

export default function AppRoutes(){

  return(

    <BrowserRouter>
      <ScrollToTop />

      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm font-semibold text-slate-700">
            Loading...
          </div>
        }
      >
        <Routes>

          <Route path="/" element={<Home/>} />

          <Route path="/product/:id" element={<ProductDetails/>} />

          <Route path="/cart" element={<CartPage/>} />

          <Route path="/orders" element={<OrdersPage/>} />

          <Route path="/track-order/:orderId" element={<TrackOrderPage/>} />

          <Route path="/owner-dashboard" element={<OwnerDashboard/>} />

          <Route path="/wishlist" element={<WishlistPage/>} />

          <Route path="/about" element={<AboutPage/>} />

        </Routes>
      </Suspense>

    </BrowserRouter>

  );

}
