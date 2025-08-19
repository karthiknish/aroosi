import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative overflow-y-hidden min-h-screen flex flex-col items-center justify-center bg-white ">
      {/* Decorative pink circle */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 bg-pink-300 rounded-full opacity-30 blur-3xl" />

      <div className="text-center relative z-10">
        <div className="text-7xl font-extrabold text-pink-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-neutral-800 mb-2">
          Page Not Found
        </h1>
        <p className="text-lg text-neutral-600 mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link href="/">
          <span className="inline-block bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition">
            Go to Homepage
          </span>
        </Link>
      </div>
    </div>
  );
}
