// services/sync.js

import NetInfo from '@react-native-community/netinfo';
import { API_URL } from './api';
import api, { getCrops, getFarmTypes, syncFarmerData, createFarmType, createCrop, submitFarmerData } from './api';
import { 
  getUnsyncedFarmerData, 
  markFarmerDataAsSynced, 
  saveCrops, 
  saveFarmTypes,
  getUnsyncedFarmTypes,
  getUnsyncedCrops,
  markFarmTypeAsSynced,
  markCropAsSynced,
  getFarmTypesFromDB,
  getCropsFromDB
} from './database';

// Global connection state
let globalConnectionState = {
  isConnected: false,
  lastChecked: null
};

// Start monitoring connectivity
export const startConnectionMonitoring = () => {
  console.log('Starting connection monitoring');
  
  // Set up event listener
  const unsubscribe = NetInfo.addEventListener(state => {
    const wasConnected = globalConnectionState.isConnected;
    globalConnectionState = {
      isConnected: state.isConnected,
      lastChecked: new Date()
    };
    
    // Log significant changes
    if (wasConnected !== state.isConnected) {
      console.log(`Connection status changed: ${state.isConnected ? 'ONLINE' : 'OFFLINE'}`);
      
      // If we just came online, trigger a sync
      if (state.isConnected && !wasConnected) {
        console.log('Device came online, triggering automatic sync');
        syncAllData().catch(err => console.error('Auto-sync error:', err));
      }
    }
  });
  
  // Start with a manual check
  NetInfo.fetch().then(state => {
    globalConnectionState = {
      isConnected: state.isConnected,
      lastChecked: new Date()
    };
    console.log(`Initial connection status: ${state.isConnected ? 'ONLINE' : 'OFFLINE'}`);
  });
  
  return unsubscribe;
};

