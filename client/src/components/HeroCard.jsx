// A floating info pill in the hero's own stage. icon is either a small
// filled circle (the gate code card) or a bigger icon tile (the others);
// label is optional, dropped for the gate code card which is one line.
export default function HeroCard({ icon, label, value, className }) {
  return (
    <div
      className={`absolute flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-border bg-surface/[0.72] px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.5)] backdrop-blur-[10px] ${className}`}
    >
      {icon}
      <div>
        {label && (
          <small className="block text-[11px] uppercase tracking-[0.06em] text-text-muted">
            {label}
          </small>
        )}
        <b className={`block font-bold ${label ? "mt-0.5 text-sm" : "text-[13px] font-semibold"}`}>
          {value}
        </b>
      </div>
    </div>
  );
}
