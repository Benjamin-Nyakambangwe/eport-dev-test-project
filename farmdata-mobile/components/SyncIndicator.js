import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

const SyncIndicator = ({ isOnline, isSyncing, onSync }) => {
  return (
    <View style={styles.container}>
      <View style={[
        styles.statusIndicator,
        { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }
      ]} />
      <Text style={styles.statusText}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
      {/* {isOnline && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </TouchableOpacity>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SyncIndicator;