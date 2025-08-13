interface InviteEmailParams {
  businessName: string;
  businessLogoUrl?: string;
  inviterName: string;
  inviteeEmail: string;
  inviteUrl: string;
  role: string;
  expiresAt: string;
}

export function buildInviteEmail({
  businessName,
  businessLogoUrl,
  inviterName,
  inviteeEmail,
  inviteUrl,
  role,
  expiresAt
}: InviteEmailParams) {
  const subject = `You've been invited to join ${businessName} on ServiceGrid`;
  
  const headerLeft = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${escapeHtml(businessName)} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />`
    : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${escapeHtml(businessName)}</span>`;

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to ${escapeHtml(businessName)}</title>
    </head>
    <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:24px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="left">${headerLeft}</td>
                      <td align="right" style="color:#f8fafc; font-weight:600; font-size:14px; opacity:0.9;">Team Invitation</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:40px 32px;">
                  
                  <!-- Greeting -->
                  <div style="margin-bottom:32px;">
                    <h1 style="margin:0 0 16px; font-size:28px; font-weight:700; color:#111827; line-height:1.2;">
                      You're invited to join<br>${escapeHtml(businessName)}
                    </h1>
                    <p style="margin:0; font-size:16px; line-height:1.6; color:#6b7280;">
                      ${escapeHtml(inviterName)} has invited you to collaborate as a <strong style="color:#111827;">${escapeHtml(role)}</strong> on ServiceGrid.
                    </p>
                  </div>

                  <!-- Benefits -->
                  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px;">
                    <h2 style="margin:0 0 16px; font-size:18px; font-weight:600; color:#111827;">What you'll get access to:</h2>
                    <ul style="margin:0; padding-left:20px; color:#374151; line-height:1.7;">
                      <li style="margin-bottom:8px;">Shared calendar and scheduling</li>
                      <li style="margin-bottom:8px;">Work order management</li>
                      <li style="margin-bottom:8px;">Customer information and quotes</li>
                      <li style="margin-bottom:8px;">Team collaboration tools</li>
                    </ul>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center; margin-bottom:32px;">
                    <a href="${inviteUrl}" 
                       style="display:inline-block; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: transform 0.2s ease;"
                       onmouseover="this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.transform='translateY(0)'">
                      Accept Invitation
                    </a>
                  </div>

                  <!-- Alternative Link -->
                  <div style="text-align:center; margin-bottom:24px;">
                    <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">
                      Or copy and paste this link in your browser:
                    </p>
                    <div style="background:#f3f4f6; border-radius:6px; padding:12px; word-break:break-all; font-family:monospace; font-size:13px; color:#374151;">
                      ${inviteUrl}
                    </div>
                  </div>

                  <!-- Expiry Notice -->
                  <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:6px; padding:12px; margin-bottom:24px;">
                    <p style="margin:0; font-size:14px; color:#92400e; text-align:center;">
                      ⏰ This invitation expires on <strong>${expiryDate}</strong>
                    </p>
                  </div>

                  <!-- Security Notice -->
                  <div style="border-top:1px solid #e5e7eb; padding-top:24px;">
                    <p style="margin:0; font-size:13px; color:#6b7280; text-align:center; line-height:1.5;">
                      If you didn't expect this invitation, you can safely ignore this email. 
                      This invitation was sent to <strong>${escapeHtml(inviteeEmail)}</strong>.
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc; padding:24px 32px; border-top:1px solid #e5e7eb; text-align:center;">
                  <p style="margin:0 0 8px; font-size:14px; color:#374151; font-weight:600;">
                    Powered by ServiceGrid
                  </p>
                  <p style="margin:0; font-size:12px; color:#6b7280;">
                    Professional service management made simple
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  return { subject, html };
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}