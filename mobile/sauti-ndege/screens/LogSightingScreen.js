import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  FlatList, Modal, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { getBirds } from '../utils/birdsRepository';

export default function LogSightingScreen({ route, navigation }) {
  const presetBird = route?.params?.bird || null;
  const presetLocation = route?.params?.presetLocation || null; // { lat, lon, name }

  const [selectedBird, setSelectedBird] = useState(presetBird);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [allBirds, setAllBirds] = useState([]);
  const [loadingBirds, setLoadingBirds] = useState(false);
  const [search, setSearch] = useState('');

  const [latitude, setLatitude] = useState(presetLocation?.lat ?? null);
  const [longitude, setLongitude] = useState(presetLocation?.lon ?? null);
  const [locationName, setLocationName] = useState(presetLocation?.name || '');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Try to grab the device's current location automatically, unless a
  // hotspot (or some other caller) already supplied one to use instead.
  useEffect(() => {
    if (presetLocation) return;
    captureCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      try {
        const geocode = await Location.reverseGeocodeAsync(loc.coords);
        const place = geocode[0]?.city || geocode[0]?.region;
        if (place) setLocationName((prev) => prev || place);
      } catch {
        // Reverse geocoding isn't available everywhere (e.g. web) --
        // the coordinates alone are still useful, so this fails silently.
      }
    } catch (e) {
      console.error('Error getting current location:', e);
      setLocationDenied(true);
    } finally {
      setLocationLoading(false);
    }
  };

  const openPicker = () => {
    setPickerVisible(true);
    if (allBirds.length === 0) {
      setLoadingBirds(true);
      getBirds().then(({ birds }) => {
        setAllBirds(birds);
        setLoadingBirds(false);
      });
    }
  };

  const filteredBirds = allBirds.filter((b) =>
    b.common_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.scientific_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectBird = (bird) => {
    setSelectedBird(bird);
    setPickerVisible(false);
    setSearch('');
  };

  const hasLocation = latitude != null && longitude != null;
  const canSubmit = !!selectedBird && (hasLocation || locationName.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('sightings').insert({
        bird_id: selectedBird.id,
        latitude,
        longitude,
        location_name: locationName.trim() || null,
      });
      if (error) throw error;

      Alert.alert('Sighting logged', `${selectedBird.common_name} has been added to the map.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('Error logging sighting:', e);
      Alert.alert('Something went wrong', "Couldn't save this sighting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const primaryImage = selectedBird?.images?.find((img) => img.is_primary) || selectedBird?.images?.[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log a sighting</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionLabel}>Species</Text>
      {selectedBird ? (
        <TouchableOpacity style={styles.selectedBirdCard} onPress={openPicker}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage.image_url }} style={styles.selectedBirdImage} />
          ) : (
            <View style={[styles.selectedBirdImage, styles.selectedBirdPlaceholder]}>
              <Text style={{ fontSize: 24 }}>🦅</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedBirdName}>{selectedBird.common_name}</Text>
            <Text style={styles.selectedBirdScientific}>{selectedBird.scientific_name}</Text>
          </View>
          <Text style={styles.changeLink}>Change</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.pickSpeciesButton} onPress={openPicker}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.pickSpeciesText}>Which bird did you see?</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>Location</Text>

      {locationLoading ? (
        <View style={styles.locationStatusRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.locationStatusText}>Getting your location…</Text>
        </View>
      ) : hasLocation ? (
        <View style={styles.locationStatusRow}>
          <Ionicons name="location" size={16} color={theme.colors.primary} />
          <Text style={styles.locationStatusText}>
            {locationName ? locationName : `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`}
          </Text>
          <TouchableOpacity onPress={captureCurrentLocation}>
            <Text style={styles.retryLink}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.locationStatusRow}>
          <Ionicons name="location-outline" size={16} color={theme.colors.textDim} />
          <Text style={styles.locationStatusText}>
            {locationDenied ? 'Location unavailable' : 'No location captured yet'}
          </Text>
          <TouchableOpacity onPress={captureCurrentLocation}>
            <Text style={styles.retryLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.helperText}>
        Or type a place name — useful if you're logging a sighting from memory, or GPS isn't available.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Kakamega Forest"
        placeholderTextColor={theme.colors.textDim}
        value={locationName}
        onChangeText={setLocationName}
      />

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={styles.submitButtonText}>Log sighting</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Which bird did you see?</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={theme.colors.textDim} style={{ marginRight: theme.spacing.sm }} />
            <TextInput
              style={[styles.searchInput, { outline: 'none' }]}
              placeholder="Search species..."
              placeholderTextColor={theme.colors.textDim}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loadingBirds ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredBirds}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const image = item.images?.find((img) => img.is_primary)
                  || (item.image_url ? { image_url: item.image_url } : null);
                return (
                  <TouchableOpacity style={styles.pickerRow} onPress={() => handleSelectBird(item)} activeOpacity={0.7}>
                    {image ? (
                      <Image source={{ uri: image.image_url }} style={styles.pickerImage} />
                    ) : (
                      <View style={styles.pickerImagePlaceholder}>
                        <Text style={{ fontSize: 24 }}>🦅</Text>
                      </View>
                    )}
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerCommonName}>{item.common_name}</Text>
                      <Text style={styles.pickerScientificName}>{item.scientific_name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  pickSpeciesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
  },
  pickSpeciesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  selectedBirdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  selectedBirdImage: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
  },
  selectedBirdPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  selectedBirdName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedBirdScientific: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.textDim,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  locationStatusText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  retryLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primaryLight,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
  },
  submitButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.background,
  },
  pickerContainer: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 50 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  pickerImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
  },
  pickerImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  pickerInfo: { flex: 1 },
  pickerCommonName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pickerScientificName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.textDim,
  },
});