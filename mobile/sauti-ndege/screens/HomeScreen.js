import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform
} from 'react-native';
import { Audio } from 'expo-av';

const API_URL = 'https://ndege-id-production.up.railway.app';

export default function HomeScreen({ navigation }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const recordingRef = useRef(null);

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Test with a sample bird call?');
      if (confirmed) testWithSample();
      return;
    }
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (Platform.OS === 'web') return;
    setIsRecording(false);
    setIsIdentifying(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      await identifyBird(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsIdentifying(false);
    }
  };

  const identifyBird = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      const response = await fetch(`${API_URL}/identify`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      navigation.navigate('Result', { result });
    } catch (err) {
      console.error('Identification failed', err);
    } finally {
      setIsIdentifying(false);
    }
  };

  const testWithSample = async () => {
    setIsIdentifying(true);
    try {
      const response = await fetch(`${API_URL}/birds/2`);
      const bird = await response.json();
      navigation.navigate('Result', {
        result: {
          prediction: {
            predicted_species: bird.common_name,
            scientific_name: bird.scientific_name,
            confidence: 94.5,
            top3: [
              { common_name: bird.common_name, scientific_name: bird.scientific_name, confidence: 94.5 },
              { common_name: 'Hadada Ibis', scientific_name: 'Bostrychia hagedash', confidence: 3.2 },
              { common_name: 'Black Kite', scientific_name: 'Milvus migrans', confidence: 2.3 },
            ]
          },
          bird: bird
        }
      });
    } catch (error) {
      console.error('Error', error);
    } finally {
      setIsIdentifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sauti Ndege</Text>
        <Text style={styles.subtitle}>East African Bird Identifier</Text>
      </View>

      <View style={styles.recordSection}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            isIdentifying && styles.recordButtonDisabled
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isIdentifying}
        >
          {isIdentifying ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.recordIcon}>
              {isRecording ? '⏹' : '🎙️'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.recordLabel}>
          {isIdentifying ? 'Identifying...' :
           isRecording ? 'Recording... Release to identify' :
           'Hold to Record'}
        </Text>
        <Text style={styles.recordHint}>
          Hold near the bird call
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🌍 Focused on East African species</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F8E9',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: { alignItems: 'center' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#1B5E20' },
  subtitle: { fontSize: 16, color: '#558B2F', marginTop: 8 },
  recordSection: { alignItems: 'center' },
  recordButton: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#2E7D32',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  recordButtonActive: { backgroundColor: '#B71C1C', transform: [{ scale: 1.1 }] },
  recordButtonDisabled: { backgroundColor: '#888' },
  recordIcon: { fontSize: 60 },
  recordLabel: { fontSize: 20, fontWeight: '600', color: '#1B5E20', marginTop: 24 },
  recordHint: { fontSize: 14, color: '#888', marginTop: 8 },
  footer: { alignItems: 'center' },
  footerText: { fontSize: 14, color: '#558B2F' },
});