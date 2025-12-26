-- Add payment_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';

-- Add check constraint for valid payment statuses
ALTER TABLE public.orders 
ADD CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'paid'));