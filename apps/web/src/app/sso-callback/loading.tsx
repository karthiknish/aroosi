export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-light">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-dark mb-4">Completing Authentication</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-info mx-auto"></div>
        <p className="text-neutral-light mt-4">Please wait while we complete your authentication...</p>
      </div>
    </div>
  );
}