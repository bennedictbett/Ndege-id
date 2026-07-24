import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { theme } from '../constants/theme';

const API_URL = 'https://ndege-id.onrender.com';

export default function RecordingScreen({ navigation }) {
  const [phase, setPhase] = useState('listening'); // 'listening' | 'analyzing'
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    startRecording();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission is required to identify by sound.');
        navigation.goBack();
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      alert('Could not start recording.');
      navigation.goBack();
    }
  };

  const handleCancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch (e) {}
    }
    navigation.goBack();
  };

  const handleStop = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('analyzing');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      let latitude = null, longitude = null, locationName = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
        const geocode = await Location.reverseGeocodeAsync(loc.coords);
        locationName = geocode[0]?.city || geocode[0]?.region || null;
      }

      const formData = new FormData();
      formData.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' });
      if (latitude) formData.append('latitude', String(latitude));
      if (longitude) formData.append('longitude', String(longitude));
      if (locationName) formData.append('location_name', locationName);

      const response = await fetch(`${API_URL}/identify`, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.bird) {
        navigation.replace('Result', { result });
      } else {
        alert('Could not identify a bird from that recording.');
        navigation.goBack();
      }
    } catch (e) {
      console.error(e);
      alert('Something went wrong processing the recording.');
      navigation.goBack();
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Identify by Sound</Text>

      {phase === 'listening' ? (
        <>
          <Animated.View style={[styles.micCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="mic" size={48} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.statusText}>Listening...</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
          <Text style={styles.hint}>Point your phone toward the bird</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Ionicons name="mic" size={48} color={theme.colors.primary} style={{ marginBottom: theme.spacing.lg }} />
          <Text style={styles.statusText}>Recording Complete</Text>
          <Text style={styles.hint}>Analyzing bird call...</Text>
          <Text style={styles.hint}>Comparing against East African birds</Text>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0A2A0A',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textDim,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cancelText: {
    color: theme.colors.textDim,
    fontWeight: '600',
  },
  stopButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.danger,
  },
  stopText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});