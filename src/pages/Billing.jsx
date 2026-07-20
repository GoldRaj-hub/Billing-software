import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useBillingStore } from '../store/billingStore';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  CreditCard, 
  Printer, 
  Download, 
  Share2, 
  Mail, 
  Bookmark, 
  RefreshCw,
  FolderOpen,
  X,
  Camera,
  Play,
  Plus,
  Minus,
  AlertCircle,
  Barcode,
  Receipt
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Billing() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Manager';
  const location = useLocation();

  // Retrieve Billing Zustand State
  const {
    cart,
    customer,
    discountType,
    discountValue,
    taxRate,
    extraCharges,
    couponCode,
    couponDiscount,
    heldBills,
    addToCart,
    updateQuantity,
    editUnitPrice,
    removeItem,
    setCustomer,
    applyDiscount,
    applyTax,
    applyExtraCharges,
    applyCoupon,
    clearCart,
    holdBill,
    resumeBill,
    discardHeldBill,
    getTotals
  } = useBillingStore();

  // Component local states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'Retail Genius Store',
    gst_number: '',
    address: '',
    phone: '',
    email: '',
    invoice_prefix: 'RG',
    tax_settings: { default_gst: 18, inclusive_tax: false },
    printer_settings: { receipt_width: '80mm' }
  });
  
  // Modals visibility
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHoldsModalOpen, setIsHoldsModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // New Customer Form State
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', gst_number: '' });
  
  // Checkout settings
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [checkoutBillNumber, setCheckoutBillNumber] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Barcode keyboard typing tracker (for hardware scanners)
  const barcodeKeysRef = useRef('');
  const barcodeTimeRef = useRef(0);

  // Refs for camera scanner
  const qrScannerRef = useRef(null);

  useEffect(() => {
    fetchBillingMetadata();
  }, []);

  // Register hardware barcode keypress listeners with proper cleanup
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error);
      }
    };
  }, [handleGlobalKeydown]);

  // Update searchQuery if location search param changes (?q=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [location.search]);

  const fetchBillingMetadata = async () => {
    try {
      // 1. Fetch products
      const { data: prodData } = await supabase
          .from('products')
          .select('*, categories(name)')
          .order('name');
      setProducts(prodData || []);

      // 2. Fetch categories
      const { data: catData } = await supabase
          .from('categories')
          .select('*');
      setCategories(catData || []);

      // 3. Fetch customers
      const { data: custData } = await supabase
          .from('customers')
          .select('*');
      setCustomers(custData || []);

      // 4. Fetch store settings
      const { data: settingsData } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 'store_config')
          .single();
      if (settingsData) {
        setStoreSettings(settingsData);
        // Load default GST rate into billing store
        if (settingsData.tax_settings?.default_gst !== undefined) {
          applyTax(parseFloat(settingsData.tax_settings.default_gst));
        }
      }
    } catch (err) {
      console.error('Billing metadata load failed:', err.message);
    }
  };

  // 1. Hardware Barcode Scanner Listener (wrapped in useCallback to avoid stale closures)
  const handleGlobalKeydown = useCallback((e) => {
    // If typing in input fields, ignore scanner listener
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Allow F-shortcuts
      if (e.key === 'F9') {
        e.preventDefault();
        setIsCheckoutOpen(true);
      }
      return;
    }

    // Close modals on Escape
    if (e.key === 'Escape') {
      setIsCustomerModalOpen(false);
      setIsHoldsModalOpen(false);
      setIsCheckoutOpen(false);
      setIsScannerOpen(false);
      setLastInvoice(null);
      return;
    }

    const now = Date.now();
    // Hardware scanners output characters very fast (interval < 40ms)
    if (now - barcodeTimeRef.current > 150) {
      barcodeKeysRef.current = '';
    }
    barcodeTimeRef.current = now;

    if (e.key === 'Enter') {
      if (barcodeKeysRef.current.length > 3) {
        processBarcodeScan(barcodeKeysRef.current);
      }
      barcodeKeysRef.current = '';
    } else if (e.key.length === 1 && /[0-9a-zA-Z\-]/.test(e.key)) {
      barcodeKeysRef.current += e.key;
    }

    // Keyboard POS Shortcuts
    if (e.key === 'F2') {
      e.preventDefault();
      setIsCustomerModalOpen(true);
    }
    if (e.key === 'F8') {
      e.preventDefault();
      const note = prompt('Enter notes for holding this bill:');
      if (note !== null) holdBill(note);
    }
    if (e.key === 'F9') {
      e.preventDefault();
      setIsCheckoutOpen(true);
    }
    if (e.key === 'F12') {
      e.preventDefault();
      if (confirm('Clear entire cart?')) clearCart();
    }
  }, [products, addToCart, holdBill, clearCart]);

  const processBarcodeScan = useCallback((barcode) => {
    // Find matching product
    const matched = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (matched) {
      addToCart(matched, 1);
      // Optional sound notification
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // beep
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (f) {}
    } else {
      alert(`Barcode "${barcode}" not matched in products database.`);
    }
  }, [products, addToCart]);

  // 2. Camera QR/Barcode Scanner
  const startCameraScanner = () => {
    setIsScannerOpen(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 15, 
        qrbox: { width: 250, height: 250 } 
      }, false);
      
      scanner.render((decodedText) => {
        processBarcodeScan(decodedText);
        scanner.clear();
        setIsScannerOpen(false);
      }, (error) => {
        // quiet error
      });
      qrScannerRef.current = scanner;
    }, 100);
  };

  // Create new customer inside billing modal
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCust.name || !newCust.phone) return alert('Name & Phone are required');
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCust])
        .select();

      if (error) throw error;
      setCustomers(prev => [...prev, data[0]]);
      setCustomer(data[0]);
      setIsCustomerModalOpen(false);
      setNewCust({ name: '', phone: '', email: '', gst_number: '' });
    } catch (err) {
      alert('Failed to register customer: ' + err.message);
    }
  };

  // Generate complete checkout invoice
  const executeCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty.');
    setIsCheckingOut(true);
    try {
      const inclusiveTax = storeSettings?.tax_settings?.inclusive_tax || false;
      const totals = getTotals(inclusiveTax);
      const prefix = storeSettings?.invoice_prefix || 'RG';
      const uniqueBillNo = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // 1. Save Sale to Supabase
      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          bill_number: uniqueBillNo,
          customer_id: customer.id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          discount_amount: totals.discount,
          coupon_code: couponCode || null,
          extra_charges: extraCharges,
          grand_total: totals.grandTotal,
          payment_method: paymentMethod,
          cashier_id: profile?.id || null,
          status: 'Completed',
          date: new Date().toISOString()
        }])
        .select();

      if (saleErr) throw saleErr;
      const saleId = saleData[0].id;

      // 2. Save Sale Items to Supabase
      const itemsToInsert = cart.map(item => ({
        sale_id: saleId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.customPrice !== null ? item.customPrice : item.product.selling_price,
        purchase_price: item.product.purchase_price,
        gst_rate: item.product.gst_rate,
        discount_amount: 0, // item-level discount could go here
        total_amount: (item.customPrice !== null ? item.customPrice : item.product.selling_price) * item.quantity
      }));

      const { error: itemsErr } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        await supabase.from('sales').delete().eq('id', saleId);
        throw itemsErr;
      }

      // 3. Save Payments details
      const { error: payErr } = await supabase
        .from('payments')
        .insert([{
          sale_id: saleId,
          amount: totals.grandTotal,
          payment_method: paymentMethod
        }]);
        
      if (payErr) {
        await supabase.from('sales').delete().eq('id', saleId);
        throw payErr;
      }

      // 4. Deduct Stock
      for (const item of cart) {
        const newStock = Math.max(0, item.product.current_stock - item.quantity);
        await supabase
          .from('products')
          .update({ current_stock: newStock })
          .eq('id', item.product.id);
      }

      setCheckoutBillNumber(uniqueBillNo);
      setLastInvoice({
        bill_number: uniqueBillNo,
        date: new Date(),
        customer,
        cart,
        totals,
        paymentMethod
      });
      
      setIsCheckoutOpen(false);
      clearCart();
      fetchBillingMetadata(); // refresh stock numbers
      
      alert('Checkout completed successfully!');
    } catch (err) {
      alert('Checkout transaction error: ' + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Instantly search matching products locally
  const matchedProducts = products.filter(p => {
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
           (p.barcode && p.barcode.includes(searchQuery));
  });

  const inclusiveTax = storeSettings?.tax_settings?.inclusive_tax || false;
  const totals = getTotals(inclusiveTax);

  return (
    <div className="page-wrapper" style={{ height: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Shortcuts Banner */}
      <div className="desktop-only" style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', opacity: 0.7, paddingBottom: '12px' }}>
        <span><strong>F2:</strong> Bind Customer</span>
        <span><strong>F8:</strong> Hold Draft</span>
        <span><strong>F9:</strong> Checkout</span>
        <span><strong>F12:</strong> Clear Cart</span>
        <span><strong>Hardware Barcodes:</strong> Scan anytime without focusing inputs</span>
      </div>

      <div className="billing-layout">
        
        {/* LEFT COLUMN: PRODUCT PICKER */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input 
                type="text" 
                placeholder="Search catalog... (Name, SKU, Barcode)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field" 
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <button className="btn btn-secondary" onClick={startCameraScanner} title="Camera Scanner">
              <Camera size={18} />
            </button>

            <button className="btn btn-secondary" onClick={() => setIsHoldsModalOpen(true)} title="Draft holds">
              <FolderOpen size={18} />
              {heldBills.length > 0 && <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '4px' }}>{heldBills.length}</span>}
            </button>
          </div>

          {/* Camera Scanner View */}
          {isScannerOpen && (
            <div style={{ position: 'relative', padding: '10px', background: 'black', borderRadius: '8px', marginBottom: '12px' }}>
              <div id="reader" style={{ width: '100%' }}></div>
              <button 
                onClick={() => {
                  if (qrScannerRef.current) qrScannerRef.current.clear();
                  setIsScannerOpen(false);
                }} 
                style={{ position: 'absolute', top: 5, right: 5, background: 'var(--danger)', color: 'white', padding: '4px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Grid list of matched products */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', alignContent: 'start' }}>
            {(showAllProducts ? matchedProducts : matchedProducts.slice(0, 24)).map(p => {
              const isOut = p.current_stock === 0;
              return (
                <div 
                  key={p.id}
                  onClick={() => !isOut && addToCart(p, 1)}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: isOut ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: isOut ? 0.5 : 1,
                    position: 'relative'
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                  ) : (
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border)', borderRadius: '6px', marginBottom: '8px' }}>
                      <Barcode size={28} color="var(--text-light)" />
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>Stock: {p.current_stock}</span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--primary)', marginTop: '6px' }}>₹{p.selling_price.toFixed(2)}</strong>
                </div>
              );
            })}
            {!showAllProducts && matchedProducts.length > 24 && (
              <button
                onClick={() => setShowAllProducts(true)}
                className="btn btn-secondary"
                style={{ gridColumn: '1 / -1', padding: '12px', fontSize: '0.85rem' }}
              >
                Show all {matchedProducts.length} products
              </button>
            )}
            {showAllProducts && matchedProducts.length > 24 && (
              <button
                onClick={() => setShowAllProducts(false)}
                className="btn btn-secondary"
                style={{ gridColumn: '1 / -1', padding: '12px', fontSize: '0.85rem' }}
              >
                Show less
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BILL CART */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Customer Binder Row */}
          <div style={{ display: 'flex', justifyItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block' }}>Customer Link</span>
              <strong style={{ fontSize: '0.95rem' }}>{customer.name} ({customer.phone})</strong>
            </div>
            <button className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(true)} style={{ padding: '8px 12px' }}>
              <UserPlus size={16} />
              <span>Bind</span>
            </button>
          </div>

          {/* Cart Table list */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
            {cart.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Receipt size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <span>Standard checkout cart is empty</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, marginRight: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.product.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      MRP: ₹{item.product.selling_price.toFixed(2)}
                    </span>
                  </div>

                  {/* Qty selectors */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="btn btn-secondary" style={{ padding: '4px', borderRadius: '4px' }}>
                      <Minus size={12} />
                    </button>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                      style={{ width: '40px', textAlign: 'center', fontWeight: 'bold' }} 
                    />
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="btn btn-secondary" style={{ padding: '4px', borderRadius: '4px' }}>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Price column (supports overrides) */}
                  <div style={{ marginRight: '16px' }}>
                    {isAdmin ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.customPrice !== null ? item.customPrice : item.product.selling_price}
                        onChange={(e) => editUnitPrice(item.product.id, e.target.value)}
                        style={{ width: '70px', borderBottom: '1px dashed var(--primary)', textAlign: 'right', fontWeight: 'bold' }} 
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>
                        ₹{((item.customPrice !== null ? item.customPrice : item.product.selling_price) * item.quantity).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <button onClick={() => removeItem(item.product.id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart calculations panel */}
          <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            
            {/* Discount/Charges config button row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Disc (%)</label>
                <input 
                  type="number" 
                  value={discountValue} 
                  onChange={(e) => applyDiscount('percentage', e.target.value)}
                  className="input-field" 
                  style={{ padding: '6px 12px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Charges (₹)</label>
                <input 
                  type="number" 
                  value={extraCharges} 
                  onChange={(e) => useBillingStore.getState().applyExtraCharges(e.target.value)}
                  className="input-field" 
                  style={{ padding: '6px 12px' }}
                />
              </div>
            </div>

            {/* Calculations breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                <strong>₹{totals.subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount:</span>
                <strong style={{ color: 'var(--danger)' }}>-₹{totals.discount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GST ({taxRate}%):</span>
                <strong>₹{totals.taxAmount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                <strong>Grand Total:</strong>
                <strong style={{ color: 'var(--primary)' }}>₹{totals.grandTotal.toFixed(2)}</strong>
              </div>
            </div>

            {/* Hold and Checkout Controls */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => {
                const note = prompt('Enter notes for holding this bill:');
                if (note !== null) holdBill(note);
              }} className="btn btn-secondary" style={{ flex: 1 }}>
                <Bookmark size={16} />
                <span>Hold</span>
              </button>
              <button onClick={() => setIsCheckoutOpen(true)} className="btn btn-primary" style={{ flex: 2 }}>
                <CreditCard size={16} />
                <span>Checkout</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* DYNAMIC MODAL: CUSTOMER SELECTION & CREATION */}
      {isCustomerModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '32px', background: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Select or Add Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} style={{ color: 'var(--text-light)' }}><X size={20} /></button>
            </div>

            {/* Quick Bind Selector */}
            <div className="form-group">
              <label className="form-label">Search existing customer</label>
              <select 
                onChange={(e) => {
                  const selected = customers.find(c => c.id === e.target.value);
                  setCustomer(selected);
                  setIsCustomerModalOpen(false);
                }} 
                className="input-field"
                value={customer?.id || ''}
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0', padding: '16px 0 0 0' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Register New Customer</h4>
              <form onSubmit={handleAddCustomerSubmit}>
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Customer Name *" 
                    value={newCust.name}
                    onChange={(e) => setNewCust(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="tel" 
                    placeholder="Phone Number *" 
                    value={newCust.phone}
                    onChange={(e) => setNewCust(prev => ({ ...prev, phone: e.target.value }))}
                    className="input-field" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={newCust.email}
                    onChange={(e) => setNewCust(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field" 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>Bind & Save Customer</button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: HELD BILLS */}
      {isHoldsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '32px', background: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Held Drafts ({heldBills.length})</h3>
              <button onClick={() => setIsHoldsModalOpen(false)} style={{ color: 'var(--text-light)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
              {heldBills.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  No draft invoices are currently held.
                </div>
              ) : (
                heldBills.map((bill) => (
                  <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bill.notes}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        Items: {bill.cart.length} | Customer: {bill.customer.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { resumeBill(bill.id); setIsHoldsModalOpen(false); }} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                        Resume
                      </button>
                      <button onClick={() => discardHeldBill(bill.id)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem', boxShadow: 'none' }}>
                        Discard
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: CHECKOUT */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '32px', background: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Invoice Payment</h3>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ color: 'var(--text-light)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount Due:</span>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{totals.grandTotal.toFixed(2)}
              </h2>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-field"
              >
                <option value="Cash">Cash payment</option>
                <option value="UPI">UPI/QR payment</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Credit">Customer Store Credit</option>
              </select>
            </div>

            {paymentMethod === 'Cash' && (
              <div className="form-group">
                <label className="form-label">Cash Received</label>
                <input 
                  type="number" 
                  value={cashReceived} 
                  onChange={(e) => setCashReceived(e.target.value)} 
                  placeholder="0.00" 
                  className="input-field" 
                />
                {parseFloat(cashReceived) >= totals.grandTotal && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '6px', fontWeight: 'bold' }}>
                    Change Return: ₹{(parseFloat(cashReceived) - totals.grandTotal).toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={executeCheckout} 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={isCheckingOut || (paymentMethod === 'Cash' && (!cashReceived || isNaN(parseFloat(cashReceived)) || parseFloat(cashReceived) < totals.grandTotal))}
            >
              {isCheckingOut ? 'Saving transaction...' : 'Collect & Print Invoice'}
            </button>

          </div>
        </div>
      )}

      {/* DYNAMIC MODAL: LAST INVOICE / PRINT VIEW (PRINT OVERLAY) */}
      {lastInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }} className="no-print">
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer size={16} />
              <span>Print Bill</span>
            </button>
            <button onClick={() => {
              // Mock WhatsApp sharing
              const text = `Hi ${lastInvoice.customer.name}, your invoice ${lastInvoice.bill_number} for ₹${lastInvoice.totals.grandTotal.toFixed(2)} has been generated.`;
              window.open(`https://api.whatsapp.com/send?phone=${lastInvoice.customer.phone}&text=${encodeURIComponent(text)}`);
            }} className="btn btn-secondary">
              <Share2 size={16} />
              <span>Share WhatsApp</span>
            </button>
            <button onClick={() => setLastInvoice(null)} className="btn btn-danger" style={{ boxShadow: 'none' }}>
              <span>Close POS Term</span>
            </button>
          </div>

          {/* Printable Layout Container */}
          <div className="glass-panel print-area thermal-receipt" style={{ 
            background: 'white', 
            color: 'black', 
            padding: '24px', 
            borderRadius: '8px', 
            maxWidth: storeSettings?.printer_settings?.receipt_width === 'A4' ? '680px' : storeSettings?.printer_settings?.receipt_width === '58mm' ? '280px' : '360px', 
            width: '100%', 
            maxHeight: '75vh', 
            overflowY: 'auto' 
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #ccc', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#000', textTransform: 'uppercase' }}>{storeSettings?.store_name || 'RETAIL GENIUS'}</h2>
              {storeSettings?.gst_number && <p style={{ fontSize: '0.75rem', color: '#555' }}>GSTIN: {storeSettings.gst_number}</p>}
              {storeSettings?.address && <p style={{ fontSize: '0.75rem', color: '#555' }}>{storeSettings.address}</p>}
              {storeSettings?.phone && <p style={{ fontSize: '0.75rem', color: '#555' }}>Tel: {storeSettings.phone}</p>}
              {storeSettings?.email && <p style={{ fontSize: '0.75rem', color: '#555' }}>Email: {storeSettings.email}</p>}
            </div>

            <div style={{ fontSize: '0.75rem', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
              <p><strong>Invoice No:</strong> {lastInvoice.bill_number}</p>
              <p><strong>Date & Time:</strong> {lastInvoice.date.toLocaleString()}</p>
              <p><strong>Customer:</strong> {lastInvoice.customer.name} ({lastInvoice.customer.phone})</p>
            </div>

            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '4px 0' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '4px 0' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {lastInvoice.cart.map((item, index) => {
                  const price = item.customPrice !== null ? item.customPrice : item.product.selling_price;
                  return (
                    <tr key={index}>
                      <td style={{ padding: '4px 0' }}>{item.product.name}</td>
                      <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{(price * item.quantity).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '12px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{lastInvoice.totals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-₹{lastInvoice.totals.discount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax:</span>
                <span>₹{lastInvoice.totals.taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '4px' }}>
                <span>Grand Total:</span>
                <span>₹{lastInvoice.totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px dashed #ccc', paddingTop: '12px', fontSize: '0.7rem' }}>
              <p>Payment: {lastInvoice.paymentMethod}</p>
              <p style={{ marginTop: '4px', fontWeight: 'bold' }}>Thank You for Shopping!</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
