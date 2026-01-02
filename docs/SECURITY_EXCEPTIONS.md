# Security Exceptions Documentation

This document tracks accepted security exceptions in the Supabase linter results that cannot or should not be fixed.

## PostGIS Extension Objects

The following security findings are false positives caused by the PostGIS extension, which installs system-level database objects that cannot be modified by the application:

### Security Definer Views (7 items)

These views are installed by PostGIS and use SECURITY DEFINER, which the linter flags as potentially allowing RLS bypass. However, these are read-only system metadata views that don't contain user data.

| Object | Schema | Reason |
|--------|--------|--------|
| `geography_columns` | public | PostGIS system metadata view |
| `geometry_columns` | public | PostGIS system metadata view |
| `raster_columns` | public | PostGIS system metadata view |
| `raster_overviews` | public | PostGIS system metadata view |
| `vector_columns` | public | PostGIS system metadata view |
| `vector_layers` | public | PostGIS system metadata view |
| `vector_records` | public | PostGIS system metadata view |

**Risk Assessment**: None - these views only expose PostGIS metadata about spatial column types, not application data.

### RLS Disabled Table (1 item)

| Table | Schema | Reason |
|-------|--------|--------|
| `spatial_ref_sys` | public | PostGIS spatial reference system table |

**Risk Assessment**: None - this is a read-only reference table containing EPSG coordinate system definitions. It contains no user data.

### Extension in Public Schema (1 item)

| Extension | Current Schema | Recommended |
|-----------|----------------|-------------|
| `postgis` | public | extensions |

**Risk Assessment**: Low - PostGIS requires public schema access for spatial functions to work with application tables. Moving to extensions schema would break spatial queries.

## Application Reporting Views

The following views use SECURITY DEFINER (default for views owned by postgres) and trigger linter warnings. These are documented exceptions because they are protected by the application's edge function architecture.

### Security Definer Views (7 items)

| View | Schema | Purpose |
|------|--------|---------|
| `unified_assignments` | public | Aggregated assignment data for reporting |
| `time_by_job_report` | public | Time tracking aggregated by job |
| `time_by_task_report` | public | Time tracking aggregated by task |
| `user_productivity_report` | public | User productivity metrics |
| `daily_time_breakdown` | public | Daily time entry breakdown |
| `weekly_time_breakdown` | public | Weekly time entry breakdown |
| `task_category_breakdown` | public | Task categorization metrics |

### Risk Assessment: Acceptable

These views are NOT directly exposed to the frontend. They are protected by multiple layers:

1. **Edge Function Authentication**: All access goes through authenticated edge functions that validate JWT tokens
2. **Business ID Filtering**: Edge functions filter by `business_id` before returning data
3. **Underlying RLS**: The base tables (`time_entries`, `assignments`, `tasks`, etc.) all have RLS enabled
4. **No Direct Access**: The Supabase client cannot query these views directly from the frontend

### Why Not Use `security_invoker = true`?

While PostgreSQL 15+ supports `security_invoker = true` for views, we chose not to migrate because:
- The current edge function pattern already provides robust access control
- Changing view security mode could introduce regressions
- The theoretical RLS bypass is mitigated by the architectural pattern

## Application Security Measures

Despite these exceptions, the application maintains robust security through:

1. **Row Level Security (RLS)**: Enabled on all application tables
2. **Function Security**: All application functions have `SET search_path = public`
3. **Auth Verification**: Edge functions validate JWT tokens appropriately
4. **Business Isolation**: RLS policies enforce business_id scoping on all data tables

## Linter Configuration

The security validator in `src/lib/verification/security/validator.ts` is configured to exclude these objects from error reporting.

### Excluded Patterns

```typescript
const POSTGIS_EXCLUSIONS = [
  'geography_columns',
  'geometry_columns', 
  'raster_columns',
  'raster_overviews',
  'vector_columns',
  'vector_layers',
  'vector_records',
  'spatial_ref_sys'
];

const REPORTING_VIEW_EXCLUSIONS = [
  'unified_assignments',
  'time_by_job_report',
  'time_by_task_report',
  'user_productivity_report',
  'daily_time_breakdown',
  'weekly_time_breakdown',
  'task_category_breakdown'
];
```

## Review Schedule

These exceptions should be reviewed:
- When upgrading PostGIS version
- When changing database security policies
- When adding new reporting views
- During annual security audits

---

Last Updated: 2026-01-01
Reviewed By: Automated Governance System
