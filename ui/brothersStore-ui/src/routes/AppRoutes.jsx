import { BrowserRouter, Routes, Route } from "react-router-dom";

import AboutPage from "../pages/About/AboutPage";
import CartPage from "../pages/Cart/CartPage";
import Home from "../pages/Home/Home";
import OwnerDashboard from "../pages/Owner/OwnerDashboard";
import OrdersPage from "../pages/Orders/OrdersPage";
import TrackOrderPage from "../pages/Orders/TrackOrderPage";
import ProductDetails from "../pages/Product/ProductDetails";
import WishlistPage from "../pages/Wishlist/WishlistPage";

export default function AppRoutes(){

  return(

    <BrowserRouter>

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

    </BrowserRouter>

  );

}
