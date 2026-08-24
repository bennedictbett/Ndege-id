import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, useWindowDimensions
} from 'react-native';
import { theme } from '../constants/theme';
import { addToLifeList } from './LifeListScreen';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://ndege-id.onrender.com';
const GRID_GAP = 10;

export default function BrowseScreen({ navigation }) {
  const [birds, setBirds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState({});
  const sectionListRef = useRef(null);
  const { width } = useWindowDimensions();

  // Responsive column count: more columns as the screen gets wider,
  // same idea as a photo gallery adapting from phone to tablet/web.
  const numColumns = width >= 900 ? 5 : width >= 640 ? 4 : width >= 420 ? 3 : 2;
  const contentPadding = theme.spacing.md * 2;
  const cardWidth = (width - contentPadding - GRID_GAP * (numColumns - 1)) / numColumns;

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

  // Group alphabetically by family, species alphabetical within each --
  // same grouping as before, then chunk each family's species into rows
  // of `numColumns` so SectionList (which has no native grid mode) can
  // render each chunk as one flex row of side-by-side photo cards.
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
      .map(family => {
        const sorted = byFamily[family].sort((a, b) =>
          a.common_name.localeCompare(b.common_name)
        );
        const rows = [];
        for (let i = 0; i < sorted.length; i += numColumns) {
          rows.push(sorted.slice(i, i + numColumns));
        }
        return { title: family, count: sorted.length, data: rows };
      });
  }, [birds, search, numColumns]);

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

  const totalCount = sections.reduce((sum, s) => sum + s.count, 0);

  return (
    <View style={styles.container}>
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
          keyExtractor={(row, index) => row.map(b => b.id).join('-') + index}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          onScrollToIndexFailed={() => {}}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.count}</Text>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View style={styles.gridRow}>
              {row.map((bird) => {
                const primaryImage = bird.images?.find(img => img.is_primary)
                  || (bird.image_url ? { image_url: bird.image_url } : null);
                return (
                  <TouchableOpacity
                    key={bird.id}
                    style={[styles.gridCard, { width: cardWidth }]}
                    onPress={() => navigation.navigate('BirdDetail', { bird })}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.gridImageFrame, { height: cardWidth }]}>
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={bird.common_name}
                        />
                      ) : (
                        <View style={styles.gridImagePlaceholder}>
                          <Text style={styles.placeholderIcon}>🦅</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.addButton, added[bird.id] && styles.addedButton]}
                        onPress={(e) => { e.stopPropagation(); handleAdd(bird); }}
                      >
                        <Text style={styles.addButtonText}>
                          {added[bird.id] ? '✓' : '+'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.gridCommonName} numberOfLines={1}>
                      {bird.common_name}
                    </Text>
                    <Text style={styles.gridScientificName} numberOfLines={1}>
                      {bird.scientific_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {/* Pad the last row so cards stay left-aligned instead of stretching */}
              {row.length < numColumns &&
                Array.from({ length: numColumns - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ width: cardWidth }} />
                ))}
            </View>
          )}
        />

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
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginTop: theme.spacing.sm,
  },
  gridCard: {},
  gridImageFrame: {
    width: '100%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },
  gridImagePlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  placeholderIcon: { fontSize: 26 },
  addButton: {
    position: 'absolute',
    bottom: 6, right: 6,
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  gridCommonName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 6,
  },
  gridScientificName: {
    fontSize: 10,
    fontStyle: 'italic',
    color: theme.colors.textDim,
    marginTop: 1,
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