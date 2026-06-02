ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'saas_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'saas_support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bql_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bql_staff';