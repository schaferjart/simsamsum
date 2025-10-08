# Important: How Variables Work & When to Recalculate

## ✅ What Was Fixed

### 1. **Removed `variable` column from elements.json**
The old `variable` field in elements is no longer needed. Probabilities now live in:
- **connections.json** (the probability values)
- **variables.json** (non-default probabilities for reference)

### 2. **Why Values Don't Update Automatically**

When you manually edit `variables.json`:
- ❌ `elements.json` static values DON'T auto-update
- ✅ The app DOES recalculate on page load
- ✅ The app DOES recalculate when you edit through the UI

**This is by design** - JSON files store snapshots, not live formulas.

---

## 🔄 Two Ways to Update Values

### Method 1: Edit Through the UI (Recommended)
```
1. Open the app in browser
2. Edit values in the Variables table
3. Values recalculate INSTANTLY
4. Click "Save to Server" to persist
```

✅ **Immediate feedback**  
✅ **Live recalculation**  
✅ **No manual steps**

### Method 2: Edit JSON Files Manually
```bash
1. Edit data/variables.json manually
2. Run: npm run recalculate
3. Reload browser to see changes
```

✅ **Good for bulk edits**  
✅ **Good for scripts/automation**  
⚠️ **Requires recalculation step**

---

## 📝 The Recalculation Script

### When You Changed variables.json

You changed `text_application->pre_call_sms` from `0.8` to `0.4`

**What happened:**
1. ✅ `variables.json` saved with new value `0.4`
2. ❌ `elements.json` still had old calculated volumes
3. ❌ Browser showed old values from `elements.json`

**The fix:**
```bash
npm run recalculate
```

This script:
1. Reads current `variables.json`, `connections.json`, `elements.json`
2. Recalculates all volumes using new probability values
3. Updates `elements.json` with new volumes
4. Shows you what changed

**Output from your change (0.8 → 0.4):**
```
📊 Source node indeed: incoming_volume × 1 = 10000
📈 Flow: text_application(10000) → pre_call_sms: 10000 × 0.4 = 4000 ✅ (was 8000)
📈 Flow: text_application(10000) → pre_video_mail: 10000 × 0.6 = 6000 ✅ (was 2000)
```

---

## 🎯 Understanding the Data Flow

### Stored in JSON Files
```json
// connections.json - The probability definition
{ "fromId": "text_application", "toId": "pre_call_sms", "probability": ".8" }

// variables.json - For reference and expressions
{ "text_application->pre_call_sms": 0.8 }

// elements.json - Calculated results (snapshots)
{ "id": "pre_call_sms", "incomingNumber": 8000, "effectiveCost": 1600 }
```

### When App Loads
```javascript
1. Load all JSON files
2. Run computeDerivedFields()
3. Calculate volumes: indeed(10000) → text_app(10000) → pre_call(8000)
4. Display calculated values (overriding static JSON values)
```

### When You Edit in UI
```javascript
1. User changes variable in table
2. core.updateFromTable('variables', newValues)
3. computeDerivedFields() runs immediately
4. UI updates with new values
5. Save button writes to JSON files
```

### When You Edit JSON Manually
```javascript
1. User edits variables.json manually
2. ❌ No trigger to recalculate
3. elements.json still has old values
4. Must run: npm run recalculate
5. Then reload browser
```

---

## 🚀 Quick Reference

### I want to change a probability value

**Option A: Through UI**
```
1. Open app
2. Variables table → change value
3. See results immediately
4. Click "Save to Server"
```

**Option B: Edit JSON**
```bash
1. Edit data/variables.json
2. npm run recalculate
3. Reload browser
```

### I want to see if my expression works

**Test it:**
```bash
npm run test:expressions
```

**Or test specific scenario:**
```bash
npm run test:volumes
```

### I want to bulk update many values

**Best approach:**
```bash
1. Edit data/variables.json with all changes
2. npm run recalculate
3. Commit changes
4. Team members pull and reload browser
```

---

## 📋 Available Commands

```bash
# Recalculate volumes after editing variables.json
npm run recalculate

# Run all tests
npm test

# Test expression handling
npm run test:expressions

# Test volume calculations
npm run test:volumes

# Start dev server
npm run dev

# Start API server
npm run server
```

---

## 💡 Pro Tips

1. **Edit through UI for single changes** - Instant feedback
2. **Edit JSON for bulk changes** - Then `npm run recalculate`
3. **Always reload browser** after `npm run recalculate`
4. **Check the console** - The script shows exactly what changed
5. **Source nodes keep their references** - `indeed: "incoming_volume"` stays that way

---

## 🔍 Example Workflow

**Scenario:** You want to test what happens if callback rate drops from 0.4 to 0.2

**Steps:**
```bash
1. Edit data/variables.json:
   "call_back_rate": 0.2  # was 0.4

2. npm run recalculate

3. Check output:
   ✏️  HP Interview Callback
       Incoming: 5.88 → 2.94
   ✏️  LP Interview Callback  
       Incoming: 5.56 → 2.78
   ...

4. Reload browser to see changes

5. If satisfied, commit the changes
```

---

## ⚠️ Important Notes

- **`variable` field removed** - No longer in elements.json
- **Calculations are snapshots** - JSON files store results, not formulas
- **UI does live calc** - Editing through UI recalculates immediately
- **Manual edits need recalc** - Run `npm run recalculate` after editing JSON
- **Always reload browser** - After running recalculation script

---

## 🎉 Summary

✅ **Removed variable column** from elements.json  
✅ **Created recalculation script** (`npm run recalculate`)  
✅ **Two workflows supported:**
- Edit in UI → Immediate updates
- Edit JSON → Run script → Reload browser

**Your change (0.8 → 0.4) is now applied!** 🚀
