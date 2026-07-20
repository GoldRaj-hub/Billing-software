import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Calendar, 
  Coins, 
  ShoppingBag,
  Clock,
  X 
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    birthday: '',
    anniversary: '',
    notes: '',
    reward_points: '0',
    outstanding_balance: '0.00'
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Query customers and fetch their sales history summary
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          sales ( id, grand_total, date )
        `)
        .order('name');

      if (error) throw error;
      
      // Map aggregated sales details to customers
      const mapped = (data || []).map(c => {
        const completedSales = c.sales || [];
        const totalPurchase = completedSales.reduce((sum, s) => sum + parseFloat(s.grand_total), 0);
        const lastPurchase = completedSales.length > 0 
          ? new Date(Math.max(...completedSales.map(s => new Date(s.date)))).toLocaleDateString()
          : 'N/A';

        return {
          ...c,
          total_orders: completedSales.length,
          total_purchase: totalPurchase,
          last_purchase_date: lastPurchase
        };
      });

      setCustomers(mapped);
    } catch (err) {
      console.error('Error fetching customers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        gst_number: formData.gst_number || null,
        birthday: formData.birthday || null,
        anniversary: formData.anniversary || null,
        notes: formData.notes || null,
        reward_points: parseInt(formData.reward_points) || 0,
        outstanding_balance: parseFloat(formData.outstanding_balance) || 0.00,
        updated_at: new Date().toISOString()
      };

      if (editingCust) {
        const { error } = await supabase
          .from('customers')
          .update(cData)
          .eq('id', editingCust.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([cData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingCust(null);
      fetchCustomers();
    } catch (err) {
      alert('Error saving customer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cust) => {
    setEditingCust(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      gst_number: cust.gst_number || '',
      birthday: cust.birthday || '',
      anniversary: cust.anniversary || '',
      notes: cust.notes || '',
      reward_points: cust.reward_points.toString(),
      outstanding_balance: cust.outstanding_balance.toString()
    });
    setIsModalOpen(true);
  };

  const deleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer record?')) return;
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchCustomers();
    } catch (err) {
      alert(err.message);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Address', 'GST Number', 'Birthday', 'Anniversary', 'Reward Points', 'Outstanding Balance', 'Total Orders', 'Total Purchases'];
    const rows = customers.map(c => [
      c.name, c.phone, c.email || '', c.address || '', c.gst_number || '', c.birthday || '', c.anniversary || '', c.reward_points, c.outstanding_balance, c.total_orders, c.total_purchase
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer CRM</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Maintain registered buyers directory, point structures and logs</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-primary" onClick={() => {
            setEditingCust(null);
            setFormData({
              name: '', phone: '', email: '', address: '', gst_number: '',
              birthday: '', anniversary: '', notes: '', reward_points: '0', outstanding_balance: '0.00'
            });
            setIsModalOpen(true);
          }}>
            <Plus size={16} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <Search size={18} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
        <input 
          type="text" 
          placeholder="Search by name, phone, email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field" 
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Grid Sheet */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Name / Info</th>
              <th style={{ padding: '12px' }}>Contact Phone</th>
              <th style={{ padding: '12px' }}>Loyalty Points</th>
              <th style={{ padding: '12px' }}>Outstanding</th>
              <th style={{ padding: '12px' }}>Purchases Summary</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && customers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading customer accounts database...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No customer profiles matched the keyword.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '12px' }}>
                    <h4 style={{ fontWeight: 600 }}>{c.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{c.email || 'No email attached'}</span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {c.phone}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--warning)' }}>
                      <Coins size={16} />
                      <span>{c.reward_points} pts</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: c.outstanding_balance > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    ₹{parseFloat(c.outstanding_balance).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Purchased: </span>
                      <strong>₹{c.total_purchase.toFixed(2)}</strong> ({c.total_orders} bills)
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block', marginTop: '2px' }}>
                      Last Active: {c.last_purchase_date}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => startEdit(c)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px' }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteCustomer(c.id)} className="btn btn-danger" style={{ padding: '6px', borderRadius: '8px', boxShadow: 'none' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DYNAMIC MODAL: REGISTER/EDIT CUSTOMER */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '540px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: '32px', background: 'var(--bg-card)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {editingCust ? 'Modify Customer Profile' : 'Register New Buyer Profile'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-light)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9876543210" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com" 
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Billing Address</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Apartment/Street No, City, State" 
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN ID (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.gst_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="27AAAAA1111A1Z1" 
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reward Points Balance</label>
                  <input 
                    type="number" 
                    value={formData.reward_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, reward_points: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Birthday</label>
                  <input 
                    type="date" 
                    value={formData.birthday}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Anniversary Date</label>
                  <input 
                    type="date" 
                    value={formData.anniversary}
                    onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Outstanding Credit Balance (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.outstanding_balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, outstanding_balance: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">CRM Notes / Custom Remarks</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="VIP Customer, prefers thermal receipts, wholesale accounts tags..." 
                    className="input-field" 
                    rows="3"
                  ></textarea>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting profiles...' : 'Confirm Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
