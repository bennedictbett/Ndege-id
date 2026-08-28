import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { theme } from '../constants/theme';

// Leaflet isn't an npm dependency of this project -- it's loaded from a CDN
// at runtime, since react-native-maps (used on native) cannot bundle for
// web at all. This keeps the web bundle free of that native-only code
// while still giving web a real, working map.
let leafletLoadingPromise = null;
function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadingPromise) return leafletLoadingPromise;

  leafletLoadingPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
  return leafletLoadingPromise;
}

/**
 * gbifPoints: [{ lat, lon }]           -- broader real occurrence records (base layer)
 * sightingPoints: [{ lat, lon, location_name, date }] -- this user's own logged sightings (highlighted)
 */
export default function SpeciesMap({ gbifPoints = [], sightingPoints = [], height = 260 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize the map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = L.map(containerRef.current, {
          center: [0.5, 37.5], // roughly central Kenya
          zoom: 6,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '\u00A9 OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(mapRef.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Redraw markers whenever the point sets change
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    markersRef.current.forEach((m) => mapRef.current.removeLayer(m));
    markersRef.current = [];

    gbifPoints.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 4,
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.5,
        weight: 1,
      }).addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    sightingPoints.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 7,
        color: theme.colors.primary,
        fillColor: theme.colors.primary,
        fillOpacity: 0.95,
        weight: 2,
      })
        .bindPopup(p.location_name ? `Your sighting \u2014 ${p.location_name}` : 'Your sighting')
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [gbifPoints, sightingPoints]);

  // Tear the map down on unmount so navigating back and forth doesn't
  // accumulate duplicate Leaflet instances
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}