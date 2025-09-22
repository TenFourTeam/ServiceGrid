/**
 * Lightweight meta tag management utility
 * Similar pattern to BusinessLogo - reads from localStorage with props override
 */

export interface BusinessMetaData {
  name?: string;
  description?: string;
  logoUrl?: string;
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
          description: business.description,
          logoUrl: business.logo_url || business.light_logo_url
        };
      }
    }
  } catch {
    // ignore localStorage errors
  }

  // Use props override if provided, otherwise fall back to cached data
  const name = businessData?.name || cachedBusiness?.name;
  const description = businessData?.description || cachedBusiness?.description;
  const logoUrl = businessData?.logoUrl || cachedBusiness?.logoUrl;

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
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', title);
  }

  // Update OpenGraph description
  const ogDescription = document.querySelector('meta[property="og:description"]');
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

  // Add Open Graph and Twitter images if logo is available
  if (logoUrl) {
    // Update Open Graph image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute('content', logoUrl);
    } else {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      ogImage.setAttribute('content', logoUrl);
      document.head.appendChild(ogImage);
    }

    // Update Twitter image
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      twitterImage.setAttribute('content', logoUrl);
    } else {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      twitterImage.setAttribute('content', logoUrl);
      document.head.appendChild(twitterImage);
    }
  }
}