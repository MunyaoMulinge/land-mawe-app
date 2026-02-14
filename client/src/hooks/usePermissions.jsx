import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { API_BASE } from '../config';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children, currentUser }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!currentUser) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchPermissions();
  }, [currentUser]);
  
  // Refresh permissions when window gains focus (for cross-tab updates)
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser) {
        fetchPermissions();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser]);

  // Permission aliases for backwards compatibility
  const permissionAliases = {
    'fuel:create': ['fuel:record'] // fuel:create is equivalent to fuel:record
  };

  const hasPermission = useCallback((module, action) => {
    // Superadmin has all permissions
    if (currentUser?.role === 'superadmin') return true;
    
    const permissionKey = `${module}:${action}`;
    
    // Check exact permission
    if (permissions.includes(permissionKey)) return true;
    
    // Check aliases (e.g., fuel:create -> fuel:record)
    const aliases = permissionAliases[permissionKey] || [];
    return aliases.some(alias => permissions.includes(alias));
  }, [permissions, currentUser]);

  const hasAnyPermission = useCallback((perms) => {
    // Superadmin has all permissions
    if (currentUser?.role === 'superadmin') return true;
    return perms.some(({ module, action }) => permissions.includes(`${module}:${action}`));
  }, [permissions, currentUser]);

  const hasAllPermissions = useCallback((perms) => {
    // Superadmin has all permissions
    if (currentUser?.role === 'superadmin') return true;
    return perms.every(({ module, action }) => permissions.includes(`${module}:${action}`));
  }, [permissions, currentUser]);

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: fetchPermissions,
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
