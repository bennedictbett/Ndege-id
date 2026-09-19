import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Image, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { haversineKm, formatDistance } from '../utils/geo';
import SpeciesMap from '../components/SpeciesMap';

// Sightings farther than this from the hotspot's own coordinates aren't
// considered "at" it -- hotspots are broad areas (a forest, a lake), not
// a single point, so a generous radius avoids missing genuine nearby records.
const NEARBY_RADIUS_KM = 30;
const NEARBY_FETCH_LIMIT = 200;

export default function HotspotDetailScreen({ route, navigation }) {
  const { hotspot } = route.params;
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasCoords = typeof hotspot.latitude === 'number' && typeof hotspot.longitude === 'number';

  const loadNearbySightings = useCallback(async () => {
    if (!hasCoords) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('sightings')
      .select('*, birds(*, images:bird_images(*))')
      .order('created_at', { ascending: false })
      .limit(NEARBY_FETCH_LIMIT);

    if (error) {
      console.error('Error fetching sightings for hotspot:', error);
      setSightings([]);
      setLoading(false);
      return;
    }

    const nearby = (data || [])
      .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s) => ({
        ...s,
        distanceKm: haversineKm(hotspot.latitude, hotspot.longitude, s.latitude, s.longitude),
      }))
      .filter((s) => s.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setSightings(nearby);
    setLoading(false);
  }, [hotspot.latitude, hotspot.longitude, hasCoords]);

  // Re-fetch on focus so a sighting logged elsewhere (e.g. Record a
  // sound here, then come back) shows up without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      loadNearbySightings();
    }, [loadNearbySightings])
  );

  // Unique species seen here, most recently recorded first
  const speciesSeen = [];
  const seenIds = new Set();
  for (const s of sightings) {
    if (s.birds && !seenIds.has(s.birds.id)) {
      seenIds.add(s.birds.id);
      speciesSeen.push(s.birds);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ImageBackground
        source={hotspot.image_url ? { uri: hotspot.image_url } : undefined}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{hotspot.name}</Text>
          {hotspot.region && <Text style={styles.heroRegion}>{hotspot.region}</Text>}
        </View>
      </ImageBackground>

      {hotspot.description && (
        <Text style={styles.description}>{hotspot.description}</Text>
      )}

      {hasCoords && (
        <View style={styles.mapWrap}>
          <SpeciesMap
            center={{ lat: hotspot.latitude, lon: hotspot.longitude }}
            zoomDelta={0.6}
            zoom={11}
            hotspotPoint={{ lat: hotspot.latitude, lon: hotspot.longitude, name: hotspot.name }}
            sightingPoints={sightings.map((s) => ({
              lat: s.latitude,
              lon: s.longitude,
              title: s.birds?.common_name,
              location_name: s.location_name,
            }))}
            height={200}
          />
          <TouchableOpacity
            style={styles.viewOnMapButton}
            onPress={() =>
              navigation.navigate('MapTab', {
                screen: 'MapMain',
                params: { focusLatitude: hotspot.latitude, focusLongitude: hotspot.longitude },
              })
            }
          >
            <Ionicons name="expand-outline" size={14} color={theme.colors.text} />
            <Text style={styles.viewOnMapText}>View on full map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logSightingButton}
            onPress={() =>
              navigation.navigate('LogSighting', {
                presetLocation: { lat: hotspot.latitude, lon: hotspot.longitude, name: hotspot.name },
              })
            }
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.background} />
            <Text style={styles.logSightingButtonText}>Log a sighting here</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Species recorded here{speciesSeen.length > 0 ? ` (${speciesSeen.length})` : ''}
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.md }} />
        ) : !hasCoords ? (
          <Text style={styles.emptyText}>No location data for this hotspot yet.</Text>
        ) : speciesSeen.length === 0 ? (
          <Text style={styles.emptyText}>No sightings recorded here yet — be the first!</Text>
        ) : (
          <FlatList
            data={speciesSeen}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.speciesList}
            renderItem={({ item }) => {
              const primaryImage = item.images?.find((img) => img.is_primary) || item.images?.[0];
              return (
                <TouchableOpacity
                  style={styles.speciesCard}
                  onPress={() => navigation.navigate('BirdDetail', { bird: item })}
                >
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage.image_url }} style={styles.speciesImage} />
                  ) : (
                    <View style={[styles.speciesImage, styles.speciesPlaceholder]}>
                      <Text style={{ fontSize: 28 }}>🦅</Text>
                    </View>
                  )}
                  <Text style={styles.speciesName} numberOfLines={1}>{item.common_name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {sightings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent sightings nearby</Text>
          {sightings.slice(0, 8).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.sightingRow}
              onPress={() => s.birds && navigation.navigate('BirdDetail', { bird: s.birds })}
            >
              <View style={styles.sightingDot} />
              <Text style={styles.sightingBird} numberOfLines={1}>
                {s.birds?.common_name || 'Unknown bird'}
              </Text>
              <Text style={styles.sightingMeta}>{formatDistance(s.distanceKm)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: theme.spacing.xxl },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.card,
  },
  heroImage: {},
  heroOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.md,
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    padding: theme.spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  heroRegion: {
    fontSize: 13,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
  mapWrap: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  viewOnMapText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  logSightingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  logSightingButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.background,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textDim,
  },
  speciesList: {
    gap: theme.spacing.md,
  },
  speciesCard: {
    width: 92,
    alignItems: 'center',
  },
  speciesImage: {
    width: 76,
    height: 76,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.xs,
  },
  speciesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  speciesName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  sightingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  sightingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  sightingBird: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  sightingMeta: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
});