import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  AlertTriangle, 
  XOctagon,
  ArrowRight,
  PlusCircle,
  Receipt,
  FileBarChart
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayISO = today.toISOString();

      // 1. Fetch Today's Sales & Orders
      const { data: salesToday, error: salesError } = await supabase
        .from('sales')
        .select('grand_total, status')
        .gte('date', todayISO);
      
      let salesSum = 0;
      let ordersCount = 0;
      if (salesToday) {
        salesToday.forEach(s => {
          if (s.status === 'Completed') {
            salesSum += parseFloat(s.grand_total);
            ordersCount++;
          }
        });
      }

      // 2. Fetch Customer Count
      const { count: customersCount, error: custError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // 3. Fetch Products Stats
      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('id, current_stock, minimum_stock');

      let totalProds = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      if (productsData) {
        totalProds = productsData.length;
        productsData.forEach(p => {
          if (p.current_stock === 0) {
            outOfStockCount++;
          } else if (p.current_stock <= p.minimum_stock) {
            lowStockCount++;
          }
        });
      }

      setStats({
        todaySales: salesSum,
        todayOrders: ordersCount,
        totalCustomers: customersCount || 0,
        totalProducts: totalProds,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount
      });

      // 4. Fetch Recent Bills
      const { data: recent, error: recentError } = await supabase
        .from('sales')
        .select(`
          id,
          bill_number,
          grand_total,
          payment_method,
          date,
          status,
          customers ( name )
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (recent) setRecentBills(recent);

      // 5. Fetch Weekly Sales Chart Data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weeklySales, error: chartError } = await supabase
        .from('sales')
        .select('grand_total, date, status')
        .gte('date', sevenDaysAgo.toISOString())
        .eq('status', 'Completed');

      // Aggregate sales by weekday
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
          dateObj: d,
          name: days[d.getDay()],
          sales: 0
        };
      }).reverse();

      if (weeklySales) {
        weeklySales.forEach(sale => {
          const saleDate = new Date(sale.date);
          const match = last7Days.find(day => 
            day.dateObj.getDate() === saleDate.getDate() && 
            day.dateObj.getMonth() === saleDate.getMonth()
          );
          if (match) {
            match.sales += parseFloat(sale.grand_total);
          }
        });
      }

      setChartData(last7Days.map(d => ({ name: d.name, Sales: parseFloat(d.sales.toFixed(2)) })));

      // 6. Fetch Top Selling Products
      // We will perform a simple join or fetch a mocked-up top selling from active stock
      const { data: popular, error: popError } = await supabase
        .from('products')
        .select('name, current_stock, selling_price, brand')
        .order('selling_price', { ascending: false })
        .limit(4);
      
      if (popular) setTopProducts(popular);

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const gridCardStyle = {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  };

  const iconWrapper = (bgColor, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bgColor,
    color: color
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading business operations metrics...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time sales figures, orders status and catalog summary</p>
        </div>

        {/* Quick Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/billing')}>
            <Receipt size={18} />
            <span>New Invoice</span>
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
            <PlusCircle size={18} />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={gridCardStyle}>
          <div style={iconWrapper('rgba(114, 52, 237, 0.1)', 'var(--primary)')}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Sales</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>₹{stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="glass-panel" style={gridCardStyle}>
          <div style={iconWrapper('rgba(16, 185, 129, 0.1)', 'var(--success)')}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Invoices</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{stats.todayOrders}</h3>
          </div>
        </div>

        <div className="glass-panel" style={gridCardStyle}>
          <div style={iconWrapper('rgba(6, 182, 212, 0.1)', 'var(--accent)')}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Customers</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{stats.totalCustomers}</h3>
          </div>
        </div>

        <div className="glass-panel" style={gridCardStyle}>
          <div style={iconWrapper('rgba(245, 158, 11, 0.1)', 'var(--warning)')}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Low / No Stock</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: stats.outOfStock > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {stats.lowStock} / {stats.outOfStock}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Charts & Side Panels */}
      <div className="charts-grid">
        {/* Sales Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Weekly Sales Performance</h3>
          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-light)" fontSize={12} />
                <YAxis stroke="var(--text-light)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-card)', 
                    borderColor: 'var(--border)', 
                    borderRadius: '8px', 
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)'
                  }} 
                />
                <Area type="monotone" dataKey="Sales" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Top Selling Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {topProducts.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No product sales log found.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{p.brand || 'No Brand'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>₹{p.selling_price.toFixed(2)}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Stock: {p.current_stock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Bills List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Bills</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/sales')} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <th style={{ padding: '12px 8px' }}>Invoice No</th>
                <th style={{ padding: '12px 8px' }}>Customer</th>
                <th style={{ padding: '12px 8px' }}>Date</th>
                <th style={{ padding: '12px 8px' }}>Total Amount</th>
                <th style={{ padding: '12px 8px' }}>Payment Method</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No recent bills generated today.
                  </td>
                </tr>
              ) : (
                recentBills.map((bill) => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{bill.bill_number}</td>
                    <td style={{ padding: '12px 8px' }}>{bill.customers?.name || 'Walk-in Customer'}</td>
                    <td style={{ padding: '12px 8px' }}>{new Date(bill.date).toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>₹{parseFloat(bill.grand_total).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{bill.payment_method}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`badge ${bill.status === 'Completed' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
