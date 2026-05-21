## PostgreSQL Resolve Function Pattern

### Overview
Resolve functions match incoming data against existing entities or create new entities when no match is found. They are the core of entity resolution in data import pipelines.

### Standard Function Signature
```sql
CREATE OR REPLACE FUNCTION {schema}.f_resolve_{entity_type}(
    p_batch_id UUID,
    p_source_table TEXT,
    p_source_schema TEXT,
    p_source_system TEXT,
    p_column_mappings JSONB
) RETURNS TABLE (
    processed_count INTEGER,
    found_count INTEGER,
    created_count INTEGER,
    error_count INTEGER
)
LANGUAGE plpgsql
AS $$
```

### Parameter Requirements
| Parameter          | Type   | Required | Description                                    |
|--------------------|--------|----------|------------------------------------------------|
| p_batch_id         | UUID   | Yes      | Unique identifier for this import batch        |
| p_source_table     | TEXT   | Yes      | Name of staging table containing data          |
| p_source_schema    | TEXT   | Yes      | Schema containing staging table                |
| p_source_system    | TEXT   | Yes      | Source system identifier for entity matching   |
| p_column_mappings  | JSONB  | Yes      | Maps staging columns to entity fields          |

### Column Mappings Structure
```json
{
    "source_primary_key": "external_id",
    "name_field": "participant_name",
    "email_field": "email_address",
    "additional_fields": {
        "phone": "contact_phone",
        "address": "mailing_address"
    }
}
```

### Implementation Phases

#### PHASE 1: INITIALIZE
- Declare all metric tracking variables
- Extract column mappings from JSONB parameter
- Log step start to audit tables

```sql
DECLARE
    v_step_name TEXT := 'INITIALIZE';
    v_rows_staged INTEGER := 0;
    v_rows_processed INTEGER := 0;
    v_rows_succeeded INTEGER := 0;
    v_rows_errored INTEGER := 0;
    v_entities_found INTEGER := 0;
    v_entities_added INTEGER := 0;
BEGIN
    PERFORM audit.f_log_import_step(p_batch_id, v_step_name, 'Starting resolution');
```

#### PHASE 2: COUNT STAGED RECORDS
- Count records to be processed using dynamic SQL
- Log metric for rows_staged

```sql
v_step_name := 'COUNT_STAGED';
EXECUTE format(
    'SELECT COUNT(*) FROM %I.%I WHERE batch_id = $1',
    p_source_schema, p_source_table
) INTO v_rows_staged USING p_batch_id;
PERFORM audit.f_add_metric(p_batch_id, 'rows_staged', v_rows_staged);
```

#### PHASE 3: CREATE TEMP TABLE
- Create temp table joining staging to existing entities
- Pre-compute entity matches for efficiency

```sql
v_step_name := 'CREATE_TEMP_TABLE';
DROP TABLE IF EXISTS temp_resolve_staging;
CREATE TEMP TABLE temp_resolve_staging AS
SELECT
    s.id AS staging_id,
    s.source_primary_key,
    e.id AS existing_entity_id
FROM staging_table s
LEFT JOIN public.entities e ON
    e.source_system = p_source_system
    AND e.source_primary_key = s.source_primary_key
WHERE s.batch_id = p_batch_id;
```

#### PHASE 4: MATCH EXISTING ENTITIES
- Count records with existing entity matches
- Update staging table with resolved entity IDs
- Log entities_found metric

```sql
v_step_name := 'MATCH_EXISTING';
SELECT COUNT(*) INTO v_entities_found
FROM temp_resolve_staging
WHERE existing_entity_id IS NOT NULL;

-- Update staging with found entities
UPDATE staging_table s
SET resolved_entity_id = t.existing_entity_id,
    resolved_at = NOW()
FROM temp_resolve_staging t
WHERE s.id = t.staging_id
  AND t.existing_entity_id IS NOT NULL;

PERFORM audit.f_add_metric(p_batch_id, 'entities_found', v_entities_found);
```

#### PHASE 5: CREATE NEW ENTITIES
- Insert new entity records for unmatched rows
- Create domain-specific records (participants, vendors, etc.)
- Update staging with new entity IDs
- Log entities_added metric

