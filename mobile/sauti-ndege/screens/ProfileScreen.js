import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, Platform, Share, Alert, StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { theme } from '../constants/theme';
import { LIFE_LIST_KEY } from './LifeListScreen';
import SettingsRow from '../components/SettingsRow';
import OptionsSheet from '../components/OptionsSheet';
import EditProfileSheet from '../components/EditProfileSheet';

const RECENT_COUNT = 4;
const DEFAULT_TARGET = 50;
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const TARGET_KEY = 'setting_life_list_target';
const DISTANCE_UNIT_KEY = 'setting_distance_unit';
const NOTIFICATIONS_KEY = 'setting_notifications_enabled';
const NEARBY_BIRDS_KEY = 'setting_show_nearby_birds';
const DISPLAY_NAME_KEY = 'profile_display_name';
const BIO_KEY = 'profile_bio';
const PHOTO_KEY = 'profile_photo_uri';

const TARGET_OPTIONS = [
  { label: '10 species — MVP roster', value: 10 },
  { label: '50 species — roadmap goal', value: 50 },
  { label: '100 species', value: 100 },
];
const DISTANCE_OPTIONS = [
  { label: 'Kilometers', value: 'km' },
  { label: 'Miles', value: 'mi' },
];

function formatMonthDay(dateString) {
  return new Date(dateString).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

export default function ProfileScreen({ navigation }) {
  const [lifeList, setLifeList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [lifeListTarget, setLifeListTarget] = useState(DEFAULT_TARGET);
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNearbyBirds, setShowNearbyBirds] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState('');

  const [activeSheet, setActiveSheet] = useState(null); // 'target' | 'distance' | 'editProfile' | 'editBio' | 'photoActions' | null

  useFocusEffect(
    useCallback(() => {
      loadLifeList();
      loadSettings();
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

  const loadSettings = async () => {
    try {
      const [target, unit, notif, nearby, name, bioVal, photo] = await Promise.all([
        AsyncStorage.getItem(TARGET_KEY),
        AsyncStorage.getItem(DISTANCE_UNIT_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_KEY),
        AsyncStorage.getItem(NEARBY_BIRDS_KEY),
        AsyncStorage.getItem(DISPLAY_NAME_KEY),
        AsyncStorage.getItem(BIO_KEY),
        AsyncStorage.getItem(PHOTO_KEY),
      ]);
      if (target) setLifeListTarget(Number(target));
      if (unit) setDistanceUnit(unit);
      if (notif !== null) setNotificationsEnabled(notif === 'true');
      if (nearby !== null) setShowNearbyBirds(nearby === 'true');
      if (name) setDisplayName(name);
      if (bioVal) setBio(bioVal);
      if (photo) setPhotoUri(photo);
    } catch (e) {
      console.error('Failed to load profile settings', e);
    }
  };

  const persistDisplayName = async (val) => {
    setDisplayName(val);
    if (val) {
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, val);
    } else {
      await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
    }
  };

  const persistBio = async (val) => {
    setBio(val);
    if (val) {
      await AsyncStorage.setItem(BIO_KEY, val);
    } else {
      await AsyncStorage.removeItem(BIO_KEY);
    }
  };

  const persistPhoto = async (dataUri) => {
    setPhotoUri(dataUri);
    if (dataUri) {
      await AsyncStorage.setItem(PHOTO_KEY, dataUri);
    } else {
      await AsyncStorage.removeItem(PHOTO_KEY);
    }
  };

  // Picks a photo, then resizes it down to a small square before storing —
  // storing a full-resolution photo as base64 in AsyncStorage would be
  // multiple MB per photo; 300x300 keeps it well under 200KB.
  const pickAndProcessPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      const renderedImage = await context.resize({ width: 300, height: 300 }).renderAsync();
      const saved = await renderedImage.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      context.release?.();
      renderedImage.release?.();

      await persistPhoto(`data:image/jpeg;base64,${saved.base64}`);
    } catch (e) {
      console.error('Photo pick/process failed', e);
      Alert.alert('Something went wrong', "Couldn't set your profile photo. Please try again.");
    }
  };

  const handlePhotoRowPress = () => {
    if (photoUri) {
      setActiveSheet('photoActions');
    } else {
      pickAndProcessPhoto();
    }
  };

  const handlePhotoAction = (action) => {
    if (action === 'choose') pickAndProcessPhoto();
    if (action === 'remove') persistPhoto('');
  };

  const persistTarget = async (val) => {
    setLifeListTarget(val);
    await AsyncStorage.setItem(TARGET_KEY, String(val));
  };
  const persistDistanceUnit = async (val) => {
    setDistanceUnit(val);
    await AsyncStorage.setItem(DISTANCE_UNIT_KEY, val);
  };
  const toggleNotifications = async (val) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(val));
  };
  const toggleNearbyBirds = async (val) => {
    setShowNearbyBirds(val);
    await AsyncStorage.setItem(NEARBY_BIRDS_KEY, String(val));
  };

  const speciesCount = lifeList.length;
  const progress = Math.min(speciesCount / lifeListTarget, 1);

  const now = new Date();
  const thisMonthCount = lifeList.filter(b => {
    const d = new Date(b.date_seen);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const oldestEntry = lifeList.length > 0 ? lifeList[lifeList.length - 1] : null;
  const memberSinceLabel = oldestEntry ? formatMonthDay(oldestEntry.date_seen) : '—';

  const recent = lifeList.slice(0, RECENT_COUNT);

  const goToLifeList = () => navigation.navigate('HomeTab', { screen: 'LifeList' });

  const handleExport = async () => {
    if (lifeList.length === 0) {
      Alert.alert('Nothing to export yet', 'Identify a bird first to start your life list.');
      return;
    }
    const payload = JSON.stringify(lifeList, null, 2);
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sauti-ya-ndege-life-list.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'My Sauti ya Ndege Life List',
          message: payload,
        });
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const showAbout = () => {
    Alert.alert(
      'Sauti ya Ndege',
      `Version ${APP_VERSION}\n\nA bird identification and life-listing app built for Kenyan birders — identify by sound or photo, and track every species you discover.`
    );
  };

  const SETTINGS_GROUPS = [
    {
      title: 'Account',
      rows: [
        { key: 'editProfile', icon: 'person-outline', title: 'Edit Profile', description: displayName ? `Editing as ${displayName}` : 'Update your birding profile', type: 'chevron', onPress: () => setActiveSheet('editProfile') },
        { key: 'profilePhoto', icon: 'image-outline', title: 'Profile Photo', description: photoUri ? 'Tap to change or remove' : 'Choose a profile picture', type: 'chevron', onPress: handlePhotoRowPress },
        { key: 'birderBio', icon: 'create-outline', title: 'Birder Bio', description: bio || 'A short line about your birding style', type: 'chevron', onPress: () => setActiveSheet('editBio') },
      ],
    },
    {
      title: 'Birding Preferences',
      rows: [
        { key: 'defaultLocation', icon: 'compass-outline', title: 'Default Location', description: 'Used for nearby species suggestions', type: 'disabled' },
        { key: 'distanceUnits', icon: 'resize-outline', title: 'Distance Units', description: distanceUnit === 'km' ? 'Kilometers' : 'Miles', type: 'chevron', onPress: () => setActiveSheet('distance') },
        { key: 'nearbyBirds', icon: 'radio-outline', title: 'Show Nearby Birds', description: 'Surface sightings reported near you', type: 'toggle', value: showNearbyBirds, onToggle: toggleNearbyBirds },
        { key: 'lifeListPrefs', icon: 'list-outline', title: 'Life List Preferences', description: `Goal: ${lifeListTarget} species`, type: 'chevron', onPress: () => setActiveSheet('target') },
      ],
    },
    {
      title: 'App Preferences',
      rows: [
        { key: 'notifications', icon: 'notifications-outline', title: 'Notifications', description: 'Get notified about new features', type: 'toggle', value: notificationsEnabled, onToggle: toggleNotifications },
        { key: 'darkMode', icon: 'moon-outline', title: 'Dark Mode', description: 'Dark theme is the only option for now', type: 'value', rightText: 'On' },
        { key: 'language', icon: 'language-outline', title: 'Language', description: 'English', type: 'disabled' },
      ],
    },
    {
      title: 'Identification',
      rows: [
        { key: 'soundId', icon: 'mic-outline', title: 'Sound Identification', description: 'Identify birds from audio recordings', type: 'disabled' },
        { key: 'photoId', icon: 'camera-outline', title: 'Photo Identification', description: 'Identify birds from photos', type: 'disabled' },
        { key: 'locationSighting', icon: 'pin-outline', title: 'Location & Sighting Settings', description: "Control what's captured with each sighting", type: 'disabled' },
      ],
    },
    {
      title: 'Data & Privacy',
      rows: [
        { key: 'mySightings', icon: 'albums-outline', title: 'My Sightings', description: `${speciesCount} logged`, type: 'chevron', onPress: goToLifeList },
        { key: 'exportData', icon: 'download-outline', title: 'Export Data', description: 'Download your life list as JSON', type: 'chevron', onPress: handleExport },
        { key: 'privacy', icon: 'shield-checkmark-outline', title: 'Privacy', description: 'How your data is handled', type: 'disabled' },
      ],
    },
    {
      title: 'About',
      rows: [
        { key: 'help', icon: 'help-circle-outline', title: 'Help & Support', description: 'Get help using the app', type: 'disabled' },
        { key: 'about', icon: 'information-circle-outline', title: 'About Sauti ya Ndege', description: 'Learn more about the project', type: 'chevron', onPress: showAbout },
        { key: 'version', icon: 'apps-outline', title: 'App Version', description: 'Current release', type: 'value', rightText: APP_VERSION },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageInner}>

          {/* Identity block — local display name + photo only, no account system yet */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePhotoRowPress} activeOpacity={0.8} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : displayName ? (
                  <Text style={styles.avatarInitial}>{displayName.trim().charAt(0).toUpperCase()}</Text>
                ) : (
                  <Ionicons name="person" size={36} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={11} color={theme.colors.background} />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{displayName || 'Bird Explorer'}</Text>
            <Text style={styles.headerSubtitle}>{displayName ? 'Bird Explorer' : 'Tracking sightings on this device'}</Text>
            {!!bio && <Text style={styles.headerBio}>{bio}</Text>}
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
              <Text style={styles.heroCaptionStrong}>{speciesCount} of {lifeListTarget}</Text> species on your goal
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

          {loaded && speciesCount === 0 && (
            <View style={styles.emptyNudge}>
              <Text style={styles.emptyNudgeText}>
                Identify your first bird to start building your life list.
              </Text>
            </View>
          )}

          {/* Settings — grouped, eBird-style */}
          <View style={styles.settingsHeading}>
            <Text style={styles.settingsHeadingText}>Settings</Text>
          </View>

          {SETTINGS_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.groupCard}>
                {group.rows.map((row, index) => (
                  <SettingsRow
                    key={row.key}
                    {...row}
                    isLast={index === group.rows.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}

        </View>
      </ScrollView>

      <OptionsSheet
        visible={activeSheet === 'target'}
        title="Life List goal"
        options={TARGET_OPTIONS}
        selectedValue={lifeListTarget}
        onSelect={persistTarget}
        onClose={() => setActiveSheet(null)}
      />
      <OptionsSheet
        visible={activeSheet === 'distance'}
        title="Distance units"
        options={DISTANCE_OPTIONS}
        selectedValue={distanceUnit}
        onSelect={persistDistanceUnit}
        onClose={() => setActiveSheet(null)}
      />
      <OptionsSheet
        visible={activeSheet === 'photoActions'}
        title="Profile photo"
        options={[
          { label: 'Choose new photo', value: 'choose' },
          { label: 'Remove photo', value: 'remove' },
        ]}
        selectedValue={null}
        onSelect={handlePhotoAction}
        onClose={() => setActiveSheet(null)}
      />
      <EditProfileSheet
        visible={activeSheet === 'editProfile'}
        title="Edit Profile"
        label="Birding name"
        placeholder="e.g. Benedict"
        hint="This is how you'll appear in the app — stored on this device only."
        maxLength={30}
        currentValue={displayName}
        onSave={persistDisplayName}
        onClose={() => setActiveSheet(null)}
      />
      <EditProfileSheet
        visible={activeSheet === 'editBio'}
        title="Birder Bio"
        label="Bio"
        placeholder="e.g. Weekend birder, Nairobi"
        hint="Shown under your name on your profile."
        maxLength={60}
        multiline
        currentValue={bio}
        onSave={persistBio}
        onClose={() => setActiveSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: theme.spacing.xxl, alignItems: 'center' },
  // Centers and caps width on wide viewports (desktop / web preview) while
  // staying full-width on phones.
  pageInner: { width: '100%', maxWidth: 560, padding: theme.spacing.md },

  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  avatarWrap: { width: 72, height: 72, marginBottom: theme.spacing.sm, position: 'relative' },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.primaryDim,
    borderWidth: 1, borderColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.colors.background,
  },
  avatarInitial: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textDim, marginTop: 2 },
  headerBio: { fontSize: 12.5, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },

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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
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

  settingsHeading: { marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  settingsHeadingText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },

  group: { marginBottom: theme.spacing.lg },
  groupTitle: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textDim,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: theme.spacing.xs, marginLeft: 4,
  },
  groupCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
});