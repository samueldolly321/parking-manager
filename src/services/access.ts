/** Interface side of the rights: hides the actions the signed-in user may not do (the server checks them anyway). */
import { loadState } from './storage';
import { Action, roleCan } from './permissions';

/** True when the signed-in user's role allows the action. */
export function can(action: Action): boolean {
  return roleCan(loadState().currentUser?.role, action);
}

/** Name of the signed-in user (default cashier, author…). */
export function currentUserName(): string {
  return loadState().currentUser?.fullName || '';
}
