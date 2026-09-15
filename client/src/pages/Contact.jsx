import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <>
      <section className="px-5 pb-8 pt-12 md:max-w-page md:pb-10 md:pl-24 md:pr-10 md:pt-16">
        <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Contact</h1>
        <p className="max-w-[60ch] text-text-muted">
          Send us a message, or come and see the courts.
        </p>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
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
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="resize-none rounded-lg border border-border bg-surface px-4 py-2.5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="mt-2 inline-block self-start rounded-full border border-border px-7 py-3 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              Send message
            </button>
          </form>

          <div>
            <h2 className="mb-3 text-2xl">Find us</h2>
            <p className="text-text-muted">
              Sportovní 12
              <br />
              756 61 Rožnov pod Radhoštěm
            </p>
            <p className="mt-4 text-text-muted">
              Email:{" "}
              <a href="mailto:info@genpadel.cz" className="text-text hover:text-accent">
                info@genpadel.cz
              </a>
            </p>
            <p className="mt-4 text-text-muted">
              For opening hours and prices, see the{" "}
              <Link to="/info" className="text-text hover:text-accent">
                Info
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
