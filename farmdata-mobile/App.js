import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { startConnectionMonitoring } from './services/sync';
import { initDatabase, testDatabaseConnection } from './services/database';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './components/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Load fonts
    const loadFonts = async () => {
      await Font.loadAsync({
        'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        // Add other weights if you have them
        // 'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        // 'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
      });
      setFontsLoaded(true);
    };

    // Initialize database at startup
    const setupDatabase = async () => {
      try {
        await initDatabase();
        
        const testResult = await testDatabaseConnection();
        console.log('Database test result:', testResult);
        
        if (!testResult.success) {
          console.error('DATABASE INIT FAILED - App may not work offline');
        }
      } catch (err) {
        console.error('Database setup error:', err);
      }
    };
    
    loadFonts();
    setupDatabase();
    
    // Start connection monitoring
    const unsubscribe = startConnectionMonitoring();
    
    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
}); 