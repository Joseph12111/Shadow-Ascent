import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

export function useProfile() {
  const { profile, updateProfile, loading, error } = useAuth();

  return useMemo(
    () => ({
      profile,
      updateProfile,
      loading,
      error,
      isProfileReady: Boolean(profile?.id),
    }),
    [error, loading, profile, updateProfile],
  );
}
