import { ADDRESS_LINES, CONTACT_EMAIL, OPENING_HOURS } from "../constants/business.js";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-5 py-12 sm:px-8 md:px-24">
      <div className="max-w-[1200px] gap-10 sm:flex sm:items-start sm:justify-between">
        {/* A fixed anchor, not a fourth peer competing with the info grid:
            that is what made two dense columns and one short one read as
            unbalanced before. */}
        <div className="mb-10 sm:mb-0">
          <p className="font-heading text-lg font-bold text-text">GEN PADEL</p>
          <p className="mt-2 text-sm text-text-muted">
            &copy; {new Date().getFullYear()} GEN PADEL Rožnov
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          <div>
            <h2 className="mb-3 text-sm font-medium text-text">Opening hours</h2>
            <dl className="space-y-1 text-sm text-text-muted">
              {OPENING_HOURS.map(({ label, hours }) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt>{label}</dt>
                  <dd className="tabular-nums text-text">{hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-text">Address</h2>
            <p className="text-sm text-text-muted">
              {ADDRESS_LINES.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-text">Contact</h2>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-text hover:text-accent">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
