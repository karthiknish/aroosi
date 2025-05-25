import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white px-4">
      <div className="text-center">
        <div className="text-7xl font-extrabold text-pink-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Page Not Found
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Sorry, we couldn't find the page you're looking for.
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
