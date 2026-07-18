import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  History,
  Settings
} from 'lucide-react';

export default function BottomNav() {
  const { profile } = useAuthStore();
  const role = profile?.role || 'Cashier';

  const menuItems = [
    { path: '/', label: 'Home', icon: LayoutDashboard, minRole: 'Manager' },
    { path: '/billing', label: 'POS', icon: Receipt, minRole: 'Cashier' },
    { path: '/inventory', label: 'Stock', icon: Package, minRole: 'Manager' },
    { path: '/customers', label: 'CRM', icon: Users, minRole: 'Cashier' },
    { path: '/sales', label: 'Sales', icon: History, minRole: 'Cashier' },
    { path: '/settings', label: 'Setup', icon: Settings, minRole: 'Admin' }
  ];

  const filteredItems = menuItems.filter(item => {
    if (role === 'Admin') return true;
    if (role === 'Manager') return item.minRole !== 'Admin';
    if (role === 'Cashier') return item.minRole === 'Cashier';
    return false;
  });

  const bottomNavStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: 'var(--bg-nav)',
    backdropFilter: 'var(--glass-blur)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    fontSize: '0.65rem',
    fontWeight: isActive ? '700' : '500',
    flex: 1,
    height: '100%',
    transition: 'color var(--transition-fast)'
  });

  return (
    <div style={bottomNavStyle} className="no-print mobile-only-flex">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.path} to={item.path} style={navLinkStyle}>
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
