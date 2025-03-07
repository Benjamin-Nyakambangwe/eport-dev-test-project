// services/database.js

import * as SQLite from 'expo-sqlite';
import { generateUUID } from './utils';

// Database reference
let db = null;

// Drop and recreate all tables
export const resetDatabase = async () => {
  try {
    console.log('Completely resetting database...');
    db = await SQLite.openDatabaseAsync('farmdata.db');
    
    // Drop tables if they exist
    await db.execAsync('DROP TABLE IF EXISTS farm_types');
    await db.execAsync('DROP TABLE IF EXISTS crops');
    await db.execAsync('DROP TABLE IF EXISTS farmer_data');
    
    console.log('Tables dropped, now recreating from scratch');
    
    // Recreate tables with reliable schema
    await db.execAsync(`
      CREATE TABLE farm_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT,
        local_id TEXT,
        is_synced INTEGER DEFAULT 1
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE crops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
        created_at TEXT,
        local_id TEXT,
        is_synced INTEGER DEFAULT 1
      )
    `);
    
    await db.execAsync(`
      CREATE TABLE farmer_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        farm_type_id INTEGER NOT NULL,
        crop_id INTEGER NOT NULL,
        location TEXT,
        created_at TEXT,
        local_id TEXT,
          is_synced INTEGER DEFAULT 0
      )
    `);
    
    console.log('Database has been completely reset and tables recreated');
    return true;
  } catch (error) {
    console.error('Fatal error resetting database:', error);
    return false;
  }
};

