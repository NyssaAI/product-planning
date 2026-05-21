## PostgreSQL Config Schema Pattern

### Overview
The config schema contains lookup tables that enforce data standards across the data pipeline. These tables serve as foreign key references to constrain allowed values.

### Schema Setup
```sql
CREATE SCHEMA IF NOT EXISTS config;
COMMENT ON SCHEMA config IS 'Lookup tables for data validation and standardization';
```

### Standard Lookup Table Structure
```sql
CREATE TABLE IF NOT EXISTS config.{domain}_lookup (
    value TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
```

### Required Columns
| Column        | Type          | Required | Description                           |
|---------------|---------------|----------|---------------------------------------|
| value         | TEXT          | Yes      | Primary key, the actual lookup value  |
| description   | TEXT          | Yes      | Human-readable explanation            |
| is_active     | BOOLEAN       | Yes      | Whether value is active for new use   |
| sort_order    | INTEGER       | No       | Optional UI display ordering          |
| created_at    | TIMESTAMPTZ   | Yes      | Record creation timestamp             |
| updated_at    | TIMESTAMPTZ   | No       | Last modification timestamp           |

### Domain-Specific Extensions
Add columns specific to the domain being modeled:

```sql
-- Status lookup with terminal/error flags
CREATE TABLE config.import_status_lookup (
    value TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment method with behavior flags
CREATE TABLE config.payment_method_lookup (
    value TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    requires_verification BOOLEAN NOT NULL DEFAULT FALSE,
    is_electronic BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hierarchical entity types
CREATE TABLE config.entity_type_lookup (
    value TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    parent_type TEXT REFERENCES config.entity_type_lookup(value),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Essential Lookup Tables

#### 1. Entity Type Lookup
Constrains the types of entities in the system.
```sql
INSERT INTO config.entity_type_lookup (value, description) VALUES
    ('participant', 'Individual person participating in programs'),
    ('vendor', 'External vendor or supplier'),
    ('program', 'Program or initiative'),
    ('organization', 'Internal organization unit'),
    ('location', 'Physical or virtual location')
ON CONFLICT (value) DO NOTHING;
```

#### 2. Import Status Lookup
Tracks import batch status with terminal/error states.
```sql
INSERT INTO config.import_status_lookup (value, description, is_terminal, is_error) VALUES
    ('pending', 'Import queued', FALSE, FALSE),
    ('validating', 'Validation in progress', FALSE, FALSE),
    ('processing', 'Processing in progress', FALSE, FALSE),
    ('completed', 'Completed successfully', TRUE, FALSE),
    ('completed_with_errors', 'Completed with errors', TRUE, TRUE),
    ('failed', 'Import failed', TRUE, TRUE),
    ('cancelled', 'Cancelled by user', TRUE, FALSE)
ON CONFLICT (value) DO NOTHING;
```

#### 3. Source System Lookup
Identifies data sources for entity matching.
```sql
INSERT INTO config.source_system_lookup (value, description) VALUES
    ('VENDOR_A', 'Primary vendor feed'),
    ('VENDOR_B', 'Secondary vendor feed'),
    ('MANUAL_ENTRY', 'Manual data entry'),
    ('API_INTEGRATION', 'External API'),
    ('LEGACY_SYSTEM', 'Legacy migration')
ON CONFLICT (value) DO NOTHING;
```

#### 4. Metrics Lookup
Defines valid metric names with types and units.
```sql
INSERT INTO config.metrics_lookup (value, description, metric_type, unit) VALUES
    ('rows_staged', 'Rows loaded to staging', 'count', 'rows'),
    ('rows_processed', 'Rows processed', 'count', 'rows'),
    ('rows_succeeded', 'Successful rows', 'count', 'rows'),
    ('rows_errored', 'Error rows', 'count', 'rows'),
    ('entities_found', 'Existing matches', 'count', 'entities'),
    ('entities_added', 'New entities created', 'count', 'entities'),
    ('processing_duration_ms', 'Processing time', 'duration', 'ms')
