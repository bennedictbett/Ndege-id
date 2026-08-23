import { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Modal, Pressable, useWindowDimensions
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';

// Above this content width, show the classic field-guide "plate" layout:
// image on one side, species account on the other. Below it, stack them --
// this mirrors how eField Guide-style apps adapt from tablet/web to phone.
const SPLIT_BREAKPOINT = 640;

export default function BirdDetailScreen({ route, navigation }) {
  const { bird } = route.params;
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;

  const primaryImage = bird?.images?.find(img => img.is_primary)
    || (bird?.image_url ? { image_url: bird.image_url } : null);
  const otherImages = bird?.images?.filter(img => !img.is_primary) || [];
  const [added, setAdded] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const handleAddToLifeList = async () => {
    await addToLifeList(bird);
    setAdded(true);
  };

  const Plate = (
    <View style={[styles.plate, isSplit && styles.plateSplit]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.plateImageFrame}
        onPress={() => primaryImage && setZoomImage(primaryImage.image_url)}
      >
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt={bird.common_name}
          />
        ) : (
          <View style={styles.plateImagePlaceholder}>
            <Text style={styles.plateImagePlaceholderIcon}>🦅</Text>
          </View>
        )}
        {primaryImage && (
          <View style={styles.expandHint}>
            <Text style={styles.expandHintText}>⤢ Tap to expand</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Gallery thumbnails sit under the plate image, matching a field
          guide's small supplementary photos beside the main plate */}
      {otherImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plateGallery}>
          {otherImages.map((img, index) => (
            <TouchableOpacity
              key={index}
              style={styles.plateGalleryThumb}
              activeOpacity={0.85}
              onPress={() => setZoomImage(img.image_url)}
            >
              <img
                src={img.image_url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const Account = (
    <View style={[styles.account, isSplit && styles.accountSplit]}>
      {/* Header block: name, scientific name, family -- the species
          account's title block, as in a printed field guide entry */}
      <View style={styles.accountHeader}>
        <Text style={styles.commonName}>{bird.common_name}</Text>
        <Text style={styles.scientificName}>{bird.scientific_name}</Text>
        <View style={styles.familyRow}>
          <View style={styles.familyPill}>
            <Text style={styles.familyPillText}>{bird.family}</Text>
          </View>
        </View>
      </View>

      {/* Identification stats -- the quick-reference fields a birder
          scans first, laid out like a field guide's ID panel */}
      <View style={styles.statsGrid}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>HABITAT</Text>
          <Text style={styles.statValue}>{bird.habitat}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>CONSERVATION STATUS</Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {bird.conservation_status}
          </Text>
        </View>
      </View>

      {bird.description && (
        <View style={styles.accountSection}>
          <Text style={styles.accountSectionTitle}>Field Notes</Text>
          <Text style={styles.accountText}>{bird.description}</Text>
        </View>
      )}

      <View style={styles.accountActions}>
        <TouchableOpacity
          style={[styles.lifeListButton, added && styles.lifeListButtonAdded]}
          onPress={handleAddToLifeList}
        >
          <Text style={[styles.lifeListButtonText, added && styles.lifeListButtonTextAdded]}>
            {added ? '✓ In Life List' : '+ Add to Life List'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.identifyButton}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.identifyButtonText}>🎙️ Identify This Bird</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back button floats above everything, plate or account */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isSplit && styles.scrollSplit}
      >
        <View style={isSplit ? styles.splitRow : undefined}>
          {Plate}
          {Account}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-screen zoom modal, field-guide plate view */}
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
          <TouchableOpacity
            style={styles.zoomCloseButton}
            onPress={() => setZoomImage(null)}
          >
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
    position: 'absolute',
    top: 50, left: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backIcon: { color: '#fff', fontSize: 20 },

  scrollSplit: { paddingTop: 90 },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },

  // --- Plate (image) ---
  plate: {
    paddingTop: 90,
  },
  plateSplit: {
    flex: 1,
    paddingTop: 0,
    paddingRight: theme.spacing.md,
  },
  plateImageFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateImagePlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateImagePlaceholderIcon: { fontSize: 56 },
  expandHint: {
    position: 'absolute',
    bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expandHintText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  plateGallery: { marginTop: theme.spacing.sm },
  plateGalleryThumb: {
    width: 64, height: 64,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },

  // --- Species account (text) ---
  account: {
    padding: theme.spacing.md,
  },
  accountSplit: {
    flex: 1,
    paddingTop: 0,
  },
  accountHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  commonName: {
    fontSize: 28, fontWeight: 'bold',
    color: theme.colors.text,
  },
  scientificName: {
    fontSize: 16, fontStyle: 'italic',
    color: theme.colors.primaryLight,
    marginTop: 4,
  },
  familyRow: { flexDirection: 'row', marginTop: theme.spacing.sm },
  familyPill: {
    backgroundColor: theme.colors.primaryDim,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  familyPillText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statBlock: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: theme.colors.textDim,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  accountSection: { marginBottom: theme.spacing.lg },
  accountSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: theme.colors.primaryLight,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  accountText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  accountActions: { marginTop: theme.spacing.sm },
  lifeListButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  lifeListButtonAdded: {
    backgroundColor: theme.colors.primary,
  },
  lifeListButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  lifeListButtonTextAdded: {
    color: theme.colors.text,
  },
  identifyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  identifyButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  // --- Zoom modal ---
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50, right: 20,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});