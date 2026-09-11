import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ATTACH_LOCATION_KEY } from '../constants/settingsKeys';

/**
 * Captures the user's current location for a sighting, respecting the
 * "Attach Location to Sightings" preference (defaults to on, matching
 * the app's original always-on behavior for anyone who hasn't touched
 * the setting).
 *
 * Returns { latitude, longitude, locationName } — all null if the
 * preference is off, permission is denied, or location capture fails.
 * Reverse geocoding (coordinates → place name) is attempted separately
 * and allowed to fail silently, since it isn't supported on web at all —
 * a geocode failure should never block the coordinates themselves from
 * being attached.
 */
export async function captureLocationIfEnabled() {
  const empty = { latitude: null, longitude: null, locationName: null };

  const attachLocationSetting = await AsyncStorage.getItem(ATTACH_LOCATION_KEY);
  const shouldAttachLocation = attachLocationSetting === null ? true : attachLocationSetting === 'true';
  if (!shouldAttachLocation) return empty;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return empty;

  const loc = await Location.getCurrentPositionAsync({});
  const latitude = loc.coords.latitude;
  const longitude = loc.coords.longitude;

  let locationName = null;
  try {
    const geocode = await Location.reverseGeocodeAsync(loc.coords);
    locationName = geocode[0]?.city || geocode[0]?.region || null;
  } catch {
    // Not available on web, and can fail on native too — coordinates
    // alone are still useful, so this doesn't propagate.
  }

  return { latitude, longitude, locationName };
}