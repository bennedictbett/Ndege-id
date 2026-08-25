import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {/* Home */}
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('HomeTab')}>
        <Ionicons
          name={state.index === 0 ? 'home' : 'home-outline'}
          size={22}
          color={state.index === 0 ? theme.colors.primary : theme.colors.textDim}
        />
        <Text style={[styles.tabLabel, state.index === 0 && styles.activeLabel]}>Home</Text>
      </TouchableOpacity>

      {/* Explore */}
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('BrowseTab')}>
        <Ionicons
          name={state.index === 1 ? 'compass' : 'compass-outline'}
          size={22}
          color={state.index === 1 ? theme.colors.primary : theme.colors.textDim}
        />
        <Text style={[styles.tabLabel, state.index === 1 && styles.activeLabel]}>Explore</Text>
      </TouchableOpacity>

      {/* Center mic button */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity style={styles.centerButton} onPress={() => navigation.navigate('HomeTab', { screen: 'Recording' })} activeOpacity={0.85}>
          <Ionicons name="mic" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Map */}
    <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('MapTab')}>
      <Ionicons
        name={state.index === 2 ? 'map' : 'map-outline'}
        size={22}
        color={state.index === 2 ? theme.colors.primary : theme.colors.textDim}
      />
      <Text style={[styles.tabLabel, state.index === 2 && styles.activeLabel]}>Map</Text>
    </TouchableOpacity>

    {/* Profile */}
    <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('ProfileTab')}>
      <Ionicons
        name={state.index === 3 ? 'person' : 'person-outline'}
        size={22}
        color={state.index === 3 ? theme.colors.primary : theme.colors.textDim}
      />
      <Text style={[styles.tabLabel, state.index === 3 && styles.activeLabel]}>Profile</Text>
    </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    height: 70,
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  activeLabel: {
    color: theme.colors.primary,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: theme.colors.surface,
  },
});