
REVOKE ALL ON public.mv_ops_kpi_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mv_ops_kpi_daily TO service_role;

REVOKE ALL ON FUNCTION public.refresh_ops_kpi_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_ops_kpi_daily() TO service_role;
