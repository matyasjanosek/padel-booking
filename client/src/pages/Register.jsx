import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ContinueWithGoogle from "../components/ContinueWithGoogle.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.target);
    try {
      await register({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      });
      navigate("/account");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Create an account</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">
        Sign up to book a court and see your bookings.
      </p>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
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
            minLength={8}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <p className="text-sm text-text-muted">At least 8 characters.</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-block self-start rounded-full border border-border px-7 py-3 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <ContinueWithGoogle />

      <p className="mt-6 text-text-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-text hover:text-accent">
          Log in
        </Link>
        .
      </p>
    </section>
  );
}
