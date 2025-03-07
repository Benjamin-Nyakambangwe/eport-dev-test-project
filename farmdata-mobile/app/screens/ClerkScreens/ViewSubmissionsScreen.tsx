import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  getFarmerDataFromDB,
  getUnsyncedFarmerData,
} from "../../../services/database";
import { syncAllData, isOnline } from "../../../services/sync";
import SyncIndicator from "../../../components/SyncIndicator";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "../../../components/AuthContext";

const ViewSubmissionsScreen = () => {
  const { offlineMode } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    loadSubmissions();
    checkOnlineStatus();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !online;
      const isNowOnline = state.isConnected;

      setOnline(isNowOnline);

      if (wasOffline && isNowOnline) {
        handleAutoReconnect();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkOnlineStatus = async () => {
    const status = await isOnline();
    setOnline(status);
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      console.log("Loading submissions from local database...");
      const data = await getFarmerDataFromDB();
      console.log(`Loaded ${data?.length} submissions`);

      if (data && data.length > 0) {
        setSubmissions(data);
      } else {
        console.log("No submissions found");
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error loading submissions:", error);
      Alert.alert("Error", "Failed to load submissions: " + error.message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log("Starting sync process for farmer data...");

      const isNetworkAvailable = await isOnline();
      if (!isNetworkAvailable) {
        Alert.alert("Offline Mode", "You need to be online to sync data");
        setSyncing(false);
        return;
      }

      const unsyncedCount = (await getUnsyncedFarmerData()).length;
      console.log(`Found ${unsyncedCount} unsynced farmer records to sync`);

      if (unsyncedCount === 0) {
        Alert.alert("Sync Info", "No records to sync");
        setSyncing(false);
        return;
      }

      const result = await syncAllData();

      if (result.success) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${
            result.uploads.farmerData || 0
          } farmer records\n` +
            `${result.uploads.farmTypes || 0} farm types\n` +
            `${result.uploads.crops || 0} crops`
        );

        await loadSubmissions();
      } else {
        Alert.alert("Sync Failed", result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert(
        "Sync Error",
        error.message || "An error occurred during sync"
      );
    } finally {
      setSyncing(false);
      await checkOnlineStatus();
    }
  };

  const handleAutoReconnect = async () => {
    try {
      const isNetworkAvailable = await isOnline(true);
      if (!isNetworkAvailable) return;

      console.log("Network connection restored, attempting to reconnect...");
      setReconnecting(true);

      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const userData = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");

      if (userData && (!token || offlineMode)) {
        console.log("Auto-refreshing data after reconnection...");

        await loadSubmissions();

        Alert.alert(
          "Reconnected",
          "Your device is now online and data has been refreshed.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error during auto-reconnect:", error);
    } finally {
      setReconnecting(false);
    }
  };

  const renderSubmissionItem = ({ item }) => (
    <View style={styles.card}>
      <View
        style={[
          styles.syncStatusContainer,
          { backgroundColor: item.is_synced ? "#4CAF50" : "#FFC107" },
        ]}
      >
        <Text style={styles.syncStatusText}>
          {item.is_synced ? "Synced" : "Unsynced"}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <View style={styles.cardColumn}>
            <Text style={styles.label}>Farmer Name</Text>
            <Text style={styles.value}>{item.farmer_name}</Text>
          </View>

          <View style={styles.cardColumn}>
            <Text style={styles.label}>National ID</Text>
            <Text style={styles.value}>{item.national_id}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.cardColumn}>
            <Text style={styles.label}>Farm Type</Text>
            <Text style={styles.value}>
              {item.farm_type_name || `Type #${item.farm_type_id}`}
            </Text>
          </View>

          <View style={styles.cardColumn}>
            <Text style={styles.label}>Crop</Text>
            <Text style={styles.value}>
              {item.crop_name || `Crop #${item.crop_id}`}
            </Text>
          </View>
        </View>

        {item.location ? (
          <View style={styles.locationContainer}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{item.location}</Text>
          </View>
        ) : null}

        {/* <View style={styles.timestampContainer}>
          <Text style={styles.timestamp}>
            {item.created_at_formatted ||
              new Date(item.created_at).toLocaleString()}
          </Text>
        </View> */}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submissions</Text>
        <View style={styles.headerActions}>
          {reconnecting ? (
            <View style={styles.reconnecting}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.reconnectingText}>Reconnecting...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.syncHeaderButton}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncHeaderButtonText}>Sync Now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {submissions.length > 0 ? (
        <FlatList
          data={submissions}
          renderItem={renderSubmissionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#6c757d" />
          <Text style={styles.emptyText}>
            No submissions found.{"\n"}
            Add data from the collection screen.
          </Text>
          {online && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={18} color="#fff" />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212529",
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  syncStatusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  cardContent: {
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  cardColumn: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#212529",
    fontWeight: "500",
  },
  timestampContainer: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#6c757d",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
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
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  syncButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
  },
  reconnecting: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  reconnectingText: {
    fontSize: 12,
    color: "#0066cc",
    marginLeft: 4,
  },
  syncHeaderButton: {
    backgroundColor: "#007bff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  syncHeaderButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default ViewSubmissionsScreen;
