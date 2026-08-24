import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const LIFE_LIST_KEY = 'ndege_life_list';
const API_URL = 'https://ndege-id.onrender.com';

export async function addToLifeList(bird) {
  try {
    const existing = await AsyncStorage.getItem(LIFE_LIST_KEY);
    const list = existing ? JSON.parse(existing) : [];
    const alreadyAdded = list.find(b => b.id === bird.id);
    if (!alreadyAdded) {
      const entry = {
        ...bird,
        date_seen: new Date().toISOString(),
      };
      list.unshift(entry);
      await AsyncStorage.setItem(LIFE_LIST_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to add to life list', e);
    return false;
  }
}

export default function LifeListScreen({ navigation }) {
  const [lifeList, setLifeList] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [allBirds, setAllBirds] = useState([]);
  const [loadingBirds, setLoadingBirds] = useState(false);
  const [search, setSearch] = useState('');
  const [justAdded, setJustAdded] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadLifeList();
    }, [])
  );

  const loadLifeList = async () => {
    try {
      const data = await AsyncStorage.getItem(LIFE_LIST_KEY);
      setLifeList(data ? JSON.parse(data) : []);
    } catch (e) {
      console.error('Failed to load life list', e);
    }
  };

  const removeFromList = async (birdId) => {
    Alert.alert('Remove Bird', 'Remove this bird from your life list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = lifeList.filter(b => b.id !== birdId);
          setLifeList(updated);
          await AsyncStorage.setItem(LIFE_LIST_KEY, JSON.stringify(updated));
        }
      }
    ]);
  };

  const openPicker = () => {
    setPickerVisible(true);
    setSearch('');
    setJustAdded({});
    if (allBirds.length === 0) {
      setLoadingBirds(true);
      fetch(`${API_URL}/birds`)
        .then(res => res.json())
        .then(data => {
          setAllBirds(data.birds || []);
          setLoadingBirds(false);
        })
        .catch(() => setLoadingBirds(false));
    }
  };

  const handleManualAdd = async (bird) => {
    const added = await addToLifeList(bird);
    if (added) {
      setJustAdded(prev => ({ ...prev, [bird.id]: true }));
      loadLifeList();
    }
  };

  const lifeListIds = new Set(lifeList.map(b => b.id));
  const filteredBirds = allBirds.filter(b => {
    const q = search.toLowerCase();
    return b.common_name.toLowerCase().includes(q) ||
      b.scientific_name.toLowerCase().includes(q);
  });

  const getMilestone = (count) => {
    if (count >= 50) return '🏆 Expert Birder';
    if (count >= 25) return '🥇 Advanced Birder';
    if (count >= 10) return '🥈 Intermediate Birder';
    if (count >= 5) return '🥉 Beginner Birder';
    return '🌱 Just Starting';
  };

  const PickerModal = (
    <Modal
      visible={pickerVisible}
      animationType="slide"
      onRequestClose={() => setPickerVisible(false)}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Add a Bird You've Seen</Text>
          <TouchableOpacity onPress={() => setPickerVisible(false)}>
            <Ionicons name="close" size={26} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

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
            onChangeText={setSearch}
          />
        </View>

        {loadingBirds ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={filteredBirds}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const primaryImage = item.images?.find(img => img.is_primary)
                || (item.image_url ? { image_url: item.image_url } : null);
              const alreadyIn = lifeListIds.has(item.id) || justAdded[item.id];
              return (
                <TouchableOpacity
                  style={styles.pickerRow}
                  disabled={alreadyIn}
                  onPress={() => handleManualAdd(item)}
                  activeOpacity={0.7}
                >
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage.image_url }} style={styles.pickerImage} />
                  ) : (
                    <View style={styles.pickerImagePlaceholder}>
                      <Text style={{ fontSize: 24 }}>🦅</Text>
                    </View>
                  )}
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerCommonName}>{item.common_name}</Text>
                    <Text style={styles.pickerScientificName}>{item.scientific_name}</Text>
                  </View>
                  <View style={[styles.pickerAddBadge, alreadyIn && styles.pickerAddedBadge]}>
                    <Ionicons
                      name={alreadyIn ? 'checkmark' : 'add'}
                      size={18}
                      color={theme.colors.text}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );

  if (lifeList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🦅</Text>
        <Text style={styles.emptyTitle}>Your Life List is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Identify birds to automatically add them here, or add one manually if you've seen it before.
        </Text>
        <TouchableOpacity style={styles.browseButton} onPress={openPicker}>
          <Text style={styles.browseButtonText}>+ Add a Bird</Text>
        </TouchableOpacity>
        {PickerModal}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <Text style={styles.statsCount}>{lifeList.length}</Text>
        <Text style={styles.statsLabel}>Species Seen</Text>
        <Text style={styles.milestone}>{getMilestone(lifeList.length)}</Text>
      </View>

      <FlatList
        data={lifeList}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const primaryImage = item.images?.find(img => img.is_primary)
            || (item.image_url ? { image_url: item.image_url } : null);
          const dateSeen = new Date(item.date_seen).toLocaleDateString('en-KE', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('BirdDetail', { bird: item })}
              onLongPress={() => removeFromList(item.id)}
              activeOpacity={0.8}
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
                <Text style={styles.dateSeen}>📅 First seen: {dateSeen}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.hint}>Long press a bird to remove it</Text>

      <TouchableOpacity style={styles.fab} onPress={openPicker} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={theme.colors.text} />
      </TouchableOpacity>

      {PickerModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: {
    flex: 1, backgroundColor: theme.colors.background,
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyIcon: { fontSize: 80, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22, fontWeight: 'bold',
    color: theme.colors.text, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15, color: theme.colors.textSecondary,
    textAlign: 'center', marginTop: 8, lineHeight: 22,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 24,
  },
  browseButtonText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  statsCard: {
    backgroundColor: theme.colors.primaryDim,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    margin: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  statsCount: { fontSize: 48, fontWeight: 'bold', color: theme.colors.text },
  statsLabel: { fontSize: 16, color: theme.colors.primaryLight, marginTop: 4 },
  milestone: { fontSize: 18, color: theme.colors.text, marginTop: 8, fontWeight: '600' },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  image: { width: 90, height: 90 },
  imagePlaceholder: {
    width: 90, height: 90,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { fontSize: 36 },
  info: { flex: 1, padding: theme.spacing.md, justifyContent: 'center' },
  commonName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  scientificName: {
    fontSize: 13, fontStyle: 'italic',
    color: theme.colors.primaryLight, marginTop: 2,
  },
  dateSeen: { fontSize: 12, color: theme.colors.textDim, marginTop: 6 },
  hint: {
    textAlign: 'center', color: theme.colors.textDim,
    fontSize: 12, paddingBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 20, bottom: 90,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  // --- Picker modal ---
  pickerContainer: { flex: 1, backgroundColor: theme.colors.background },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
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
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  pickerImage: {
    width: 48, height: 48,
    borderRadius: theme.radius.md,
  },
  pickerImagePlaceholder: {
    width: 48, height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: { flex: 1, marginLeft: theme.spacing.md },
  pickerCommonName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  pickerScientificName: {
    fontSize: 12, fontStyle: 'italic',
    color: theme.colors.textDim, marginTop: 2,
  },
  pickerAddBadge: {
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  pickerAddedBadge: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});