import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const API_URL = 'https://ndege-id.onrender.com';

export default function MapScreen({ navigation }) {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSightings = async () => {
      try {
        const response = await fetch(`${API_URL}/sightings/recent?limit=50`);
        const data = await response.json();
        const withCoords = (data.sightings || []).filter(
          (s) => s.latitude != null && s.longitude != null
        );
        setSightings(withCoords);
      } catch (e) {
        console.error('Error fetching sightings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSightings();
  }, []);

  // Default region — Eldoret, Kenya
  const initialRegion = {
    latitude: 0.5143,
    longitude: 35.2698,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sighting Map</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {sightings.map((sighting) => (
            <Marker
              key={sighting.id}
              coordinate={{ latitude: sighting.latitude, longitude: sighting.longitude }}
              pinColor={theme.colors.primary}
            >
              <Callout onPress={() => navigation.navigate('BirdDetail', { bird: sighting.birds })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{sighting.birds?.common_name || 'Unknown bird'}</Text>
                  {sighting.confidence && (
                    <Text style={styles.calloutSubtitle}>{Math.round(sighting.confidence)}% confidence</Text>
                  )}
                  {sighting.location_name && (
                    <Text style={styles.calloutSubtitle}>{sighting.location_name}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {!loading && sightings.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="location-outline" size={40} color={theme.colors.textDim} />
          <Text style={styles.emptyText}>No sightings with location data yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  callout: {
    minWidth: 140,
    padding: 4,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 11,
    color: '#555',
  },
  emptyOverlay: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: theme.spacing.sm,
  },
});