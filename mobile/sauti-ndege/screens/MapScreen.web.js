import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

// react-native-maps is a native-only library (Google Maps SDK / Apple Maps),
// so it cannot run in a browser. Metro automatically picks this file over
// MapScreen.native.js when bundling for web, which keeps react-native-maps
// out of the web bundle entirely -- avoiding the codegenNativeComponent
// crash that otherwise breaks the whole app on load.
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Map view isn't available in the browser</Text>
      <Text style={styles.subtitle}>
        This screen uses native maps, which only run on iOS/Android.{'\n'}
        Open the app on a device or emulator to see hotspots and sightings on the map.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: theme.spacing.md },
  title: {
    fontSize: 18, fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});