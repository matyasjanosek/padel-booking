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

// The glow and the ball only. The stage around them (the court lines, the
// floating info cards) belongs to Hero.jsx, which owns the shared
// positioning context all of it sits in.
export default function HeroBall() {
  const show3d = useShouldRender3d();

  return (
    <>
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
    </>
  );
}
