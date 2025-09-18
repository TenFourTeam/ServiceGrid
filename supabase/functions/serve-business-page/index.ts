import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    let business = null;
    let error = null;

    // Try subdomain-based routing first
    const host = req.headers.get('host') || url.hostname;
    const subdomain = host.split('.')[0];
    
    // Skip common subdomains and main domain
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && !subdomain.includes('localhost') && !subdomain.includes('vercel') && !subdomain.includes('ngrok')) {
      console.log('Attempting subdomain lookup for:', subdomain);
      
      const { data: subdomainBusiness, error: subdomainError } = await supabase
        .from('businesses')
        .select('name, description, logo_url, light_logo_url')
        .eq('slug', subdomain)
        .single();
      
      if (subdomainBusiness && !subdomainError) {
        business = subdomainBusiness;
        console.log('Found business via subdomain:', business.name);
      }
    }

    // Fallback to path-based routing if subdomain lookup failed
    if (!business) {
      const pathSegments = url.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length >= 2 && pathSegments[0] === 'b') {
        const businessId = pathSegments[1];
        console.log('Attempting path-based lookup for:', businessId);
        
        const { data: pathBusiness, error: pathError } = await supabase
          .from('businesses')
          .select('name, description, logo_url, light_logo_url')
          .eq('id', businessId)
          .single();
          
        business = pathBusiness;
        error = pathError;
      }
    }

    if (error || !business) {
      console.error('Business not found:', error);
      // Return default HTML with fallback meta tags
      return generateHTML(null);
    }

    console.log('Serving business page for:', business.name);
    return generateHTML(business);

  } catch (error) {
    console.error('Error serving business page:', error);
    return generateHTML(null);
  }
});

function generateHTML(business: any) {
  // Default values
  const defaultTitle = 'ServiceGrid - Professional Services';
  const defaultDescription = 'Professional softwaressssss for service businesses. Streamline scheduling, invoicing, and customer management.';
  const defaultImage = '/favicon.svg';

  // Business-specific values
  const businessName = business?.name || 'ServiceGrid';
  const businessDescription = business?.description;
  const businessLogo = business?.light_logo_url || business?.logo_url || defaultImage;

  const title = businessDescription 
    ? `${businessName} - ${businessDescription}`
    : `${businessName} - Professional Service Management`;

  const description = businessDescription || defaultDescription;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="author" content="ServiceGrid" />
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${businessLogo}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${businessLogo}" />
    
    <link rel="preload" as="image" href="/images/a86a00c8-341b-4bbd-b9b5-8b15c1bd5227-removebg-preview%20(1).png" fetchpriority="high" imagesizes="(max-width: 768px) 96px, 128px" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600&display=swap" rel="stylesheet">

    <script>
      (function () {
        try {
          var raw = localStorage.getItem('ServiceGrid-lawn-store-v1');
          if (!raw) return;
          var parsed = JSON.parse(raw);
          var data = (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) ? parsed.data : parsed;
          var business = data && data.business;
          
          // Handle logo preloading
          var logo = business && (business.lightLogoUrl || business.logoUrl);
          if (logo && typeof logo === 'string') {
            // Preconnect to the logo origin
            try {
              var u = new URL(logo);
              var pre = document.createElement('link');
              pre.rel = 'preconnect';
              pre.href = u.origin;
              pre.crossOrigin = 'anonymous';
              document.head.appendChild(pre);
            } catch (e) {}

            // Preload the last-known logo so it renders instantly on first paint
            var link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = logo;
            document.head.appendChild(link);
          }

          // Handle meta tag updates
          if (business && business.name) {
            var name = business.name;
            var description = business.description;
            
            // Update document title
            var title = description 
              ? name + ' - ' + description
              : name + ' - Professional Service Management';
            document.title = title;

            // Update meta description
            var metaDescription = description || 
              'Professional service management software. Streamline scheduling, invoicing, and customer management.';
            
            var metaDescElement = document.querySelector('meta[name="description"]');
            if (metaDescElement) {
              metaDescElement.setAttribute('content', metaDescription);
            }

            // Update OpenGraph title
            var ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) {
              ogTitle.setAttribute('content', title);
            }

            // Update OpenGraph description
            var ogDescription = document.querySelector('meta[property="og:description"]');
            if (ogDescription) {
              ogDescription.setAttribute('content', metaDescription);
            }

            // Update Twitter title
            var twitterTitle = document.querySelector('meta[name="twitter:title"]');
            if (twitterTitle) {
              twitterTitle.setAttribute('content', title);
            }

            // Update Twitter description
            var twitterDescription = document.querySelector('meta[name="twitter:description"]');
            if (twitterDescription) {
              twitterDescription.setAttribute('content', metaDescription);
            }
          }
        } catch (e) {
          // swallow
        }
      })();
    </script>
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}