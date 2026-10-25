ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_email text;

CREATE POLICY "staff read table orders" ON public.orders FOR SELECT TO authenticated
  USING (mode = 'mesa' AND public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff update table orders" ON public.orders FOR UPDATE TO authenticated
  USING (mode = 'mesa' AND public.has_role(auth.uid(), 'staff'))
  WITH CHECK (mode = 'mesa' AND public.has_role(auth.uid(), 'staff'));

CREATE TABLE public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL DEFAULT 'Cozinha',
  connection text NOT NULL DEFAULT 'Rede (IP)',
  address text NOT NULL DEFAULT '',
  paper_width text NOT NULL DEFAULT '80mm',
  copies integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.printers TO authenticated;
GRANT ALL ON public.printers TO service_role;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin printers" ON public.printers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff read printers" ON public.printers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));