import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the database functions for offline operations
import { 
  saveOfflineFarmType as dbSaveOfflineFarmType, 
  saveOfflineCrop as dbSaveOfflineCrop,
  addToLocalDatabase
} from './database';

// Set API URL for connecting to your localhost backend
// For Android emulator: use 10.0.2.2 to refer to the host machine's localhost
// For iOS simulator: localhost usually works directly
export const API_URL = 'https://eport.dealpusher.com' 


const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization header to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `JWT ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const login = (username, password) => 
  api.post('/auth/jwt/create/', { username, password });

export const refreshToken = (refresh) => 
  api.post('/auth/jwt/refresh/', { refresh });

export const verifyToken = (token) => 
  api.post('/auth/jwt/verify/', { token });

export const getUserData = () => 
  api.get('/auth/users/me/');

// API functions for farm types
export const getFarmTypes = () => api.get('/api/v1/farm-types/');
export const createFarmType = async (data) => {
  try {
    // First send to server
    const response = await api.post('/api/v1/farm-types/', data);
    
    // Then also save to local database
    await addToLocalDatabase('farm_types', {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description || '',
      is_synced: 1 // Marked as synced since it came from server
    });
    
    console.log('Farm type saved to both server and local database');
    return response;
  } catch (error) {
    console.error('Error creating farm type:', error);
    throw error;
  }
};
export const updateFarmType = async (id, data) => {
  try {
    // First send to server
    const response = await api.put(`/api/v1/farm-types/${id}/`, data);
    
    // Then also update local database
    await addToLocalDatabase('farm_types', {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description || '',
      is_synced: 1
    }, true); // true flag indicates update existing record
    
    return response;
  } catch (error) {
    console.error('Error updating farm type:', error);
    throw error;
  }
};
export const deleteFarmType = (id) => api.delete(`/api/v1/farm-types/${id}/`);

// API functions for crops
export const getCrops = () => api.get('/api/v1/crops/');
export const createCrop = async (data) => {
  try {
    // First send to server
    const response = await api.post('/api/v1/crops/', data);
    
    // Then also save to local database
    await addToLocalDatabase('crops', {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description || '',
      is_synced: 1 // Marked as synced since it came from server
    });
    
    console.log('Crop saved to both server and local database');
    return response;
  } catch (error) {
    console.error('Error creating crop:', error);
    throw error;
  }
};
export const updateCrop = async (id, data) => {
  try {
    // First send to server
    const response = await api.put(`/api/v1/crops/${id}/`, data);
    
    // Then also update local database
    await addToLocalDatabase('crops', {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description || '',
      is_synced: 1
    }, true); // true flag indicates update existing record
    
    return response;
  } catch (error) {
    console.error('Error updating crop:', error);
    throw error;
  }
};
export const deleteCrop = (id) => api.delete(`/api/v1/crops/${id}/`);

// API functions for farmer data
export const getFarmerData = () => api.get('/api/v1/farmer-data/');
export const createFarmerData = (data) => api.post('/api/v1/farmer-data/', data);
export const updateFarmerData = (id, data) => api.put(`/api/v1/farmer-data/${id}/`, data);
export const deleteFarmerData = (id) => api.delete(`/api/v1/farmer-data/${id}/`);
export const syncFarmerData = (data) => api.post('/api/v1/farmer-data/sync/', data);

// Add these functions to your api.js
export const saveOfflineFarmType = async (farmType) => {
  try {
    return await dbSaveOfflineFarmType(farmType);
  } catch (error) {
    console.error('Error saving offline farm type:', error);
    throw error;
  }
};

export const saveOfflineCrop = async (crop) => {
  try {
    return await dbSaveOfflineCrop(crop);
  } catch (error) {
    console.error('Error saving offline crop:', error);
    throw error;
  }
};

/**
 * Check if the API is available
 * @returns {Promise<boolean>} - True if the API is available
 */
const checkApiAvailability = async () => {
  try {
    // Try a simple HEAD request to check if the API is available
    await axios.head(`${API_URL}/api/v1/health/`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('API is not available:', error.message);
    throw new Error('API is not available. Check your network connection.');
  }
};

/**
 * Get the authorization headers
 * @returns {Object} - The headers object with Authorization
 */
const getAuthHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `JWT ${token}` } : {};
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {};
  }
};

/**
 * Submit farmer data to the server
 * @param {Object} farmerData - The farmer data to submit
 * @returns {Promise} - The response from the API
 */
export const submitFarmerData = async (farmerData) => {
  try {
    console.log('Submitting farmer data to API:', farmerData);
    
    // FIXED: Check for either the original field names OR the API field names
    const hasFarmType = farmerData.farm_type_id !== undefined || farmerData.farm_type !== undefined;
    const hasCrop = farmerData.crop_id !== undefined || farmerData.crop !== undefined;
    
    // Validate required fields
    if (!farmerData.farmer_name || !farmerData.national_id || !hasFarmType || !hasCrop) {
      console.error('Missing fields in:', farmerData);
      throw new Error('Missing required fields for farmer data');
    }
    
    // Check API availability (don't fail if unavailable, just log it)
    try {
      await checkApiAvailability();
    } catch (error) {
      console.warn('API availability check failed:', error.message);
      // Continue anyway - we want to attempt the request
    }
    
    // Prepare data to match what the backend API expects
    // If the fields are already transformed, use them as is
    const formattedData = {
      farmer_name: farmerData.farmer_name,
      national_id: farmerData.national_id,
      farm_type: farmerData.farm_type !== undefined ? 
        parseInt(farmerData.farm_type) : 
        parseInt(farmerData.farm_type_id),
      crop: farmerData.crop !== undefined ? 
        parseInt(farmerData.crop) : 
        parseInt(farmerData.crop_id),
      location: farmerData.location || ''
    };
    
    console.log('Formatted data for API:', formattedData);
    
    // Make the POST request to the farmer data endpoint
    const response = await api.post('/api/v1/farmer-data/', formattedData);
    
    console.log('Farmer data submitted successfully:', response.data);
    return response;
  } catch (error) {
    console.error('Error submitting farmer data to API:', error);
    
    // Enhance error for better debugging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.data);
      throw new Error(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Check your network connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw error;
    }
  }
};

export default api;