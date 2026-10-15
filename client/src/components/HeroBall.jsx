import { Suspense, lazy, useState } from "react";

// The scene pulls in three.js and the 6.6 MB model, so it is a lazy chunk that
// only loads once we decide to show it.
const HeroScene = lazy(() => import("./HeroScene.jsx"));

// Decide once, when the hero first renders, whether to show the moving ball:
// wide screens only, and only when the visitor has not asked for reduced motion.
// This is not re-evaluated later, so a live scene is never torn down.
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
          background. Accent-coloured at low opacity, nothing new, the same
          green the ball itself is lit with in the scene below. */}
      <div
        className="hero-glow pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(166,226,46,0.16), rgba(166,226,46,0.04) 38%, transparent 68%)",
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
