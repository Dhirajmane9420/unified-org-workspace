import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  // Extract initial state from localStorage to maintain session on refresh
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [availableWorkspaces, setAvailableWorkspaces] = useState(() => {
    const savedWorkspaces = localStorage.getItem('availableWorkspaces');
    return savedWorkspaces ? JSON.parse(savedWorkspaces) : [];
  });
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    const savedActive = localStorage.getItem('activeWorkspace');
    return savedActive ? JSON.parse(savedActive) : null;
  });

  // Automatically track state changes back to localStorage
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (availableWorkspaces.length > 0) {
      localStorage.setItem('availableWorkspaces', JSON.stringify(availableWorkspaces));
    } else {
      localStorage.removeItem('availableWorkspaces');
    }
  }, [availableWorkspaces]);

  useEffect(() => {
    if (activeWorkspace) {
      localStorage.setItem('activeWorkspace', JSON.stringify(activeWorkspace));
    } else {
      localStorage.removeItem('activeWorkspace');
    }
  }, [activeWorkspace]);

  /**
   * Hydrates the context state immediately upon successful user login[cite: 1]
   */
  const loginUser = (authPayload) => {
    setToken(authPayload.token);
    setUser({
      id: authPayload.user.id,
      email: authPayload.user.email,
    });
    
    const workspaces = authPayload.availableWorkspaces || authPayload.workspaces || [];
    setAvailableWorkspaces(workspaces);
    
    if (authPayload.activeWorkspace) {
      setActiveWorkspace(authPayload.activeWorkspace);
    } else if (workspaces.length > 0) {
      setActiveWorkspace(workspaces[0]);
    }
  };

  /**
   * Cleans all active sessions across localStorage contexts[cite: 1]
   */
  const logoutUser = async () => {
    try {
      // Notify backend to clear global Redis cache states[cite: 1]
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Network silent error cleaning cache records:', err);
    } finally {
      setToken(null);
      setUser(null);
      setAvailableWorkspaces([]);
      setActiveWorkspace(null);
      localStorage.clear();
    }
  };

  /**
   * Org Switcher Context Action: Adjusts the active tenant context dynamically[cite: 1]
   */
  const switchWorkspace = (organizationId) => {
    const target = availableWorkspaces.find(w => w.organizationId === organizationId);
    if (target) {
      setActiveWorkspace(target);
    }
  };

  /**
   * Automated Fetch Wrapper: Securely injects JWT and Multi-Tenant scoping headers[cite: 1]
   */
  const authenticatedFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'x-active-org-id': activeWorkspace?.organizationId || '',
      'Content-Type': 'application/json',
    };

    return fetch(url, { ...options, headers });
  };

  return (
    <WorkspaceContext.Provider value={{
      token,
      user,
      availableWorkspaces,
      activeWorkspace,
      loginUser,
      logoutUser,
      switchWorkspace,
      authenticatedFetch
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be invoked inside a valid WorkspaceProvider component hierarchy');
  }
  return context;
}