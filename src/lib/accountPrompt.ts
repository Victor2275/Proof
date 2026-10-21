/*
 * Asking for the account sheet from anywhere: a Publish key, the account row
 * in More, a Settings button. The app shell owns the one sheet and opens it.
 */
export type AccountPromptMode = 'signin' | 'signup' | 'forgot';

export interface AccountPrompt {
  mode: AccountPromptMode;
  /** Why it was asked for, said at the top of the sheet: "Sign in to publish this recipe." */
  reason?: string;
}

export const ACCOUNT_PROMPT_EVENT = 'open-account';

export function requestAccount(mode: AccountPromptMode = 'signin', reason?: string) {
  window.dispatchEvent(new CustomEvent<AccountPrompt>(ACCOUNT_PROMPT_EVENT, { detail: { mode, reason } }));
}
