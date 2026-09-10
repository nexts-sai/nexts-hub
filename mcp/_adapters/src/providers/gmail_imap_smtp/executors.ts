import type { CredentialValidators, ProviderExecutors } from "../../core/types.ts";

import { createMailProviderRuntime } from "../../mail/imap-smtp/runtime.ts";
import { gmailImapSmtpRuntimeConfig } from "./config.ts";

const runtime = createMailProviderRuntime(gmailImapSmtpRuntimeConfig);

export const executors: ProviderExecutors = runtime.executors;
export const credentialValidators: CredentialValidators = runtime.credentialValidators;
