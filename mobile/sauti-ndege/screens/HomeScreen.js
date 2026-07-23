import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, ImageBackground
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';

const API_URL = 'https://ndege-id.onrender.com';

const IdentifyCard = ({ icon, title, subtitle, onPress, isRecording, pulseAnim }) => (
  <TouchableOpacity style={styles.identifyCard} onPress={onPress}>
    <Animated.View
      style={[
        styles.identifyIconGlow,
        isRecording && styles.identifyIconGlowRecording,
        isRecording && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <View style={[styles.identifyIconContainer, isRecording && styles.identifyIconContainerRecording]}>
        <Ionicons name={isRecording ? 'stop' : icon} size={24} color={isRecording ? theme.colors.danger : theme.colors.primary} />
      </View>
    </Animated.View>
    <Text style={styles.identifyTitle}>{isRecording ? 'Recording...' : title}</Text>
    <Text style={styles.identifySubtitle}>{isRecording ? 'Tap to stop' : subtitle}</Text>
  </TouchableOpacity>
);

const RecentCard = ({ bird, confidence }) => {
  const primaryImage = bird?.images?.find(img => img.is_primary);
  return (
    <View style={styles.recentCard}>
      {primaryImage && (
        <View style={styles.recentImageContainer}>
          <img
            src={primaryImage.image_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            alt={bird.common_name}
          />
        </View>
      )}
      <View style={styles.confidenceBadge}>
        <Text style={styles.confidenceText}>{confidence}%</Text>
      </View>
      <View style={styles.recentCardOverlay}>
        <Text style={styles.recentBirdName}>{bird.common_name}</Text>
        <Text style={styles.recentLocation}>📍 Eldoret • Just now</Text>
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [isIdentifying, setIsIdentifying] = useState(false);
const [recentBirds, setRecentBirds] = useState([]);

useEffect(() => {
  const fetchRecentBirds = async () => {
    const { data, error } = await supabase
      .from('birds')
      .select('*, images:bird_images(*)')
      .limit(4);

    if (error) {
      console.error('Error fetching birds:', error);
      return;
    }

    const withFakeConfidence = data.map((bird) => ({
      bird,
      confidence: Math.floor(Math.random() * (99 - 90 + 1)) + 90,
    }));

    setRecentBirds(withFakeConfidence);
  };

  fetchRecentBirds();
}, []);

const pulseAnim = useRef(new Animated.Value(1)).current;

const startPulse = () => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])
  ).start();
};

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const [recording, setRecording] = useState(null);

  const handleIdentifyBySound = async () => {
    if (recording) {
      // Currently recording — stop and process
      setIsIdentifying(true);
      startPulse();
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);

        // Get location (best-effort — proceed even if denied)
        let latitude = null;
        let longitude = null;
        let locationName = null;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          const geocode = await Location.reverseGeocodeAsync(loc.coords);
          locationName = geocode[0]?.city || geocode[0]?.region || null;
        }

        // Build multipart form data
        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        });
        if (latitude) formData.append('latitude', String(latitude));
        if (longitude) formData.append('longitude', String(longitude));
        if (locationName) formData.append('location_name', locationName);

        const response = await fetch(`${API_URL}/identify`, {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();

        if (result.bird) {
          setRecentBirds(prev => [{ bird: result.bird, confidence: result.prediction.confidence }, ...prev.slice(0, 4)]);
          navigation.navigate('Result', { result });
        } else {
          alert('Could not identify a bird from that recording.');
        }
      } catch (e) {
        console.error(e);
        alert('Something went wrong processing the recording.');
      } finally {
        setIsIdentifying(false);
        stopPulse();
      }
      return;
    }

    // Not currently recording — start
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission is required to identify by sound.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
    } catch (e) {
      console.error(e);
      alert('Could not start recording.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Hero */}
<View style={styles.heroContainer}>

  {/* Layered background - clipped */}
<View style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  }}>
    <img
      src="https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/hero/lilac-breasted-roller-hero.jpg"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center 30%'
      }}
      alt="Lilac-breasted roller"
    />
    <View style={[styles.heroGradient, {
      background: `
        linear-gradient(180deg, rgba(9,12,9,0.75) 0%, rgba(9,12,9,0.25) 30%, rgba(9,12,9,0.55) 100%),
        linear-gradient(90deg, rgba(9,12,9,0.9) 0%, rgba(9,12,9,0.4) 50%, rgba(9,12,9,0.15) 100%)
      `,
    }]} />
