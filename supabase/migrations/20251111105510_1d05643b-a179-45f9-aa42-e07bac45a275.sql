-- Add SVG to allowed MIME types for job-media bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]
WHERE name = 'job-media';