// Initialize database - ONLY create tables if they don't exist
export const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Check if tables already exist before creating
    const tableCheck = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('farm_types', 'crops', 'farmer_data')
    `);
    
    // If we already have all tables, just return
    if (tableCheck.rows?.length === 3) {
      console.log('Database already initialized, tables exist');
      return true;
    }
    
    console.log('Creating missing tables...');
    
    // Create farm_types table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS farm_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT,
        local_id TEXT,
        is_synced INTEGER DEFAULT 1
      )
    `);
    
    // Create crops table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS crops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
        created_at TEXT,
        local_id TEXT,
        is_synced INTEGER DEFAULT 1
      )
    `);
    
    // Create farmer_data table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS farmer_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmer_name TEXT NOT NULL,
          national_id TEXT NOT NULL,
          farm_type_id INTEGER NOT NULL,
          crop_id INTEGER NOT NULL,
        location TEXT,
        created_at TEXT,
        local_id TEXT,
        is_synced INTEGER DEFAULT 0
      )
    `);
    
    console.log('Database initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Updated saveOfflineFarmType to use direct SQL insertion instead of parameter binding
export const saveOfflineFarmType = async (farmType) => {
  try {
    console.log('Saving farm type with direct SQL:', farmType);
    
    if (!farmType || !farmType.name || !farmType.name.trim()) {
      throw new Error('Farm type name is required');
    }
    
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Sanitize input values (escape single quotes)
    const name = farmType.name.trim().replace(/'/g, "''");
    const description = (farmType.description ? farmType.description.trim() : '').replace(/'/g, "''");
    
    // Use direct SQL insertion instead of parameter binding
    const sql = `INSERT INTO farm_types (name, description, is_synced) VALUES ('${name}', '${description}', 0)`;
    console.log(`Executing direct SQL: ${sql}`);
    
    await db.execAsync(sql);
    
    // Get the ID of the inserted item
    const result = await db.getAllAsync('SELECT last_insert_rowid() as id');
    console.log('Insert result:', result);
    
    // Handle different result formats
    let id;
    if (Array.isArray(result) && result.length > 0) {
      id = result[0].id;
    } else if (result.rows && result.rows.length > 0) {
      id = result.rows[0].id;
    } else {
      console.warn('Could not get last insert ID, using temp ID');
      id = Date.now(); // Fallback ID
    }
    
    console.log(`Successfully saved farm type with ID ${id}`);
    return { 
      id, 
      name: farmType.name.trim(), 
      description: farmType.description ? farmType.description.trim() : '', 
      is_synced: 0 
    };
  } catch (error) {
    console.error('Error in saveOfflineFarmType:', error);
    throw new Error(`Could not save farm type: ${error.message}`);
  }
};

// Updated saveOfflineCrop to use direct SQL insertion
export const saveOfflineCrop = async (crop) => {
  try {
    console.log('Saving crop with direct SQL:', crop);
    
    if (!crop || !crop.name || !crop.name.trim()) {
      throw new Error('Crop name is required');
    }
    
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Sanitize input values
    const name = crop.name.trim().replace(/'/g, "''");
    const description = (crop.description ? crop.description.trim() : '').replace(/'/g, "''");
    
    // Use direct SQL insertion
    const sql = `INSERT INTO crops (name, description, is_synced) VALUES ('${name}', '${description}', 0)`;
    console.log(`Executing direct SQL: ${sql}`);
    
    await db.execAsync(sql);
    
    // Get the ID of the inserted item
    const result = await db.getAllAsync('SELECT last_insert_rowid() as id');
    
    // Handle different result formats
    let id;
    if (Array.isArray(result) && result.length > 0) {
      id = result[0].id;
    } else if (result.rows && result.rows.length > 0) {
      id = result.rows[0].id;
    } else {
      console.warn('Could not get last insert ID, using temp ID');
      id = Date.now(); // Fallback ID
    }
    
    console.log(`Successfully saved crop with ID ${id}`);
    return { 
      id, 
      name: crop.name.trim(), 
      description: crop.description ? crop.description.trim() : '', 
      is_synced: 0 
    };
  } catch (error) {
    console.error('Error in saveOfflineCrop:', error);
    throw new Error(`Could not save crop: ${error.message}`);
  }
};

// Get farm types from database
export const getFarmTypesFromDB = async () => {
  try {
    console.log('Getting farm types from DB...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Get all farm types from database
    const result = await db.getAllAsync('SELECT * FROM farm_types');
    console.log('DB farm types result:', result);
    
    // Handle different result formats from SQLite
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} farm types in DB`);
      return result;
    } else if (result.rows) {
      console.log(`Found ${result.rows.length} farm types in DB`);
      return result.rows;
    } else {
      console.warn('Unknown result format for farm types:', result);
      return [];
    }
  } catch (error) {
    console.error('Error getting farm types from DB:', error);
    return [];
  }
};

// Get crops from database
export const getCropsFromDB = async () => {
  try {
    console.log('Getting crops from DB...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Get all crops from database
    const result = await db.getAllAsync('SELECT * FROM crops');
    console.log('DB crops result:', result);
    
    // Handle different result formats from SQLite
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} crops in DB`);
      return result;
    } else if (result.rows) {
      console.log(`Found ${result.rows.length} crops in DB`);
      return result.rows;
    } else {
      console.warn('Unknown result format for crops:', result);
      return [];
    }
  } catch (error) {
    console.error('Error getting crops from DB:', error);
    return [];
  }
};

// List all database tables for debugging
export const listDatabaseTables = async () => {
  try {
    console.log('Listing all database tables and schema');
    
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Get list of tables
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('Tables in database:', tables.rows);
    
    // Get schema for each table
    for (const table of tables.rows) {
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(${table.name})`);
      console.log(`Schema for table ${table.name}:`, tableInfo.rows);
    }
    
    return tables.rows;
  } catch (error) {
    console.error('Error listing database tables:', error);
    return [];
  }
};

// Simple placeholder methods to maintain API compatibility
export const saveFarmTypes = async (farmTypes) => {
  try {
    if (!db) await initDatabase();
    
    for (const farmType of farmTypes) {
      await db.execAsync(
        'INSERT INTO farm_types (id, name, description, is_synced) VALUES (?, ?, ?, 1)',
        [farmType.id, farmType.name, farmType.description || '']
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error saving farm types:', error);
    return false;
  }
};

export const saveCrops = async (crops) => {
  try {
    if (!db) await initDatabase();
    
    for (const crop of crops) {
      await db.execAsync(
        'INSERT INTO crops (id, name, description, is_synced) VALUES (?, ?, ?, 1)',
        [crop.id, crop.name, crop.description || '']
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error saving crops:', error);
    return false;
  }
};

export const getUnsyncedFarmTypes = async () => {
  try {
    console.log('Getting unsynced farm types...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    const result = await db.getAllAsync('SELECT * FROM farm_types WHERE is_synced = 0');
    
    console.log('Unsynced farm types result:', result);
    
    // Handle different result formats
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} unsynced farm types`);
      return result;
    } else if (result.rows) {
      console.log(`Found ${result.rows.length} unsynced farm types`);
      return result.rows;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting unsynced farm types:', error);
    return [];
  }
};

export const getUnsyncedCrops = async () => {
  try {
    console.log('Getting unsynced crops...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    const result = await db.getAllAsync('SELECT * FROM crops WHERE is_synced = 0');
    
    // Handle different result formats
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} unsynced crops`);
      return result;
    } else if (result.rows) {
      console.log(`Found ${result.rows.length} unsynced crops`);
      return result.rows;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting unsynced crops:', error);
    return [];
  }
};

// Save farmer data to local database
export const saveFarmerData = async (data) => {
  try {
    console.log('Saving farmer data to local DB:', data);
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Generate a UUID for local tracking
    const local_id = generateUUID();
    const timestamp = new Date().toISOString();
    
    // Sanitize input values
    const farmerName = (data.farmer_name || '').replace(/'/g, "''");
    const nationalId = (data.national_id || '').replace(/'/g, "''");
    const farmTypeId = data.farm_type_id;
    const cropId = data.crop_id;
    const location = (data.location || '').replace(/'/g, "''");
    const isSynced = data.is_synced || 0;
    
    // Use direct SQL insertion
    const sql = `
      INSERT INTO farmer_data (
        farmer_name, 
        national_id, 
        farm_type_id, 
        crop_id, 
        location, 
        created_at, 
        local_id, 
        is_synced
      ) VALUES (
        '${farmerName}', 
        '${nationalId}', 
        ${farmTypeId}, 
        ${cropId}, 
        '${location}', 
        '${timestamp}', 
        '${local_id}', 
        ${isSynced}
      )
    `;
    
    console.log('Executing:', sql);
    await db.execAsync(sql);
    
    // Get the ID of the inserted record
    const result = await db.getAllAsync('SELECT last_insert_rowid() as id');
    
    // Handle different result formats
    let id;
    if (Array.isArray(result) && result.length > 0) {
      id = result[0].id;
    } else if (result.rows && result.rows.length > 0) {
      id = result.rows[0].id;
    } else {
      id = Date.now(); // Fallback ID
    }
    
    console.log(`Saved farmer data with local ID: ${id}`);
    return { 
      id, 
      local_id,
      ...data
    };
  } catch (error) {
    console.error('Error saving farmer data to local DB:', error);
    return false;
  }
};

// Get all farmer data from local database with farm type and crop names
export const getFarmerDataFromDB = async () => {
  try {
    console.log('Getting farmer data from database...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Use a JOIN query to get farm type and crop names along with farmer data
    const sql = `
      SELECT 
        fd.id, 
        fd.farmer_name, 
        fd.national_id, 
        fd.farm_type_id, 
        fd.crop_id, 
        fd.location, 
        fd.created_at,
        fd.local_id,
        fd.is_synced,
        ft.name AS farm_type_name,
        c.name AS crop_name
      FROM 
        farmer_data fd
      LEFT JOIN 
        farm_types ft ON fd.farm_type_id = ft.id
      LEFT JOIN 
        crops c ON fd.crop_id = c.id
      ORDER BY 
        fd.created_at DESC
    `;
    
    console.log('Executing SQL:', sql);
    const result = await db.getAllAsync(sql);
    
    // Handle different result formats
    let submissions = [];
    if (Array.isArray(result)) {
      submissions = result;
      console.log(`Found ${submissions.length} farmer data records`);
    } else if (result.rows) {
      submissions = result.rows;
      console.log(`Found ${submissions.rows.length} farmer data records`);
    }
    
    // Format created_at dates
    submissions = submissions.map(item => {
      // Convert created_at to a readable format if it exists
      if (item.created_at) {
        try {
          // Just in case it's not a valid date string
          const date = new Date(item.created_at);
          if (!isNaN(date)) {
            item.created_at_formatted = date.toLocaleString();
          }
        } catch (e) {
          console.warn('Error formatting date:', e);
        }
      }
      
      // Provide fallbacks for farm_type_name and crop_name if the JOIN didn't work
      if (!item.farm_type_name) {
        item.farm_type_name = `Farm Type #${item.farm_type_id}`;
      }
      
      if (!item.crop_name) {
        item.crop_name = `Crop #${item.crop_id}`;
      }
      
      return item;
    });
    
    console.log('Farmer data retrieved successfully', submissions.length);
    return submissions;
  } catch (error) {
    console.error('Error getting farmer data from database:', error);
    return [];
  }
};

