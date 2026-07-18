import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  BarChart, 
  Download, 
  Percent, 
  AlertTriangle, 
  RefreshCw 
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'taxes' | 'expenses' | 'stock'
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [salesSummary, setSalesSummary] = useState({ totalRevenue: 0, totalOrders: 0, totalProfit: 0, totalDiscount: 0 });
  const [taxReport, setTaxReport] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Date range selectors
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Expense form state
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'Rent', description: '', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate + 'T23:59:59').toISOString();

      if (activeTab === 'sales') {
        // Fetch revenue, discount, and orders count
        const { data: salesData, error: salesErr } = await supabase
          .from('sales')
          .select('id, grand_total, discount_amount, subtotal')
          .gte('date', startISO)
          .lte('date', endISO)
          .eq('status', 'Completed');

        if (salesErr) throw salesErr;

        // Fetch sale items to calculate exact profits
        // Profit = selling_price - purchase_price for each quantity
        const { data: saleItemsData, error: itemsErr } = await supabase
          .from('sale_items')
          .select('quantity, unit_price, purchase_price, total_amount')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        if (itemsErr) throw itemsErr;

        let totalRevenue = 0;
        let totalDiscount = 0;
        let totalOrders = salesData?.length || 0;
        
        if (salesData) {
          salesData.forEach(s => {
            totalRevenue += parseFloat(s.grand_total);
            totalDiscount += parseFloat(s.discount_amount || 0);
          });
        }

        let totalCost = 0;
        if (saleItemsData) {
          saleItemsData.forEach(item => {
            totalCost += parseFloat(item.purchase_price) * item.quantity;
          });
        }

        const totalProfit = Math.max(0, totalRevenue - totalCost);

        setSalesSummary({
          totalRevenue,
          totalOrders,
          totalDiscount,
          totalProfit
        });
      }

      if (activeTab === 'taxes') {
        // Tax Report: Aggregate sales by tax parameters
        const { data: salesTaxData, error: taxErr } = await supabase
          .from('sales')
          .select('bill_number, date, subtotal, tax_amount, grand_total')
          .gte('date', startISO)
          .lte('date', endISO)
          .eq('status', 'Completed');

        if (taxErr) throw taxErr;
        setTaxReport(salesTaxData || []);
      }

      if (activeTab === 'expenses') {
        // Fetch expenses
        const { data: expenseData, error: expErr } = await supabase
          .from('expenses')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });

        if (expErr) throw expErr;
        setExpenses(expenseData || []);
      }

      if (activeTab === 'stock') {
        // Fetch low stock products
        const { data: stockData, error: stockErr } = await supabase
          .from('products')
          .select('name, sku, current_stock, minimum_stock, brand')
          .order('current_stock', { ascending: true });

        if (stockErr) throw stockErr;
        
        // Filter locally for simplicity and reactivity
        const filtered = (stockData || []).filter(p => p.current_stock <= p.minimum_stock);
        setLowStockItems(filtered);
      }

    } catch (err) {
      console.error('Error fetching report details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description,
          date: expenseForm.date
        }]);

      if (error) throw error;
      setIsExpenseOpen(false);
      setExpenseForm({ amount: '', category: 'Rent', description: '', date: new Date().toISOString().slice(0, 10) });
      fetchReportData();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportReportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `report_${activeTab}`;

    if (activeTab === 'sales') {
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Revenue (₹)', salesSummary.totalRevenue.toFixed(2)],
        ['Total Profit (₹)', salesSummary.totalProfit.toFixed(2)],
        ['Total Orders', salesSummary.totalOrders],
        ['Discounts Awarded (₹)', salesSummary.totalDiscount.toFixed(2)]
      ];
    } else if (activeTab === 'taxes') {
      headers = ['Invoice No', 'Date', 'Subtotal (₹)', 'GST Tax Amount (₹)', 'Grand Total (₹)'];
      rows = taxReport.map(t => [t.bill_number, new Date(t.date).toLocaleDateString(), t.subtotal, t.tax_amount, t.grand_total]);
    } else if (activeTab === 'expenses') {
      headers = ['Date', 'Category', 'Description', 'Amount (₹)'];
      rows = expenses.map(e => [e.date, e.category, e.description || '', e.amount]);
    } else if (activeTab === 'stock') {
      headers = ['Product Name', 'SKU', 'Current Stock', 'Minimum Stock Threshold'];
      rows = lowStockItems.map(p => [p.name, p.sku || '', p.current_stock, p.minimum_stock]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summaryCardStyle = {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Reports & Financials</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyze business margins, collect tax audits, track operational expenditures</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={exportReportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          
          {activeTab === 'expenses' && (
            <button className="btn btn-primary" onClick={() => setIsExpenseOpen(true)}>
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector & Date row */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Tab triggers */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button onClick={() => setActiveTab('sales')} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: activeTab === 'sales' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'sales' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Sales & Profits
          </button>
          <button onClick={() => setActiveTab('taxes')} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: activeTab === 'taxes' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'taxes' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            GST Audits
          </button>
          <button onClick={() => setActiveTab('expenses')} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: activeTab === 'expenses' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'expenses' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Expense Book
          </button>
          <button onClick={() => setActiveTab('stock')} className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', background: activeTab === 'stock' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'stock' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Low Stock Alerts
          </button>
        </div>

        {/* Date scope selector */}
        {activeTab !== 'stock' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field" 
              style={{ width: 'auto' }} 
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
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

      {/* CONTENT SHEETS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading financial summaries...
        </div>
      ) : (
        <>
          {/* TAB 1: SALES SUMMARY */}
          {activeTab === 'sales' && (
            <div>
              <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                <div className="glass-panel" style={summaryCardStyle}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(114, 52, 237, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Revenue</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>₹{salesSummary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                </div>

                <div className="glass-panel" style={summaryCardStyle}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center' }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Calculated Profit</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--success)' }}>₹{salesSummary.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                </div>

                <div className="glass-panel" style={summaryCardStyle}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center' }}>
                    <BarChart size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Order Volume</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{salesSummary.totalOrders}</h3>
                  </div>
                </div>

                <div className="glass-panel" style={summaryCardStyle}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center' }}>
                    <Percent size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Discounts Given</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--danger)' }}>-₹{salesSummary.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>Profit calculation includes standard unit costs margin overrides subtracted from selling totals.</p>
              </div>
            </div>
          )}

          {/* TAB 2: TAX REPORT */}
          {activeTab === 'taxes' && (
            <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px' }}>Invoice No</th>
                    <th style={{ padding: '12px' }}>Billing Date</th>
                    <th style={{ padding: '12px' }}>Taxable Amt (₹)</th>
                    <th style={{ padding: '12px' }}>GST Tax Charged (₹)</th>
                    <th style={{ padding: '12px' }}>Total Ledger (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {taxReport.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No tax collections logged in this date range.
                      </td>
                    </tr>
                  ) : (
                    taxReport.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{t.bill_number}</td>
                        <td style={{ padding: '12px' }}>{new Date(t.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px' }}>₹{parseFloat(t.subtotal).toFixed(2)}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--warning)' }}>₹{parseFloat(t.tax_amount).toFixed(2)}</td>
                        <td style={{ padding: '12px' }}>₹{parseFloat(t.grand_total).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: EXPENSE BOOK */}
          {activeTab === 'expenses' && (
            <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Expenditure Type</th>
                    <th style={{ padding: '12px' }}>Description Notes</th>
                    <th style={{ padding: '12px' }}>Amount Spent (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Expense book is empty for this date range.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px' }}>{e.date}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-info">{e.category}</span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{e.description || 'N/A'}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--danger)' }}>-₹{parseFloat(e.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: LOW STOCK LIST */}
          {activeTab === 'stock' && (
            <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px' }}>Product Name</th>
                    <th style={{ padding: '12px' }}>SKU Code</th>
                    <th style={{ padding: '12px' }}>Current Stock</th>
                    <th style={{ padding: '12px' }}>Minimum Threshold</th>
                    <th style={{ padding: '12px' }}>Alert Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ✓ All catalog products satisfy safety margins.
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{p.sku || 'N/A'}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--danger)' }}>{p.current_stock}</td>
                        <td style={{ padding: '12px' }}>{p.minimum_stock}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={12} />
                            <span>{p.current_stock === 0 ? 'Out of stock' : 'Low Stock'}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* DYNAMIC MODAL: LOG EXPENSE */}
      {isExpenseOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '32px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Log Expense Entry</h3>
            
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Expense Amount (₹) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={expenseForm.amount} 
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input-field" 
                  placeholder="0.00" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  value={expenseForm.category} 
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field"
                >
                  <option value="Rent">Rent</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Salary">Staff Salaries</option>
                  <option value="Inventory Logistics">Logistics / Shipping</option>
                  <option value="Marketing">Marketing / Advertisement</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expense Date</label>
                <input 
                  type="date" 
                  value={expenseForm.date} 
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Remarks</label>
                <input 
                  type="text" 
                  value={expenseForm.description} 
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field" 
                  placeholder="e.g. Paid office rent for July" 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsExpenseOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
