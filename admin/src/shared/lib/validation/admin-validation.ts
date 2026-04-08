const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateRoleFields(input: { user_id: string; role: string }): FieldErrors<{ user_id: string; role: string }> {
  const errors: FieldErrors<{ user_id: string; role: string }> = {};

  if (!uuidPattern.test(input.user_id.trim())) {
    errors.user_id = 'Enter a valid user UUID.';
  }

  if (!['admin', 'moderator', 'player'].includes(input.role)) {
    errors.role = 'Select a valid role.';
  }

  return errors;
}

export function validateBanFields(input: { user_id: string; banned_until: string }): FieldErrors<{ user_id: string; banned_until: string }> {
  const errors: FieldErrors<{ user_id: string; banned_until: string }> = {};

  if (!uuidPattern.test(input.user_id.trim())) {
    errors.user_id = 'Enter a valid user UUID.';
  }

  if (input.banned_until.trim() && Number.isNaN(Date.parse(input.banned_until.trim()))) {
    errors.banned_until = 'Use a valid ISO datetime for the ban expiration.';
  }

  return errors;
}

export function validateNewsFields(input: { title: string; body: string }): FieldErrors<{ title: string; body: string }> {
  const errors: FieldErrors<{ title: string; body: string }> = {};

  if (!input.title.trim()) {
    errors.title = 'News title is required.';
  }

  if (!input.body.trim()) {
    errors.body = 'News body is required.';
  }

  return errors;
}

export function validateReleaseFields(input: { version: string; manifest_url: string }): FieldErrors<{ version: string; manifest_url: string }> {
  const errors: FieldErrors<{ version: string; manifest_url: string }> = {};

  if (!input.version.trim()) {
    errors.version = 'Release version is required.';
  }

  if (input.manifest_url.trim() && !isValidUrl(input.manifest_url.trim())) {
    errors.manifest_url = 'Manifest URL must be a valid http/https URL.';
  }

  return errors;
}

export function validateProfileFields(input: { avatar_url: string }): FieldErrors<{ avatar_url: string }> {
  const errors: FieldErrors<{ avatar_url: string }> = {};

  if (input.avatar_url.trim() && !isValidUrl(input.avatar_url.trim())) {
    errors.avatar_url = 'Avatar URL must be a valid http/https URL.';
  }

  return errors;
}

export function firstFieldError<T>(errors: FieldErrors<T>): string {
  return (Object.values(errors).find((entry) => Boolean(entry)) as string | undefined) ?? '';
}