// Also implement proper getUnsyncedFarmerData function
export const getUnsyncedFarmerData = async () => {
  try {
    console.log('Getting unsynced farmer data...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    const sql = `SELECT * FROM farmer_data WHERE is_synced = 0`;
    const result = await db.getAllAsync(sql);
    
    // Handle different result formats
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} unsynced farmer data records`);
      return result;
    } else if (result.rows) {
      console.log(`Found ${result.rows.length} unsynced farmer data records`);
      return result.rows;
    }
    
    return [];
  } catch (error) {
      console.error('Error getting unsynced farmer data:', error);
    return [];
  }
};

// Implement proper markFarmerDataAsSynced function
export const markFarmerDataAsSynced = async (id) => {
  try {
    console.log(`Marking farmer data ${id} as synced`);
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Use direct SQL to update
    const sql = `UPDATE farmer_data SET is_synced = 1 WHERE id = ${id}`;
    console.log('Executing:', sql);
    
    await db.execAsync(sql);
    console.log(`Farmer data ${id} marked as synced`);
    return true;
  } catch (error) {
    console.error(`Error marking farmer data ${id} as synced:`, error);
    return false;
  }
};

export const markFarmTypeAsSynced = async (id) => {
  try {
    console.log(`Marking farm type ${id} as synced`);
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Use direct SQL to update
    const sql = `UPDATE farm_types SET is_synced = 1 WHERE id = ${id}`;
    console.log('Executing:', sql);
    
    await db.execAsync(sql);
    console.log(`Farm type ${id} marked as synced`);
    return true;
  } catch (error) {
    console.error(`Error marking farm type ${id} as synced:`, error);
    return false;
  }
};

export const markCropAsSynced = async (id) => {
  try {
    console.log(`Marking crop ${id} as synced`);
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Use direct SQL to update
    const sql = `UPDATE crops SET is_synced = 1 WHERE id = ${id}`;
    console.log('Executing:', sql);
    
    await db.execAsync(sql);
    console.log(`Crop ${id} marked as synced`);
    return true;
  } catch (error) {
    console.error(`Error marking crop ${id} as synced:`, error);
    return false;
  }
};

export const upgradeDatabase = async () => true;

// Update the addToLocalDatabase function with direct value insertion
export const addToLocalDatabase = async (tableName, data, isUpdate = false) => {
  try {
    console.log(`Adding to local database (${tableName}):`, data);
    
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    if (isUpdate) {
      // Update existing record
      const updateFields = Object.keys(data)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.keys(data)
        .filter(key => key !== 'id')
        .map(key => data[key]);
      
      // Add the ID for the WHERE clause
      values.push(data.id);
      
      const sql = `UPDATE ${tableName} SET ${updateFields} WHERE id = ?`;
      console.log(`Executing: ${sql} with values:`, values);
      
      await db.execAsync(sql, values);
      console.log(`Updated ${tableName} record with ID ${data.id}`);
    } else {
      // Insert with direct value insertion (avoiding parameter binding issues)
      try {
        // Build a SQL statement with direct values
        const fields = Object.keys(data).join(', ');
        
        // Create value string with proper escaping
        const valueStrings = Object.values(data).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 1 : 0;
          
          // Escape string values (replace single quotes with two single quotes)
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        const valueString = valueStrings.join(', ');
        
        // Direct SQL insertion
        const sql = `INSERT INTO ${tableName} (${fields}) VALUES (${valueString})`;
        console.log(`Executing direct SQL: ${sql}`);
        
        await db.execAsync(sql);
        console.log(`Inserted new ${tableName} record with ID ${data.id}`);
      } catch (directInsertError) {
        console.error('Direct insert failed:', directInsertError);
        
        // Fallback to a very simple insert with just id and name
        if (data.name) {
          const simpleSql = `INSERT INTO ${tableName} (id, name, is_synced) VALUES (${data.id}, '${data.name.replace(/'/g, "''")}', 1)`;
          console.log('Trying simplified insert:', simpleSql);
          await db.execAsync(simpleSql);
          console.log(`Inserted ${tableName} record with simplified approach`);
        } else {
          throw new Error(`Cannot insert without name field`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error adding to local database (${tableName}):`, error);
    return false;
  }
};

// Test database connection and operations
export const testDatabaseConnection = async () => {
  try {
    console.log('===== RUNNING DATABASE DIAGNOSTICS =====');
    
    // 1. Make sure DB opens correctly
    if (!db) {
      console.log('Opening database...');
      db = await SQLite.openDatabaseAsync('farmdata.db');
      console.log('Database opened successfully');
    } else {
      console.log('Database was already open');
    }
    
    // 2. Create a test table
    console.log('Creating test table...');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_value TEXT,
        timestamp TEXT
      )
    `);
    console.log('Test table created');
    
    // 3. Insert test record
    const testValue = `test_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    console.log(`Inserting test value: ${testValue}`);
    await db.execAsync(
      'INSERT INTO db_test (test_value, timestamp) VALUES (?, ?)',
      [testValue, timestamp]
    );
    console.log('Test record inserted');
    
    // 4. Read back test records
    console.log('Reading test records...');
    const results = await db.getAllAsync('SELECT * FROM db_test ORDER BY id DESC LIMIT 5');
    console.log('Test records retrieved:', results);
    
    // 5. List all tables in database
    console.log('Listing all tables in database:');
    const tables = await db.getAllAsync(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `);
    console.log('Database tables:', tables);
    
    // 6. Check contents of main tables
    try {
      console.log('Checking farm_types table:');
      const farmTypes = await db.getAllAsync('SELECT * FROM farm_types');
      console.log('Farm types:', farmTypes);
      
      console.log('Checking crops table:');
      const crops = await db.getAllAsync('SELECT * FROM crops');
      console.log('Crops:', crops);
    } catch (e) {
      console.log('Error checking main tables:', e.message);
    }
    
    console.log('===== DATABASE DIAGNOSTICS COMPLETE =====');
    return {
      success: true,
      message: 'Database connection test successful',
      testValue,
      results
    };
  } catch (error) {
    console.error('DATABASE TEST FAILED:', error);
    return {
      success: false,
      message: `Database test failed: ${error.message}`,
      error
    };
  }
};

