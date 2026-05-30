import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-20">
      <div className="max-w-xl text-center rounded-3xl border border-white/10 bg-white/5 p-12 shadow-2xl">
        <h1 className="text-5xl font-black mb-6">404</h1>
        <p className="text-lg text-gray-300 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
