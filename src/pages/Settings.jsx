import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  Store, 
  Settings as SettingsIcon, 
  Lock, 
  Database, 
  Printer, 
  Sliders, 
  ShieldAlert, 
  Sparkles,
  Upload
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'tax' | 'printer' | 'backup'
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Settings State Form
  const [settings, setSettings] = useState({
    store_name: 'Retail Genius Store',
    logo_url: '',
    gst_number: '',
    address: '',
    phone: '',
    email: '',
    invoice_prefix: 'RG',
    tax_settings: { default_gst: 18, inclusive_tax: false },
    printer_settings: { receipt_width: '80mm' },
    language: 'en',
    dark_mode: false
  });

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'store_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings({
          store_name: data.store_name || 'Retail Genius Store',
          logo_url: data.logo_url || '',
          gst_number: data.gst_number || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          invoice_prefix: data.invoice_prefix || 'RG',
          tax_settings: data.tax_settings || { default_gst: 18, inclusive_tax: false },
          printer_settings: data.printer_settings || { receipt_width: '80mm' },
          language: data.language || 'en',
          dark_mode: data.dark_mode || false
        });
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoMsg('');
    setErrMsg('');
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 'store_config',
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setInfoMsg('Settings updated successfully!');
      
      // Update global DOM theme if toggled
      document.documentElement.setAttribute('data-theme', settings.dark_mode ? 'dark' : 'light');
      localStorage.setItem('theme', settings.dark_mode ? 'dark' : 'light');
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Change Password Auth trigger
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsChangingPass(true);
    setInfoMsg('');
    setErrMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setInfoMsg('Account password changed successfully!');
      setNewPassword('');
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  // Dynamic Full DB local JSON backup utility
  const handleBackupExport = async () => {
    setLoading(true);
    try {
      const tables = ['products', 'categories', 'customers', 'sales', 'sale_items', 'expenses', 'settings'];
      const backupData = {};

      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        backupData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `retail_genius_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setInfoMsg('Database backup package downloaded.');
    } catch (err) {
      setErrMsg('Backup export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Store Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configure receipt headers, local tax parameters, passwords, and backups</p>
        </div>
      </div>

      {/* Info/Err banners */}
      {infoMsg && (
        <div className="glass-panel" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
          <span>✓ {infoMsg}</span>
        </div>
      )}

      {errMsg && (
        <div className="glass-panel" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
          <span>✗ {errMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Left Side Tab Controls */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px' }}>
          <button onClick={() => setActiveTab('store')} className="btn" style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', background: activeTab === 'store' ? 'var(--primary)' : 'transparent', color: activeTab === 'store' ? 'white' : 'var(--text-secondary)' }}>
            <Store size={16} />
            <span>Store Details</span>
          </button>
          <button onClick={() => setActiveTab('tax')} className="btn" style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', background: activeTab === 'tax' ? 'var(--primary)' : 'transparent', color: activeTab === 'tax' ? 'white' : 'var(--text-secondary)' }}>
            <Sliders size={16} />
            <span>Taxes & System</span>
          </button>
          <button onClick={() => setActiveTab('printer')} className="btn" style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', background: activeTab === 'printer' ? 'var(--primary)' : 'transparent', color: activeTab === 'printer' ? 'white' : 'var(--text-secondary)' }}>
            <Printer size={16} />
            <span>Printer Size</span>
          </button>
          <button onClick={() => setActiveTab('backup')} className="btn" style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', background: activeTab === 'backup' ? 'var(--primary)' : 'transparent', color: activeTab === 'backup' ? 'white' : 'var(--text-secondary)' }}>
            <Database size={16} />
            <span>Pass & Backup</span>
          </button>
        </div>

        {/* Right Side Settings Pane */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          
          {/* TAB 1: STORE DETAILS */}
          {activeTab === 'store' && (
            <form onSubmit={handleSettingsSubmit}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} color="var(--primary)" />
                <span>Store Specifications</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Store Brand Name *</label>
                  <input 
                    type="text" 
                    value={settings.store_name} 
                    onChange={(e) => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN Registry Number</label>
                  <input 
                    type="text" 
                    value={settings.gst_number} 
                    onChange={(e) => setSettings(prev => ({ ...prev, gst_number: e.target.value }))}
                    className="input-field" 
                    placeholder="27AAAAA1111A1Z1" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Prefix</label>
                  <input 
                    type="text" 
                    value={settings.invoice_prefix} 
                    onChange={(e) => setSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Store Contact Phone</label>
                  <input 
                    type="tel" 
                    value={settings.phone} 
                    onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Store Helpdesk Email</label>
                  <input 
                    type="email" 
                    value={settings.email} 
                    onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Physical Address</label>
                  <input 
                    type="text" 
                    value={settings.address} 
                    onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                    className="input-field" 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }} disabled={loading}>
                Save Store Settings
              </button>
            </form>
          )}

          {/* TAB 2: TAXES & THEMES */}
          {activeTab === 'tax' && (
            <form onSubmit={handleSettingsSubmit}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} color="var(--primary)" />
                <span>GST Tax & Interface Parameters</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Default GST Rate (%)</label>
                  <input 
                    type="number" 
                    value={settings.tax_settings.default_gst} 
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      tax_settings: { ...prev.tax_settings, default_gst: parseInt(e.target.value) || 0 } 
                    }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '24px' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.tax_settings.inclusive_tax} 
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        tax_settings: { ...prev.tax_settings, inclusive_tax: e.target.checked } 
                      }))}
                    />
                    <span>Invoice Tax inclusive prices calculations</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Interface Colors</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.dark_mode} 
                      onChange={(e) => setSettings(prev => ({ ...prev, dark_mode: e.target.checked }))}
                    />
                    <span>Activate Dark Mode styling system</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                Save Tax Config
              </button>
            </form>
          )}

          {/* TAB 3: PRINTER CONFIGS */}
          {activeTab === 'printer' && (
            <form onSubmit={handleSettingsSubmit}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={20} color="var(--primary)" />
                <span>Thermal Printer Layouts</span>
              </h3>

              <div className="form-group" style={{ maxWidth: '320px' }}>
                <label className="form-label">Receipt Print Width</label>
                <select 
                  value={settings.printer_settings.receipt_width} 
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    printer_settings: { receipt_width: e.target.value } 
                  }))}
                  className="input-field"
                >
                  <option value="80mm">Standard 80mm Thermal Receipt (Standard POS)</option>
                  <option value="58mm">Compact 58mm Thermal Receipt (Mini-Printer)</option>
                  <option value="A4">A4 Office paper document (Billing Invoice)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
                Save Printer Layout
              </button>
            </form>
          )}

          {/* TAB 4: PASSWORD CHANGES & BACKUPS */}
          {activeTab === 'backup' && (
            <div>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="var(--primary)" />
                  <span>Update Staff Account Password</span>
                </h3>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '480px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="input-field" 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isChangingPass}>
                    Update Password
                  </button>
                </form>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={20} color="var(--primary)" />
                  <span>System Database Backups</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Download a localized backup snapshot containing products, categories, sales records, and CRM customer listings.
                </p>
                <button type="button" onClick={handleBackupExport} className="btn btn-secondary" disabled={loading}>
                  Download JSON Database Snapshot
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
