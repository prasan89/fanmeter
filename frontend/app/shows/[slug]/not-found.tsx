export default function ShowNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">🎭</div>
      <h1 className="text-3xl font-black text-text-primary mb-3">Show Not Found</h1>
      <p className="text-text-muted mb-8 max-w-md">
        This show doesn&apos;t exist or may have been removed. Browse all available shows below.
      </p>
      <a
        href="/shows"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-brand text-white font-semibold rounded-xl shadow-brand-sm hover:shadow-brand-lg hover:scale-105 transition-all"
      >
        Browse All Shows
      </a>
    </div>
  );
}
