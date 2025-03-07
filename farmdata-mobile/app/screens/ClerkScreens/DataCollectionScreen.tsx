import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../components/AuthContext';
import { 
  getFarmTypesFromDB, 
  getCropsFromDB,
  saveFarmerData
} from '../../../services/database';
import { syncAllData, isOnline } from '../../../services/sync';
import SyncIndicator from '../../../components/SyncIndicator';
import { submitFarmerData } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import globalStyles, { COLORS, FONTS } from '../../../styles/globalStyles';

const DataCollectionScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    farmer_name: '',
    national_id: '',
    farm_type_id: '',
    crop_id: '',
    location: ''
  });
  const [farmTypes, setFarmTypes] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Load reference data from local database
  useEffect(() => {
    // Initial data loading
    (async () => {
      setLoadingData(true);
      await loadReferenceData();
      await checkOnlineStatus();
      setLoadingData(false);
    })();
  }, []);

  const checkOnlineStatus = async () => {
    const status = await isOnline();
    setOnline(status);
  };

  const loadReferenceData = async () => {
    setLoading(true);
    try {
      const isNetworkAvailable = await isOnline();
      setOnline(isNetworkAvailable);
      
      if (isNetworkAvailable) {
        // Online: Get data from API
        console.log('Loading form options from API...');
        const { getFarmTypes, getCrops } = require('../../../services/api');
        
        const [farmTypesResponse, cropsResponse] = await Promise.all([
          getFarmTypes(),
          getCrops()
        ]);
        
        setFarmTypes(farmTypesResponse.data);
        setCrops(cropsResponse.data);
        
        console.log(`Loaded ${farmTypesResponse.data.length} farm types and ${cropsResponse.data.length} crops from API`);
      } else {
        // Offline: Get data from local database
        console.log('Loading form options from local database...');
        const { getFarmTypesFromDB, getCropsFromDB } = require('../../../services/database');
        
        const localFarmTypes = await getFarmTypesFromDB();
        const localCrops = await getCropsFromDB();
        
        console.log(`Loaded ${localFarmTypes?.length || 0} farm types and ${localCrops?.length || 0} crops from local DB`);
        
        if (localFarmTypes && localFarmTypes.length > 0) {
          setFarmTypes(localFarmTypes);
        } else {
          console.warn('No farm types found in local database');
          setFarmTypes([]);
          Alert.alert('Offline Mode', 'No farm types found in local database. Add test data or sync when online.');
        }
        
        if (localCrops && localCrops.length > 0) {
          setCrops(localCrops);
        } else {
          console.warn('No crops found in local database');
          setCrops([]);
          Alert.alert('Offline Mode', 'No crops found in local database. Add test data or sync when online.');
        }
      }
    } catch (error) {
      console.error('Error loading form options:', error);
      Alert.alert('Error', 'Failed to load form options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Try to sync with detailed info
      console.log('Starting data sync...');
      const result = await syncAllData();
      
      if (result.success) {
        console.log('Sync successful:', result.message);
        Alert.alert('Sync Successful', result.message);
        
        // Force reload reference data after sync
        await loadReferenceData();
      } else {
        console.log('Sync failed:', result.message);
        Alert.alert('Sync Failed', result.message);
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', error.message || 'An error occurred during sync');
    } finally {
      setSyncing(false);
      await checkOnlineStatus();
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation errors when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validation
    if (!formData.farmer_name) newErrors.farmer_name = 'Farmer name is required';
    if (!formData.national_id) newErrors.national_id = 'National ID is required';
    if (!formData.farm_type_id) newErrors.farm_type_id = 'Farm type is required';
    if (!formData.crop_id) newErrors.crop_id = 'Crop is required';
    
    // National ID format validation (adjust to match your country's format)
    const nationalIdRegex = /^[a-zA-Z0-9]{6,10}$/;
    if (formData.national_id && !nationalIdRegex.test(formData.national_id)) {
      newErrors.national_id = 'Invalid National ID format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    Keyboard.dismiss();
    setSubmitting(true);
    
    try {
      const isConnected = await isOnline();
      setOnline(isConnected);
      
      // Always save to local database first
      console.log('Saving farmer data to local database...');
      const localResult = await saveFarmerData({
        ...formData,
        is_synced: isConnected ? 1 : 0 // Mark as synced if submitted online
      });
      
      if (!localResult) {
        throw new Error('Failed to save to local database');
      }
      
      if (isConnected) {
        // If online, also submit to server
        console.log('Submitting farmer data to server...');
        const response = await submitFarmerData(formData);
        console.log('Server response:', response.data);
      }
      
      // Success message based on connection status
      if (isConnected) {
        Alert.alert(
          'Success', 
          'Farmer data has been submitted to the server and saved locally',
          [{ text: 'OK', onPress: resetForm }]
        );
      } else {
        Alert.alert(
          'Saved Offline', 
          'Farmer data has been saved to your device and will sync when you reconnect',
          [{ text: 'OK', onPress: resetForm }]
        );
      }
    } catch (error) {
      console.error('Error submitting farmer data:', error);
      Alert.alert('Error', `Failed to submit data: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      farmer_name: '',
      national_id: '',
      farm_type_id: '',
      crop_id: '',
      location: ''
    });
  };

  const handleViewSubmissions = () => {
    navigation.navigate('ViewSubmissions');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Data Collection</Text>
        <View style={styles.headerButtons}>
          <SyncIndicator isOnline={online} isSyncing={syncing} onSync={handleSync} />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Farmer Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.farmer_name && styles.inputError]}
            placeholder="Enter farmer's full name"
            value={formData.farmer_name}
            onChangeText={(value) => handleInputChange('farmer_name', value)}
          />
          {errors.farmer_name && <Text style={styles.errorText}>{errors.farmer_name}</Text>}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>National ID <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.national_id && styles.inputError]}
            placeholder="Enter national ID"
            value={formData.national_id}
            onChangeText={(value) => handleInputChange('national_id', value)}
          />
          {errors.national_id && <Text style={styles.errorText}>{errors.national_id}</Text>}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Farm Type <Text style={styles.required}>*</Text></Text>
          <View style={[styles.pickerContainer, errors.farm_type_id && styles.pickerError]}>
            <Picker
              selectedValue={formData.farm_type_id}
              onValueChange={(value) => handleInputChange('farm_type_id', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select farm type" value="" color="#6c757d" />
              {farmTypes.map(type => (
                <Picker.Item 
                  key={type.id} 
                  label={type.name} 
                  value={type.id.toString()} 
                />
              ))}
            </Picker>
          </View>
          {errors.farm_type_id && <Text style={styles.errorText}>{errors.farm_type_id}</Text>}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Crop <Text style={styles.required}>*</Text></Text>
          <View style={[styles.pickerContainer, errors.crop_id && styles.pickerError]}>
            <Picker
              selectedValue={formData.crop_id}
              onValueChange={(value) => handleInputChange('crop_id', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select crop" value="" color="#6c757d" />
              {crops.map(crop => (
                <Picker.Item 
                  key={crop.id} 
                  label={crop.name} 
                  value={crop.id.toString()} 
                />
              ))}
            </Picker>
          </View>
          {errors.crop_id && <Text style={styles.errorText}>{errors.crop_id}</Text>}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location (optional)"
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            multiline
          />
        </View>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Data</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleViewSubmissions}
        >
          <Ionicons name="list-outline" size={20} color="#fff" />
          <Text style={styles.viewButtonText}>View Submissions</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...globalStyles.container,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  title: {
    ...globalStyles.heading,
    fontSize: 22,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  logoutText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.dark,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    ...globalStyles.input,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    fontFamily: FONTS.regular,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  pickerError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontFamily: FONTS.regular,
    color: COLORS.danger,
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    ...globalStyles.buttonPrimary,
    marginTop: 20,
    marginBottom: 16,
  },
  submitButtonText: {
    ...globalStyles.buttonText,
    marginLeft: 8,
  },
  viewButton: {
    ...globalStyles.buttonSecondary,
  },
  viewButtonText: {
    ...globalStyles.buttonText,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.secondary,
    marginTop: 16,
  },
});

export default DataCollectionScreen;