/**
 * Lightweight meta tag management utility
 * Similar pattern to BusinessLogo - reads from localStorage with props override
 */
export interface BusinessMetaData {
  name?: string;
  description?: string;
}

export function updateBusinessMeta(businessData?: BusinessMetaData) {
  // Try to get business data from localStorage (same pattern as BusinessLogo)
  let cachedBusiness: BusinessMetaData | undefined;
  try {
    const raw = localStorage.getItem('ServiceGrid-lawn-store-v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed ? parsed.data : parsed;
      const business = data?.business;
      if (business) {
        cachedBusiness = {
          name: business.name,
          description: business.description
        };
      }
    }
  } catch {
    // ignore localStorage errors
  }

  // Use props override if provided, otherwise fall back to cached data
  const name = businessData?.name || cachedBusiness?.name;
  const description = businessData?.description || cachedBusiness?.description;

  if (!name) return; // No business name available

  // Update document title
  const title = description 
    ? `${name} - ${description}`
    : `${name} - Professional Service Management`;
  document.title = title;

  // Update meta description
  const metaDescription = description || 
    'Professional service management software. Streamline scheduling, invoicing, and customer management.';
  
  // Update or create meta description
  let metaDescElement = document.querySelector('meta[name="description"]');
  if (metaDescElement) {
    metaDescElement.setAttribute('content', metaDescription);
  } else {
    metaDescElement = document.createElement('meta');
    metaDescElement.setAttribute('name', 'description');
    metaDescElement.setAttribute('content', metaDescription);
    document.head.appendChild(metaDescElement);
  }

  // Update OpenGraph title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', title);
  }

  // Update OpenGraph description
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', metaDescription);
  }

  // Update Twitter title
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute('content', title);
  } else {
    twitterTitle = document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    twitterTitle.setAttribute('content', title);
    document.head.appendChild(twitterTitle);
  }

  // Update Twitter description
  let twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterDescription) {
    twitterDescription.setAttribute('content', metaDescription);
  } else {
    twitterDescription = document.createElement('meta');
    twitterDescription.setAttribute('name', 'twitter:description');
    twitterDescription.setAttribute('content', metaDescription);
    document.head.appendChild(twitterDescription);
  }
}