ON CONFLICT (value) DO NOTHING;
```

### Using Lookups as Foreign Keys
```sql
-- Domain table referencing lookups
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL REFERENCES config.entity_type_lookup(value),
    source_system TEXT NOT NULL REFERENCES config.source_system_lookup(value),
    status TEXT NOT NULL DEFAULT 'active' REFERENCES config.status_lookup(value),
    -- other columns
);

-- Staging table referencing lookups
CREATE TABLE staging.participants_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    import_status TEXT NOT NULL DEFAULT 'pending'
        REFERENCES config.import_status_lookup(value),
    -- other columns
);
```

### Helper Functions

#### Validate Lookup Value
```sql
CREATE OR REPLACE FUNCTION config.f_validate_lookup_value(
    p_lookup_table TEXT,
    p_value TEXT,
    p_active_only BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
    v_sql TEXT;
BEGIN
    IF p_active_only THEN
        v_sql := format(
            'SELECT EXISTS(SELECT 1 FROM config.%I WHERE value = $1 AND is_active = TRUE)',
            p_lookup_table
        );
    ELSE
        v_sql := format(
            'SELECT EXISTS(SELECT 1 FROM config.%I WHERE value = $1)',
            p_lookup_table
        );
    END IF;

    EXECUTE v_sql INTO v_exists USING p_value;
    RETURN v_exists;
END;
$$;
```

#### Get Active Values
```sql
CREATE OR REPLACE FUNCTION config.f_get_active_values(
    p_lookup_table TEXT
) RETURNS TABLE (value TEXT, description TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT value, description FROM config.%I WHERE is_active = TRUE ORDER BY sort_order NULLS LAST, value',
        p_lookup_table
    );
END;
$$;
```

#### Add New Lookup Value
```sql
CREATE OR REPLACE FUNCTION config.f_add_lookup_value(
    p_lookup_table TEXT,
    p_value TEXT,
    p_description TEXT,
    p_sort_order INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format(
        'INSERT INTO config.%I (value, description, sort_order) VALUES ($1, $2, $3) ON CONFLICT (value) DO UPDATE SET description = $2, sort_order = $3, updated_at = NOW()',
        p_lookup_table
    ) USING p_value, p_description, p_sort_order;
END;
$$;
```

#### Deactivate Lookup Value
```sql
CREATE OR REPLACE FUNCTION config.f_deactivate_lookup_value(
    p_lookup_table TEXT,
    p_value TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format(
        'UPDATE config.%I SET is_active = FALSE, updated_at = NOW() WHERE value = $1',
        p_lookup_table
    ) USING p_value;
END;
$$;
```

### Best Practices

#### Naming Conventions
| Element         | Convention              | Example                    |
|-----------------|-------------------------|----------------------------|
| Table name      | `{domain}_lookup`       | `entity_type_lookup`       |
| Primary key     | Always `value`          | `'participant'`            |
| Description     | Always `description`    | `'Individual participant'` |

#### Design Principles
1. **Use TEXT for values** - More readable than integer IDs
2. **Require descriptions** - Every value must be documented
3. **Support soft disable** - Use is_active instead of DELETE
4. **Idempotent seeds** - Use ON CONFLICT DO NOTHING for inserts
5. **Add domain flags** - Include relevant boolean flags per domain

#### Maintenance Guidelines
1. Never delete lookup values - deactivate instead
2. Document all additions with descriptions
3. Use sort_order for UI display preferences
4. Create validation functions for runtime checks
5. Include created_at/updated_at for auditing

### Comments
Always add table and column comments:
```sql
COMMENT ON TABLE config.entity_type_lookup IS 'Valid entity types in the system';
COMMENT ON COLUMN config.entity_type_lookup.value IS 'The entity type identifier used in foreign keys';
COMMENT ON COLUMN config.entity_type_lookup.description IS 'Human-readable description of entity type';
COMMENT ON COLUMN config.entity_type_lookup.is_active IS 'Whether type can be used for new entities';
```
