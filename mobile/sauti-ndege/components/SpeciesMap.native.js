import MapView, { Circle, Marker } from 'react-native-maps';
import { theme } from '../constants/theme';

/**
 * gbifPoints: [{ lat, lon }]           -- broader real occurrence records (base layer)
 * sightingPoints: [{ lat, lon, location_name, date }] -- this user's own logged sightings (highlighted)
 * hotspotPoint: { lat, lon, name } -- optional single distinguished marker, e.g. a hotspot's own location
 * center: { lat, lon } -- optional override for the initial map center (defaults to central Kenya)
 * zoomDelta: number -- optional override for initial zoom; smaller = more zoomed in (defaults to 6)
 */
export default function SpeciesMap({
  gbifPoints = [], sightingPoints = [], hotspotPoint = null,
  center = null, zoomDelta = 6, height = 260,
}) {
  const initialRegion = {
    latitude: center ? center.lat : 0.5,
    longitude: center ? center.lon : 37.5,
    latitudeDelta: zoomDelta,
    longitudeDelta: zoomDelta,
  };

  return (
    <MapView
      style={{ height, borderRadius: theme.radius.lg }}
      initialRegion={initialRegion}
    >
      {hotspotPoint && (
        <Marker
          coordinate={{ latitude: hotspotPoint.lat, longitude: hotspotPoint.lon }}
          title={hotspotPoint.name || 'Hotspot'}
          pinColor={theme.colors.accent}
        />
      )}
      {gbifPoints.map((p, i) => (
        <Circle
          key={`g-${i}`}
          center={{ latitude: p.lat, longitude: p.lon }}
          radius={2000}
          strokeColor="#4CAF50"
          fillColor="rgba(76,175,80,0.35)"
          strokeWidth={1}
        />
      ))}
      {sightingPoints.map((p, i) => (
        <Marker
          key={`s-${i}`}
          coordinate={{ latitude: p.lat, longitude: p.lon }}
          title={p.title || 'Your sighting'}
          description={p.location_name || undefined}
          pinColor={theme.colors.primary}
        />
      ))}
    </MapView>
  );
}