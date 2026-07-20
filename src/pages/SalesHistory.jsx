import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  Printer, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  User, 
  CreditCard,
  X,
  Share2
} from 'lucide-react';

export default function SalesHistory() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'Admin';

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Re-print modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    fetchSales();
    fetchStoreSettings();
  }, [dateFilter, startDate, endDate]);

  const fetchStoreSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'store_config')
        .single();
      if (data) setStoreSettings(data);
    } catch (err) {
      console.error('Error fetching store settings:', err.message);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers ( name, phone, address ),
          sale_items (
            id,
            quantity,
            unit_price,
            total_amount,
            products ( name )
          )
        `)
        .order('date', { ascending: false });

      // Apply date filters
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = todayStart.toISOString();
        query = query.gte('date', start);
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday.setHours(0,0,0,0)).toISOString();
        const end = new Date(yesterday.setHours(23,59,59,999)).toISOString();
        query = query.gte('date', start).lte('date', end);
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        query = query.gte('date', oneWeekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        query = query.gte('date', oneMonthAgo.toISOString());
      } else if (dateFilter === 'custom' && startDate && endDate) {
        query = query.gte('date', new Date(startDate).toISOString())
                     .lte('date', new Date(endDate + 'T23:59:59').toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error loading sales logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Return & Refund Trigger
  const handleReturnInvoice = async (saleId) => {
    if (!confirm('Are you sure you want to mark this transaction as RETURNED? This will automatically restore all product stocks.')) return;
    try {
      // 1. Fetch the sale items to restore stock
      const { data: saleItems, error: fetchErr } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);
        
      if (fetchErr) throw fetchErr;

      // 2. Mark as returned
      const { error } = await supabase
        .from('sales')
        .update({ status: 'Returned' })
        .eq('id', saleId);

      if (error) throw error;
      
      // 3. Restore stock
      if (saleItems) {
        for (const item of saleItems) {
          const { data: productData } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();
            
          if (productData) {
            await supabase
              .from('products')
              .update({ current_stock: productData.current_stock + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }

      fetchSales();
      alert('Invoice status updated. Stock has been incremented.');
    } catch (err) {
      alert('Return action failed: ' + err.message);
    }
  };

  // Delete transaction (Admin only!)
  const handleDeleteInvoice = async (saleId) => {
    if (!isAdmin) return alert('Restricted command. Requires Administrator rights.');
    if (!confirm('CRITICAL WARNING: Are you sure you want to PERMANENTLY delete this invoice from records? This action is irreversible.')) return;
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
      fetchSales();
      alert('Invoice record permanently deleted.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter list matching search query
  const filteredSales = sales.filter(s => {
    const term = search.toLowerCase();
    const billMatch = (s.bill_number || '').toLowerCase().includes(term);
    const customerMatch = s.customers?.name?.toLowerCase().includes(term) || false;
    const phoneMatch = String(s.customers?.phone || '').includes(term) || false;
    const amountMatch = (s.grand_total || 0).toString().includes(term);
    return billMatch || customerMatch || phoneMatch || amountMatch;
  });

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Sales Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Query previous bills, generate returns, and audit transaction items</p>
        </div>
      </div>

      {/* Filter and Search Row */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
          <input 
            type="text" 
            placeholder="Search by invoice no, customer name, phone, amount..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field" 
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <select 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          <option value="all">All Dates</option>
          <option value="today">Today's Transactions</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Past 7 Days</option>
          <option value="month">Past 30 Days</option>
          <option value="custom">Custom Date Range</option>
        </select>

        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field" 
              style={{ width: 'auto' }} 
            />
            <span>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field" 
              style={{ width: 'auto' }} 
            />
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Invoice Code</th>
              <th style={{ padding: '12px' }}>Customer Phone</th>
              <th style={{ padding: '12px' }}>Transaction Date</th>
              <th style={{ padding: '12px' }}>Total amount</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && sales.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading database sales records...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No transaction records matched your search filters.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {s.bill_number}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{s.customers?.name || 'Walk-in Customer'}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{s.customers?.phone || 'No phone'}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(s.date).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    ₹{parseFloat(s.grand_total).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${s.status === 'Completed' ? 'badge-success' : s.status === 'Returned' ? 'badge-warning' : 'badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => setSelectedInvoice(s)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px', borderRadius: '8px' }}
                        title="Reprint Bill"
                      >
                        <Printer size={14} />
                      </button>
                      
                      {s.status === 'Completed' && (
                        <button 
                          onClick={() => handleReturnInvoice(s.id)}
                          className="btn btn-secondary" 
                          style={{ padding: '6px', borderRadius: '8px' }}
                          title="Process Return"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}

                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteInvoice(s.id)}
                          className="btn btn-danger" 
                          style={{ padding: '6px', borderRadius: '8px', boxShadow: 'none' }}
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DYNAMIC MODAL: RE-PRINT VIEW */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }} className="no-print">
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer size={16} />
              <span>Print Bill</span>
            </button>
            <button onClick={() => {
              const text = `Hi, invoice copy ${selectedInvoice.bill_number} for ₹${parseFloat(selectedInvoice.grand_total).toFixed(2)} is generated.`;
              window.open(`https://api.whatsapp.com/send?phone=${selectedInvoice.customers?.phone || ''}&text=${encodeURIComponent(text)}`);
            }} className="btn btn-secondary">
              <Share2 size={16} />
              <span>WhatsApp copy</span>
            </button>
            <button onClick={() => setSelectedInvoice(null)} className="btn btn-danger" style={{ boxShadow: 'none' }}>
              <span>Close Print View</span>
            </button>
          </div>

          {/* Printable Layout Container */}
          <div className="glass-panel print-area thermal-receipt" style={{ background: 'white', color: 'black', padding: '24px', borderRadius: '8px', maxWidth: '360px', width: '100%', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #ccc', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#000' }}>{storeSettings?.store_name || 'RETAIL GENIUS'}</h2>
              {storeSettings?.gst_number && <p style={{ fontSize: '0.75rem', color: '#555' }}>GSTIN: {storeSettings.gst_number}</p>}
              {storeSettings?.address && <p style={{ fontSize: '0.75rem', color: '#555' }}>{storeSettings.address}</p>}
              {storeSettings?.phone && <p style={{ fontSize: '0.75rem', color: '#555' }}>Tel: {storeSettings.phone}</p>}
              {storeSettings?.email && <p style={{ fontSize: '0.75rem', color: '#555' }}>Email: {storeSettings.email}</p>}
            </div>

            <div style={{ fontSize: '0.75rem', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
              <p><strong>Invoice No:</strong> {selectedInvoice.bill_number}</p>
              <p><strong>Date & Time:</strong> {new Date(selectedInvoice.date).toLocaleString()}</p>
              <p><strong>Customer:</strong> {selectedInvoice.customers?.name || 'Walk-in Customer'} ({selectedInvoice.customers?.phone || 'N/A'})</p>
            </div>

            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.sale_items?.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '4px 0' }}>{item.products?.name || 'Item'}</td>
                    <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{parseFloat(item.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '12px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-₹{parseFloat(selectedInvoice.discount_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GST:</span>
                <span>₹{parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '4px', justifyContent: 'space-between' }}>
                <span>Grand Total:</span>
                <span>₹{parseFloat(selectedInvoice.grand_total).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px dashed #ccc', paddingTop: '12px', fontSize: '0.7rem' }}>
              <p>Payment: {selectedInvoice.payment_method}</p>
              <p style={{ marginTop: '4px', fontWeight: 'bold' }}>Thank You for Shopping!</p>
              <p style={{ color: '#c00', fontSize: '0.75rem', marginTop: '8px', fontWeight: 'bold' }}>
                {selectedInvoice.status !== 'Completed' && `STATUS: ${selectedInvoice.status.toUpperCase()}`}
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