</View>

  {/* Header */}
  <View style={styles.header}>
    <TouchableOpacity>
      <Text style={styles.menuIcon}>☰</Text>
    </TouchableOpacity>
    <View style={styles.logoContainer}>
      <Text style={styles.logoText}>🦅 Sauti ya <Text style={styles.logoAccent}>Ndege</Text></Text>
    </View>
    <TouchableOpacity>
      <Text style={styles.notifIcon}>🔔</Text>
    </TouchableOpacity>
  </View>

  {/* Split content */}
  <View style={styles.heroContent}>
    {/* Left - Text */}
    <View style={styles.heroLeft}>
      <Text style={styles.heroTitle}>Know{'\n'}Every{'\n'}Bird.</Text>
      <Text style={styles.heroSub}>Anywhere in</Text>
      <Text style={styles.heroAccent}>East Africa.</Text>
      <Text style={styles.heroSubtitle}>
        AI-powered bird recognition by sound, photo or sighting.
      </Text>
    </View>
  </View>

  {/* Search bar */}
  <View style={styles.searchBar}>
    <Ionicons name="search" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
    <Text style={styles.searchPlaceholder}>Search birds, calls, places...</Text>
    <Ionicons name="options-outline" size={16} color={theme.colors.textDim} />
  </View>

</View>

      {/* Identify Section */}
<View style={styles.section}>
  <View style={styles.identifySectionCard}>
    <View style={styles.sectionHeader}>
      <Ionicons name="sparkles" size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
      <Text style={styles.sectionTitle}>Identify a bird</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textDim} />
    </View>
    <View style={styles.identifyCards}>
      <IdentifyCard
        icon="mic"
        title="By Sound"
        subtitle="Record or upload a bird sound"
        onPress={handleIdentifyBySound}
      />
      <IdentifyCard
        icon="camera"
        title="By Photo"
        subtitle="Take or upload a photo"
        onPress={() => alert('Coming soon!')}
      />
      <IdentifyCard
        icon="eye-outline"
        title="By Sight"
        subtitle="Describe what you saw"
        onPress={() => navigation.navigate('BrowseTab')}
      />
    </View>
  </View>
