import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { theme } from './constants/theme';

import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import BirdDetailScreen from './screens/BirdDetailScreen';
import ResultScreen from './screens/ResultScreen';
import LifeListScreen from './screens/LifeListScreen';

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
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Identification Result' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
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

function LifeListStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="LifeListMain" component={LifeListScreen} options={{ title: 'My Life List' }} />
      <Stack.Screen name="BirdDetail" component={BirdDetailScreen} options={{ title: 'Bird Detail' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.cardBorder,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textDim,
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          }}
        />
        <Tab.Screen
          name="BrowseTab"
          component={BrowseStack}
          options={{
            tabBarLabel: 'Browse',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🦅</Text>,
          }}
        />
        <Tab.Screen
          name="LifeListTab"
          component={LifeListStack}
          options={{
            tabBarLabel: 'Life List',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}