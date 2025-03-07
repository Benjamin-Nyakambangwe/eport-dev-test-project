import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../components/AuthContext";
import {
  getFarmTypes,
  getCrops,
  createFarmType,
  createCrop,
  updateFarmType,
  updateCrop,
  deleteFarmType,
  deleteCrop,
  saveOfflineFarmType,
  saveOfflineCrop,
} from "../../../services/api";
import { isOnline, syncAllData } from "../../../services/sync";
import SyncIndicator from "../../../components/SyncIndicator";
import {
  testDatabaseConnection,
  populateTestData,
} from "../../../services/database";
import { Ionicons } from "@expo/vector-icons";
import globalStyles, { COLORS, FONTS } from "../../../styles/globalStyles";

// Define interfaces for data models
interface FarmType {
  id: number;
  name: string;
  description: string;
  is_synced?: boolean | number;
}

interface Crop {
  id: number;
  name: string;
  description: string;
  is_synced?: boolean | number;
}

interface FormData {
  name: string;
  description: string;
}

const ConfigOptionsScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [farmTypes, setFarmTypes] = useState<FarmType[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("farmTypes");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("farmType");
  const [modalAction, setModalAction] = useState("add");
  const [currentItem, setCurrentItem] = useState<FarmType | Crop | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
  });
  const [online, setOnline] = useState(false);

  useEffect(() => {
    loadData();
    checkOnlineStatus();
  }, []);

  const checkOnlineStatus = async () => {
    const status = await isOnline();
    setOnline(status);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const isNetworkAvailable = await isOnline();
      setOnline(isNetworkAvailable);

      if (isNetworkAvailable) {
        // Online: Load from API
        const [farmTypesResponse, cropsResponse] = await Promise.all([
          getFarmTypes(),
          getCrops(),
        ]);

        console.log(
          "Loaded online data:",
          farmTypesResponse.data.length,
          "farm types,",
          cropsResponse.data.length,
          "crops"
        );

        setFarmTypes(farmTypesResponse.data);
        setCrops(cropsResponse.data);
      } else {
        // Offline: Load from local database
        Alert.alert(
          "Offline Mode",
          "You are currently offline. Loading data from local database.",
          [{ text: "OK" }]
        );

        try {
          // Import directly to avoid circular dependencies
          const {
            getFarmTypesFromDB,
            getCropsFromDB,
          } = require("../../../services/database");

          console.log("Loading data from local database...");

          // Get local data
          const localFarmTypes = await getFarmTypesFromDB();
          const localCrops = await getCropsFromDB();

          console.log(
            "Loaded from local DB:",
            localFarmTypes?.length || 0,
            "farm types,",
            localCrops?.length || 0,
            "crops"
          );

          if (localFarmTypes && localFarmTypes.length > 0) {
            setFarmTypes(localFarmTypes);
          } else {
            console.warn("No farm types found in local database");
            setFarmTypes([]);
          }

          if (localCrops && localCrops.length > 0) {
            setCrops(localCrops);
          } else {
            console.warn("No crops found in local database");
            setCrops([]);
          }
        } catch (dbError) {
          console.error("Error loading from local database:", dbError);

          // Initialize with empty arrays to allow adding new items
          setFarmTypes([]);
          setCrops([]);
        }
      }
    } catch (error) {
      console.error("Error loading configuration data:", error);
      Alert.alert("Error", "Failed to load configuration options");

      // Initialize with empty arrays to allow adding new items
      setFarmTypes([]);
      setCrops([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, action, item = null) => {
    setModalType(type);
    setModalAction(action);
    setCurrentItem(item);

    if (action === "add") {
      setFormData({ name: "", description: "" });
    } else {
      setFormData({
        name: item.name,
        description: item.description || "",
      });
    }

    setModalVisible(true);
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (): Promise<void> => {
    if (!formData.name || !formData.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      console.log("Adding item with form data:", formData);

      // Validate the form data strictly
      if (!formData.name || formData.name.trim().length === 0) {
        throw new Error("Name cannot be empty");
      }

      const itemData = {
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : "",
      };

      console.log("Clean itemData:", itemData);

      const isConnected = await isOnline();
      let newItem: FarmType | Crop;

      if (modalType === "farmType") {
        if (isConnected) {
          // Online: create directly via API
          const response = await createFarmType(itemData);
          newItem = response.data;
          setFarmTypes([...farmTypes, newItem]);
        } else {
          try {
            console.log("Creating offline farm type...");
            newItem = await saveOfflineFarmType(itemData);
            console.log("Created farm type successfully:", newItem);

            // Only update state if we got a valid response
            if (newItem && newItem.id) {
              setFarmTypes((current) => [...current, newItem]);
              Alert.alert(
                "Saved Offline",
                "This farm type is saved on your device and will sync when you reconnect."
              );
            } else {
              throw new Error("Failed to save farm type");
            }
          } catch (dbError) {
            console.error("Database error creating farm type:", dbError);
            Alert.alert(
              "Database Error",
              `Could not save farm type: ${dbError.message}`
            );
            throw dbError;
          }
        }
      } else if (modalType === "crop") {
        if (isConnected) {
          // Online: create directly via API
          const response = await createCrop(itemData);
          newItem = response.data;
          setCrops([...crops, newItem]);
        } else {
          // Offline: save to local database
          newItem = await saveOfflineCrop(itemData);
          setCrops([...crops, newItem]);
          Alert.alert(
            "Saved Offline",
            "This crop is saved on your device and will sync when you reconnect."
          );
        }
      }

      setFormData({ name: "", description: "" });
    } catch (error) {
      console.error(`Error in handleAddItem for ${modalType}:`, error);
      Alert.alert("Error", `Failed to create ${modalType}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      if (modalAction === "add") {
        await handleAddItem();
        return;
      }

      if (modalType === "farmType") {
        const response = await updateFarmType(currentItem.id, formData);
        const updatedFarmTypes = farmTypes.map((item) =>
          item.id === currentItem.id ? response.data : item
        );
        setFarmTypes(updatedFarmTypes);
      } else if (modalType === "crop") {
        const response = await updateCrop(currentItem.id, formData);
        const updatedCrops = crops.map((item) =>
          item.id === currentItem.id ? response.data : item
        );
        setCrops(updatedCrops);
      }
    } catch (error) {
      console.error(`Error updating ${modalType}:`, error);
      Alert.alert("Error", `Failed to update ${modalType}. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    type: "farmType" | "crop",
    item: FarmType | Crop
  ): Promise<void> => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete this ${
        type === "farmType" ? "farm type" : "crop"
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (type === "farmType") {
                await deleteFarmType(item.id);
                setFarmTypes((prev) => prev.filter((ft) => ft.id !== item.id));
              } else {
                await deleteCrop(item.id);
                setCrops((prev) => prev.filter((c) => c.id !== item.id));
              }
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const renderSyncStatus = (item: FarmType | Crop) => {
    if (item.is_synced === 0 || item.is_synced === false) {
      return (
        <View style={styles.syncStatusContainer}>
          <Text style={styles.syncStatusText}>Offline</Text>
        </View>
      );
    }
    return null;
  };

  const renderFarmTypeItem = ({ item }: { item: FarmType }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>

      {renderSyncStatus(item)}

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
          onPress={() => openModal("farmType", "edit", item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#F44336" }]}
          onPress={() => handleDelete("farmType", item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCropItem = ({ item }: { item: Crop }) => (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
          onPress={() => openModal("crop", "edit", item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#F44336" }]}
          onPress={() => handleDelete("crop", item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const testDatabase = async () => {
    try {
      setLoading(true);
      const result = await testDatabaseConnection();

      if (result.success) {
        Alert.alert("Database Test", "Database is working correctly!");
      } else {
        Alert.alert("Database Error", result.message);
      }
    } catch (error) {
      console.error("Error testing database:", error);
      Alert.alert("Error", "Failed to test database");
    } finally {
      setLoading(false);
    }
  };

  const populateDatabase = async () => {
    try {
      setLoading(true);
      const result = await populateTestData();

      if (result) {
        Alert.alert(
          "Success",
          "Test data added to the database. Refreshing..."
        );
        await loadData(); // Reload data from database
      } else {
        Alert.alert("Error", "Failed to add test data");
      }
    } catch (error) {
      console.error("Error populating database:", error);
      Alert.alert("Error", "Failed to populate database");
    } finally {
      setLoading(false);
    }
  };

  const testOfflineMode = async () => {
    try {
      setLoading(true);

      // First check if we have data in the database
      const {
        getFarmTypesFromDB,
        getCropsFromDB,
      } = require("../../../services/database");
      const localFarmTypes = await getFarmTypesFromDB();
      const localCrops = await getCropsFromDB();

      console.log(
        "Local data:",
        localFarmTypes?.length || 0,
        "farm types,",
        localCrops?.length || 0,
        "crops"
      );

      // Force offline mode temporarily and reload data
      setOnline(false);

      // Load directly from database as if offline
      if (localFarmTypes && localFarmTypes.length > 0) {
        setFarmTypes(localFarmTypes);
      }

      if (localCrops && localCrops.length > 0) {
        setCrops(localCrops);
      }

      Alert.alert(
        "Offline Test Mode",
        `Loaded ${localFarmTypes?.length || 0} farm types and ${
          localCrops?.length || 0
        } crops from local database`
      );
    } catch (error) {
      console.error("Error testing offline mode:", error);
      Alert.alert("Error", "Failed to test offline mode");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);

      // Check if online
      const isConnected = await isOnline();
      if (!isConnected) {
        Alert.alert("Offline", "You need to be online to sync data");
        setLoading(false);
        return;
      }

      // Run the sync process
      console.log("Starting sync process...");
      const result = await syncAllData();

      if (result.success) {
        Alert.alert(
          "Sync Complete",
          `Synced ${result.uploads.farmTypes} farm types and ${result.uploads.crops} crops to server.\n\nFetched ${result.downloads.farmTypes} farm types and ${result.downloads.crops} crops from server.`
        );

        // Reload data to reflect sync changes
        await loadData();
      } else {
        Alert.alert("Sync Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error during sync:", error);
      Alert.alert("Sync Error", error.message || "Failed to sync with server");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading configuration options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Config</Text>

        <View style={styles.headerActions}>
          <SyncIndicator isOnline={online} onSync={loadData} />

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("ManageUsers")}
          >
            <Ionicons name="people-outline" size={22} color="#007bff" />
            <Text style={styles.headerButtonText}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleSync}>
            <Ionicons name="sync-outline" size={22} color="#007bff" />
            <Text style={styles.headerButtonText}>Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#dc3545" />
            <Text style={[styles.headerButtonText, { color: "#dc3545" }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "farmTypes" && styles.activeTab]}
          onPress={() => setActiveTab("farmTypes")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "farmTypes" && styles.activeTabText,
            ]}
          >
            Farm Types
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "crops" && styles.activeTab]}
          onPress={() => setActiveTab("crops")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "crops" && styles.activeTabText,
            ]}
          >
            Crops
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === "farmTypes" && (
          <>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openModal("farmType", "add")}
            >
              <Text style={styles.addButtonText}>Add Farm Type</Text>
            </TouchableOpacity>

            {farmTypes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No farm types available</Text>
              </View>
            ) : (
              <FlatList
                data={farmTypes}
                renderItem={renderFarmTypeItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
              />
            )}
          </>
        )}

        {activeTab === "crops" && (
          <>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openModal("crop", "add")}
            >
              <Text style={styles.addButtonText}>Add Crop</Text>
            </TouchableOpacity>

            {crops.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No crops available</Text>
              </View>
            ) : (
              <FlatList
                data={crops}
                renderItem={renderCropItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
              />
            )}
          </>
        )}
      </View>

      {/* <TouchableOpacity
        style={styles.manageUsersButton}
        onPress={() => navigation.navigate('ManageUsers')}
      >
        <Text style={styles.manageUsersButtonText}>Manage Users</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity> */}

      {/* Test buttons - commented out for production */}
      {/* 
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF9800', marginTop: 10 }]}
        onPress={testDatabase}
      >
        <Text style={styles.buttonText}>Test Database</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4CAF50', marginTop: 10 }]}
        onPress={populateDatabase}
      >
        <Text style={styles.buttonText}>Add Test Data</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#607D8B', marginTop: 10 }]}
        onPress={testOfflineMode}
      >
        <Text style={styles.buttonText}>Test Offline Mode</Text>
      </TouchableOpacity>
      */}

      {/* Keep the sync button visible for production use */}
      {/* <TouchableOpacity
        style={[styles.button, { backgroundColor: '#2196F3', marginTop: 10 }]}
        onPress={handleSync}
      >
        <Text style={styles.buttonText}>Sync with Server</Text>
      </TouchableOpacity> */}

      {/* Modal for adding/editing items */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalAction === "add" ? "Add" : "Edit"}
              {modalType === "farmType" ? " Farm Type" : " Crop"}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange("name", value)}
            />

            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description (optional)"
              value={formData.description}
              onChangeText={(value) => handleInputChange("description", value)}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={modalAction === "add" ? handleAddItem : handleSubmit}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...globalStyles.container,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  title: {
    ...globalStyles.heading,
    fontSize: 22,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: COLORS.light,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    ...globalStyles.text,
    fontSize: 16,
    color: COLORS.secondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    ...globalStyles.card,
  },
  addButton: {
    backgroundColor: "#007bff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  list: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemContent: {
    marginBottom: 12,
  },
  itemName: {
    ...globalStyles.text,
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 4,
  },
  itemDescription: {
    ...globalStyles.text,
    fontSize: 14,
    color: COLORS.secondary,
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  manageUsersButton: {
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  manageUsersButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#6c757d",
  },
  syncStatusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#212529",
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary,
    marginTop: 2,
  },
});

export default ConfigOptionsScreen;
