const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/i18n/locales/en.json');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find line 1278 (index 1277) which contains the minified pressureWashing object
const targetLineIndex = 1277;
const minifiedLine = lines[targetLineIndex];

// Extract just the value part after "pressureWashing": 
const match = minifiedLine.match(/"pressureWashing":\s*(\{.*\})/);
if (!match) {
  console.error('❌ Could not find pressureWashing object');
  process.exit(1);
}

// Parse the minified JSON object
const pressureWashingObj = JSON.parse(match[1]);

// Fix the testimonials structure to match other industries
if (Array.isArray(pressureWashingObj.testimonials)) {
  pressureWashingObj.testimonials = {
    title: "Real Results from Pressure Washing Professionals",
    testimonials: pressureWashingObj.testimonials
  };
  console.log('✅ Fixed testimonials structure');
}

// Stringify with proper formatting (2 spaces)
const formattedJson = JSON.stringify(pressureWashingObj, null, 2);

// Split into lines and indent each line by 4 spaces (to match the nesting level in the file)
const formattedLines = formattedJson.split('\n').map((line, index) => {
  if (index === 0) {
    return '    "pressureWashing": ' + line;
  }
  return '    ' + line;
});

// Replace line 1278 with the formatted version
lines[targetLineIndex] = formattedLines.join('\n');

// Write back to file
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Rewrote pressureWashing section with proper formatting');
console.log(`📊 Expanded from 1 line to ${formattedLines.length} lines`);
