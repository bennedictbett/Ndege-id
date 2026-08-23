import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://ndege-id.onrender.com';

export default function BrowseScreen({ navigation }) {
  const [birds, setBirds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState({});
  const sectionListRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/birds`)
      .then(res => res.json())
      .then(data => {
        setBirds(data.birds || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async (bird) => {
    await addToLifeList(bird);
    setAdded(prev => ({ ...prev, [bird.id]: true }));
  };

  // Field-guide style grouping: filter first, then group alphabetically by
  // family, with families themselves sorted alphabetically -- this mirrors
  // how print field guides like eGuide to the Birds of East Africa organize
  // by taxonomic family rather than a flat species list.
  const sections = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = birds.filter(b =>
      b.common_name.toLowerCase().includes(q) ||
      b.scientific_name.toLowerCase().includes(q) ||
      b.family?.toLowerCase().includes(q)
    );

    const byFamily = {};
    filtered.forEach(bird => {
      const family = bird.family || 'Unclassified';
      if (!byFamily[family]) byFamily[family] = [];
      byFamily[family].push(bird);
    });

    return Object.keys(byFamily)
      .sort()
      .map(family => ({
        title: family,
        data: byFamily[family].sort((a, b) =>
          a.common_name.localeCompare(b.common_name)
        ),
      }));
  }, [birds, search]);

  // A-Z-style jump index, but by family initial letter -- lets the user
  // hop straight to a family group the way a printed index tab would.
  const familyLetters = useMemo(() => {
    const seen = new Set();
    return sections
      .map(s => s.title[0])
      .filter(letter => {
        if (seen.has(letter)) return false;
        seen.add(letter);
        return true;
      });
  }, [sections]);

  const jumpToLetter = (letter) => {
    const sectionIndex = sections.findIndex(s => s.title[0] === letter);
    if (sectionIndex === -1 || !sectionListRef.current) return;
    sectionListRef.current.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated: true,
    });
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading field guide...</Text>
    </View>
  );

  const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);

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
          placeholder="Search species or family..."
          placeholderTextColor={theme.colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close" size={18} color={theme.colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.countText}>
        {totalCount} species · {sections.length} families
      </Text>

      <View style={styles.listRow}>
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          onScrollToIndexFailed={() => {}}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const primaryImage = item.images?.find(img => img.is_primary)
              || (item.image_url ? { image_url: item.image_url } : null);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('BirdDetail', { bird: item })}
                activeOpacity={0.8}
              >
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

                <View style={styles.info}>
                  <Text style={styles.commonName}>{item.common_name}</Text>
                  <Text style={styles.scientificName}>{item.scientific_name}</Text>
                </View>

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

        {/* Family-letter jump index, field-guide style */}
        {familyLetters.length > 3 && (
          <View style={styles.indexBar}>
            {familyLetters.map(letter => (
              <TouchableOpacity key={letter} onPress={() => jumpToLetter(letter)}>
                <Text style={styles.indexLetter}>{letter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
  },
  countText: {
    color: theme.colors.textDim,
    fontSize: 13,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  listRow: { flex: 1, flexDirection: 'row' },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 100, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.colors.primaryLight,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  imageContainer: {
    width: 72, height: 72,
    backgroundColor: theme.colors.surface,
  },
  imagePlaceholder: {
    width: 72, height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  placeholderIcon: { fontSize: 30 },
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
  addButton: {
    width: 32, height: 32,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '300',
  },
  indexBar: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  indexLetter: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryLight,
    paddingVertical: 2,
  },
});