/**
 * Test script to verify profile form submission flow
 * Run this in browser console on /settings page
 */

export const testProfileFlow = async () => {
  console.log('🧪 Testing Profile Save Flow...');
  
  // Check if we're on the settings page
  if (!window.location.pathname.includes('/settings')) {
    console.warn('⚠️ Please navigate to /settings page first');
    return false;
  }
  
  // Test form elements exist
  const nameInput = document.querySelector('input[placeholder="Your full name"]') as HTMLInputElement;
  const businessInput = document.querySelector('input[placeholder="Your business name"]') as HTMLInputElement;
  const phoneInput = document.querySelector('input[placeholder="(555) 123-4567"]') as HTMLInputElement;
  const saveButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
  
  if (!nameInput || !businessInput || !phoneInput || !saveButton) {
    console.error('❌ Form elements not found:', {
      nameInput: !!nameInput,
      businessInput: !!businessInput, 
      phoneInput: !!phoneInput,
      saveButton: !!saveButton
    });
    return false;
  }
  
  console.log('✅ All form elements found');
  
  // Fill test data
  const testData = {
    name: 'Test User',
    business: 'Test Business Co',
    phone: '(555) 123-4567'
  };
  
  nameInput.value = testData.name;
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  businessInput.value = testData.business;
  businessInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  phoneInput.value = testData.phone;
  phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log('✅ Test data filled:', testData);
  
  // Monitor network requests
  const originalFetch = window.fetch;
  let requestMade = false;
  let requestDetails: any = null;
  
  window.fetch = async (...args) => {
    const [url, options] = args;
    if (typeof url === 'string' && url.includes('profile-update')) {
      requestMade = true;
      requestDetails = { url, method: options?.method, body: options?.body };
      console.log('🌐 Profile update request detected:', requestDetails);
    }
    return originalFetch.apply(window, args);
  };
  
  // Submit form
  console.log('🚀 Submitting form...');
  saveButton.click();
  
  // Wait for request
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Restore fetch
  window.fetch = originalFetch;
  
  // Results
  if (requestMade) {
    console.log('✅ Profile update request was made successfully!');
    console.log('📋 Request details:', requestDetails);
    return true;
  } else {
    console.error('❌ No profile update request was made');
    console.log('🔍 Check browser DevTools Network tab for any errors');
    return false;
  }
};

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  (window as any).testProfileFlow = testProfileFlow;
  console.log('💡 Run testProfileFlow() in console on /settings page to test profile submission');
}