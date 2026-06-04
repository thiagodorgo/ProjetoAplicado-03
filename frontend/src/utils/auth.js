export const PROFILE_IDS = {
  ADMIN: 1,
  COLABORADOR: 2,
  AUDITOR: 3,
};

function normalizeProfileId(value) {
  const profileId = Number(value);
  return Number.isInteger(profileId) ? profileId : null;
}

function getPermissions(user) {
  if (Array.isArray(user?.permissoes)) {
    return user.permissoes;
  }

  if (Array.isArray(user?.perfil?.permissoes)) {
    return user.perfil.permissoes;
  }

  return [];
}

export function getPerfilId(user) {
  return normalizeProfileId(user?.id_perfil ?? user?.perfil?.id_perfil ?? user?.perfil);
}

export function isAdmin(user) {
  return getPerfilId(user) === PROFILE_IDS.ADMIN || getPermissions(user).includes('admin');
}

export function isColaborador(user) {
  return getPerfilId(user) === PROFILE_IDS.COLABORADOR;
}

export function isAuditor(user) {
  return getPerfilId(user) === PROFILE_IDS.AUDITOR;
}

export function canAccessRoute(user, allowedProfiles) {
  if (!user) {
    return false;
  }

  if (!allowedProfiles || allowedProfiles.length === 0) {
    return true;
  }

  const profileId = getPerfilId(user);
  return allowedProfiles.map(Number).includes(profileId);
}

export function canWriteAdmin(user) {
  return isAdmin(user);
}
