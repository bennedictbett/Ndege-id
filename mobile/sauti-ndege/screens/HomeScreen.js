import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const API_URL = 'https://ndege-id-production.up.railway.app';

const IdentifyCard = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.identifyCard} onPress={onPress}>
    <View style={styles.identifyIconContainer}>
      <Text style={styles.identifyIcon}>{icon}</Text>
    </View>
    <Text style={styles.identifyTitle}>{title}</Text>
    <Text style={styles.identifySubtitle}>{subtitle}</Text>
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

  const handleIdentifyBySound = async () => {
    const confirmed = window.confirm('Test identification with a sample bird call?');
    if (!confirmed) return;
    setIsIdentifying(true);
    startPulse();
    try {
      const response = await fetch(`${API_URL}/birds/2`);
      const bird = await response.json();
      const result = {
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
        bird
      };
      setRecentBirds(prev => [{ bird, confidence: 94.5 }, ...prev.slice(0, 4)]);
      navigation.navigate('Result', { result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsIdentifying(false);
      stopPulse();
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Hero */}
<View style={styles.heroContainer}>
  {/* Layered background */}
  <img
    src="https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/birds/white_browed_robin_chat_1.jpg"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'absolute',
      top: 0, left: 0,
      filter: 'blur(8px) brightness(0.3)',
      transform: 'scale(1.1)',
    }}
    alt=""
  />
  {/* Green radial gradient overlay */}
  <View style={[styles.heroGradient, {
    background: 'radial-gradient(ellipse at 70% 50%, rgba(126,217,87,0.15) 0%, rgba(7,10,7,0.0) 70%)',
  }]} />

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

    {/* Right - Transparent bird PNG floating */}
    <View style={styles.heroRight}>
      <img
        src="https://cbhvaqscbttfdokbktxj.supabase.co/storage/v1/object/public/bird-images/hero/white_browed_robin_chat_1-removebg-preview.png"
        style={{
          width: '160%',
          height: '160%',
          objectFit: 'contain',
          position: 'absolute',
          bottom: -40,
          right: -30,
          filter: 'drop-shadow(0px 12px 32px rgba(126,217,87,0.4))',
        }}
        alt="hero bird"
      />
    </View>
  </View>

  {/* Search bar - full width */}
  <View style={styles.searchBar}>
    <Ionicons name="search" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
    <Text style={styles.searchPlaceholder}>Search birds, calls, places...</Text>
    <Ionicons name="options-outline" size={16} color={theme.colors.textDim} />
  </View>
</View>

      {/* Identify Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>✨</Text>
          <Text style={styles.sectionTitle}>Identify a bird</Text>
        </View>
        <View style={styles.identifyCards}>
          <IdentifyCard
            icon="🎙️"
            title="By Sound"
            subtitle="Record or upload a bird sound"
            onPress={handleIdentifyBySound}
          />
          <IdentifyCard
            icon="📷"
            title="By Photo"
            subtitle="Take or upload a photo"
            onPress={() => alert('Coming soon!')}
          />
          <IdentifyCard
            icon="🔭"
            title="By Sight"
            subtitle="Describe what you saw"
            onPress={() => navigation.navigate('BrowseTab')}
          />
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
          <Text style={styles.sectionIcon}>🧭</Text>
          <Text style={styles.sectionTitle}>Explore</Text>
        </View>
        <View style={styles.exploreGrid}>
          {[
            { icon: '🔭', title: 'Birds', subtitle: 'Explore species in East Africa', onPress: () => navigation.navigate('BrowseTab') },
            { icon: '📖', title: 'Field Guide', subtitle: 'Learn calls, behaviors and habitats', onPress: () => navigation.navigate('BrowseTab') },
            { icon: '🗺️', title: 'Hotspots', subtitle: 'Discover best places for birding', onPress: () => alert('Coming soon!') },
            { icon: '🏆', title: 'Life List', subtitle: 'Track your streaks and achievements', onPress: () => navigation.navigate('LifeListTab') },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={styles.exploreCard} onPress={item.onPress}>
              <Text style={styles.exploreIcon}>{item.icon}</Text>
              <Text style={styles.exploreTitle}>{item.title}</Text>
              <Text style={styles.exploreSubtitle}>{item.subtitle}</Text>
              <Text style={styles.exploreArrow}>→</Text>
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
  overflow: 'hidden',
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
  flex: 1.2,
  zIndex: 2,
  paddingRight: theme.spacing.sm,
  },
  heroRight: {
  flex: 0.9,
  height: 220,
  position: 'relative',
  overflow: 'visible',
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  identifyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0A2A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  identifyIcon: { fontSize: 24 },
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
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exploreCard: {
    width: '47%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    minHeight: 130,
  },
  exploreIcon: { fontSize: 28, marginBottom: theme.spacing.sm },
  exploreTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  exploreSubtitle: {
    fontSize: 11,
    color: theme.colors.textDim,
    lineHeight: 15,
    flex: 1,
  },
  exploreArrow: {
    color: theme.colors.primary,
    fontSize: 16,
    marginTop: theme.spacing.sm,
  },
});