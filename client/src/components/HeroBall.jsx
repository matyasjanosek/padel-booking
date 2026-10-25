import { Suspense, lazy, useState } from "react";

const HeroScene = lazy(() => import("./HeroScene.jsx"));

function useShouldRender3d() {
  const [ok] = useState(
    () =>
      window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)").matches,
  );
  return ok;
}

function BallPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="size-48 rounded-full border border-border" />
    </div>
  );
}

export default function HeroBall() {
  const show3d = useShouldRender3d();

  return (
    <div className="relative hidden md:block md:h-[520px]" aria-hidden="true">
      {/* The ball's own floodlight: a pool of light it sits in, not a flat
          background. The hero's own lime at low opacity, not the site's
          main accent, the same colour the ball itself is lit with in the
          scene below. */}
      <div
        className="hero-glow pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(163,230,53,0.16), rgba(163,230,53,0.04) 38%, transparent 68%)",
        }}
      />
      <div className="absolute inset-0">
        {show3d ? (
          <Suspense fallback={<BallPlaceholder />}>
            <HeroScene />
          </Suspense>
        ) : (
          <BallPlaceholder />
        )}
      </div>
    </div>
  );
}
