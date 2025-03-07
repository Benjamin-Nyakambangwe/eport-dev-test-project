// App.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoginScreen from './screens/LoginScreen';
import ClerkDataCollectionScreen from './screens/ClerkScreens/DataCollectionScreen';
import ClerkViewSubmissionsScreen from './screens/ClerkScreens/ViewSubmissionsScreen';
import AdminConfigOptionsScreen from './screens/AdminScreens/ConfigOptionsScreen';
import AdminManageUsersScreen from './screens/AdminScreens/ManageUsersScreen';

// Import auth context
import { AuthProvider, useAuth } from '../components/AuthContext';

const Stack = createStackNavigator();

// Main navigation component - without NavigationContainer
const AppNavigator = () => {
  const { isLoggedIn, userRole } = useAuth();

  return (
    <Stack.Navigator>
      {!isLoggedIn ? (
        // Auth stack
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      ) : (
        // Role-based screens
        userRole === 'clerk' ? (
          // Clerk screens
          <>
            <Stack.Screen name="DataCollection" component={ClerkDataCollectionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ViewSubmissions" component={ClerkViewSubmissionsScreen} options={{ headerShown: false }} />
          </>
        ) : (
          // Admin screens
          <>
            <Stack.Screen name="ConfigOptions" component={AdminConfigOptionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageUsers" component={AdminManageUsersScreen} options={{ headerShown: false }} />
          </>
        )
      )}
    </Stack.Navigator>
  );
};

// Main App component
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}