const ITEMS = [
  "Book online",
  "Pay online",
  "Gate code by email",
  "Lights on for your slot",
  "No reception",
  "Two floodlit courts",
];

// Decorative, repeats the same facts already stated elsewhere on the page,
// so a screen reader has nothing new to gain from it. The list is given
// twice so the marquee loops without a visible gap; translateX(-50%) is
// exactly one full copy's width.
export default function Ticker() {
  return (
    <div className="overflow-hidden bg-accent py-5 text-bg" aria-hidden="true">
      <div className="flex w-max animate-[marquee_34s_linear_infinite] items-center gap-10 whitespace-nowrap font-heading text-xl">
        {[...ITEMS, ...ITEMS].map((item, index) => (
          <span key={index} className="flex items-center gap-10">
            {item}
            <span className="size-3 flex-none rounded-full bg-bg" />
          </span>
        ))}
      </div>
    </div>
  );
}
