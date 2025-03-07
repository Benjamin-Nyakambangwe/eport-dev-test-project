import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import DataCollectionScreen from '../screens/DataCollectionScreen';
import ViewSubmissionsScreen from '../screens/ViewSubmissionsScreen';
import ManageUsersScreen from '../screens/ManageUsersScreen';
import ConfigOptionsScreen from '../screens/ConfigOptionsScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false  // This will hide the header for all screens in this stack
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Other auth screens */}
    </Stack.Navigator>
  );
}

function ClerkStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false  // Hide headers for all clerk screens
      }}
    >
      <Stack.Screen name="DataCollection" component={DataCollectionScreen} />
      <Stack.Screen name="ViewSubmissions" component={ViewSubmissionsScreen} />
      {/* Other clerk screens */}
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false  // Hide headers for all admin screens
      }}
    >
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ConfigOptions" component={ConfigOptionsScreen} />
      {/* Other admin screens */}
    </Stack.Navigator>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerShown: false
        }}
      >
        {/* Your main navigation structure */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator; 