</View>

      {/* Recent Sightings */}
      {recentBirds.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📍</Text>
            <Text style={styles.sectionTitle}>Recent Sightings</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentBirds.map((item, index) => (
              <RecentCard key={index} bird={item.bird} confidence={item.confidence} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Explore Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="compass-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Explore</Text>
        </View>
        <View style={styles.exploreGrid}>
          {[
            { icon: 'binoculars-outline', title: 'Birds', subtitle: 'Explore species in East Africa', image: 'https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/explore-cards/birds-card.jpg', onPress: () => navigation.navigate('BrowseTab') },
            { icon: 'book-outline', title: 'Field Guide', subtitle: 'Learn calls, behaviors and habitats', image: 'https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/explore-cards/field-guide-card.jpg', onPress: () => navigation.navigate('BrowseTab') },
            { icon: 'navigate-outline', title: 'Hotspots', subtitle: 'Discover best places for birding', image: 'https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/explore-cards/hotspots-card.jpg', onPress: () => alert('Coming soon!') },
            { icon: 'trophy-outline', title: 'Life List', subtitle: 'Track your streaks and achievements', image: 'https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/explore-cards/life-list-card.jpg', onPress: () => navigation.navigate('LifeListTab') },
          ].map((item, index) => (
              <TouchableOpacity key={index} style={styles.exploreCard} onPress={item.onPress}>
              <ImageBackground source={{ uri: item.image }} style={styles.exploreCardBg} imageStyle={{ borderRadius: theme.radius.lg }} resizeMode="cover">
                <View style={styles.exploreOverlay} />
                <View>
                  <Ionicons name={item.icon} size={26} color={theme.colors.primary} style={{ marginBottom: theme.spacing.sm }} />
                  <Text style={styles.exploreTitle}>{item.title}</Text>
                  <Text style={styles.exploreSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.exploreArrowCircle}>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.text} />
                </View>
              </ImageBackground>
                </TouchableOpacity>
                ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  heroContainer: {
  position: 'relative',
  overflow: 'visible', 
  paddingBottom: theme.spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.cardBorder,
  minHeight: 340,
  },
  heroGradient: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  zIndex: 1,
  },
  heroBg: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1,
  },
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: theme.spacing.md,
  paddingTop: 50,
  paddingBottom: theme.spacing.sm,
  zIndex: 3,
  position: 'relative',
  },
  heroContent: {
  flexDirection: 'row',
  paddingHorizontal: theme.spacing.md,
  paddingTop: theme.spacing.sm,
  alignItems: 'center',
  minHeight: 220,
  zIndex: 2,
  position: 'relative',
  },
  menuIcon: { fontSize: 24, color: theme.colors.text },
  logoContainer: { alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  logoAccent: { color: theme.colors.primary },
  notifIcon: { fontSize: 24 },
  heroText: {
    position: 'absolute',
    bottom: 20,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 2,
  },
  heroLeft: {
  flex: 1, 
  zIndex: 2,
  paddingRight: theme.spacing.sm,
  },
  heroRight: {
  flex: 0.9,
  height: 220,
  position: 'relative',
  overflow: 'hidden',
  zIndex: 2,
  },
  heroTitle: {
  fontSize: 38,
  fontWeight: 'bold',
  color: theme.colors.text,
  lineHeight: 44,
  letterSpacing: -1,
  },
  heroSub: {
  fontSize: 13,
  color: theme.colors.textSecondary,
  marginTop: 6,
  },
  heroAccent: {
  fontSize: 22,
  fontWeight: 'bold',
  color: theme.colors.primary,
  marginBottom: 8,
  },
  heroSubtitle: {
  fontSize: 12,
  color: theme.colors.textDim,
  lineHeight: 18,
  marginBottom: 0,
  },
  searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 30,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: 'rgba(126,217,87,0.3)',
  marginHorizontal: theme.spacing.md,
  marginTop: theme.spacing.md,
  zIndex: 3,
  position: 'relative',
  },
  searchPlaceholder: {
  color: theme.colors.textDim,
  fontSize: 13,
  flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionIcon: { fontSize: 18, marginRight: theme.spacing.sm },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  viewAllText: { color: theme.colors.primary, fontSize: 14 },
  identifyCards: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  identifyCard: {
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.02)', // very faint lift, not fully transparent
  borderRadius: theme.radius.md,
  padding: theme.spacing.sm,
  alignItems: 'center',
  },
  identifySectionCard: {
  backgroundColor: theme.colors.surface, // #111411, a step brighter than card
  borderRadius: theme.radius.lg,
  borderWidth: 1,
  borderColor: 'rgba(126,217,87,0.15)', // green-tinted border instead of near-invisible cardBorder
  padding: theme.spacing.md,
  },
  identifyIconGlow: {
  width: 60,
  height: 60,
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing.sm,
  shadowColor: theme.colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 12,
  elevation: 6, // Android glow approximation
  },
  identifyIconContainer: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: '#0A2A0A',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: theme.colors.primary,
  },
  identifyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  identifySubtitle: {
    fontSize: 11,
    color: theme.colors.textDim,
    textAlign: 'center',
    lineHeight: 15,
  },
  recentCard: {
    width: 160,
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    position: 'relative',
  },
  recentImageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  confidenceBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  confidenceText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  recentCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  recentBirdName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  recentLocation: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  exploreGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  exploreCard: {
  flex: 1,
  height: 170, 
  borderRadius: theme.radius.lg,
  overflow: 'hidden',
  },
  exploreCardBg: {
  flex: 1,
  padding: theme.spacing.md,
  justifyContent: 'space-between', 
  },
  exploreOverlay: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
   backgroundColor: 'rgba(0,0,0,0.65)', 
  },
  exploreTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: theme.colors.text,
  marginBottom: 4,
  },
  exploreSubtitle: {
  fontSize: 11,
  color: theme.colors.textSecondary,
  lineHeight: 15,
  },
  exploreArrowCircle: {
  width: 26,
  height: 26,
  borderRadius: 13,
  backgroundColor: 'rgba(255,255,255,0.15)',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: theme.spacing.sm,
  },
});