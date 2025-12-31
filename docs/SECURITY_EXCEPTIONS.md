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

## Application Security Measures

Despite these PostGIS exceptions, the application maintains robust security through:

1. **Row Level Security (RLS)**: Enabled on all application tables
2. **Function Security**: All application functions have `SET search_path = public`
3. **Auth Verification**: Edge functions validate JWT tokens appropriately
4. **Business Isolation**: RLS policies enforce business_id scoping on all data tables

## Linter Configuration

The security validator in `src/lib/verification/security/validator.ts` is configured to exclude these PostGIS objects from error reporting.

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
```

## Review Schedule

These exceptions should be reviewed:
- When upgrading PostGIS version
- When changing database security policies
- During annual security audits

---

Last Updated: 2024-12-31
Reviewed By: Automated Governance System
