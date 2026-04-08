import type { AuditLog } from '@entities/admin/api/admin-api';
import { buildViewHref } from '@shared/lib/url-state';

type AuditDiffBlock = {
  title: string;
  content: Record<string, unknown> | null;
};

export function getAuditDiffBlocks(log: AuditLog): AuditDiffBlock[] {
  const payload = log.payload ?? {};
  const before = asRecord(payload.before);
  const after = asRecord(payload.after);
  const metadata = asRecord(payload);

  const blocks: AuditDiffBlock[] = [];

  if (before) {
    blocks.push({ title: 'Before', content: before });
  }

  if (after) {
    blocks.push({ title: 'After', content: after });
  }

  const metadataWithoutDiff = metadata
    ? Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'before' && key !== 'after'))
    : null;

  if (metadataWithoutDiff && Object.keys(metadataWithoutDiff).length > 0) {
    blocks.push({ title: 'Metadata', content: metadataWithoutDiff });
  }

  return blocks.length > 0 ? blocks : [{ title: 'Payload', content: metadata }];
}

export function getAuditTargetHref(log: AuditLog) {
  const targetId = log.target_id;

  if (!targetId) {
    return null;
  }

  if (log.entity_type === 'profile') {
    return buildViewHref('/profiles', { selectedId: targetId });
  }

  if (log.entity_type === 'user_role') {
    return buildViewHref('/roles', { search: targetId });
  }

  if (log.entity_type === 'user_ban') {
    return buildViewHref('/bans', { selectedId: targetId });
  }

  if (log.entity_type === 'launcher_news') {
    return buildViewHref('/news', { selectedId: targetId });
  }

  if (log.entity_type === 'build_release') {
    return buildViewHref('/releases', { selectedId: targetId });
  }

  return null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
