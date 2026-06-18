import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Screens
import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import BirdDetailScreen from './screens/BirdDetailScreen';
import ResultScreen from './screens/ResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BrowseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BrowseList" component={BrowseScreen} options={{ title: 'Birds of Kenya' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Sauti Ndege' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Identification Result' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: '#888',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ tabBarIcon: () => <Text>🎙️</Text> }}
        />
        <Tab.Screen
          name="Browse"
          component={BrowseStack}
          options={{ tabBarIcon: () => <Text>🦅</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}