import { useEffect } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export function MetaUpdater() {
  const { business, businessName, businessDescription } = useBusinessContext();

  useEffect(() => {
    if (!business || !businessName) return;

    // Update page title
    const title = businessDescription 
      ? `${businessName} - ${businessDescription}`
      : `${businessName} - Professional Service Management`;
    document.title = title;

    // Update meta description
    const description = businessDescription || 
      'Professional service management software. Streamline scheduling, invoicing, and customer management.';
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      metaDescription.setAttribute('content', description);
      document.head.appendChild(metaDescription);
    }

    // Update OpenGraph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }

    // Update OpenGraph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }

    // Update Twitter title
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title);
    }

    // Update Twitter description
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', description);
    }

  }, [business, businessName, businessDescription]);

  return null;
}