// The big solid Archivo page title, shared by every page that isn't the
// homepage hero itself. intro is optional so pages without one don't carry
// extra empty spacing.
export default function PageHeading({ title, intro }) {
  return (
    <section className="px-5 py-8 md:max-w-page md:py-8 md:pl-24 md:pr-10">
      <h1 className="display-heading text-[clamp(2.5rem,7.4vw,8.875rem)] leading-[0.92] tracking-[-0.03em]">
        {title}
      </h1>
      {intro && <p className="mt-6 max-w-[60ch] text-text-muted">{intro}</p>}
    </section>
  );
}
