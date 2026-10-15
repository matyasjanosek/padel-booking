export default function ContinueWithGoogle() {
  return (
    <div className="max-w-sm">
      <div className="mt-6 flex items-center gap-4 text-text-muted">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <a href="/api/auth/google" className="btn-secondary mt-6">
        Continue with Google
      </a>
    </div>
  );
}
