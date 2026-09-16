import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';
import { addToLifeList } from '../screens/LifeListScreen';

const QUEUE_KEY = 'pending_identifications';
const SUMMARY_KEY = 'pending_identifications_summary';

async function getQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Only needed on web: the picked file's blob: URL doesn't survive a
// page reload, so it has to be captured as a portable data URI right
// away. Native keeps the plain file:// URI (see queueCapture) — Expo's
// cache files reliably persist for the short window until the queue
// flushes, so there's no need to pay the base64 encoding cost there.
async function uriToDataUri(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves a capture (audio recording or photo) that couldn't be
 * identified right now because of a connectivity failure. It's
 * resubmitted automatically the next time processQueue() runs with
 * a connection.
 */
export async function queueCapture({ type, uri, mimeType, fileName, latitude, longitude, locationName }) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type, // 'sound' | 'photo'
    mimeType,
    fileName,
    latitude,
    longitude,
    locationName,
    createdAt: new Date().toISOString(),
  };

  if (Platform.OS === 'web') {
    entry.dataUri = await uriToDataUri(uri);
  } else {
    entry.uri = uri;
  }

  const queue = await getQueue();
  queue.push(entry);
  await setQueue(queue);
}

export async function getQueueCount() {
  const queue = await getQueue();
  return queue.length;
}

async function buildFilePart(entry) {
  if (entry.dataUri) {
    const response = await fetch(entry.dataUri);
    return response.blob(); // a real Blob — web FormData accepts this directly
  }
  return { uri: entry.uri, name: entry.fileName, type: entry.mimeType };
}

async function submitEntry(entry) {
  const fieldName = entry.type === 'photo' ? 'photo' : 'audio';
  const filePart = await buildFilePart(entry);

  const formData = new FormData();
  if (entry.dataUri) {
    formData.append(fieldName, filePart, entry.fileName);
  } else {
    formData.append(fieldName, filePart);
  }
  if (entry.latitude) formData.append('latitude', String(entry.latitude));
  if (entry.longitude) formData.append('longitude', String(entry.longitude));
  if (entry.locationName) formData.append('location_name', entry.locationName);

  const endpoint = entry.type === 'photo' ? '/identify-photo' : '/identify';
  const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', body: formData });
  return response.json();
}

/**
 * Attempts to submit every queued capture. A capture that resolves to a
 * species is added to the Life List automatically — matching how a
 * live (non-queued) identification already behaves in ResultScreen,
 * since there's no in-the-moment screen here for the user to confirm
 * on. Entries that still fail (still offline, or a transient error)
 * stay queued for the next attempt; entries where the server responds
 * but finds no match are dropped, since retrying won't change that.
 *
 * Returns { resolved, remaining } so a caller (Home) can show what
 * completed.
 */
export async function processQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { resolved: [], remaining: 0 };

  const stillPending = [];
  const resolved = [];

  for (const entry of queue) {
    try {
      const result = await submitEntry(entry);
      if (result?.bird) {
        await addToLifeList(result.bird);
        resolved.push({ commonName: result.bird.common_name, type: entry.type });
      }
      // No match found — server responded fine, just nothing to add;
      // intentionally not re-queued.
    } catch (e) {
      console.warn('Queued identification failed, will retry later', e);
      stillPending.push(entry);
    }
  }

  await setQueue(stillPending);

  if (resolved.length > 0) {
    const existing = await AsyncStorage.getItem(SUMMARY_KEY);
    const combined = existing ? [...JSON.parse(existing), ...resolved] : resolved;
    await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(combined));
  }

  return { resolved, remaining: stillPending.length };
}

/**
 * Reads and clears the summary of successful queue flushes since it
 * was last checked, so Home can show a one-time "identified while you
 * were offline" banner rather than repeating it every visit.
 */
export async function consumeFlushSummary() {
  const raw = await AsyncStorage.getItem(SUMMARY_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(SUMMARY_KEY);
  const parsed = JSON.parse(raw);
  return parsed.length > 0 ? parsed : null;
}