"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-light">
      <h2 className="text-2xl font-bold mb-4 text-neutral-dark">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-base-light rounded-md hover:bg-primary-dark transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
