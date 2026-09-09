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
      {show3d && (
        <div className="absolute inset-0">
          <Suspense fallback={<BallPlaceholder />}>
            <HeroScene />
          </Suspense>
        </div>
      )}
    </div>
  );
}
