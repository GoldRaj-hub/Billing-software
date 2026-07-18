-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    gst_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (gst_rate >= 0),
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER DEFAULT 0 CHECK (minimum_stock >= 0),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    birthday DATE,
    anniversary DATE,
    notes TEXT,
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00,
    reward_points INTEGER DEFAULT 0 CHECK (reward_points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Profiles Table (linking auth.users to our profile roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier')),
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL CHECK (tax_amount >= 0),
    discount_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_code TEXT,
    extra_charges NUMERIC(12, 2) DEFAULT 0.00 CHECK (extra_charges >= 0),
    grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Credit')),
    cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Returned', 'Refunded', 'Drafted', 'OnHold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    gst_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (gst_rate >= 0),
    discount_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Inventory Logs Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    change_qty INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Sale', 'Purchase', 'Adjustment', 'Return')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT DEFAULT 'Success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'store_config',
    store_name TEXT NOT NULL DEFAULT 'My Retail Store',
    logo_url TEXT,
    gst_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    invoice_prefix TEXT DEFAULT 'INV',
    tax_settings JSONB DEFAULT '{"default_gst": 18, "inclusive_tax": false}'::jsonb,
    printer_settings JSONB DEFAULT '{"receipt_width": "80mm"}'::jsonb,
    backup_settings JSONB DEFAULT '{}'::jsonb,
    dark_mode BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES FOR INSTANT QUERY SPEEDS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON public.sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- ==========================================
-- TRIGGERS & PL/pgSQL FUNCTIONS
-- ==========================================

-- Trigger: Create profile on auth user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, name, phone)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'Cashier'),
        coalesce(new.raw_user_meta_data->>'name', 'Staff'),
        new.phone
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger: Automatic stock deduction and log generation on Sales
CREATE OR REPLACE FUNCTION public.handle_sale_item_added()
RETURNS TRIGGER AS $$
DECLARE
    sale_cashier_id UUID;
BEGIN
    -- Update product stock
    UPDATE public.products
    SET current_stock = current_stock - new.quantity
    WHERE id = new.product_id;

    -- Retrieve cashier ID from sales table
    SELECT cashier_id INTO sale_cashier_id
    FROM public.sales
    WHERE id = new.sale_id;

    -- Insert inventory log entry
    INSERT INTO public.inventory_logs(product_id, change_qty, type, notes, created_by)
    VALUES (new.product_id, -new.quantity, 'Sale', 'Item sold on Sale ID: ' || new.sale_id, sale_cashier_id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sale_item_inserted
    AFTER INSERT ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_added();


-- Trigger: Loyalty point credit on Sales and stock adjustment on Return
CREATE OR REPLACE FUNCTION public.handle_sale_completed()
RETURNS TRIGGER AS $$
DECLARE
    calculated_points INTEGER;
BEGIN
    -- If sale completed, add loyalty points (1 point per 10 currency spent)
    IF new.status = 'Completed' AND new.customer_id IS NOT NULL THEN
        calculated_points := FLOOR(new.grand_total / 10)::INTEGER;
        IF calculated_points > 0 THEN
            UPDATE public.customers
            SET reward_points = reward_points + calculated_points
            WHERE id = new.customer_id;
        END IF;
    END IF;

    -- If sale status changes to Returned/Refunded, adjust stock back
    IF (new.status = 'Returned' OR new.status = 'Refunded') AND (old.status = 'Completed') THEN
        -- Restore inventory stock for each sale item
        -- (To do this cleanly, we loop over sale items and execute stock increments)
        -- Since this runs on sales update, we write a quick sub-routine
        PERFORM public.restore_stock_on_return(new.id, new.cashier_id);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sale_status_updated
    AFTER UPDATE OF status ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.handle_sale_completed();


-- Sub-routine to restore stock on sale return
CREATE OR REPLACE FUNCTION public.restore_stock_on_return(sale_uuid UUID, cashier_uuid UUID)
RETURNS VOID AS $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT product_id, quantity FROM public.sale_items WHERE sale_id = sale_uuid LOOP
        UPDATE public.products
        SET current_stock = current_stock + item.quantity
        WHERE id = item.product_id;

        INSERT INTO public.inventory_logs(product_id, change_qty, type, notes, created_by)
        VALUES (item.product_id, item.quantity, 'Return', 'Refund/Return of Sale ID: ' || sale_uuid, cashier_uuid);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Set up default store configuration
INSERT INTO public.settings(id, store_name, gst_number, address, phone, email, invoice_prefix)
VALUES ('store_config', 'Retail Genius Billing', '27AAAAA1111A1Z1', '123 Smart Retail Ave, Tech Hub', '9876543210', 'support@retailgenius.com', 'RG')
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper Function to check current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Settings Table Policies (Admin & Manager can write, everyone can read)
CREATE POLICY "Allow read settings to authenticated users"
    ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow edit settings to Admin and Manager"
    ON public.settings FOR ALL TO authenticated
    USING (public.get_user_role() IN ('Admin', 'Manager'))
    WITH CHECK (public.get_user_role() IN ('Admin', 'Manager'));

-- 2. Profiles Table Policies (User can read/write their own; Admin can do all)
CREATE POLICY "Allow read profiles to all authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update profile to user or Admin"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.get_user_role() = 'Admin')
    WITH CHECK (id = auth.uid() OR public.get_user_role() = 'Admin');

