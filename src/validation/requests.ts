import { z } from 'zod';

export const requestSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  property_address: z.string().optional(),
  service_details: z.string().min(1, 'Service details are required').max(2000, 'Service details must be less than 2000 characters'),
  preferred_assessment_date: z.string().optional(),
  alternative_date: z.string().optional(),
  preferred_times: z.array(z.string()).optional().default([]),
  status: z.enum(['New', 'Reviewed', 'Scheduled', 'Assessed', 'Declined']).optional().default('New'),
  notes: z.string().optional(),
});

export type RequestFormData = z.infer<typeof requestSchema>;

export const preferredTimeOptions = [
  'Any time',
  'Morning (8am - 12pm)',
  'Afternoon (12pm - 5pm)',
  'Evening (5pm - 8pm)',
];

export const statusOptions = [
  { value: 'New', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'Scheduled', label: 'Scheduled', color: 'bg-green-100 text-green-800' },
  { value: 'Assessed', label: 'Assessed', color: 'bg-gray-100 text-gray-800' },
  { value: 'Declined', label: 'Declined', color: 'bg-red-100 text-red-800' },
] as const;