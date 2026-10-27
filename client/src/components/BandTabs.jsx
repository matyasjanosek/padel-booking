export default function BandTabs({ bands, selectedKey, onSelect, freeCounts }) {
  return (
    <div
      role="tablist"
      aria-label="Time of day"
      className="flex gap-8 overflow-x-auto border-b border-border"
    >
      {bands.map((band) => {
        const selected = band.key === selectedKey;
        return (
          <button
            key={band.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(band.key)}
            className={`flex flex-none items-baseline gap-2 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors duration-200 ${
              selected
                ? "border-accent font-semibold text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <span>{band.label}</span>
            <span className="text-text-muted">{band.range}</span>
            <span className={selected ? "text-accent" : "text-text-muted"}>
              {freeCounts[band.key] ?? 0} free
            </span>
          </button>
        );
      })}
    </div>
  );
}