```sql
v_step_name := 'CREATE_ENTITIES';
WITH new_entities AS (
    INSERT INTO public.entities (source_system, source_primary_key, entity_type, created_by_batch_id)
    SELECT p_source_system, t.source_primary_key, 'participant', p_batch_id
    FROM temp_resolve_staging t
    WHERE t.existing_entity_id IS NULL
    RETURNING id, source_primary_key
)
UPDATE staging_table s
SET resolved_entity_id = ne.id, resolved_at = NOW()
FROM new_entities ne
WHERE s.source_primary_key = ne.source_primary_key AND s.batch_id = p_batch_id;

GET DIAGNOSTICS v_entities_added = ROW_COUNT;
PERFORM audit.f_add_metric(p_batch_id, 'entities_added', v_entities_added);
```

#### PHASE 6: VALIDATE METRICS
- Calculate final counts
- Validate metric invariants
- Log all final metrics

```sql
v_step_name := 'VALIDATE_METRICS';
v_rows_succeeded := v_entities_found + v_entities_added;
v_rows_processed := v_rows_staged;
v_rows_errored := v_rows_processed - v_rows_succeeded;

-- Invariant validation
IF v_rows_processed <> (v_rows_succeeded + v_rows_errored) THEN
    RAISE EXCEPTION 'Invariant violation: processed <> succeeded + errored';
END IF;

PERFORM audit.f_add_metric(p_batch_id, 'rows_processed', v_rows_processed);
PERFORM audit.f_add_metric(p_batch_id, 'rows_succeeded', v_rows_succeeded);
PERFORM audit.f_add_metric(p_batch_id, 'rows_errored', v_rows_errored);
```

#### PHASE 7: CLEANUP AND RETURN
- Drop temp tables
- Log completion
- Return result counts

```sql
v_step_name := 'CLEANUP';
DROP TABLE IF EXISTS temp_resolve_staging;

PERFORM audit.f_log_import_step(p_batch_id, 'COMPLETE',
    format('Complete: %s processed, %s found, %s created, %s errors',
        v_rows_processed, v_entities_found, v_entities_added, v_rows_errored));

RETURN QUERY SELECT
    v_rows_processed::INTEGER,
    v_entities_found::INTEGER,
    v_entities_added::INTEGER,
    v_rows_errored::INTEGER;
```

### Error Handling Requirements
- Wrap function body in EXCEPTION block
- Log error details including step name
- Re-raise exceptions after logging
- Handle specific exceptions (unique_violation, foreign_key_violation)

```sql
EXCEPTION WHEN OTHERS THEN
    PERFORM audit.f_log_import_step(p_batch_id, 'ERROR',
        format('Step: %s, Error: %s', v_step_name, SQLERRM));
    RAISE;
END;
```

### Metric Invariant Rules
| Invariant                                     | Validation                                |
|-----------------------------------------------|-------------------------------------------|
| processed = succeeded + errored               | Basic accounting check                    |
| succeeded = found + created                   | Entity resolution accounting              |
| staged >= processed                           | Some records may be filtered              |

### Naming Conventions
| Element                | Convention                     | Example                      |
|------------------------|--------------------------------|------------------------------|
| Function name          | `f_resolve_{entity_type}`      | `f_resolve_participants`     |
| Parameter prefix       | `p_`                           | `p_batch_id`                 |
| Variable prefix        | `v_`                           | `v_rows_processed`           |
| Step name variable     | `v_step_name`                  | `'MATCH_EXISTING'`           |
| Temp table prefix      | `temp_resolve_`                | `temp_resolve_participants`  |

### Required Dependencies
- `audit.f_log_import_step()` function
- `audit.f_add_metric()` function
- `public.entities` table
- `config.source_system_lookup` table
- `config.entity_type_lookup` table

### Testing Requirements
1. Test with batch containing only new entities
2. Test with batch containing only existing entities
3. Test with mixed batch (new and existing)
4. Test metric invariant validation
5. Test error handling and logging
6. Verify temp table cleanup
