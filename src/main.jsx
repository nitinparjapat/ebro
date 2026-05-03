import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { OrdersProvider } from "./context/OrdersContext";
import { ProductsProvider } from "./context/ProductsContext";
import { ReviewsProvider } from "./context/ReviewsContext";
import { SearchProvider } from "./context/SearchContext";
import { WishlistProvider } from "./context/WishlistContext";

ReactDOM.createRoot(document.getElementById("root")).render(

  <GoogleOAuthProvider clientId="235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com">

    <SearchProvider>

      <AuthProvider>

        <ProductsProvider>

          <WishlistProvider>

            <OrdersProvider>

              <ReviewsProvider>

                <CartProvider>

                  <App />

                </CartProvider>

              </ReviewsProvider>

            </OrdersProvider>

          </WishlistProvider>

        </ProductsProvider>

      </AuthProvider>

    </SearchProvider>

  </GoogleOAuthProvider>

);