import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { addToLifeList } from './LifeListScreen';

const API_URL = 'https://ndege-id-production.up.railway.app';

export default function BrowseScreen({ navigation }) {
  const [birds, setBirds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/birds`)
      .then(res => res.json())
      .then(data => { setBirds(data.birds); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAddToLifeList = async (bird) => {
    const wasAdded = await addToLifeList(bird);
    if (wasAdded) {
      setAdded(prev => ({ ...prev, [bird.id]: true }));
      Alert.alert('Added!', `${bird.common_name} added to your Life List 🎉`);
    } else {
      Alert.alert('Already Added', `${bird.common_name} is already in your Life List`);
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2E7D32" />
    </View>
  );

  return (
    <FlatList
      data={birds}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const primaryImage = item.images?.find(img => img.is_primary);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BirdDetail', { bird: item })}
          >
            {primaryImage ? (
              <Image source={{ uri: primaryImage.image_url }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>🦅</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.commonName}>{item.common_name}</Text>
              <Text style={styles.scientificName}>{item.scientific_name}</Text>
              <Text style={styles.family}>{item.family}</Text>
              <TouchableOpacity
                style={[styles.addButton, added[item.id] && styles.addedButton]}
                onPress={() => handleAddToLifeList(item)}
              >
                <Text style={styles.addButtonText}>
                  {added[item.id] ? '✓ Added' : '+ Life List'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', elevation: 2,
  },
  image: { width: 100, height: 100 },
  imagePlaceholder: {
    width: 100, height: 100, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { fontSize: 40 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  commonName: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: '#558B2F', marginTop: 2 },
  family: { fontSize: 12, color: '#888', marginTop: 4 },
  addButton: {
    backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1, borderColor: '#2E7D32',
  },
  addedButton: { backgroundColor: '#2E7D32' },
  addButtonText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
});