// Add this function to directly populate the database with test data
export const populateTestData = async () => {
  try {
    console.log('Populating database with test data...');
    if (!db) {
      db = await SQLite.openDatabaseAsync('farmdata.db');
    }
    
    // Clear existing data
    await db.execAsync('DELETE FROM farm_types');
    await db.execAsync('DELETE FROM crops');
    
    // Insert test farm types with DIRECT value insertion (no parameter binding)
    console.log('Inserting farm types...');
    await db.execAsync(`INSERT INTO farm_types (name, description, is_synced) VALUES ('Test Farm Type 1', 'A test farm type for offline testing', 1)`);
    await db.execAsync(`INSERT INTO farm_types (name, description, is_synced) VALUES ('Test Farm Type 2', 'Another test farm type', 1)`);
    
    // Insert test crops with DIRECT value insertion
    console.log('Inserting crops...');
    await db.execAsync(`INSERT INTO crops (name, description, is_synced) VALUES ('Test Crop 1', 'A test crop for offline testing', 1)`);
    await db.execAsync(`INSERT INTO crops (name, description, is_synced) VALUES ('Test Crop 2', 'Another test crop', 1)`);
    
    console.log('Test data inserted successfully');
    
    // Verify the data was inserted
    const farmTypesResult = await db.getAllAsync('SELECT * FROM farm_types');
    console.log('Farm types after insert:', farmTypesResult);
    
    const cropsResult = await db.getAllAsync('SELECT * FROM crops');
    console.log('Crops after insert:', cropsResult);
    
    return true;
  } catch (error) {
    console.error('Error populating test data:', error);
    return false;
  }
};

// Export everything
const DatabaseService = {
  initDatabase,
  resetDatabase,
  listDatabaseTables,
  saveFarmTypes,
  getFarmTypesFromDB,
  saveCrops,
  getCropsFromDB,
  saveFarmerData,
  getFarmerDataFromDB,
  getUnsyncedFarmerData,
  markFarmerDataAsSynced,
  saveOfflineFarmType,
  saveOfflineCrop,
  getUnsyncedFarmTypes,
  getUnsyncedCrops,
  markFarmTypeAsSynced,
  markCropAsSynced,
  upgradeDatabase,
  addToLocalDatabase,
  testDatabaseConnection,
  populateTestData
};

export default DatabaseService;