import type { ProfileUpdateData } from '@/types/auth';
import type { ProfileUpdateFormData } from '@/lib/validation/auth';

/**
 * The profile form calls the picture field `photoURL`, but a user document keeps it as
 * `profileImage`, and that is the field every screen reads. Saving the form's data as it
 * came stored a value nothing looked at, so a picture typed in on Profile never showed.
 */
export function toProfileUpdate(form: ProfileUpdateFormData): ProfileUpdateData {
  const update: ProfileUpdateData = {};
  if (form.displayName !== undefined) update.displayName = form.displayName;
  if (form.photoURL !== undefined) update.profileImage = form.photoURL;
  return update;
}

/**
 * The name and picture the signed-in user is shown with.
 *
 * What a goalie saves on Profile is written to their user document. The sign-in account only
 * holds what they registered with, so reading it first meant an edit showed until the next
 * page load and then went back to the old name. The saved profile wins; the account fills in
 * when nothing was ever saved.
 */
export function resolveProfile(
  stored: { displayName?: string | null; profileImage?: string | null },
  account: { displayName: string | null; photoURL: string | null }
): { displayName: string | null; profileImage?: string } {
  const profileImage = stored.profileImage || account.photoURL || undefined;
  return {
    displayName: stored.displayName || account.displayName,
    ...(profileImage && { profileImage }),
  };
}
