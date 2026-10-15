import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ADDRESS_LINES, CLUB_COORDS, DIRECTIONS_URL } from "../constants/business.js";

// A plain dot in the site's own accent colour, not Leaflet's default pin,
// which would be the only blue-and-red thing on the page.
const marker = L.divIcon({
  className: "",
  html: '<span class="block size-3 rounded-full bg-accent ring-[6px] ring-accent/25"></span>',
  iconSize: [12, 12],
});

// Standing in for the map while it loads, and permanently if it never does:
// some ad blockers and offline visitors will never get tiles.
function MapFallback() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-surface p-4">
      <p className="text-sm text-text">{ADDRESS_LINES.join(", ")}</p>
      <a href={DIRECTIONS_URL} className="text-sm text-accent hover:underline">
        Get directions
      </a>
    </div>
  );
}

export default function ClubMap() {
  const containerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: [CLUB_COORDS.lat, CLUB_COORDS.lng],
      zoom: 16,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker([CLUB_COORDS.lat, CLUB_COORDS.lng], { icon: marker }).addTo(map);

    tiles.on("tileload", () => {
      hasLoadedRef.current = true;
      setLoaded(true);
    });
    // A single bad tile at the edge of the view is not a failure, only
    // never getting a single tile is.
    tiles.on("tileerror", () => {
      if (!hasLoadedRef.current) setFailed(true);
    });

    // Some ad blockers drop the tile requests with no error event at all.
    // Nothing loading after a few seconds means the same as a failure.
    const timeout = setTimeout(() => {
      if (!hasLoadedRef.current) setFailed(true);
    }, 6000);

    return () => {
      clearTimeout(timeout);
      map.remove();
    };
  }, []);

  return (
    <div className="club-map relative h-[220px] w-full max-w-xs overflow-hidden rounded-lg border border-border">
      <div ref={containerRef} className="h-full w-full" />
      {(!loaded || failed) && <MapFallback />}
    </div>
  );
}
