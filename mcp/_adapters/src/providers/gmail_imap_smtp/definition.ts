import type { ProviderDefinition } from "../../core/types.ts";

import { gmailImapSmtpActions } from "./actions.ts";

export const nodeOnly = true;

export const provider: ProviderDefinition = {
  service: "gmail_imap_smtp",
  displayName: "Gmail (IMAP/SMTP)",
  description: "Connect Gmail directly over IMAP and SMTP with a Google app password stored on this device.",
  categories: ["Communication", "Productivity"],
  authTypes: ["custom_credential"],
  auth: [{
    type: "custom_credential",
    fields: [
      { key: "EMAIL_ADDRESS", label: "Email address", inputType: "text", required: true, secret: false, placeholder: "name@gmail.com", description: "Mailbox address used for this connection." },
      { key: "EMAIL_PASSWORD", label: "App password", inputType: "password", required: true, secret: true, placeholder: "16-character app password", description: "Use the Google app password generated after enabling 2-Step Verification. Do not use your regular Google Account password." },
    ],
    testAction: { actionName: "list_folders", input: {} },
  }],
  homepageUrl: "https://mail.google.com/",
  actions: gmailImapSmtpActions,
};
