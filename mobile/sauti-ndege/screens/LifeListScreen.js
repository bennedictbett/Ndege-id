import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../constants/theme';

const LIFE_LIST_KEY = 'ndege_life_list';

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

  const getMilestone = (count) => {
    if (count >= 50) return '🏆 Expert Birder';
    if (count >= 25) return '🥇 Advanced Birder';
    if (count >= 10) return '🥈 Intermediate Birder';
    if (count >= 5) return '🥉 Beginner Birder';
    return '🌱 Just Starting';
  };

  if (lifeList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🦅</Text>
        <Text style={styles.emptyTitle}>Your Life List is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Identify birds to automatically add them here, or browse and add manually.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('BrowseTab')}
        >
          <Text style={styles.browseButtonText}>Browse Birds</Text>
        </TouchableOpacity>
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
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 40 },
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
});