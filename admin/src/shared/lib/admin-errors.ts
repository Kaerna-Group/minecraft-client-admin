export function normalizeAdminErrorMessage(error: unknown) {
  const fallback = 'Something went wrong. Please try again.';
  const raw = error instanceof Error ? error.message : String(error ?? fallback);
  const normalized = raw.toLowerCase();

  if (normalized.includes('last_admin_guard')) {
    return 'You cannot remove or downgrade the last remaining admin.';
  }

  if (normalized.includes('active_release_guard')) {
    return 'Deactivate the currently active release before deleting it.';
  }

  if (normalized.includes('invalid_input')) {
    return 'The submitted data is invalid. Please review the form and try again.';
  }

  if (normalized.includes('forbidden')) {
    return 'Your current role is not allowed to perform this action.';
  }

  if (normalized.includes('profile_not_found')) {
    return 'The selected profile no longer exists.';
  }

  if (normalized.includes('ban_not_found')) {
    return 'The selected ban record no longer exists.';
  }

  if (normalized.includes('news_not_found')) {
    return 'The selected news item no longer exists.';
  }

  if (normalized.includes('release_not_found')) {
    return 'The selected release no longer exists.';
  }

  if (normalized.includes('duplicate key')) {
    return 'A record with the same unique value already exists.';
  }

  return raw || fallback;
}
