export type EmailConfig = {
  resendApiKey: string | null;
  emailFrom: string;
  appUrl: string;
  isConfigured: boolean;
};

export function getEmailConfig(): EmailConfig {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || null;
  const emailFrom =
    process.env.EMAIL_FROM?.trim() || "InsightApex <noreply@insightapex.co.uk>";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";

  return {
    resendApiKey,
    emailFrom,
    appUrl,
    isConfigured: Boolean(resendApiKey && emailFrom),
  };
}

export function requireEmailConfig(): EmailConfig {
  const config = getEmailConfig();
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!config.emailFrom) {
    throw new Error("EMAIL_FROM is not configured");
  }
  return config;
}
