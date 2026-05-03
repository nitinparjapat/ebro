export default function HeroBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-pink-300 to-purple-300">

      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between">

        <div className="text-center md:text-left">

          <h2 className="text-3xl md:text-5xl font-bold">
            Big Sale
          </h2>

          <p className="mt-3 text-lg">
            Up to 70% OFF on Home Decor
          </p>

          <button className="mt-5 bg-black text-white px-6 py-3 rounded-lg">
            Shop Now
          </button>

        </div>

        <img
          src="https://picsum.photos/400"
          className="mt-6 md:mt-0 w-60 md:w-80"
        />

      </div>

    </div>
  );
}