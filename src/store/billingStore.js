import { create } from 'zustand';

const defaultCustomer = {
  id: null,
  name: 'Walk-in Customer',
  phone: 'N/A',
  reward_points: 0
};

export const useBillingStore = create((set, get) => ({
  cart: [],
  customer: defaultCustomer,
  discountType: 'percentage', // 'percentage' | 'fixed'
  discountValue: 0,
  taxRate: 18, // Default tax rate in %
  extraCharges: 0,
  couponCode: '',
  couponDiscount: 0,
  heldBills: [], // Holds draft bills

  // Add a product to the cart
  addToCart: (product, qty = 1) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].quantity + qty;
      
      // Prevent ordering more than available stock
      if (newQty > product.current_stock) {
        alert(`Cannot add more. Only ${product.current_stock} items in stock.`);
        return;
      }
      updatedCart[existingIndex].quantity = newQty;
      set({ cart: updatedCart });
    } else {
      if (qty > product.current_stock) {
        alert(`Cannot add. Only ${product.current_stock} items in stock.`);
        return;
      }
      set({ cart: [...cart, { product, quantity: qty, customPrice: null }] });
    }
  },

  // Update item quantity directly
  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const { cart } = get();
    const item = cart.find(item => item.product.id === productId);
    if (item && qty > item.product.current_stock) {
      alert(`Only ${item.product.current_stock} items available in stock.`);
      return;
    }
    const updatedCart = cart.map(item =>
      item.product.id === productId ? { ...item, quantity: qty } : item
    );
    set({ cart: updatedCart });
  },

  // Edit Unit Price manually (Admin only override)
  editUnitPrice: (productId, price) => {
    const { cart } = get();
    const updatedCart = cart.map(item =>
      item.product.id === productId ? { ...item, customPrice: parseFloat(price) || 0 } : item
    );
    set({ cart: updatedCart });
  },

  // Remove item from cart
  removeItem: (productId) => {
    const { cart } = get();
    set({ cart: cart.filter(item => item.product.id !== productId) });
  },

  // Set selected customer
  setCustomer: (customer) => {
    set({ customer: customer || defaultCustomer });
  },

  // Apply discounts
  applyDiscount: (type, value) => {
    set({ discountType: type, discountValue: Math.max(0, parseFloat(value) || 0) });
  },

  // Apply manual extra charges
  applyExtraCharges: (amount) => {
    set({ extraCharges: Math.max(0, parseFloat(amount) || 0) });
  },

  // Apply GST/Tax overrides
  applyTax: (rate) => {
    set({ taxRate: Math.max(0, parseFloat(rate) || 0) });
  },

  // Apply Coupon code and coupon discounts
  applyCoupon: (code, discountVal) => {
    set({ couponCode: code, couponDiscount: Math.max(0, parseFloat(discountVal) || 0) });
  },

  // Clear Billing Station
  clearCart: () => {
    set({
      cart: [],
      customer: defaultCustomer,
      discountType: 'percentage',
      discountValue: 0,
      extraCharges: 0,
      couponCode: '',
      couponDiscount: 0
    });
  },

  // Hold / Save Draft Bill
  holdBill: (notes = '') => {
    const { cart, customer, discountType, discountValue, taxRate, extraCharges, couponCode, couponDiscount, heldBills } = get();
    if (cart.length === 0) return alert('Cart is empty. Cannot hold.');

    const newHold = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date(),
      notes: notes || `Hold Bill #${heldBills.length + 1}`,
      cart,
      customer,
      discountType,
      discountValue,
      taxRate,
      extraCharges,
      couponCode,
      couponDiscount
    };

    set({
      heldBills: [...heldBills, newHold],
      cart: [],
      customer: defaultCustomer,
      discountType: 'percentage',
      discountValue: 0,
      extraCharges: 0,
      couponCode: '',
      couponDiscount: 0
    });
    alert('Bill saved to drafts/hold list.');
  },

  // Resume Draft Bill
  resumeBill: (holdId) => {
    const { heldBills } = get();
    const target = heldBills.find(bill => bill.id === holdId);
    if (!target) return;

    set({
      cart: target.cart,
      customer: target.customer,
      discountType: target.discountType,
      discountValue: target.discountValue,
      taxRate: target.taxRate,
      extraCharges: target.extraCharges,
      couponCode: target.couponCode,
      couponDiscount: target.couponDiscount,
      heldBills: heldBills.filter(bill => bill.id !== holdId)
    });
  },

  // Discard Draft
  discardHeldBill: (holdId) => {
    const { heldBills } = get();
    set({ heldBills: heldBills.filter(bill => bill.id !== holdId) });
  },

  // Calculate Subtotals, Taxes, Discounts & Grand Total
  getTotals: () => {
    const { cart, discountType, discountValue, taxRate, extraCharges, couponDiscount } = get();
    
    // Subtotal = sum(quantity * unit_selling_price)
    const subtotal = cart.reduce((sum, item) => {
      const price = item.customPrice !== null ? item.customPrice : item.product.selling_price;
      return sum + (price * item.quantity);
    }, 0);

    // Apply Cart Discount
    let cartDiscount = 0;
    if (discountType === 'percentage') {
      cartDiscount = (subtotal * discountValue) / 100;
    } else {
      cartDiscount = discountValue;
    }

    // Include Coupon discount
    const totalDiscount = cartDiscount + couponDiscount;

    // Subtotal after discount
    const taxableAmount = Math.max(0, subtotal - totalDiscount);

    // GST calculation
    // If tax settings are simple, we apply the configured flat rate on the taxable total
    const taxAmount = (taxableAmount * taxRate) / 100;

    // Grand Total = Taxable amount + GST + Extra Charges
    const grandTotal = taxableAmount + taxAmount + extraCharges;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(totalDiscount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2))
    };
  }
}));
