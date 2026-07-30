export function getOwnerEmail() {
  return String(import.meta.env?.VITE_OWNER_EMAIL || '').trim().toLowerCase();
}

export function isOwner(userOrEmail) {
  const ownerEmail = getOwnerEmail();
  const accountRole =
    typeof userOrEmail === 'string'
      ? ''
      : String(userOrEmail?.app_metadata?.role || userOrEmail?.app_metadata?.account_role || '').trim().toLowerCase();
  const candidateEmail =
    typeof userOrEmail === 'string'
      ? userOrEmail
      : userOrEmail?.email || userOrEmail?.user_metadata?.email || userOrEmail?.profile?.email || '';

  if (['admin', 'founder', 'owner'].includes(accountRole)) {
    return true;
  }

  if (!ownerEmail || !candidateEmail) {
    return false;
  }

  return String(candidateEmail).trim().toLowerCase() === ownerEmail;
}
