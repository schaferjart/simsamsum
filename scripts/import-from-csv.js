const fs = require('fs');
const path = require('path');

/**
 * Import CSV edits back to JSON
 * Validates data and preserves types
 */

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`⚠️  Row ${i + 1} has ${values.length} values but expected ${headers.length} - skipping`);
      continue;
    }

    const item = {};
    headers.forEach((header, index) => {
      item[header] = parseValue(values[index]);
    });
    data.push(item);
  }

  return data;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current); // Last field
  return values;
}

function parseValue(value) {
  // Try to parse as number
  if (value === '') return null;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }
  // Check for boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  // Return as string
  return value;
}

function convertVariablesToObject(variablesArray) {
  // Convert variables array back to object format
  const obj = {};
  variablesArray.forEach(item => {
    obj[item.key] = item.value;
  });
  return obj;
}

function validateElements(elements) {
  const errors = [];
  const ids = new Set();

  elements.forEach((el, index) => {
    // Check required fields
    if (!el.id) {
      errors.push(`Row ${index + 2}: Missing 'id' field`);
    } else if (ids.has(el.id)) {
      errors.push(`Row ${index + 2}: Duplicate id '${el.id}'`);
    } else {
      ids.add(el.id);
    }

    if (!el.name) {
      errors.push(`Row ${index + 2}: Missing 'name' field for id '${el.id}'`);
    }
  });

  return errors;
}

function validateConnections(connections, elementIds) {
  const errors = [];
  const connIds = new Set();

  connections.forEach((conn, index) => {
    // Check required fields
    if (!conn.id) {
      errors.push(`Row ${index + 2}: Missing 'id' field`);
    } else if (connIds.has(conn.id)) {
      errors.push(`Row ${index + 2}: Duplicate connection id '${conn.id}'`);
    } else {
      connIds.add(conn.id);
    }

    // Validate references
    if (!conn.fromId) {
      errors.push(`Row ${index + 2}: Missing 'fromId' for connection '${conn.id}'`);
    } else if (!elementIds.has(conn.fromId)) {
      errors.push(`Row ${index + 2}: fromId '${conn.fromId}' not found in elements`);
    }

    if (!conn.toId) {
      errors.push(`Row ${index + 2}: Missing 'toId' for connection '${conn.id}'`);
    } else if (!elementIds.has(conn.toId)) {
      errors.push(`Row ${index + 2}: toId '${conn.toId}' not found in elements`);
    }
  });

  return errors;
}

// Main import
console.log('📥 Importing CSV to JSON...\n');

const dataDir = path.join(__dirname, '..', 'data');
const csvDir = path.join(dataDir, 'csv');

try {
  // Import elements
  const elementsCsvPath = path.join(csvDir, 'elements.csv');
  if (!fs.existsSync(elementsCsvPath)) {
    console.error('❌ Error: csv/elements.csv not found');
    console.error('   Run "npm run export:csv" first to create CSV files');
    process.exit(1);
  }

  const elementsCsv = fs.readFileSync(elementsCsvPath, 'utf8');
  const elements = parseCSV(elementsCsv);
  console.log(`📊 Parsed ${elements.length} elements`);

  // Validate elements
  const elementErrors = validateElements(elements);
  if (elementErrors.length > 0) {
    console.error('\n❌ Element validation errors:');
    elementErrors.forEach(err => console.error(`   ${err}`));
    process.exit(1);
  }

  // Import connections
  const connectionsCsvPath = path.join(csvDir, 'connections.csv');
  if (!fs.existsSync(connectionsCsvPath)) {
    console.error('❌ Error: csv/connections.csv not found');
    process.exit(1);
  }

  const connectionsCsv = fs.readFileSync(connectionsCsvPath, 'utf8');
  const connections = parseCSV(connectionsCsv);
  console.log(`📊 Parsed ${connections.length} connections`);

  // Validate connections
  const elementIds = new Set(elements.map(e => e.id));
  const connectionErrors = validateConnections(connections, elementIds);
  if (connectionErrors.length > 0) {
    console.error('\n❌ Connection validation errors:');
    connectionErrors.forEach(err => console.error(`   ${err}`));
    process.exit(1);
  }

  // Import variables
  const variablesCsvPath = path.join(csvDir, 'variables.csv');
  if (!fs.existsSync(variablesCsvPath)) {
    console.error('❌ Error: csv/variables.csv not found');
    process.exit(1);
  }

  const variablesCsv = fs.readFileSync(variablesCsvPath, 'utf8');
  const variablesArray = parseCSV(variablesCsv);
  const variables = convertVariablesToObject(variablesArray);
  console.log(`📊 Parsed ${variablesArray.length} variables`);

  // Backup existing JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  fs.copyFileSync(
    path.join(dataDir, 'elements.json'),
    path.join(dataDir, `elements.backup.${timestamp}.json`)
  );
  fs.copyFileSync(
    path.join(dataDir, 'connections.json'),
    path.join(dataDir, `connections.backup.${timestamp}.json`)
  );
  fs.copyFileSync(
    path.join(dataDir, 'variables.json'),
    path.join(dataDir, `variables.backup.${timestamp}.json`)
  );
  console.log(`\n💾 Backed up existing JSON files (${timestamp})`);

  // Write new JSON
  fs.writeFileSync(
    path.join(dataDir, 'elements.json'),
    JSON.stringify(elements, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'connections.json'),
    JSON.stringify(connections, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'variables.json'),
    JSON.stringify(variables, null, 2),
    'utf8'
  );

  console.log('\n✅ Import complete!');
  console.log(`   Elements: ${elements.length}`);
  console.log(`   Connections: ${connections.length}`);
  console.log(`   Variables: ${variablesArray.length}`);
  console.log('\n📝 Next steps:');
  console.log('1. Reload the app in browser to see changes');
  console.log('2. Run "npm run test:data" to verify data integrity');
  console.log('3. Delete CSV files or run "npm run export:csv" again for next edit');

} catch (error) {
  console.error('\n❌ Import failed:', error.message);
  process.exit(1);
}
