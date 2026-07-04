import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';

export default function ResultScreen({ route, navigation }) {
  const { result } = route.params;
  const { prediction, bird } = result;
  const primaryImage = bird?.images?.find(img => img.is_primary);
  const otherImages = bird?.images?.filter(img => !img.is_primary) || [];
  const [addedToList, setAddedToList] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true
    }).start();
    if (bird) {
      addToLifeList(bird).then(added => {
        if (added) setAddedToList(true);
      });
    }
  }, []);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return '#00C853';
    if (confidence >= 60) return '#FFD600';
    return '#FF6D00';
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
            alt={bird?.common_name}
          />
        )}
        <View style={styles.heroOverlay} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Confidence badge */}
        <View style={[styles.confidenceBadge, {
          backgroundColor: getConfidenceColor(prediction.confidence)
        }]}>
          <Text style={styles.confidenceLabel}>AI Confidence</Text>
          <Text style={styles.confidenceValue}>{prediction.confidence}%</Text>
        </View>

        {/* Bird name overlay */}
        <View style={styles.heroContent}>
          <Text style={styles.commonName}>{prediction.predicted_species}</Text>
          <Text style={styles.scientificName}>
            {prediction.scientific_name.replace(/_/g, ' ')}
          </Text>
          {addedToList && (
            <View style={styles.liferBadge}>
              <Text style={styles.liferText}>🎉 Added to Life List!</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Bird Info Card */}
        {bird && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Family</Text>
                <Text style={styles.infoValue}>{bird.family}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Habitat</Text>
                <Text style={styles.infoValue}>{bird.habitat}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: '#00C853' }]}>
                  {bird.conservation_status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        {bird?.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{bird.description}</Text>
          </View>
        )}

        {/* Top 3 Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Predictions</Text>
          {prediction.top3.map((item, index) => (
            <View key={index} style={styles.predictionRow}>
              <View style={styles.predictionRank}>
                <Text style={styles.predictionRankText}>{index + 1}</Text>
              </View>
              <View style={styles.predictionInfo}>
                <Text style={styles.predictionName}>{item.common_name}</Text>
                <Text style={styles.predictionScientific}>
                  {item.scientific_name.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.predictionBar}>
                <View style={[styles.predictionBarFill, {
                  width: `${item.confidence}%`,
                  backgroundColor: getConfidenceColor(item.confidence)
                }]} />
              </View>
              <Text style={[styles.predictionConfidence, {
                color: getConfidenceColor(item.confidence)
              }]}>
                {item.confidence}%
              </Text>
            </View>
          ))}
        </View>

        {/* More Photos */}
        {otherImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {otherImages.map((img, index) => (
                <View key={index} style={styles.thumbnail}>
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

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('BirdDetail', { bird })}
          >
            <Text style={styles.primaryButtonText}>View Full Profile →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Identify Another Bird</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  heroContainer: {
    height: 380,
    position: 'relative',
    backgroundColor: theme.colors.card,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
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
  confidenceBadge: {
    position: 'absolute',
    top: 50, right: 16,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 2,
  },
  confidenceLabel: { color: '#000', fontSize: 10, fontWeight: '600' },
  confidenceValue: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  heroContent: {
    position: 'absolute',
    bottom: 20, left: 16, right: 16,
    zIndex: 2,
  },
  commonName: {
    fontSize: 32, fontWeight: 'bold',
    color: theme.colors.text,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scientificName: {
    fontSize: 16, fontStyle: 'italic',
    color: theme.colors.primary,
    marginTop: 4,
  },
  liferBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  liferText: { color: '#000', fontSize: 12, fontWeight: '600' },
  content: { padding: theme.spacing.md },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoItem: { flex: 1, alignItems: 'center' },
  infoDivider: {
    width: 1, backgroundColor: theme.colors.cardBorder,
    alignSelf: 'stretch', marginHorizontal: 8,
  },
  infoLabel: { fontSize: 11, color: theme.colors.textDim, marginBottom: 4 },
  infoValue: { fontSize: 13, color: theme.colors.text, fontWeight: '500', textAlign: 'center' },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 18, fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 15, color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  predictionRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  predictionRankText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  predictionInfo: { flex: 1, marginRight: theme.spacing.sm },
  predictionName: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  predictionScientific: { fontSize: 11, color: theme.colors.textDim, fontStyle: 'italic' },
  predictionBar: {
    width: 60, height: 4,
    backgroundColor: theme.colors.cardBorder,
    borderRadius: 2, marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  predictionBarFill: { height: '100%', borderRadius: 2 },
  predictionConfidence: { fontSize: 13, fontWeight: '600', width: 40, textAlign: 'right' },
  thumbnail: {
    width: 100, height: 100,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  actions: { gap: theme.spacing.sm },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  secondaryButtonText: { color: theme.colors.text, fontSize: 16, fontWeight: '500' },
});