export function getOwnerEmail() {
  return String(import.meta.env?.VITE_OWNER_EMAIL || '').trim().toLowerCase();
}

export function isOwner(userOrEmail) {
  const ownerEmail = getOwnerEmail();
  const candidateEmail =
    typeof userOrEmail === 'string'
      ? userOrEmail
      : userOrEmail?.email || userOrEmail?.user_metadata?.email || userOrEmail?.profile?.email || '';

  if (!ownerEmail || !candidateEmail) {
    return false;
  }

  return String(candidateEmail).trim().toLowerCase() === ownerEmail;
}
