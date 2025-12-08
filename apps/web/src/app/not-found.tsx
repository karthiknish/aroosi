import Link from "next/link";

export const metadata = {
  title: "Page Not Found | Aroosi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="relative overflow-y-hidden min-h-screen flex flex-col items-center justify-center bg-base-light ">
      {/* Decorative pink circle */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />

      <div className="text-center relative z-10">
        <div className="text-7xl font-extrabold text-primary mb-4">404</div>
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">
          Page Not Found
        </h1>
        <p className="text-lg text-neutral-light mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link href="/">
          <span className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg shadow transition">
            Go to Homepage
          </span>
        </Link>
      </div>
    </div>
  );
}
