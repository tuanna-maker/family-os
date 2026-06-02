
CREATE TABLE public.family_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  slot_id text NOT NULL CHECK (slot_id IN ('elder','family','security')),
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📞',
  name text NOT NULL,
  phone text NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, slot_id)
);

CREATE INDEX idx_family_contacts_family ON public.family_contacts(family_id);

ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_contacts_select ON public.family_contacts
FOR SELECT USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()));

CREATE POLICY family_contacts_insert ON public.family_contacts
FOR INSERT WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = updated_by);

CREATE POLICY family_contacts_update ON public.family_contacts
FOR UPDATE USING (is_family_member(auth.uid(), family_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_family_member(auth.uid(), family_id) AND auth.uid() = updated_by);

CREATE POLICY family_contacts_delete ON public.family_contacts
FOR DELETE USING (is_family_owner(auth.uid(), family_id) OR auth.uid() = updated_by OR is_super_admin(auth.uid()));

CREATE TRIGGER trg_family_contacts_updated_at
BEFORE UPDATE ON public.family_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
