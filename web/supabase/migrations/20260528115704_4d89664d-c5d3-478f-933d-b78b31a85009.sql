
-- RPCs for SaaS Families admin views

CREATE OR REPLACE FUNCTION public.list_saas_families(
  _tenant_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL,
  _plan text DEFAULT NULL
)
RETURNS TABLE (
  family_id uuid,
  family_name text,
  family_apartment text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  member_count bigint,
  apartment_id uuid,
  apartment_code text,
  project_id uuid,
  project_code text,
  project_name text,
  tenant_id uuid,
  tenant_name text,
  plan text,
  ocr_monthly_quota integer,
  insights_enabled boolean,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS family_id,
    f.name AS family_name,
    f.apartment AS family_apartment,
    f.owner_id,
    p.full_name AS owner_name,
    p.email::text AS owner_email,
    (SELECT count(*) FROM public.family_members fm WHERE fm.family_id = f.id) AS member_count,
    ar.apartment_id,
    a.code AS apartment_code,
    a.project_id,
    pr.code AS project_code,
    pr.name AS project_name,
    pr.tenant_id,
    t.name AS tenant_name,
    COALESCE(ent.plan, 'free') AS plan,
    COALESCE(ent.ocr_monthly_quota, 5) AS ocr_monthly_quota,
    COALESCE(ent.insights_enabled, false) AS insights_enabled,
    ent.expires_at,
    f.created_at
  FROM public.families f
  LEFT JOIN public.profiles p ON p.id = f.owner_id
  LEFT JOIN LATERAL (
    SELECT apartment_id FROM public.apartment_residents
    WHERE family_id = f.id AND move_out_date IS NULL
    ORDER BY is_primary DESC, move_in_date DESC LIMIT 1
  ) ar ON true
  LEFT JOIN public.apartments a ON a.id = ar.apartment_id
  LEFT JOIN public.projects pr ON pr.id = a.project_id
  LEFT JOIN public.tenants t ON t.id = pr.tenant_id
  LEFT JOIN public.ai_entitlements ent ON ent.family_id = f.id
  WHERE public.is_saas_admin(auth.uid())
    AND (_tenant_id IS NULL OR pr.tenant_id = _tenant_id)
    AND (_project_id IS NULL OR a.project_id = _project_id)
    AND (_plan IS NULL OR COALESCE(ent.plan,'free') = _plan)
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.saas_families_summary(
  _tenant_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_families bigint,
  free_count bigint,
  premium_count bigint,
  expiring_soon bigint,
  projects_covered bigint,
  tenants_covered bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      f.id,
      pr.tenant_id,
      a.project_id,
      COALESCE(ent.plan,'free') AS plan,
      ent.expires_at
    FROM public.families f
    LEFT JOIN LATERAL (
      SELECT apartment_id FROM public.apartment_residents
      WHERE family_id = f.id AND move_out_date IS NULL
      ORDER BY is_primary DESC, move_in_date DESC LIMIT 1
    ) ar ON true
    LEFT JOIN public.apartments a ON a.id = ar.apartment_id
    LEFT JOIN public.projects pr ON pr.id = a.project_id
    LEFT JOIN public.ai_entitlements ent ON ent.family_id = f.id
    WHERE public.is_saas_admin(auth.uid())
      AND (_tenant_id IS NULL OR pr.tenant_id = _tenant_id)
      AND (_project_id IS NULL OR a.project_id = _project_id)
  )
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE plan='free')::bigint,
    count(*) FILTER (WHERE plan='premium')::bigint,
    count(*) FILTER (WHERE plan='premium' AND expires_at IS NOT NULL AND expires_at < now() + interval '7 days')::bigint,
    count(DISTINCT project_id)::bigint,
    count(DISTINCT tenant_id)::bigint
  FROM base;
$$;

GRANT EXECUTE ON FUNCTION public.list_saas_families(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_families_summary(uuid, uuid) TO authenticated;
