import { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Modal, Pressable, useWindowDimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';
import { Ionicons } from '@expo/vector-icons';

const LIFE_LIST_KEY = 'ndege_life_list';

function SectionDivider() {
  return <View style={styles.divider} />;
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeaderRow}>
      {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export default function BirdDetailScreen({ route, navigation }) {
  const { bird } = route.params;
  const { width } = useWindowDimensions();

  const images = bird?.images?.length
    ? bird.images
    : (bird?.image_url ? [{ image_url: bird.image_url }] : []);

  const [added, setAdded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sightingEntry, setSightingEntry] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(LIFE_LIST_KEY).then(data => {
      if (!data) return;
      const list = JSON.parse(data);
      const entry = list.find(b => b.id === bird.id);
      if (entry) {
        setAdded(true);
        setSightingEntry(entry);
      }
    });
  }, [bird.id]);

  const handleAddToLifeList = async () => {
    const wasAdded = await addToLifeList(bird);
    if (wasAdded) {
      setAdded(true);
      setSightingEntry({ ...bird, date_seen: new Date().toISOString() });
    }
  };

  const genus = bird.scientific_name?.split(' ')[0] || '';

  const habitatTags = bird.habitat
    ? bird.habitat.split(/,| and /i).map(h => h.trim()).filter(Boolean)
    : [];

  const formattedSightingDate = sightingEntry
    ? new Date(sightingEntry.date_seen).toLocaleDateString('en-KE', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.lifeListButton, added && styles.lifeListButtonAdded]}
        onPress={handleAddToLifeList}
        disabled={added}
      >
        <Text style={styles.lifeListButtonText}>
          {added ? '✓ In Life List' : '+ Life List'}
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- Photo slider --- */}
        <View style={styles.sliderContainer}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveSlide(slide);
              }}
              scrollEventThrottle={16}
            >
              {images.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ width, height: 340 }}
                  activeOpacity={0.9}
                  onPress={() => setZoomImage(img.image_url)}
                >
                  <img
                    src={img.image_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt={bird.common_name}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.sliderContainer, styles.sliderPlaceholder]}>
              <Text style={{ fontSize: 56 }}>🦅</Text>
            </View>
          )}

          <View style={[styles.sliderOverlay, {
            background: 'linear-gradient(to bottom, rgba(7,10,7,0) 40%, rgba(7,10,7,0.9) 100%)'
          }]} />

          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
          )}

          <View style={styles.sliderNameBlock}>
            <Text style={styles.commonName}>{bird.common_name}</Text>
            <Text style={styles.scientificName}>{bird.scientific_name}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🇰🇪 East Africa</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* --- Voice (right under the photo, since sound is the app's core feature) --- */}
          <SectionHeader icon="🔊" title="VOICE" />
          {bird.audio_url ? (
            <TouchableOpacity style={styles.voiceCard} activeOpacity={0.8}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={20} color={theme.colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceLabel}>Song</Text>
                <View style={styles.waveformBar} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.voicePlaceholder}>
              <Ionicons name="mic-off-outline" size={20} color={theme.colors.textDim} />
              <Text style={styles.voicePlaceholderText}>
                No recording yet for this species
              </Text>
            </View>
          )}
          <SectionDivider />

          {/* --- Know the Bird --- */}
          {bird.description && (
            <>
              <SectionHeader title="KNOW THE BIRD" />
              <Text style={styles.subheading}>Identification</Text>
              <Text style={styles.bodyText}>{bird.description}</Text>
              <SectionDivider />
            </>
          )}

          {/* --- Habitat --- */}
          {bird.habitat && (
            <>
              <SectionHeader icon="🌿" title="HABITAT" />
              <View style={styles.tagsRow}>
                {habitatTags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <SectionDivider />
            </>
          )}

          {/* --- Classification --- */}
          <SectionHeader icon="🧬" title="CLASSIFICATION" />
          <View style={styles.classificationTable}>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>Family</Text>
              <Text style={styles.classValue}>{bird.family}</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>Genus</Text>
              <Text style={styles.classValue}>{genus}</Text>
            </View>
            <View style={styles.classRow}>
              <Text style={styles.classLabel}>Scientific name</Text>
              <Text style={[styles.classValue, { fontStyle: 'italic' }]}>
                {bird.scientific_name}
              </Text>
            </View>
          </View>
          <SectionDivider />

          {/* --- Conservation --- */}
          <SectionHeader icon="🛡️" title="CONSERVATION" />
          <View style={styles.conservationCard}>
            <View style={styles.statusDot} />
            <Text style={styles.conservationText}>{bird.conservation_status}</Text>
          </View>
          <SectionDivider />

          {/* --- Your Sighting (only if logged) --- */}
          {sightingEntry && (
            <>
              <SectionHeader icon="👀" title="YOUR SIGHTING" />
              <View style={styles.sightingCard}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primaryLight} />
                <Text style={styles.sightingText}>
                  First logged: {formattedSightingDate}
                </Text>
              </View>
              <SectionDivider />
            </>
          )}

          {/* --- Identify button --- */}
          <TouchableOpacity
            style={styles.identifyButton}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.identifyButtonText}>🎙️ Identify Another Bird</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      <Modal
        visible={!!zoomImage}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomImage(null)}>
          {zoomImage && (
            <img
              src={zoomImage}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt={bird.common_name}
            />
          )}
          <TouchableOpacity style={styles.zoomCloseButton} onPress={() => setZoomImage(null)}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  backButton: {
    position: 'absolute', top: 50, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  backIcon: { color: '#fff', fontSize: 20 },
  lifeListButton: {
    position: 'absolute', top: 50, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.colors.primary,
  },
  lifeListButtonAdded: {
    backgroundColor: theme.colors.primary,
  },
  lifeListButtonText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },

  sliderContainer: { height: 340, position: 'relative', backgroundColor: theme.colors.card },
  sliderPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  sliderOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
  },
  dotsRow: {
    position: 'absolute', top: 16, alignSelf: 'center',
    flexDirection: 'row', gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: theme.colors.primary, width: 18 },
  sliderNameBlock: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  commonName: { fontSize: 30, fontWeight: 'bold', color: theme.colors.text },
  scientificName: {
    fontSize: 15, fontStyle: 'italic',
    color: theme.colors.primaryLight, marginTop: 4,
  },
  badgeRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: theme.colors.text },

  content: { padding: theme.spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionIcon: { fontSize: 16, marginRight: 8 },
  sectionHeaderText: {
    fontSize: 13, fontWeight: '700', letterSpacing: 1,
    color: theme.colors.primaryLight,
  },
  subheading: {
    fontSize: 15, fontWeight: '600',
    color: theme.colors.text, marginBottom: 6,
  },
  bodyText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 23 },
  divider: {
    height: 1, backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.lg,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText: { fontSize: 13, color: theme.colors.text },

  voiceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
  },
  playButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  voiceLabel: { fontSize: 13, color: theme.colors.textDim, marginBottom: 6 },
  waveformBar: {
    height: 3, backgroundColor: theme.colors.cardBorder,
    borderRadius: 2,
  },
  voicePlaceholder: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
  },
  voicePlaceholderText: {
    marginLeft: 10, fontSize: 13, color: theme.colors.textDim, fontStyle: 'italic',
  },

  classificationTable: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, overflow: 'hidden',
  },
  classRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  classLabel: { fontSize: 13, color: theme.colors.textDim },
  classValue: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },

  conservationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: theme.colors.primary, marginRight: 10,
  },
  conservationText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },

  sightingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.primaryDim,
    borderWidth: 1, borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
  },
  sightingText: { marginLeft: 8, fontSize: 14, color: theme.colors.text },

  identifyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
    alignItems: 'center', marginTop: theme.spacing.sm,
  },
  identifyButtonText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },

  zoomBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomCloseButton: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
});