// Enhanced isOnline function
export const isOnline = async (forceCheck = false) => {
  // If we've checked recently and not forcing, return cached value
  const CACHE_TIMEOUT = 10000; // 10 seconds
  const now = new Date();
  
  if (
    !forceCheck && 
    globalConnectionState.lastChecked && 
    (now - globalConnectionState.lastChecked) < CACHE_TIMEOUT
  ) {
    return globalConnectionState.isConnected;
  }
  
  try {
    // Try multiple approaches to detect network status
    console.log('Checking online status...');
    
    // Start with NetInfo
    const netInfoState = await NetInfo.fetch();
    
    // If definitely not connected, don't bother with more checks
    if (!netInfoState.isConnected) {
      globalConnectionState = {
        isConnected: false,
        lastChecked: now
      };
      console.log('Device reports offline');
      return false;
    }
    
    // If connected, verify with a fetch to confirm internet access
    const timeout = 3000; // 3 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Try to ping our API first
    try {
      const apiUrl = `${API_URL}/api/v1/health/`; // Create this endpoint on your backend
      console.log(`Checking API at ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const result = response.ok;
      globalConnectionState = {
        isConnected: result,
        lastChecked: now
      };
      console.log(`API connection ${result ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      console.log('API check failed, trying Google:', error.message);
    }
    
    // If API check fails, try a reliable external service
    try {
      const googleResponse = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const result = googleResponse.ok;
      globalConnectionState = {
        isConnected: result,
        lastChecked: now
      };
      console.log(`Google connection ${result ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      console.log('Google check failed:', error.message);
      
      // All checks failed
      globalConnectionState = {
        isConnected: false,
        lastChecked: now
      };
      return false;
    }
  } catch (error) {
    console.log('Network check error:', error);
    
    globalConnectionState = {
      isConnected: false,
      lastChecked: now
    };
    return false;
  }
};

// Bidirectional sync: both download reference data and upload changes
export const syncAllData = async () => {
  console.log('Starting sync process...');
  
  // Track sync results
  const results = {
    success: true,
    uploads: { farmTypes: 0, crops: 0, farmerData: 0 },
    downloads: { farmTypes: 0, crops: 0 },
    error: null
  };
  
  try {
    // 1. UPLOAD: First get all unsynced items
    console.log('Checking for unsynced items...');
    
    // 1a. Get unsynced farm types
    const unsyncedFarmTypes = await getUnsyncedFarmTypes();
    console.log(`Found ${unsyncedFarmTypes.length} unsynced farm types`);
    
    // 1b. Get unsynced crops
    const unsyncedCrops = await getUnsyncedCrops();
    console.log(`Found ${unsyncedCrops.length} unsynced crops`);
    
    // 2. UPLOAD: Send local changes to server
    
    // 2a. Upload farm types
    for (const farmType of unsyncedFarmTypes) {
      try {
        console.log(`Syncing farm type: ${farmType.name} (ID: ${farmType.id})`);
        const response = await createFarmType({
          name: farmType.name,
          description: farmType.description || ''
        });
        
        console.log('Server response:', response.data);
        
        // Mark as synced with server ID
        await markFarmTypeAsSynced(farmType.id);
        console.log(`Marked farm type ${farmType.id} as synced`);
        
        results.uploads.farmTypes++;
      } catch (error) {
        console.error(`Error syncing farm type ${farmType.name}:`, error);
      }
    }
    
    // 2b. Upload crops
    for (const crop of unsyncedCrops) {
      try {
        console.log(`Syncing crop: ${crop.name} (ID: ${crop.id})`);
        const response = await createCrop({
          name: crop.name,
          description: crop.description || ''
        });
        
        console.log('Server response:', response.data);
        
        // Mark as synced with server ID
        await markCropAsSynced(crop.id);
        console.log(`Marked crop ${crop.id} as synced`);
        
        results.uploads.crops++;
      } catch (error) {
        console.error(`Error syncing crop ${crop.name}:`, error);
      }
    }
    
    // 2c. Upload farmer data
    console.log('Checking for unsynced farmer data...');
    const unsyncedFarmerData = await getUnsyncedFarmerData();
    console.log(`Found ${unsyncedFarmerData.length} unsynced farmer records`);

    for (const record of unsyncedFarmerData) {
      try {
        console.log(`Syncing farmer data: ${record.farmer_name} (ID: ${record.id})`);
        
        // IMPORTANT: Map database field names to API field names
        const formattedData = {
          farmer_name: record.farmer_name,
          national_id: record.national_id,
          farm_type: parseInt(record.farm_type_id), // Changed from farm_type_id to farm_type
          crop: parseInt(record.crop_id),           // Changed from crop_id to crop
          location: record.location || ''
        };
        
        console.log('Formatted farmer data for API:', formattedData);
        
        // Use the API directly with properly formatted data
        const response = await api.post('/api/v1/farmer-data/', formattedData);
        
        console.log('Server response:', response.data);
        
        // Mark as synced
        await markFarmerDataAsSynced(record.id);
        console.log(`Marked farmer data ${record.id} as synced`);
        
        results.uploads.farmerData = (results.uploads.farmerData || 0) + 1;
      } catch (error) {
        console.error(`Error syncing farmer data for ${record.farmer_name}:`, error);
        console.error('Full record:', record);
        
        // More detailed error logging
        if (error.response) {
          console.error('API Error Response:', error.response.data);
        }
      }
    }
    
    // 3. DOWNLOAD: Get latest data from server
    console.log('Downloading latest data from server...');
    
    try {
      const serverFarmTypes = await getFarmTypes();
      results.downloads.farmTypes = serverFarmTypes.data.length;
      
      const serverCrops = await getCrops();
      results.downloads.crops = serverCrops.data.length;
      
      console.log(`Downloaded ${results.downloads.farmTypes} farm types and ${results.downloads.crops} crops`);
    } catch (downloadError) {
      console.error('Error downloading server data:', downloadError);
    }
    
    console.log('Sync complete!', results);
    return results;
  } catch (error) {
    console.error('Sync error:', error);
    results.success = false;
    results.error = error.message || 'Unknown error during sync';
    return results;
  }
};

// Add default export
const SyncService = {
  isOnline,
  syncAllData,
  startConnectionMonitoring
};

export default SyncService;