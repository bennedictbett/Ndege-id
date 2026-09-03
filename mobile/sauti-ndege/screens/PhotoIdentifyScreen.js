import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { ATTACH_LOCATION_KEY } from '../constants/settingsKeys';

const API_URL = 'https://ndege-id.onrender.com';

export default function PhotoIdentifyScreen({ navigation }) {
  const [phase, setPhase] = useState('choose'); // 'choose' | 'analyzing' | 'error'
  const [previewUri, setPreviewUri] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Immediately offer the camera as the primary path — the real-world
  // use case is "I'm looking at a bird right now", not browsing a gallery.
  useEffect(() => {
    takePhoto();
  }, []);

  const identifyPhoto = async (asset) => {
    setPreviewUri(asset.uri);
    setPhase('analyzing');
    setErrorMessage('');

    try {
      let latitude = null, longitude = null, locationName = null;
      const attachLocationSetting = await AsyncStorage.getItem(ATTACH_LOCATION_KEY);
      const shouldAttachLocation = attachLocationSetting === null ? true : attachLocationSetting === 'true';
      if (shouldAttachLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          try {
            const geocode = await Location.reverseGeocodeAsync(loc.coords);
            locationName = geocode[0]?.city || geocode[0]?.region || null;
          } catch {
            // Reverse geocoding isn't available on web — coordinates alone still get sent.
          }
        }
      }

      const formData = new FormData();
      formData.append('photo', { uri: asset.uri, name: 'photo.jpg', type: 'image/jpeg' });
      if (latitude) formData.append('latitude', String(latitude));
      if (longitude) formData.append('longitude', String(longitude));
      if (locationName) formData.append('location_name', locationName);

      const response = await fetch(`${API_URL}/identify-photo`, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.bird) {
        navigation.replace('Result', { result });
      } else {
        setErrorMessage("Couldn't match that photo to a species closely enough. Try a clearer, closer shot.");
        setPhase('error');
      }
    } catch (e) {
      console.error('Photo identify failed', e);
      setErrorMessage('Something went wrong processing the photo.');
      setPhase('error');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Camera permission is required to identify by photo.');
        setPhase('error');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled) {
        navigation.goBack();
        return;
      }
      identifyPhoto(result.assets[0]);
    } catch (e) {
      console.error(e);
      setErrorMessage('Could not open the camera.');
      setPhase('error');
    }
  };

  const chooseFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Photo library access is required.');
        setPhase('error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return;
      identifyPhoto(result.assets[0]);
    } catch (e) {
      console.error(e);
      setErrorMessage('Could not open the photo library.');
      setPhase('error');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Identify by Photo</Text>

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.preview} />
      )}

      {phase === 'analyzing' && (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
          <Text style={styles.statusText}>Comparing against reference photos...</Text>
          <Text style={styles.hint}>This is a visual-similarity match, not a trained classifier — accuracy varies by species.</Text>
        </>
      )}

      {phase === 'choose' && !previewUri && (
        <>
          <Ionicons name="camera-outline" size={64} color={theme.colors.primary} style={{ marginBottom: theme.spacing.lg }} />
          <Text style={styles.hint}>Opening camera...</Text>
        </>
      )}

      {phase === 'error' && (
        <>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} style={{ marginBottom: theme.spacing.md }} />
          <Text style={styles.statusText}>{errorMessage}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
              <Text style={styles.secondaryButtonText}>Retake Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={chooseFromLibrary}>
              <Text style={styles.secondaryButtonText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: { position: 'absolute', top: 50, left: theme.spacing.md },
  title: { fontSize: 20, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xl },
  preview: {
    width: 220, height: 220, borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  statusText: { fontSize: 16, fontWeight: '600', color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing.md },
  hint: { fontSize: 13, color: theme.colors.textDim, textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl },
  secondaryButton: {
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '600' },
});