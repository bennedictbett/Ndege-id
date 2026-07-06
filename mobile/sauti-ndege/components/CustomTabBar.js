import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { theme } from '../constants/theme';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'HomeTab', label: 'Home', icon: '🏠' },
    { name: 'BrowseTab', label: 'Explore', icon: '🧭' },
    { name: 'LifeListTab', label: 'Life List', icon: '📋' },
  ];

  return (
    <View style={styles.container}>
      {/* Left tabs */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate('HomeTab')}
      >
        <Text style={[
          styles.tabIcon,
          state.index === 0 && styles.activeIcon
        ]}>🏠</Text>
        <Text style={[
          styles.tabLabel,
          state.index === 0 && styles.activeLabel
        ]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate('BrowseTab')}
      >
        <Text style={[
          styles.tabIcon,
          state.index === 1 && styles.activeIcon
        ]}>🧭</Text>
        <Text style={[
          styles.tabLabel,
          state.index === 1 && styles.activeLabel
        ]}>Explore</Text>
      </TouchableOpacity>

      {/* Center mic button */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => navigation.navigate('HomeTab')}
          activeOpacity={0.85}
        >
          <Text style={styles.centerButtonIcon}>🎙️</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate('LifeListTab')}
      >
        <Text style={[
          styles.tabIcon,
          state.index === 2 && styles.activeIcon
        ]}>📋</Text>
        <Text style={[
          styles.tabLabel,
          state.index === 2 && styles.activeLabel
        ]}>Life List</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => {}}
      >
        <Text style={styles.tabIcon}>👤</Text>
        <Text style={styles.tabLabel}>Profile</Text>
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
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
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
  centerButtonIcon: {
    fontSize: 28,
  },
});