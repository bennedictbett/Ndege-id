import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { LIFE_LIST_KEY } from './LifeListScreen';

// Roadmap target — update this as the species roster grows (see README roadmap).
const TARGET_SPECIES = 50;
const RECENT_COUNT = 4;

function formatMonthDay(dateString) {
  return new Date(dateString).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

export default function ProfileScreen({ navigation }) {
  const [lifeList, setLifeList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLifeList();
    }, [])
  );

  const loadLifeList = async () => {
    try {
      const data = await AsyncStorage.getItem(LIFE_LIST_KEY);
      setLifeList(data ? JSON.parse(data) : []);
    } catch (e) {
      console.error('Failed to load life list on Profile', e);
    } finally {
      setLoaded(true);
    }
  };

  const speciesCount = lifeList.length;
  const progress = Math.min(speciesCount / TARGET_SPECIES, 1);

  const now = new Date();
  const thisMonthCount = lifeList.filter(b => {
    const d = new Date(b.date_seen);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const oldestEntry = lifeList.length > 0 ? lifeList[lifeList.length - 1] : null;
  const memberSinceLabel = oldestEntry ? formatMonthDay(oldestEntry.date_seen) : '—';

  // lifeList is unshifted on add, so index 0 is most recent.
  const recent = lifeList.slice(0, RECENT_COUNT);

  const goToLifeList = () => navigation.navigate('HomeTab', { screen: 'LifeList' });

  const SETTINGS_ROWS = [
    { icon: 'notifications-outline', label: 'Notifications' },
    { icon: 'location-outline', label: 'Location' },
    { icon: 'mic-outline', label: 'Audio & recording' },
    { icon: 'color-palette-outline', label: 'Appearance' },
    { icon: 'information-circle-outline', label: 'About Sauti ya Ndege' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity block — no accounts yet, so this stays generic */}
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <Ionicons name="person" size={36} color={theme.colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Bird Explorer</Text>
        <Text style={styles.headerSubtitle}>Tracking sightings on this device</Text>
      </View>

      {/* Life List hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Your life list</Text>
        <Text style={styles.heroNumber}>{speciesCount}</Text>
        <Text style={styles.heroSub}>species discovered</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, speciesCount > 0 ? 4 : 0)}%` }]} />
        </View>
        <Text style={styles.heroCaption}>
          <Text style={styles.heroCaptionStrong}>{speciesCount} of {TARGET_SPECIES}</Text> species on the roadmap
        </Text>

        <TouchableOpacity style={styles.heroCta} onPress={goToLifeList} activeOpacity={0.85}>
          <Text style={styles.heroCtaText}>View life list</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      {/* Stats — only things we can actually compute from stored data */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statNumber}>{speciesCount}</Text>
          <Text style={styles.statLabel}>Species identified</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statNumber}>{thisMonthCount}</Text>
          <Text style={styles.statLabel}>This month</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statNumber}>{memberSinceLabel}</Text>
          <Text style={styles.statLabel}>First sighting</Text>
        </View>
      </View>

      {/* Recent discoveries */}
      {recent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent discoveries</Text>
            <TouchableOpacity onPress={goToLifeList}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((bird, index) => {
              const primaryImage = bird.images?.find(img => img.is_primary)
                || (bird.image_url ? { image_url: bird.image_url } : null);
              return (
                <TouchableOpacity
                  key={`${bird.id}-${index}`}
                  style={styles.birdCard}
                  onPress={() => navigation.navigate('HomeTab', { screen: 'BirdDetail', params: { bird } })}
                  activeOpacity={0.8}
                >
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage.image_url }} style={styles.birdPhoto} />
                  ) : (
                    <View style={[styles.birdPhoto, styles.birdPhotoPlaceholder]}>
                      <Text style={{ fontSize: 26 }}>🦅</Text>
                    </View>
                  )}
                  <Text style={styles.birdName} numberOfLines={2}>{bird.common_name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Empty state nudge when there's nothing tracked yet */}
      {loaded && speciesCount === 0 && (
        <View style={styles.emptyNudge}>
          <Text style={styles.emptyNudgeText}>
            Identify your first bird to start building your life list.
          </Text>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          {SETTINGS_ROWS.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.settingsRow,
                index < SETTINGS_ROWS.length - 1 && styles.settingsRowBorder,
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={row.icon} size={16} color={theme.colors.textSecondary} />
                </View>
                <Text style={styles.settingsLabel}>{row.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.primaryDim,
    borderWidth: 1, borderColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textDim, marginTop: 2 },

  heroCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 },
  heroNumber: { fontSize: 44, fontWeight: 'bold', color: theme.colors.text, lineHeight: 48 },
  heroSub: { fontSize: 13, color: theme.colors.textDim, marginBottom: theme.spacing.md },
  progressTrack: {
    width: '100%', height: 8, borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface, overflow: 'hidden', marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%', borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  heroCaption: { fontSize: 12.5, color: theme.colors.textDim, marginBottom: theme.spacing.md },
  heroCaptionStrong: { color: theme.colors.text, fontWeight: '600' },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12, width: '100%',
  },
  heroCtaText: { color: theme.colors.background, fontWeight: '600', fontSize: 14.5 },

  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  statChip: {
    flex: 1, backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.cardBorder,
    paddingVertical: 12, alignItems: 'center', gap: 3,
  },
  statNumber: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  statLabel: { fontSize: 10.5, color: theme.colors.textDim, textAlign: 'center' },

  section: { marginBottom: theme.spacing.lg },
  sectionHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.sm },
  sectionLink: { fontSize: 12.5, color: theme.colors.primaryLight, fontWeight: '600' },

  recentRow: { gap: theme.spacing.sm },
  birdCard: { width: 84, alignItems: 'center', gap: 6 },
  birdPhoto: { width: 72, height: 72, borderRadius: theme.radius.lg },
  birdPhotoPlaceholder: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.cardBorder,
  },
  birdName: { fontSize: 11.5, color: theme.colors.textSecondary, textAlign: 'center' },

  emptyNudge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  emptyNudgeText: { fontSize: 13, color: theme.colors.textDim, textAlign: 'center', lineHeight: 19 },

  settingsList: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: theme.spacing.md,
  },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  settingsIcon: {
    width: 28, height: 28, borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsLabel: { fontSize: 13.5, color: theme.colors.text },
});