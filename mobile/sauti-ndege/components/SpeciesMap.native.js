import MapView, { Circle, Marker } from 'react-native-maps';
import { theme } from '../constants/theme';

/**
 * gbifPoints: [{ lat, lon }]           -- broader real occurrence records (base layer)
 * sightingPoints: [{ lat, lon, location_name, date }] -- this user's own logged sightings (highlighted)
 */
export default function SpeciesMap({ gbifPoints = [], sightingPoints = [], height = 260 }) {
  return (
    <MapView
      style={{ height, borderRadius: theme.radius.lg }}
      initialRegion={{
        latitude: 0.5,
        longitude: 37.5,
        latitudeDelta: 6,
        longitudeDelta: 6,
      }}
    >
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
          title="Your sighting"
          description={p.location_name || undefined}
          pinColor={theme.colors.primary}
        />
      ))}
    </MapView>
  );
}