import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { API_BASE } from '../config';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children, currentUser }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/permissions`, {
          headers: { 'x-user-id': currentUser.id }
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions);
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [currentUser]);

  const hasPermission = useCallback((module, action) => {
    return permissions.includes(`${module}:${action}`);
  }, [permissions]);

  const hasAnyPermission = useCallback((perms) => {
    return perms.some(({ module, action }) => permissions.includes(`${module}:${action}`));
  }, [permissions]);

  const hasAllPermissions = useCallback((perms) => {
    return perms.every(({ module, action }) => permissions.includes(`${module}:${action}`));
  }, [permissions]);

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin: currentUser?.role === 'superadmin'
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// Helper component for conditional rendering based on permissions
export function Can({ module, action, children, fallback = null }) {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return null;
  if (hasPermission(module, action)) return children;
  return fallback;
}

// Helper component that requires ANY of the permissions
export function CanAny({ permissions, children, fallback = null }) {
  const { hasAnyPermission, loading } = usePermissions();
  
  if (loading) return null;
  if (hasAnyPermission(permissions)) return children;
  return fallback;
}

// Helper component that requires ALL of the permissions
export function CanAll({ permissions, children, fallback = null }) {
  const { hasAllPermissions, loading } = usePermissions();
  
  if (loading) return null;
  if (hasAllPermissions(permissions)) return children;
  return fallback;
}
