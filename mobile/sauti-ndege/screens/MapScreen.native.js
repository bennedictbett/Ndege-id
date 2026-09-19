\import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const API_URL = 'https://ndege-id.onrender.com';

const DATE_RANGES = [
  { key: 'all', label: 'All time' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

function isWithinRange(dateStr, rangeKey) {
  if (rangeKey === 'all' || !dateStr) return true;
  const days = { '7d': 7, '30d': 30, '90d': 90 }[rangeKey];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(dateStr).getTime() >= cutoff;
}

export default function MapScreen({ navigation, route }) {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const focus = route?.params;

  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState(new Set()); // empty set = all species

  useEffect(() => {
    const fetchSightings = async () => {
      try {
        // A bigger window than before -- filtering needs something to filter over.
        const response = await fetch(`${API_URL}/sightings/recent?limit=200`);
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

  // Every species present in the fetched sightings, alphabetical -- this is
  // the option list shown in the filter panel.
  const speciesOptions = useMemo(() => {
    const byId = new Map();
    sightings.forEach((s) => {
      if (s.birds?.id != null && !byId.has(s.birds.id)) {
        byId.set(s.birds.id, s.birds);
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      (a.common_name || '').localeCompare(b.common_name || '')
    );
  }, [sightings]);

  const filteredSightings = useMemo(() => {
    return sightings.filter((s) => {
      if (selectedSpecies.size > 0 && !selectedSpecies.has(s.birds?.id)) return false;
      if (!isWithinRange(s.created_at, dateRange)) return false;
      return true;
    });
  }, [sightings, selectedSpecies, dateRange]);

  const toggleSpecies = (id) => {
    setSelectedSpecies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedSpecies(new Set());
    setDateRange('all');
  };

  const activeFilterCount = (selectedSpecies.size > 0 ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);

  // Default region — Eldoret, Kenya, unless a hotspot asked us to focus elsewhere
  const initialRegion = focus?.focusLatitude != null && focus?.focusLongitude != null
    ? {
        latitude: focus.focusLatitude,
        longitude: focus.focusLongitude,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      }
    : {
        latitude: 0.5143,
        longitude: 35.2698,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sighting Map</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, activeFilterCount > 0 && styles.iconButtonActive]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={14}
              color={activeFilterCount > 0 ? theme.colors.background : theme.colors.text}
            />
            <Text style={[styles.iconButtonText, activeFilterCount > 0 && styles.iconButtonTextActive]}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Hotspots')}
          >
            <Ionicons name="location-outline" size={14} color={theme.colors.text} />
            <Text style={styles.iconButtonText}>Hotspots</Text>
          </TouchableOpacity>
        </View>
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
          {filteredSightings.map((sighting) => (
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

      {!loading && filteredSightings.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="location-outline" size={40} color={theme.colors.textDim} />
          <Text style={styles.emptyText}>
            {sightings.length === 0 ? 'No sightings with location data yet' : 'No sightings match your filters'}
          </Text>
          {sightings.length > 0 && activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter sightings</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>Date</Text>
            <View style={styles.chipRow}>
              {DATE_RANGES.map((r) => {
                const active = dateRange === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDateRange(r.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalSectionRow}>
              <Text style={styles.modalSectionTitle}>Species</Text>
              {selectedSpecies.size > 0 && (
                <TouchableOpacity onPress={() => setSelectedSpecies(new Set())}>
                  <Text style={styles.clearLink}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {speciesOptions.length === 0 ? (
              <Text style={styles.emptyInlineText}>No species to filter yet</Text>
            ) : (
              <ScrollView style={styles.speciesScroll}>
                {speciesOptions.map((bird) => {
                  const checked = selectedSpecies.has(bird.id);
                  return (
                    <TouchableOpacity
                      key={bird.id}
                      style={styles.speciesRow}
                      onPress={() => toggleSpecies(bird.id)}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? theme.colors.primary : theme.colors.textDim}
                      />
                      <Text style={styles.speciesRowText}>{bird.common_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.applyButton} onPress={() => setFilterVisible(false)}>
              <Text style={styles.applyButtonText}>
                Show {filteredSightings.length} sighting{filteredSightings.length === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.logFab}
        onPress={() => navigation.navigate('LogSighting')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={theme.colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  iconButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  iconButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  iconButtonTextActive: {
    color: theme.colors.background,
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
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  clearFiltersButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  modalSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  speciesScroll: {
    marginTop: theme.spacing.sm,
    maxHeight: 260,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  speciesRowText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  emptyInlineText: {
    fontSize: 13,
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
  },
  applyButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background,
  },
  logFab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});