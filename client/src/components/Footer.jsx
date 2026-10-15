import { ADDRESS_LINES, CONTACT_EMAIL, OPENING_HOURS } from "../constants/business.js";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-5 py-12 sm:px-8 md:px-24">
      <div className="grid max-w-[1200px] gap-10 sm:grid-cols-3">
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

      <p className="engraved-sign mt-10 max-w-[1200px] rounded-md border border-border bg-bg px-4 py-3 text-sm text-text">
        There is no reception at the courts. Book online, and your gate code lets you in for your
        booked time only.
      </p>

      <p className="mt-8 max-w-[1200px] text-xs text-text-muted">
        &copy; {new Date().getFullYear()} GEN PADEL Rožnov
      </p>
    </footer>
  );
}