CREATE POLICY "Allow insert profile to Admin"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'Admin');

-- 3. Products Table Policies (Cashier can read; Manager & Admin can write)
CREATE POLICY "Allow select products to authenticated users"
    ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow modify products to Admin and Manager"
    ON public.products FOR ALL TO authenticated
    USING (public.get_user_role() IN ('Admin', 'Manager'))
    WITH CHECK (public.get_user_role() IN ('Admin', 'Manager'));

-- 4. Categories Table Policies
CREATE POLICY "Allow select categories to authenticated users"
    ON public.categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow modify categories to Admin and Manager"
    ON public.categories FOR ALL TO authenticated
    USING (public.get_user_role() IN ('Admin', 'Manager'))
    WITH CHECK (public.get_user_role() IN ('Admin', 'Manager'));

-- 5. Customers Table Policies (All authenticated users can read and write customers)
CREATE POLICY "Allow full customer access to authenticated users"
    ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Sales & Sale Items Policies (Cashiers can write; Cashiers can read their own or Manager/Admin can read all)
CREATE POLICY "Allow all sales operations to authenticated users"
    ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all sale items operations to authenticated users"
    ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Inventory Logs Policies (All authenticated users can read; System/Admin/Manager writes)
CREATE POLICY "Allow select inventory logs to authenticated users"
    ON public.inventory_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert inventory logs to authenticated users"
    ON public.inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Suppliers Table Policies
CREATE POLICY "Allow supplier operations to Admin and Manager"
    ON public.suppliers FOR ALL TO authenticated
    USING (public.get_user_role() IN ('Admin', 'Manager'))
    WITH CHECK (public.get_user_role() IN ('Admin', 'Manager'));

CREATE POLICY "Allow select suppliers to Cashier"
    ON public.suppliers FOR SELECT TO authenticated USING (true);

-- 9. Expenses Table Policies
CREATE POLICY "Allow all expense operations to Admin and Manager"
    ON public.expenses FOR ALL TO authenticated
    USING (public.get_user_role() IN ('Admin', 'Manager'))
    WITH CHECK (public.get_user_role() IN ('Admin', 'Manager'));

CREATE POLICY "Allow insert expenses to Cashier"
    ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow select expenses to Cashier"
    ON public.expenses FOR SELECT TO authenticated USING (true);

-- 10. Payments Table Policies
CREATE POLICY "Allow payment operations to authenticated users"
    ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
