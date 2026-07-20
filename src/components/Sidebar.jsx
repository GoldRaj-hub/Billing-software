import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  History, 
  BarChart3, 
  Settings, 
  LogOut,
  Store
} from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const role = profile?.role || 'Cashier';

  // Define navigation items with minimum role permissions
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, minRole: 'Manager' },
    { path: '/billing', label: 'Billing POS', icon: Receipt, minRole: 'Cashier' },
    { path: '/inventory', label: 'Inventory', icon: Package, minRole: 'Manager' },
    { path: '/customers', label: 'Customers', icon: Users, minRole: 'Cashier' },
    { path: '/sales', label: 'Sales History', icon: History, minRole: 'Cashier' },
    { path: '/reports', label: 'Reports', icon: BarChart3, minRole: 'Manager' },
    { path: '/settings', label: 'Settings', icon: Settings, minRole: 'Admin' },
  ];

  // Filter items based on user role
  const filteredItems = menuItems.filter(item => {
    if (role === 'Admin') return true;
    if (role === 'Manager') return item.minRole !== 'Admin';
    if (role === 'Cashier') return item.minRole === 'Cashier';
    return false;
  });

  const sidebarStyle = {
    width: '260px',
    background: 'var(--bg-sidebar)',
    color: 'var(--text-on-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px 16px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 10,
  };

  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 8px 32px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '24px'
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--text-on-primary)' : 'rgba(255, 255, 255, 0.7)',
    background: isActive ? 'var(--primary)' : 'transparent',
    fontWeight: isActive ? '600' : '400',
    marginBottom: '8px',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer'
  });

  const profileStyle = {
    marginTop: 'auto',
    padding: '16px 8px 0 8px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const logoutButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'rgba(255, 255, 255, 0.6)',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
  };

  return (
    <aside style={sidebarStyle} className="no-print">
      <div style={logoContainerStyle}>
        <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '12px' }}>
          <Store size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px' }}>Retail Genius</h2>
          <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>POS & Inventory</span>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              style={navLinkStyle}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={profileStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            {profile?.name ? profile.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{profile?.name || 'User'}</h4>
            <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: '2px' }}>
              {role}
            </span>
          </div>
        </div>
        
        <button 
          onClick={signOut} 
          style={logoutButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: 500 }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
