const fs = require('fs');
const path = require('path');

/**
 * Export JSON data to CSV for editing in Excel/Google Sheets
 * CSV files are temporary - JSON remains source of truth
 */

function jsonToCSV(data, filename) {
  if (!data || data.length === 0) {
    console.log(`⚠️  No data to export for ${filename}`);
    return;
  }

  // Get all unique fields from all objects
  const allFields = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => allFields.add(key));
  });
  const fields = Array.from(allFields);

  // Create CSV header
  const header = fields.join(',');

  // Create CSV rows
  const rows = data.map(item => {
    return fields.map(field => {
      let value = item[field];
      
      // Handle different types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and escape
      value = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });

  const csv = [header, ...rows].join('\n');
  const outputPath = path.join(__dirname, '..', 'data', filename);
  
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`✅ Exported ${data.length} items to ${filename}`);
}

function convertVariablesToArray(variables) {
  // Convert variables object to array format for CSV
  return Object.entries(variables).map(([key, value]) => ({
    key: key,
    value: value
  }));
}

// Main export
console.log('📤 Exporting JSON to CSV...\n');

const dataDir = path.join(__dirname, '..', 'data');
const csvDir = path.join(dataDir, 'csv');

// Create csv directory if it doesn't exist
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
  console.log('📁 Created csv directory\n');
}

// Export elements
const elements = JSON.parse(fs.readFileSync(path.join(dataDir, 'elements.json'), 'utf8'));
const elementsOutput = path.join(csvDir, 'elements.csv');
const header1 = Object.keys(elements[0]).join(',');
const rows1 = elements.map(item => {
  return Object.keys(elements[0]).map(field => {
    let value = item[field];
    if (value === null || value === undefined) return '';
    value = String(value);
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }).join(',');
});
fs.writeFileSync(elementsOutput, [header1, ...rows1].join('\n'), 'utf8');
console.log(`✅ Exported ${elements.length} items to csv/elements.csv`);

// Export connections
const connections = JSON.parse(fs.readFileSync(path.join(dataDir, 'connections.json'), 'utf8'));
const connectionsOutput = path.join(csvDir, 'connections.csv');
const header2 = Object.keys(connections[0]).join(',');
const rows2 = connections.map(item => {
  return Object.keys(connections[0]).map(field => {
    let value = item[field];
    if (value === null || value === undefined) return '';
    value = String(value);
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }).join(',');
});
fs.writeFileSync(connectionsOutput, [header2, ...rows2].join('\n'), 'utf8');
console.log(`✅ Exported ${connections.length} items to csv/connections.csv`);

// Export variables
const variables = JSON.parse(fs.readFileSync(path.join(dataDir, 'variables.json'), 'utf8'));
const variablesArray = convertVariablesToArray(variables);
const variablesOutput = path.join(csvDir, 'variables.csv');
const header3 = 'key,value';
const rows3 = variablesArray.map(item => {
  let key = String(item.key);
  let value = String(item.value);
  if (key.includes(',') || key.includes('"')) {
    key = '"' + key.replace(/"/g, '""') + '"';
  }
  return `${key},${value}`;
});
fs.writeFileSync(variablesOutput, [header3, ...rows3].join('\n'), 'utf8');
console.log(`✅ Exported ${variablesArray.length} items to csv/variables.csv`);

console.log('\n✨ Export complete!');
console.log('\n📝 Next steps:');
console.log('1. Open data/csv/elements.csv, connections.csv, or variables.csv in Google Sheets/Excel');
console.log('2. Make your edits');
console.log('3. Export as CSV (same filename)');
console.log('4. Run: npm run import:csv');
console.log('\n⚠️  CSV files are temporary - they are ignored by git');
