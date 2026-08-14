import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import { getOrFetchTile, prefetchVisibleTiles } from "../../lib/tileCache";

const EMPTY_TILE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function CachedTileLayer() {
  const map = useMap();

  useEffect(() => {
    const objectUrls = new Set();
    let layerDisposed = false;
    const CachedLayer = L.TileLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement("img");
        let settled = false;
        tile.alt = "";
        tile.setAttribute("role", "presentation");
        const finish = () => {
          if (settled) return;
          settled = true;
          done(null, tile);
        };
        tile.onload = () => {
          finish();
        };
        tile.onerror = () => {
          if (tile._reliefoptObjectUrl) {
            URL.revokeObjectURL(tile._reliefoptObjectUrl);
            objectUrls.delete(tile._reliefoptObjectUrl);
            tile._reliefoptObjectUrl = null;
          }
          tile.onload = null;
          tile.onerror = null;
          tile.src = EMPTY_TILE;
          finish();
        };

        getOrFetchTile(coords.z, coords.x, coords.y).then((blob) => {
          if (settled || layerDisposed || tile._reliefoptUnloaded) return;
          if (!blob) {
            tile.onload = null;
            tile.onerror = null;
            tile.src = EMPTY_TILE;
            finish();
            return;
          }
          const objectUrl = URL.createObjectURL(blob);
          tile._reliefoptObjectUrl = objectUrl;
          objectUrls.add(objectUrl);
          tile.src = objectUrl;
        });
        return tile;
      },
    });

    const layer = new CachedLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      crossOrigin: true,
    });
    layer.on("tileunload", ({ tile }) => {
      tile._reliefoptUnloaded = true;
      if (!tile._reliefoptObjectUrl) return;
      URL.revokeObjectURL(tile._reliefoptObjectUrl);
      objectUrls.delete(tile._reliefoptObjectUrl);
      tile._reliefoptObjectUrl = null;
    });
    layer.addTo(map);
    return () => {
      layerDisposed = true;
      map.removeLayer(layer);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [map]);

  return null;
}

export default function MapView({ children }) {
  const [map, setMap] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  async function downloadVisibleArea() {
    if (!map || downloading) return;
    setDownloading(true);
    try {
      const result = await prefetchVisibleTiles(map.getBounds(), map.getZoom());
      setDownloadStatus(`${result.cached} of ${result.requested} tiles saved`);
    } catch {
      setDownloadStatus("Unable to download this area right now");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative">
      <MapContainer
        center={[23.8103, 90.4125]}
        zoom={8}
        scrollWheelZoom={true}
        attributionControl={false}
        className="h-[calc(100vh-56px)] w-full rounded-none"
        whenReady={(event) => setMap(event.target)}
      >
        <CachedTileLayer />
        {children}
      </MapContainer>
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={downloadVisibleArea}
          disabled={!map || downloading}
          className="rounded-md bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-md border border-border disabled:opacity-60"
        >
          {downloading ? "Downloading area..." : "Download this area for offline use"}
        </button>
        {downloadStatus && <span className="rounded bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow">{downloadStatus}</span>}
      </div>
    </div>
  );
}
