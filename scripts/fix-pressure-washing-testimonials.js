const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/i18n/locales/en.json');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

// Fix the testimonials structure to match other industries
if (data.industries?.pressureWashing?.testimonials && Array.isArray(data.industries.pressureWashing.testimonials)) {
  data.industries.pressureWashing.testimonials = {
    title: "Real Results from Pressure Washing Professionals",
    testimonials: data.industries.pressureWashing.testimonials
  };
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Fixed pressure washing testimonials structure');
