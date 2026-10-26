import type { LogEntry } from './api';

/*
 * The moderation log, as sentences (server/models/ModerationLog.js). Read on
 * the Log tab and in an account's history.
 */

/** What each action says, with `%` standing for the target's label. */
const SENTENCE: Record<string, string> = {
  'account.confirm': 'confirmed %',
  'account.promote': 'made % a moderator',
  'account.demote': 'removed % as a moderator',
  'account.suspend': 'suspended %',
  'account.unsuspend': 'lifted the suspension of %',
  'account.signout': 'signed % out everywhere',
  'recipe.approve': 'approved %',
  'recipe.reject': 'held back %',
  'recipe.takedown': 'took down %',
  'comment.approve': 'approved a comment (%)',
  'comment.remove': 'removed a comment (%)',
  'report.resolve': 'closed a report (%)',
};

/** "@mod suspended @ada", or "The operator approved Dark Rye". */
export function describeEntry(e: LogEntry) {
  const who = e.actorKind === 'operator' ? 'The operator' : `@${e.actorHandle}`;
  const sentence = SENTENCE[e.action] ?? `${e.action} %`;
  return `${who} ${sentence.replace('%', () => e.label)}`;
}
