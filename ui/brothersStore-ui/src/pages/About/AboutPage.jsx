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

    <div className="min-h-screen">

      <Navbar />

      <main>

        <section className="px-4 py-8 md:py-10">

          <div className="paper-stack mx-auto max-w-6xl">
            <div className="genz-paper paper-panel flex flex-col gap-6 rounded-[2rem] px-5 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">

            <div className="max-w-2xl">

              <p className="genz-kicker text-slate-700">
                About BrothersStore
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
                Quality, style, and trust for everyday shopping.
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-700">
                BrothersStore is a mobile-first ecommerce experience focused on
                home decos and everyday essentials. We keep the shopping flow
                simple, clean, and practical so customers can quickly find what
                they want and order with confidence.
              </p>

            </div>

            <img
              src="/bs_logo_hd.png"
              alt="BrothersStore"
              className="w-64 max-w-full self-center rounded-[1.5rem] bg-white/80 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] object-contain"
            />

            </div>
          </div>

        </section>

        <section className="mx-auto max-w-6xl px-4 py-2 pb-8">

          <div className="grid gap-4 md:grid-cols-3">

            {values.map((value) => (

              <div
                key={value.title}
                className="genz-paper paper-panel rounded-[1.6rem] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
              >

                <h2 className="text-lg font-black text-slate-950">
                  {value.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {value.description}
                </p>

              </div>

            ))}

          </div>

        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10">

          <div className="paper-stack">
            <div className="genz-paper paper-panel rounded-[2rem] p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">

            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
              Why customers choose us
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {highlights.map((highlight) => (

                <div
                  key={highlight}
                  className="genz-chip rounded-[1.2rem] px-4 py-3 text-sm font-bold text-slate-800"
                >
                  {highlight}
                </div>

              ))}

            </div>

            <div className="mt-6 border-t border-slate-900/10 pt-6">

              <h3 className="text-lg font-black text-slate-950">
                Our promise
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-700">
                We want shopping to feel clear, not complicated. That means
                useful categories, honest pricing, familiar COD checkout, and a
                place where customers can revisit their previous orders anytime.
              </p>

            </div>

          </div>
          </div>

        </section>

      </main>

    </div>

  );
}
