import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { result } = route.params;
  const { prediction, bird } = result;
  const primaryImage = bird?.images?.find(img => img.is_primary);

  return (
    <ScrollView style={styles.container}>
      {primaryImage && (
        <Image source={{ uri: primaryImage.image_url }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={styles.commonName}>{prediction.predicted_species}</Text>
        <Text style={styles.scientificName}>{prediction.scientific_name.replace('_', ' ')}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {prediction.confidence}% confident
          </Text>
        </View>
        {bird && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Habitat</Text>
            <Text style={styles.infoValue}>{bird.habitat}</Text>
            <Text style={styles.infoLabel}>Family</Text>
            <Text style={styles.infoValue}>{bird.family}</Text>
            <Text style={styles.infoLabel}>Conservation</Text>
            <Text style={styles.infoValue}>{bird.conservation_status}</Text>
          </View>
        )}
        <View style={styles.top3}>
          <Text style={styles.top3Title}>Top 3 Predictions</Text>
          {prediction.top3.map((item, index) => (
            <View key={index} style={styles.top3Item}>
              <Text style={styles.top3Name}>{item.common_name}</Text>
              <Text style={styles.top3Confidence}>{item.confidence}%</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => navigation.navigate('BirdDetail', { bird })}
        >
          <Text style={styles.detailButtonText}>View Full Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9' },
  image: { width: '100%', height: 250 },
  content: { padding: 20 },
  commonName: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  scientificName: { fontSize: 16, fontStyle: 'italic', color: '#558B2F', marginTop: 4 },
  confidenceBadge: {
    backgroundColor: '#2E7D32', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 12,
  },
  confidenceText: { color: '#fff', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginTop: 20,
  },
  infoLabel: { fontSize: 12, color: '#888', marginTop: 8 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  top3: { marginTop: 20 },
  top3Title: { fontSize: 16, fontWeight: '600', color: '#1B5E20', marginBottom: 8 },
  top3Item: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  top3Name: { fontSize: 14, color: '#333' },
  top3Confidence: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  detailButton: {
    backgroundColor: '#2E7D32', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  detailButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});