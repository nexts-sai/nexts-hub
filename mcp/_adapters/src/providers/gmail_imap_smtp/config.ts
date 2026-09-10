import type { MailCredential } from "../../mail/imap-smtp/protocol.ts";
import type { MailRuntimeConfig } from "../../mail/imap-smtp/runtime.ts";

import { ProviderRequestError } from "../provider-runtime.ts";

export const gmailImapSmtpRuntimeConfig: MailRuntimeConfig = {
  service: "gmail_imap_smtp",
  displayName: "Gmail",
  attachmentFallbackPrefix: "gmail",
  connectAuthMessage:
    "Use the 16-character Google app password generated after enabling 2-Step Verification, not the Google Account password.",
  executeAuthMessage:
    "Gmail rejected the saved app password. Generate a fresh 16-character Google app password and reconnect; do not use your normal Google Account password.",
  readCredential(values): MailCredential {
    const email = values.EMAIL_ADDRESS?.trim() ?? "";
    const appPassword = (values.EMAIL_PASSWORD ?? "").replaceAll(" ", "").trim();
    const parts = email.split("@");
    if (parts.length !== 2 || !parts[0] || parts[1].toLowerCase() !== "gmail.com" || /\s/.test(email)) {
      throw new ProviderRequestError(400, "Gmail email must be a valid @gmail.com address.");
    }
    if (appPassword.length !== 16) {
      throw new ProviderRequestError(400, "Gmail app password must be 16 characters.");
    }
    return {
      email,
      authorizationCode: appPassword,
      imapHost: "imap.gmail.com",
      smtpHost: "smtp.gmail.com",
    };
  },
};
