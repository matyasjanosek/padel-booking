import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ContinueWithGoogle from "../components/ContinueWithGoogle.jsx";
import PageHeading from "../components/PageHeading.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(
    searchParams.get("error") === "google"
      ? "Something went wrong signing in with Google. Please try again."
      : "",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.target);
    try {
      await login({ email: form.get("email"), password: form.get("password") });
      navigate(location.state?.from ?? "/account");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading title="Log in" intro="Log in to see your account and your bookings." />

      <section className="px-5 pb-12 md:max-w-page md:pb-16 md:pl-24 md:pr-10">
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary mt-2 self-start">
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <ContinueWithGoogle />

        <p className="mt-6 text-text-muted">
          New here?{" "}
          <Link to="/register" className="text-text hover:text-accent">
            Create an account
          </Link>
          .
        </p>
      </section>
    </>
  );
}
