import { supabase } from '../supabase-client.js';

// Cache for permissions (reset on server restart)
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get permissions for a role
async function getRolePermissions(role) {
  const cacheKey = `role:${role}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        granted,
        permissions!inner(module, action)
      `)
      .eq('role', role)
      .eq('granted', true);
    
    if (error) throw error;
    
    const permissions = data.map(p => `${p.permissions.module}:${p.permissions.action}`);
    
    permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  } catch (err) {
    console.error('Error fetching role permissions:', err);
    return [];
  }
}

// Get user-specific permission overrides
async function getUserPermissions(userId) {
  const cacheKey = `user:${userId}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        granted,
        permissions!inner(module, action)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const permissions = {};
    data.forEach(p => {
      const key = `${p.permissions.module}:${p.permissions.action}`;
      permissions[key] = p.granted;
    });
    
    permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });
    
    return permissions;
  } catch (err) {
    console.error('Error fetching user permissions:', err);
    return {};
  }
}

// Check if user has a specific permission
export async function checkPermission(userId, module, action) {
  try {
    // Get user role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError || !user) return false;
    
    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;
    
    // Get role permissions
    const rolePermissions = await getRolePermissions(user.role);
    const permissionKey = `${module}:${action}`;
    
    // Check if role has permission
    const hasRolePermission = rolePermissions.includes(permissionKey);
    
    // Get user-specific overrides
    const userPermissions = await getUserPermissions(userId);
    
    // Check for user override
    if (permissionKey in userPermissions) {
      return userPermissions[permissionKey];
    }
    
    return hasRolePermission;
  } catch (err) {
    console.error('Error checking permission:', err);
    return false;
  }
}

// Middleware factory for checking permissions
export function requirePermission(module, action) {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasPermission = await checkPermission(userId, module, action);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: `You don't have permission to ${action} ${module}`
      });
    }
    
    next();
  };
}

// Middleware to check any of the given permissions
export function requireAnyPermission(permissions) {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    for (const { module, action } of permissions) {
      const hasPermission = await checkPermission(userId, module, action);
      if (hasPermission) {
        return next();
      }
    }
    
    return res.status(403).json({ 
      error: 'Permission denied',
      message: 'You don\'t have permission to perform this action'
    });
  };
}

// Middleware to check all of the given permissions
export function requireAllPermissions(permissions) {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    for (const { module, action } of permissions) {
      const hasPermission = await checkPermission(userId, module, action);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permission denied',
          message: `Missing permission: ${action} ${module}`
        });
      }
    }
    
    next();
  };
}

// Get all permissions for a user (for frontend)
export async function getUserPermissionsList(userId) {
  try {
    // Get user role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError || !user) return [];
    
    // Superadmin gets all permissions
    if (user.role === 'superadmin') {
      const { data: allPermissions } = await supabase
        .from('permissions')
        .select('module, action');
      return allPermissions.map(p => `${p.module}:${p.action}`);
    }
    
    // Get role permissions
    const rolePermissions = await getRolePermissions(user.role);
    
    // Get user overrides
    const userOverrides = await getUserPermissions(userId);
    
    // Apply overrides
    const finalPermissions = [...rolePermissions];
    
    Object.entries(userOverrides).forEach(([key, granted]) => {
      if (granted && !finalPermissions.includes(key)) {
        finalPermissions.push(key);
      } else if (!granted && finalPermissions.includes(key)) {
        const idx = finalPermissions.indexOf(key);
        if (idx > -1) finalPermissions.splice(idx, 1);
      }
    });
    
    return finalPermissions;
  } catch (err) {
    console.error('Error getting user permissions:', err);
    return [];
  }
}

// Clear permission cache (call after permission changes)
export function clearPermissionCache(userId) {
  if (userId) {
    permissionCache.delete(`user:${userId}`);
  } else {
    permissionCache.clear();
  }
}
