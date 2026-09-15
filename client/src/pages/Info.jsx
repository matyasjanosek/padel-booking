export default function Info() {
  return (
    <>
      <section className="px-5 pb-8 pt-12 md:max-w-page md:pb-10 md:pl-24 md:pr-10 md:pt-16">
        <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Info</h1>
        <p className="max-w-[60ch] text-text-muted">Everything you need before you play.</p>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="mb-3 text-2xl">Opening hours</h2>
            <ul className="space-y-1 text-text-muted">
              <li>Monday to Friday: 7:00 to 22:00</li>
              <li>Saturday and Sunday: 8:00 to 20:00</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-2xl">Prices</h2>
            <p className="text-text-muted">
              One hour on a court costs <span className="font-medium text-text">400 CZK</span>. The
              price is the same during the day and in the evening. You pay online when you book.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <h2 className="mb-3 text-2xl">How to find us</h2>
        <p className="max-w-[60ch] text-text-muted">
          GEN PADEL Rožnov is at Sportovní 12, Rožnov pod Radhoštěm. The courts are outdoor, a short
          walk from the town centre. Free parking is next to the courts.
        </p>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <h2 className="mb-3 text-2xl">Court rules</h2>
        <ul className="max-w-[60ch] space-y-2 text-text-muted">
          <li>Book online before you arrive. There is no reception at the courts.</li>
          <li>Each court fits up to 4 players.</li>
          <li>Wear shoes made for outdoor courts. Shoes with black soles are not allowed.</li>
          <li>No glass on the court.</li>
          <li>
            Your gate code works only for your booked time. The lights turn off when your time ends.
          </li>
          <li>Please leave the court on time for the next booking.</li>
        </ul>
      </section>
    </>
  );
}
