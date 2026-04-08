export type AdminRole = 'admin' | 'moderator' | 'player';

export type RoleCapabilities = {
  hasAdminAccess: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canViewAuditLogs: boolean;
  canManageProfiles: boolean;
  canManageNews: boolean;
  canManageBans: boolean;
  canManageRoles: boolean;
  canManageReleases: boolean;
};

export function getRoleCapabilities(roles: AdminRole[]): RoleCapabilities {
  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const hasAdminAccess = isAdmin || isModerator;

  return {
    hasAdminAccess,
    isAdmin,
    isModerator,
    canViewAuditLogs: isAdmin,
    canManageProfiles: isAdmin,
    canManageNews: hasAdminAccess,
    canManageBans: hasAdminAccess,
    canManageRoles: isAdmin,
    canManageReleases: isAdmin,
  };
}
