/*
 * Writing to the moderation log (models/ModerationLog.js).
 *
 * Every staff action records itself here. A failure to log never undoes the
 * action it describes: the action has happened, and the log is the record of
 * it, not a gate on it.
 */
import { ModerationLog } from '../models/ModerationLog.js';

/** Who is acting, as requireModerator (middleware/auth.js) sets it on req.staff. */
export interface Staff {
  kind: 'operator' | 'moderator';
  userId: string | null;
  handle: string;
}

export type LogAction =
  | 'account.confirm'
  | 'account.promote'
  | 'account.demote'
  | 'account.suspend'
  | 'account.unsuspend'
  | 'account.signout'
  | 'recipe.approve'
  | 'recipe.reject'
  | 'recipe.takedown'
  | 'comment.approve'
  | 'comment.remove'
  | 'report.resolve';

export interface LogEntry {
  action: LogAction;
  targetType: 'account' | 'recipe' | 'comment' | 'report';
  targetId: string;
  label?: string;
  reason?: string;
}

export async function logAction(staff: Staff, entry: LogEntry) {
  await ModerationLog.create({
    actorKind: staff.kind,
    actorId: staff.userId,
    actorHandle: staff.handle,
    ...entry,
  }).catch(() => undefined);
}
