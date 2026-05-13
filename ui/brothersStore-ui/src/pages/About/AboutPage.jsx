import Navbar from "../../components/layout/Navbar";

const values = [
  {
    title: "Curated Home Picks",
    description:
      "We focus on useful, stylish pieces that fit everyday homes without making the catalog feel noisy.",
  },
  {
    title: "Simple COD Shopping",
    description:
      "Customers can browse, add to cart, and place cash-on-delivery orders through a lightweight mobile-first flow.",
  },
  {
    title: "Trust First Experience",
    description:
      "From wishlist to order history, the app is built to feel dependable, fast, and easy to come back to.",
  },
];

const highlights = [
  "Mobile-first shopping experience",
  "Category-based browsing and search",
  "Wishlist, cart, and order history",
  "Cash on delivery checkout flow",
];

export default function AboutPage() {

  return (

    <div className="min-h-screen bg-gray-100">

      <Navbar />

      <main>

        <section className="px-4 py-8 md:py-10">

          <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-lg bg-white px-6 py-10 shadow-sm md:flex-row md:items-center md:justify-between">

            <div className="max-w-2xl">

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                About BrothersStore
              </p>

              <h1 className="mt-3 text-3xl font-bold text-gray-900 md:text-5xl">
                Quality, style, and trust for everyday shopping.
              </h1>

              <p className="mt-4 text-base text-gray-600">
                BrothersStore is a mobile-first ecommerce experience focused on
                home decor and everyday essentials. We keep the shopping flow
                simple, clean, and practical so customers can quickly find what
                they want and order with confidence.
              </p>

            </div>

            <img
              src="/bs_logo_hd.png"
              alt="BrothersStore"
              loading="eager"
              decoding="async"
              className="w-64 max-w-full self-center object-contain"
            />

          </div>

        </section>

        <section className="mx-auto max-w-6xl px-4 py-2 pb-8">

          <div className="grid gap-4 md:grid-cols-3">

            {values.map((value) => (

              <div
                key={value.title}
                className="rounded-lg bg-white p-5 shadow-sm"
              >

                <h2 className="text-lg font-bold text-gray-900">
                  {value.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {value.description}
                </p>

              </div>

            ))}

          </div>

        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10">

          <div className="rounded-lg bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold text-gray-900">
              Why customers choose us
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {highlights.map((highlight) => (

                <div key={highlight} className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  {highlight}
                </div>

              ))}

            </div>

            <div className="mt-6 border-t border-gray-100 pt-6">

              <h3 className="text-lg font-bold text-gray-900">
                Our promise
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                We want shopping to feel clear, not complicated. That means
                useful categories, honest pricing, familiar COD checkout, and a
                place where customers can revisit their previous orders anytime.
              </p>

            </div>

          </div>

        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12">

          <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Support</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                Need help with an order?
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-600">
                Email us at{" "}
                <a
                  className="font-semibold text-gray-900 underline"
                  href="mailto:orders.brothersstore@gmail.com"
                >
                  orders.brothersstore@gmail.com
                </a>
                .
              </p>
          </div>

        </section>

      </main>

    </div>

  );
}
