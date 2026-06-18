import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function BirdDetailScreen({ route }) {
  const { bird } = route.params;
  const primaryImage = bird?.images?.find(img => img.is_primary);
  const otherImages = bird?.images?.filter(img => !img.is_primary) || [];

  return (
    <ScrollView style={styles.container}>
      {primaryImage && (
        <Image source={{ uri: primaryImage.image_url }} style={styles.heroImage} />
      )}
      <View style={styles.content}>
        <Text style={styles.commonName}>{bird.common_name}</Text>
        <Text style={styles.scientificName}>{bird.scientific_name}</Text>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{bird.family}</Text>
          </View>
          <View style={[styles.badge, styles.statusBadge]}>
            <Text style={styles.badgeText}>{bird.conservation_status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{bird.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habitat</Text>
          <Text style={styles.description}>{bird.habitat}</Text>
        </View>

        {otherImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {otherImages.map((img, index) => (
                <Image key={index} source={{ uri: img.image_url }} style={styles.thumbnail} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9' },
  heroImage: { width: '100%', height: 280 },
  content: { padding: 20 },
  commonName: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  scientificName: { fontSize: 16, fontStyle: 'italic', color: '#558B2F', marginTop: 4 },
  badges: { flexDirection: 'row', marginTop: 12, gap: 8 },
  badge: {
    backgroundColor: '#2E7D32', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  statusBadge: { backgroundColor: '#558B2F' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1B5E20', marginBottom: 8 },
  description: { fontSize: 15, color: '#444', lineHeight: 22 },
  thumbnail: { width: 120, height: 120, borderRadius: 8, marginRight: 8 },
});