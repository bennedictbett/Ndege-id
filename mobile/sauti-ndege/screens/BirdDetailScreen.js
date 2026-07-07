import { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';

export default function BirdDetailScreen({ route, navigation }) {
  const { bird } = route.params;
  const primaryImage = bird?.images?.find(img => img.is_primary);
  const otherImages = bird?.images?.filter(img => !img.is_primary) || [];
  const [added, setAdded] = useState(false);

  const handleAddToLifeList = async () => {
    const wasAdded = await addToLifeList(bird);
    setAdded(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        {primaryImage && (
          <img
            src={primaryImage.image_url}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', position: 'absolute'
            }}
            alt={bird.common_name}
          />
        )}
        <View style={[styles.heroOverlay, {
          background: 'linear-gradient(to bottom, rgba(7,10,7,0.3) 0%, rgba(7,10,7,0.95) 100%)'
        }]} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Life List button */}
        <TouchableOpacity
          style={[styles.lifeListButton, added && styles.lifeListButtonAdded]}
          onPress={handleAddToLifeList}
        >
          <Text style={styles.lifeListButtonText}>
            {added ? '✓ In Life List' : '+ Life List'}
          </Text>
        </TouchableOpacity>

        {/* Name overlay */}
        <View style={styles.heroContent}>
          <Text style={styles.commonName}>{bird.common_name}</Text>
          <Text style={styles.scientificName}>{bird.scientific_name}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🌿</Text>
            <Text style={styles.statLabel}>Family</Text>
            <Text style={styles.statValue}>{bird.family}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🌍</Text>
            <Text style={styles.statLabel}>Habitat</Text>
            <Text style={styles.statValue}>{bird.habitat}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🛡️</Text>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {bird.conservation_status}
            </Text>
          </View>
        </View>

        {/* About */}
        {bird.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{bird.description}</Text>
          </View>
        )}

        {/* Habitat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habitat</Text>
          <View style={styles.habitatCard}>
            <Text style={styles.habitatIcon}>🌳</Text>
            <Text style={styles.habitatText}>{bird.habitat}</Text>
          </View>
        </View>

        {/* More Photos */}
        {otherImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[primaryImage, ...otherImages].filter(Boolean).map((img, index) => (
                <View key={index} style={styles.galleryImage}>
                  <img
                    src={img.image_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt=""
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Identify Button */}
        <TouchableOpacity
          style={styles.identifyButton}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.identifyButtonText}>🎙️ Identify This Bird</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  heroContainer: {
    height: 400,
    position: 'relative',
    backgroundColor: theme.colors.card,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '50%',
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50, left: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backIcon: { color: '#fff', fontSize: 20 },
  lifeListButton: {
    position: 'absolute',
    top: 50, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    zIndex: 2,
  },
  lifeListButtonAdded: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  lifeListButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20, left: 16, right: 16,
    zIndex: 2,
  },
  commonName: {
    fontSize: 34, fontWeight: 'bold',
    color: theme.colors.text,
  },
  scientificName: {
    fontSize: 16, fontStyle: 'italic',
    color: theme.colors.primary,
    marginTop: 4,
  },
  content: { padding: theme.spacing.md },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
    marginHorizontal: 8,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statLabel: { fontSize: 11, color: theme.colors.textDim, marginBottom: 4 },
  statValue: {
    fontSize: 12, color: theme.colors.text,
    fontWeight: '500', textAlign: 'center',
  },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 18, fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 15, color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  habitatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  habitatIcon: { fontSize: 24, marginRight: theme.spacing.md },
  habitatText: {
    flex: 1, fontSize: 15,
    color: theme.colors.textSecondary,
  },
  galleryImage: {
    width: 140, height: 140,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  identifyButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  identifyButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});