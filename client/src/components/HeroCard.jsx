// A floating info pill in the hero's own stage. icon is either a small
// filled circle (the gate code card) or a bigger icon tile (the others);
// label is optional, dropped for the gate code card which is one line.
export default function HeroCard({ icon, label, value, className }) {
  return (
    <div
      className={`absolute flex items-center gap-3.5 whitespace-nowrap rounded-[22px] border border-border bg-surface/[0.72] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-[14px] ${className}`}
    >
      {icon}
      <div>
        {label && (
          <small className="block text-[13px] uppercase tracking-[0.08em] text-text-muted">
            {label}
          </small>
        )}
        <b className={`block font-bold ${label ? "mt-1.5 text-lg" : "text-[15px] font-semibold"}`}>
          {value}
        </b>
      </div>
    </div>
  );
}
