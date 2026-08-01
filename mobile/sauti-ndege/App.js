import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import MapScreen from './screens/MapScreen';
import { theme } from './constants/theme';

import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import BirdDetailScreen from './screens/BirdDetailScreen';
import ResultScreen from './screens/ResultScreen';
import LifeListScreen from './screens/LifeListScreen';
import CustomTabBar from './components/CustomTabBar';
import ProfileScreen from './screens/ProfileScreen';
import RecordingScreen from './screens/RecordingScreen';
import HotspotsScreen from './screens/HotspotsScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerTitleStyle: { color: theme.colors.text },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Recording" component={RecordingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Identification Result' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
      <Stack.Screen name="LifeList" component={LifeListScreen} options={{ title: 'My Life List' }} />
      <Stack.Screen name="Hotspots" component={HotspotsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BrowseList" component={BrowseScreen} options={{ title: 'Birds of Kenya' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MapMain" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
    </Stack.Navigator>
  );
}


export default function App() {
  return (
  <NavigationContainer>
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="BrowseTab" component={BrowseStack} />
      <Tab.Screen name="MapTab" component={MapStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  </NavigationContainer>
  );
}