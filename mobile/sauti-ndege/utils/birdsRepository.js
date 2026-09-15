import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

const CACHE_KEY = 'cache_birds_v1';

/**
 * Fetches the full bird reference list (species + images), caching it
 * locally so Browse, Life List's manual picker, and Bird Detail's
 * "similar species" section all keep working with no connection, once
 * there's been at least one successful fetch on this device.
 *
 * Returns { birds, fromCache }. fromCache is true when the network
 * fetch failed and this fell back to the last cached copy — callers can
 * use that to show an "offline, showing cached data" hint.
 */
export async function getBirds() {
  try {
    const response = await fetch(`${API_URL}/birds`);
    const data = await response.json();
    const birds = data.birds || [];
    // Cache in the background — a storage hiccup shouldn't block the return.
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(birds)).catch(() => {});
    return { birds, fromCache: false };
  } catch (e) {
    console.warn('Birds fetch failed, falling back to cached copy', e);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return { birds: cached ? JSON.parse(cached) : [], fromCache: true };
    } catch {
      return { birds: [], fromCache: true };
    }
  }
}