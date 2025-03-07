// services/auth.js

import axios from 'axios';
import { Platform } from 'react-native';
import { API_URL } from './api';

// Login function with enhanced error handling
export const login = async (username, password) => {
  try {
    console.log(`Attempting to login with username: ${username} to server: ${API_URL}`);
    
    // Get JWT token
    console.log('Sending request to:', `${API_URL}/auth/jwt/create/`);
    const response = await axios.post(`${API_URL}/auth/jwt/create/`, {
      username,
      password
    }, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Token received successfully');
    const token = response.data.access;
    
    // Get user data
    console.log('Fetching user data from:', `${API_URL}/auth/users/me/`);
    const userResponse = await axios.get(`${API_URL}/auth/users/me/`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('User data received successfully');
    return {
      token,
      user: userResponse.data
    };
  } catch (error) {
    // Enhanced error reporting
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Login server error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Login network error - No response received:', {
        request: error.request._url || error.request.url,
        platform: Platform.OS
      });
      
      // Provide more specific troubleshooting advice
      if (Platform.OS === 'android') {
        console.error('Android troubleshooting: Make sure your backend is running and accessible at 10.0.2.2:8000');
      } else if (Platform.OS === 'ios') {
        console.error('iOS troubleshooting: Make sure your backend is running and accessible at localhost:8000');
      }
    } else {
      // Something happened in setting up the request
      console.error('Login error during request setup:', error.message);
    }
    
    throw error;
  }
};

// Test server connection
export const testConnection = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/`, { timeout: 5000 });
    return { success: true, status: response.status };
  } catch (error) {
    if (error.response) {
      // Even a 404 or 403 means we connected to the server
      return { success: true, status: error.response.status };
    }
    return { 
      success: false, 
      error: error.message,
      details: Platform.OS === 'android' ? 
        'If using Android emulator, make sure backend is at 10.0.2.2:8000' :
        'If using iOS simulator, make sure backend is at localhost:8000'
    };
  }
};

// Add default export
const AuthService = {
  login,
  testConnection
};

export default AuthService;