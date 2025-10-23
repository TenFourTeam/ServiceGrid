const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/i18n/locales/en.json');
console.log('📖 Reading en.json...');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

// Fix the testimonials structure to match other industries
if (data.industries?.pressureWashing?.testimonials) {
  if (Array.isArray(data.industries.pressureWashing.testimonials)) {
    console.log('🔧 Fixing testimonials structure...');
    data.industries.pressureWashing.testimonials = {
      title: "Real Results from Pressure Washing Professionals",
      testimonials: data.industries.pressureWashing.testimonials
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Pressure washing testimonials fixed successfully!');
    console.log('🌐 The /resources/pressure-washing page should now work correctly.');
  } else {
    console.log('✅ Testimonials structure is already correct!');
  }
} else {
  console.error('❌ Could not find pressureWashing testimonials in the file');
  process.exit(1);
}
