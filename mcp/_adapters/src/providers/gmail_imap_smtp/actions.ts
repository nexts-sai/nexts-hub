import type { ProviderActionDefinition } from "../../core/provider-definition.ts";
import type { MailActionName } from "../../mail/imap-smtp/actions.ts";

import { createMailActions } from "../../mail/imap-smtp/actions.ts";

export const gmailImapSmtpActions: readonly ProviderActionDefinition<MailActionName>[] = createMailActions(
  "gmail_imap_smtp",
  "Gmail",
);
