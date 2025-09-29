# Test Scripts

This folder contains various test scripts and debug utilities for the Workflow Visualizer application.

## Test Scripts (Node.js)

### 1. `verify-sync.js`
**Purpose**: Comprehensive data synchronization verification between JSON files and the API
**Usage**: `node tests/verify-sync.js`
**Description**: 
- Checks JSON file integrity and consistency
- Verifies API server functionality
- Compares data between files and API responses
- Analyzes workflow structure and validates references
- Provides detailed reporting

### 2. `test-data-sync.js`
**Purpose**: Simple data validation and consistency check
**Usage**: `node tests/test-data-sync.js`
**Description**:
- Validates JSON file structure
- Checks element/connection relationships
- Verifies variable references
- Quick data integrity check

### 3. `test-api-simple.js`
**Purpose**: Basic API endpoint testing
**Usage**: `node tests/test-api-simple.js`
**Description**:
- Tests API health endpoint
- Tests workflow data loading endpoint
- Basic connectivity verification

### 4. `test-api.js`
**Purpose**: Browser-based API testing (legacy)
**Usage**: Run in browser console or include in HTML page
**Description**:
- Frontend API testing
- Save/load workflow testing
- Browser environment testing

## Debug Utilities

### 5. `debug-clear-cache.js`
**Purpose**: Clear localStorage and force fresh start
**Usage**: Run in browser console: `copy and paste script contents`
**Description**:
- Clears cached workflow data from localStorage
- Forces page reload for clean state
- Useful for testing fresh data loading

### 6. `debug-test-data.js`
**Purpose**: Sample test data for development
**Usage**: `import { testData } from './tests/debug-test-data.js'`
**Description**:
- Provides minimal test dataset
- Sample elements, connections, and variables
- Useful for isolated testing

### 7. `debug-test-table.js`
**Purpose**: Table modification testing
**Usage**: Run in browser console when app is loaded
**Description**:
- Tests direct table data modification
- Verifies updateFromTable functionality
- Debug table state changes

## Running Tests

### Prerequisites
- Node.js server running on port 3001: `npm run server`
- Vite dev server running on port 5174: `npm run dev`

### Quick Test Suite
```bash
# Run comprehensive verification
npm run test        # or: node tests/verify-sync.js

# Run basic data check
npm run test:data   # or: node tests/test-data-sync.js

# Run API connectivity test
npm run test:api    # or: node tests/test-api-simple.js

# Debug utilities (copy script contents to browser console)
npm run debug:cache # Clear localStorage cache
npm run debug:table # Test table modifications
```

## Test Scenarios

### Data Integrity
- JSON file validation
- Element/connection consistency
- Variable reference validation
- Data structure compliance

### API Functionality
- Health endpoint availability
- Data loading/saving operations
- Error handling
- Response format validation

### Frontend Debugging
- localStorage cache clearing
- Table modification testing
- Sample data injection
- Browser console utilities

### Integration Testing
- Frontend-backend communication
- File system data access
- Real-time data synchronization
- Cross-browser compatibility

## Troubleshooting

### Common Issues
1. **API Connection Failed**: Ensure server is running on port 3001
2. **File Access Denied**: Check file permissions in data/ directory
3. **Module Import Errors**: Verify Node.js version and module format
4. **Cache Issues**: Run debug-clear-cache.js in browser console
5. **Table Updates Not Working**: Use debug-test-table.js to verify

### Debug Information
Tests provide detailed console output including:
- Element and connection counts
- Variable values and references
- API response data
- Error messages with context

## Maintenance

These tests should be run:
- After any data model changes
- Before deploying new versions
- When debugging sync issues
- After modifying API endpoints

Last updated: September 29, 2025
