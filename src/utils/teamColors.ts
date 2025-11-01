/**
 * Team member color coding system
 * Provides consistent colors for visualizing team members across the app
 */

export const TEAM_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Blue
] as const;

/**
 * Get a consistent color for a team member based on their user ID
 * Same user will always get the same color
 */
export function getTeamMemberColor(userId: string): string {
  // Hash the user ID to get a consistent number
  const hash = userId.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0
  );
  
  return TEAM_COLORS[hash % TEAM_COLORS.length];
}

/**
 * Determine if white or black text should be used on a colored background
 * Returns appropriate contrast color for text
 */
export function getContrastTextColor(bgColor: string): 'white' | 'black' {
  // Remove # if present
  const color = bgColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Get a lighter version of a color for hover/active states
 */
export function getLighterColor(color: string, amount: number = 0.2): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
