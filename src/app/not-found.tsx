import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="text-center">
        <div className="text-7xl font-extrabold text-red-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Page Not Found
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link href="/">
          <span className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition">
            Go to Homepage
          </span>
        </Link>
      </div>
    </div>
  );
}
