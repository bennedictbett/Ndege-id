import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function HotspotsScreen({ navigation }) {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotspots = async () => {
      const { data, error } = await supabase.from('hotspots').select('*').order('name');
      if (error) {
        console.error('Error fetching hotspots:', error);
      } else {
        setHotspots(data);
      }
      setLoading(false);
    };
    fetchHotspots();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hotspots</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading hotspots...</Text>
      ) : hotspots.length === 0 ? (
        <Text style={styles.loadingText}>No hotspots yet.</Text>
      ) : (
        <FlatList
          data={hotspots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <ImageBackground
                source={{ uri: item.image_url }}
                style={styles.cardBg}
                imageStyle={{ borderRadius: theme.radius.lg }}
                resizeMode="cover"
              >
                <View style={styles.overlay} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.region && <Text style={styles.cardRegion}>{item.region}</Text>}
                  {item.description && <Text style={styles.cardDescription}>{item.description}</Text>}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingText: {
    color: theme.colors.textDim,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    height: 160,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  cardBg: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardContent: {},
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardRegion: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
});