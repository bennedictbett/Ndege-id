import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { theme } from '../constants/theme';

const API_URL = 'https://ndege-id.onrender.com';

const LISTENING_MESSAGES = [
  'Listening...',
  'Detecting bird calls...',
  'Filtering background noise...',
  'Comparing with East African species...',
];

const ANALYZING_MESSAGES = [
  'Checking Turacos...',
  'Checking Nightjars...',
  'Checking Sunbirds...',
  'Checking Weavers...',
  'Checking Kingfishers...',
];

const BAR_COUNT = 12;

export default function RecordingScreen({ navigation }) {
  const [phase, setPhase] = useState('listening'); // 'listening' | 'analyzing'
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(null);
  const [listeningMsgIndex, setListeningMsgIndex] = useState(0);
  const [analyzingMsgIndex, setAnalyzingMsgIndex] = useState(0);

  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))).current;

  const timerRef = useRef(null);
  const msgIntervalRef = useRef(null);
  const barIntervalRef = useRef(null);

  useEffect(() => {
    startRecording();
    startBreathingPulse();
    startWaveform();

    msgIntervalRef.current = setInterval(() => {
      setListeningMsgIndex((i) => (i + 1) % LISTENING_MESSAGES.length);
    }, 2200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      if (barIntervalRef.current) clearInterval(barIntervalRef.current);
    };
  }, []);

  const startBreathingPulse = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  const startWaveform = () => {
    barIntervalRef.current = setInterval(() => {
      barAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.2 + Math.random() * 0.8,
          duration: 250,
          useNativeDriver: false,
        }).start();
      });
    }, 250);
  };

  const startAnalyzingCycle = () => {
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    msgIntervalRef.current = setInterval(() => {
      setAnalyzingMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
    }, 900);
  };

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
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    if (barIntervalRef.current) clearInterval(barIntervalRef.current);
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch (e) {}
    }
    navigation.goBack();
  };

  const handleStop = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    if (barIntervalRef.current) clearInterval(barIntervalRef.current);

    setPhase('analyzing');
    startAnalyzingCycle();

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

      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();

      setTimeout(() => {
        if (result.bird) {
          navigation.replace('Result', { result });
        } else {
          alert('Could not identify a bird from that recording.');
          navigation.goBack();
        }
      }, 400);
    } catch (e) {
      console.error(e);
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
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
          <View style={styles.micWrapper}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={48} color={theme.colors.primary} />
            </View>
          </View>

          <Text style={styles.statusText}>{LISTENING_MESSAGES[listeningMsgIndex]}</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          <View style={styles.waveformRow}>
            {barAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 40],
                    }),
                  },
                ]}
              />
            ))}
          </View>

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
          <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} style={{ marginBottom: theme.spacing.md }} />
          <Text style={styles.statusText}>Recording Complete</Text>
          <Text style={styles.hint}>{ANALYZING_MESSAGES[analyzingMsgIndex]}</Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.hintSmall}>Comparing against 2,300 East African birds...</Text>
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
  micWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.primary,
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
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    marginBottom: theme.spacing.md,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textDim,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  hintSmall: {
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: 'center',
    marginTop: theme.spacing.md,
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
  progressTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.cardBorder,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
});