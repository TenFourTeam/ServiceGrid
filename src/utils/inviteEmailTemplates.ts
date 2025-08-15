import { generateInviteEmail } from './emailTemplateEngine';

interface InviteEmailParams {
  businessName: string;
  businessLogoUrl?: string;
  inviterName: string;
  inviteeEmail: string;
  inviteUrl: string;
  role: string;
  expiresAt: string;
}

/**
 * @deprecated Use generateInviteEmail from emailTemplateEngine instead
 */
export function buildInviteEmail(params: InviteEmailParams) {
  return generateInviteEmail(params);
}