import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  History, 
  Layers, 
  Package, 
  Upload, 
  Barcode, 
  ArrowLeftRight 
} from 'lucide-react';

export default function Inventory() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories' | 'logs'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'low' | 'out'

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    brand: '',
    purchase_price: '',
    selling_price: '',
    gst_rate: '18',
    current_stock: '0',
    minimum_stock: '10',
    supplier_id: '',
    description: '',
    image_url: ''
  });

  // Category & Supplier Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Stock Adjustment Form State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('Adjustment'); // 'Adjustment' | 'Purchase'
  const [adjustNotes, setAdjustNotes] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
    fetchLogs();
  }, []);

  // Fetch lists
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories ( name )
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
          *,
          products ( name, sku )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  // Image Upload helper
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      // Upload file to Supabase storage bucket
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        // Fallback: create base64 representation if bucket doesn't exist
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result }));
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      }
    } catch (err) {
      console.error('Image upload failed:', err.message);
    }
  };

  // Handle barcode creation auto-generator
  const generateSKUAndBarcode = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    const skuName = formData.name ? formData.name.substring(0, 3).toUpperCase() : 'PROD';
    setFormData(prev => ({
      ...prev,
      sku: `${skuName}-${random}`,
      barcode: `${8900000000000 + random}`
    }));
  };

  // Create or Update Product
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const pData = {
        name: formData.name,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        brand: formData.brand || null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        gst_rate: parseFloat(formData.gst_rate) || 0,
        current_stock: parseInt(formData.current_stock) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 0,
        supplier_id: formData.supplier_id || null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(pData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([pData]);
        if (error) throw error;
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
      fetchLogs();
    } catch (err) {
      alert('Error saving product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Button Trigger
  const startEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      gst_rate: product.gst_rate.toString(),
      current_stock: product.current_stock.toString(),
      minimum_stock: product.minimum_stock.toString(),
      supplier_id: product.supplier_id || '',
      description: product.description || '',
      image_url: product.image_url || ''
    });
    setIsFormOpen(true);
  };

  // Delete Product
  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  // Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCatName, description: newCatDesc }]);
      if (error) throw error;
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  // Adjust stock
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustQty || !adjustProduct) return;
    try {
      const qtyChange = parseInt(adjustQty);
      const absoluteChange = adjustType === 'Purchase' ? Math.abs(qtyChange) : qtyChange; // purchase strictly increments, manual adjustment can be pos or neg
      
      const newStock = Math.max(0, adjustProduct.current_stock + absoluteChange);

      // 1. Update product stock
      const { error: prodErr } = await supabase
        .from('products')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', adjustProduct.id);
      
      if (prodErr) throw prodErr;

      // 2. Insert stock log entry (trigger is set to insert logs automatically, but manual adjustment logs can also be explicitly created)
      const { error: logErr } = await supabase
        .from('inventory_logs')
        .insert([{
          product_id: adjustProduct.id,
          change_qty: absoluteChange,
          type: adjustType,
          notes: adjustNotes || `${adjustType} stock change`,
          created_by: user?.id
        }]);

      if (logErr) throw logErr;

      setIsAdjustOpen(false);
      setAdjustProduct(null);
      setAdjustQty('');
      setAdjustNotes('');
      fetchProducts();
      fetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter products based on inputs
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                          (p.barcode && p.barcode.includes(search));
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.current_stock > 0 && p.current_stock <= p.minimum_stock;
    } else if (stockFilter === 'out') {
      matchesStock = p.current_stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Inventory Warehouse</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Catalog products, adjust stock levels, and review audit history</p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button 
            className="btn" 
            onClick={() => setActiveTab('products')} 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem', 
              background: activeTab === 'products' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'products' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <Package size={16} />
            <span>Products</span>
          </button>
          <button 
            className="btn" 
            onClick={() => setActiveTab('categories')} 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem', 
              background: activeTab === 'categories' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'categories' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <Layers size={16} />
            <span>Categories</span>
          </button>
          <button 
            className="btn" 
            onClick={() => setActiveTab('logs')} 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem', 
              background: activeTab === 'logs' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'logs' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <History size={16} />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCTS SHEET */}
      {activeTab === 'products' && (
        <div>
          {/* Controls row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input 
                type="text" 
                placeholder="Search by SKU, Barcode, Name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field" 
                style={{ paddingLeft: '40px' }}
              />
            </div>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select 
              value={stockFilter} 
              onChange={(e) => setStockFilter(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="all">All Stocks</option>
              <option value="low">Low Stock Alerts</option>
              <option value="out">Out of Stock</option>
            </select>

            <button className="btn btn-primary" onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '', sku: '', barcode: '', category_id: '', brand: '',
                purchase_price: '', selling_price: '', gst_rate: '18',
                current_stock: '0', minimum_stock: '10', supplier_id: '',
                description: '', image_url: ''
              });
              setIsFormOpen(true);
            }}>
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Product Details</th>
                  <th style={{ padding: '12px' }}>SKU / Barcode</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px' }}>Pricing</th>
                  <th style={{ padding: '12px' }}>Stock Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No items matched your active search query.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOut = p.current_stock === 0;
                    const isLow = p.current_stock <= p.minimum_stock;

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: 'var(--border)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Package size={20} color="var(--text-light)" />
                            )}
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 600 }}>{p.name}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{p.brand || 'Generic'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, display: 'block' }}>{p.sku || 'N/A'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Barcode size={12} /> {p.barcode || 'No Barcode'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-info">{p.categories?.name || 'Uncategorized'}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Buy: </span>
                            <strong>₹{p.purchase_price.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Sell: </span>
                            <strong style={{ color: 'var(--primary)' }}>₹{p.selling_price.toFixed(2)}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block' }}>{p.current_stock}</span>
                          <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                            {isOut ? 'Out of stock' : isLow ? 'Low Stock' : 'In stock'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => {
                                setAdjustProduct(p);
                                setAdjustType('Purchase');
                                setIsAdjustOpen(true);
                              }}
                              className="btn btn-secondary" 
                              style={{ padding: '6px', borderRadius: '8px' }}
                              title="Quick Stock Adjust"
                            >
                              <ArrowLeftRight size={14} />
                            </button>
                            <button 
                              onClick={() => startEdit(p)}
                              className="btn btn-secondary" 
                              style={{ padding: '6px', borderRadius: '8px' }}
                              title="Edit Details"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteProduct(p.id)}
                              className="btn btn-danger" 
                              style={{ padding: '6px', borderRadius: '8px', boxShadow: 'none' }}
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY MANAGER */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Create New Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)} 
                  placeholder="e.g. Beverages, Packaged Foods" 
                  className="input-field" 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  value={newCatDesc} 
                  onChange={(e) => setNewCatDesc(e.target.value)} 
                  placeholder="Short explanation of products inside this grouping..." 
                  className="input-field" 
                  rows="3"
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary">Create Category</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Existing Categories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{c.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.description || 'No description provided.'}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Created: {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Stock Adjustment Audit Trails</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px' }}>Time</th>
                  <th style={{ padding: '12px' }}>Product</th>
                  <th style={{ padding: '12px' }}>SKU</th>
                  <th style={{ padding: '12px' }}>Change Qty</th>
                  <th style={{ padding: '12px' }}>Reason Type</th>
                  <th style={{ padding: '12px' }}>Audit Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No inventory logs recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px' }}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{l.products?.name || 'Deleted Product'}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{l.products?.sku || 'N/A'}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: l.change_qty > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {l.change_qty > 0 ? `+${l.change_qty}` : l.change_qty}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${l.type === 'Sale' ? 'badge-info' : l.type === 'Return' ? 'badge-success' : 'badge-warning'}`}>
                          {l.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{l.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: ADD/EDIT PRODUCT */}
      {isFormOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '640px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: '32px', background: 'var(--bg-card)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>
              {editingProduct ? 'Modify Product Specifications' : 'Catalog New Inventory Item'}
            </h3>
            
            <form onSubmit={handleProductSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Diet Coke 300ml" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input 
                    type="text" 
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Coca Cola" 
                    className="input-field" 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label">SKU & Barcode *</label>
                    <button type="button" onClick={generateSKUAndBarcode} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                      Generate Automatically
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input 
                      type="text" 
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="SKU Code" 
                      className="input-field" 
                      required 
                    />
                    <input 
                      type="text" 
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="UPC/EAN Barcode" 
                      className="input-field" 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Purchase Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="0.00" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                    placeholder="0.00" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST Tax (%)</label>
                  <select 
                    value={formData.gst_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_rate: e.target.value }))}
                    className="input-field"
                  >
                    <option value="0">0% (GST Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stock / Min Threshold</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input 
                      type="number" 
                      value={formData.current_stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                      placeholder="Current Stock" 
                      className="input-field" 
                      disabled={!!editingProduct} // Require audit adjusts for edits
                      required 
                    />
                    <input 
                      type="number" 
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: e.target.value }))}
                      placeholder="Min Stock Alert" 
                      className="input-field" 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Supplier Partner</label>
                  <select 
                    value={formData.supplier_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Item Photo</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      <Upload size={16} />
                      <span>Upload JPG/PNG</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    {formData.image_url && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                        ✓ Photo attached successfully
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Product Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional notes about package dimensions, barcodes, or display guidelines..."
                    className="input-field"
                    rows="3"
                  ></textarea>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving details...' : 'Confirm Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: STOCK ADJUSTMENT */}
      {isAdjustOpen && adjustProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '400px', width: '100%', padding: '32px', background: 'var(--bg-card)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Adjust Stock</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              <strong>Item:</strong> {adjustProduct.name} <br />
              <strong>Current Stock:</strong> {adjustProduct.current_stock}
            </p>

            <form onSubmit={handleStockAdjustment}>
              <div className="form-group">
                <label className="form-label">Adjustment Type</label>
                <select 
                  value={adjustType} 
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="input-field"
                >
                  <option value="Adjustment">Manual Correction (can be negative)</option>
                  <option value="Purchase">Purchase Supply (Restock)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Change Quantity *</label>
                <input 
                  type="number" 
                  value={adjustQty} 
                  onChange={(e) => setAdjustQty(e.target.value)} 
                  placeholder="e.g. +50 or -10" 
                  className="input-field" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Audit Notes</label>
                <input 
                  type="text" 
                  value={adjustNotes} 
                  onChange={(e) => setAdjustNotes(e.target.value)} 
                  placeholder="e.g. Supplier delivery invoice #99" 
                  className="input-field" 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsAdjustOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
