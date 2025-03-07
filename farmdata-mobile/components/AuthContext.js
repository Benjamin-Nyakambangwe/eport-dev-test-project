// components/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/auth';
import { isOnline } from '../services/sync';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        const online = await isOnline();
        
        setOfflineMode(!online);
        
        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
          setUserRole(userData.role);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Login function with offline support
  const login = async (username, password) => {
    try {
      console.log('Login attempt for user:', username);
      
      // Check if we're online first - be more aggressive about assuming offline
      let online = false;
      try {
        online = await isOnline();
        console.log('Online status check result:', online);
      } catch (error) {
        console.log('Error checking online status, assuming offline:', error);
      }
      
      setOfflineMode(!online);
      
      // If clearly online, try online login first
      if (online) {
        try {
          console.log('Attempting online login...');
          const { token, user } = await authService.login(username, password);
          
          console.log('Online login successful, saving credentials');
          // Save auth data to AsyncStorage
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          
          // Also save credentials for offline login
          await AsyncStorage.setItem('offlineUsername', username);
          await AsyncStorage.setItem('offlinePasswordHash', hashPassword(password));
          
          // Update state
          setToken(token);
          setUser(user);
          setUserRole(user.role);
          setIsLoggedIn(true);
          
          return true;
        } catch (error) {
          console.error('Online login failed:', error.message);
          console.log('Falling back to offline login...');
          return tryOfflineLogin(username, password);
        }
      } else {
        // We're offline or connection is poor, go straight to offline login
        console.log('Device appears to be offline, trying offline login...');
        return tryOfflineLogin(username, password);
      }
    } catch (error) {
      console.error('Login error:', error);
      return tryOfflineLogin(username, password); // Last resort fallback
    }
  };

  // Simple hash function for passwords (not secure, but better than plaintext)
  const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
  };
  
  // Attempt offline login with cached credentials
  const tryOfflineLogin = async (username, password) => {
    try {
      console.log('Attempting offline login for user:', username);
      
      const storedUsername = await AsyncStorage.getItem('offlineUsername');
      const storedPasswordHash = await AsyncStorage.getItem('offlinePasswordHash');
      let storedUser = await AsyncStorage.getItem('user');
      
      // If user data isn't available, try the offline backup
      if (!storedUser) {
        storedUser = await AsyncStorage.getItem('offlineUserData');
        console.log('Using preserved offline user data');
      }
      
      console.log('Stored credentials found:', {
        hasUsername: !!storedUsername,
        hasPasswordHash: !!storedPasswordHash,
        hasUserData: !!storedUser,
        hasOfflineData: !!(await AsyncStorage.getItem('offlineUserData'))
      });
      
      if (storedUsername && storedPasswordHash && storedUser) {
        // Check if credentials match
        const inputHash = hashPassword(password);
        console.log('Password hash comparison:', {
          stored: storedPasswordHash.substring(0, 5) + '...',
          input: inputHash.substring(0, 5) + '...',
          match: storedPasswordHash === inputHash
        });
        
        if (storedUsername === username && storedPasswordHash === inputHash) {
          console.log('Offline credentials match! Proceeding with login');
          const userData = JSON.parse(storedUser);
          const storedToken = await AsyncStorage.getItem('token') || 'offline-token';
          
          // When logging in offline, restore this data to the main storage
          await AsyncStorage.setItem('user', storedUser);
          if (!await AsyncStorage.getItem('token')) {
            await AsyncStorage.setItem('token', storedToken);
          }
          
          setToken(storedToken);
          setUser(userData);
          setUserRole(userData.role);
          setIsLoggedIn(true);
          
          return true;
        } else {
          console.log('Offline credentials do not match');
        }
      } else {
        console.log('Missing stored credentials for offline login');
      }
      
      // IMPORTANT: For testing - add this emergency backdoor
      if (__DEV__ && username === 'test' && password === 'test') {
        console.log('DEVELOPMENT MODE: Using emergency test login');
        const fakeUser = {
          id: 999,
          username: 'test',
          role: 'clerk', // or 'admin' for testing admin features
          is_staff: true
        };
        
        // Store these for future offline login
        await AsyncStorage.setItem('offlineUsername', 'test');
        await AsyncStorage.setItem('offlinePasswordHash', hashPassword('test'));
        await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
        await AsyncStorage.setItem('token', 'fake-token-for-offline-testing');
        
        setToken('fake-token-for-offline-testing');
        setUser(fakeUser);
        setUserRole(fakeUser.role);
        setIsLoggedIn(true);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Offline login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Get current user data before logout (to preserve for offline login)
      const userData = await AsyncStorage.getItem('user');
      
      // Clear session data but NOT credentials
      await AsyncStorage.removeItem('token');
      
      // Instead of removing user, store it as offlineUserData
      if (userData) {
        await AsyncStorage.setItem('offlineUserData', userData);
      }
      await AsyncStorage.removeItem('user');
      
      // Update state
      setToken(null);
      setUser(null);
      setUserRole(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const authContextValue = {
    isLoggedIn,
    userRole,
    token,
    user,
    loading,
    offlineMode,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Add default export
const AuthContextModule = {
  AuthProvider,
  useAuth
};

export default AuthContextModule;