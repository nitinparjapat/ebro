import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { OrdersProvider } from "./context/OrdersContext";
import { ProductsProvider } from "./context/ProductsContext";
import { ReviewsProvider } from "./context/ReviewsContext";
import { SearchProvider } from "./context/SearchContext";
import { WishlistProvider } from "./context/WishlistContext";

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "235789455690-abk09k6o73ligh8r30nh8ro50a14mehh.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={googleClientId}>
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
