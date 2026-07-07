import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://ndege-id-production.up.railway.app';

export default function BrowseScreen({ navigation }) {
  const [birds, setBirds] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/birds`)
      .then(res => res.json())
      .then(data => {
        setBirds(data.birds);
        setFiltered(data.birds);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(birds.filter(b =>
      b.common_name.toLowerCase().includes(q) ||
      b.scientific_name.toLowerCase().includes(q) ||
      b.family?.toLowerCase().includes(q)
    ));
  };

  const handleAdd = async (bird) => {
    const wasAdded = await addToLifeList(bird);
    if (wasAdded) {
      setAdded(prev => ({ ...prev, [bird.id]: true }));
    } else {
      setAdded(prev => ({ ...prev, [bird.id]: true }));
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading birds...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
    <View style={styles.searchContainer}>
      <Ionicons
        name="search"
        size={18}
        color={theme.colors.textDim}
        style={{ marginRight: theme.spacing.sm }}
      />
      <TextInput
        style={[styles.searchInput, { outline: 'none' }]}
        placeholder="Search species..."
        placeholderTextColor={theme.colors.textDim}
        value={search}
        onChangeText={handleSearch}
      />
      {search.length > 0 && (
        <TouchableOpacity onPress={() => handleSearch('')}>
          <Ionicons name="close" size={18} color={theme.colors.textDim} />
        </TouchableOpacity>
      )}
    </View>

      <Text style={styles.countText}>{filtered.length} species</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const primaryImage = item.images?.find(img => img.is_primary);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('BirdDetail', { bird: item })}
              activeOpacity={0.8}
            >
              {/* Image */}
              <View style={styles.imageContainer}>
                {primaryImage ? (
                  <img
                    src={primaryImage.image_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt={item.common_name}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderIcon}>🦅</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.info}>
                <Text style={styles.commonName}>{item.common_name}</Text>
                <Text style={styles.scientificName}>{item.scientific_name}</Text>
                <View style={styles.tags}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.family}</Text>
                  </View>
                </View>
              </View>

              {/* Add button */}
              <TouchableOpacity
                style={[styles.addButton, added[item.id] && styles.addedButton]}
                onPress={() => handleAdd(item)}
              >
                <Text style={styles.addButtonText}>
                  {added[item.id] ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: { color: theme.colors.textSecondary, marginTop: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  searchIcon: { fontSize: 16, marginRight: theme.spacing.sm },
  searchInput: {
  flex: 1,
  color: theme.colors.text,
  fontSize: 15,
  },
  clearIcon: { color: theme.colors.textDim, fontSize: 16, padding: 4 },
  countText: {
    color: theme.colors.textDim,
    fontSize: 13,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  imageContainer: {
    width: 90, height: 90,
    backgroundColor: theme.colors.surface,
  },
  imagePlaceholder: {
    width: 90, height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  placeholderIcon: { fontSize: 36 },
  info: { flex: 1, padding: theme.spacing.md },
  commonName: {
    fontSize: 15, fontWeight: '600',
    color: theme.colors.text,
  },
  scientificName: {
    fontSize: 12, fontStyle: 'italic',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tags: { flexDirection: 'row', marginTop: 6 },
  tag: {
    backgroundColor: '#0A2A0A',
    borderRadius: theme.radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tagText: { color: theme.colors.primary, fontSize: 10, fontWeight: '500' },
  addButton: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  addedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  addButtonText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '300',
  },
});