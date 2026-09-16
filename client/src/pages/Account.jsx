import { useAuth } from "../context/AuthContext.jsx";

export default function Account() {
  const { user } = useAuth();

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Account</h1>
      <p className="max-w-[60ch] text-text-muted">Your account details.</p>

      <dl className="mt-8 max-w-sm space-y-4">
        <div>
          <dt className="text-sm text-text-muted">Name</dt>
          <dd className="text-text">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Email</dt>
          <dd className="text-text">{user.email}</dd>
        </div>
      </dl>
    </section>
  );
}
