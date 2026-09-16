export default function ContinueWithGoogle() {
  return (
    <div className="max-w-sm">
      <div className="mt-6 flex items-center gap-4 text-text-muted">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href="/api/auth/google"
        className="mt-6 inline-block rounded-full border border-border px-7 py-3 text-center font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
      >
        Continue with Google
      </a>
    </div>
  );
}
