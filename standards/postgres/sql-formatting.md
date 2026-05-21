# PostgreSQL SQL Formatting Standards

## Overview
Consistent SQL formatting improves readability and maintainability. Follow these standards for all PostgreSQL functions, scripts, and migrations.

---

## Indentation and Alignment

### Keywords and Clauses
- Align SQL keywords vertically for readability
- Use tabs or consistent spaces (4 spaces recommended)

```sql
-- GOOD: Vertically aligned
UPDATE      temp_participant_work t
    SET     resolved_participant_id = p.participant_id,
            resolved_participant_entity_id = p.entity_id,
            resolved_person_id = p.person_id
    FROM        public.participants p
        JOIN    public.entities e ON e.entity_id = p.entity_id
    WHERE   e.source_primary_key = t.participant_primary_key
      AND   e.source_system = p_source_system
      AND   e.entity_type = 'PARTICIPANT';

-- BAD: No alignment
UPDATE temp_participant_work t
SET resolved_participant_id = p.participant_id,
resolved_participant_entity_id = p.entity_id
FROM public.participants p
JOIN public.entities e ON e.entity_id = p.entity_id
WHERE e.source_primary_key = t.participant_primary_key
AND e.source_system = p_source_system;
```

### Multi-line Conditions
- Align AND/OR operators vertically
- Indent continuation lines

```sql
WHERE batch_id = p_batch_id
  AND import_status = 'IN_PROCESS'
  AND resolved_program_id IS NOT NULL
  AND resolved_participant_id IS NULL
```

---

## Section Separators

### Major Section Dividers
Use horizontal rules with clear labels:

```sql
-----------------------------------------------------------------------------------------------------------
-- 1. INITIALIZE
-----------------------------------------------------------------------------------------------------------
SET LOCAL client_min_messages = WARNING;
DROP TABLE IF EXISTS temp_participant_work;
SET LOCAL client_min_messages = NOTICE;

-----------------------------------------------------------------------------------------------------------
-- 2. VALIDATE INPUT
-----------------------------------------------------------------------------------------------------------
IF p_batch_id IS NULL THEN
    RAISE EXCEPTION 'batch_id is required and cannot be NULL';
END IF;
```

### Minor Section Dividers
Use single-line comments with spacing:

```sql
-- Create person_protected entities
INSERT INTO public.entities (...)
...

-- Create person_protected records
WITH persons_to_create AS (...)
INSERT INTO public.person_protected (...)
...
```

---

## Variable Naming

### Prefixes for Clarity
- **p_** prefix for parameters: `p_batch_id`, `p_source_table`, `p_column_mappings`
- **v_** prefix for variables: `v_processed`, `v_found`, `v_created`, `v_errors`
- **t** alias for temp/staging tables in queries
- **e** alias for entities table
- **p** alias for primary table (participants, programs, etc.)

```sql
CREATE OR REPLACE FUNCTION import.f_resolve_programs(
    p_batch_id          UUID,
    p_source_table      TEXT,
    p_source_schema     TEXT,
    p_source_system     TEXT,
    p_column_mappings   JSONB
)
RETURNS TABLE (
    processed_count     INT,
    found_count         INT,
    created_count       INT,
    error_count         INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_processed INT := 0;
    v_found INT := 0;
    v_created INT := 0;
    v_errors INT := 0;
BEGIN
    ...
END;
$$;
```

---

## Dynamic SQL with format()

### Parameter Formatting
- Use `%I` for identifiers (table names, column names)
- Use `%L` for literals (values)
- Use `%s` for raw SQL substitution (use sparingly)

```sql
EXECUTE format('
    INSERT INTO temp_program_work (
        staging_id, program_primary_key, program_name
    )
    SELECT DISTINCT
        %I::BIGINT,
        %I,
        %I
    FROM %I.%I
    WHERE batch_id = %L
      AND import_status = ''IN_PROCESS''
      AND resolved_program_id IS NULL',
    p_column_mappings->>'staging_id',          -- %I
    p_column_mappings->>'program_primary_key', -- %I
    p_column_mappings->>'program_name',        -- %I
    p_source_schema,                           -- %I
    p_source_table,                            -- %I
    p_batch_id                                 -- %L
);
```

### Format String Alignment
- Align format placeholders with their corresponding parameters
- Add inline comments to show mapping

---

## Common Table Expressions (CTEs)

### Formatting WITH Clauses
```sql
WITH participants_to_create AS (
    SELECT DISTINCT ON (t.participant_primary_key)
        e.entity_id,
        pp.person_id
    FROM temp_participant_work t
    JOIN public.entities e ON e.source_primary_key = t.participant_primary_key
                           AND e.source_system = p_source_system
                           AND e.entity_type = 'PARTICIPANT'
    LEFT JOIN public.participants p ON p.entity_id = e.entity_id
    WHERE t.resolved_participant_id IS NULL
      AND p.participant_id IS NULL
    ORDER BY t.participant_primary_key, t.staging_id
)
INSERT INTO public.participants (
    entity_id,
    person_id
)
SELECT
    entity_id,
    person_id
FROM participants_to_create;
```

---

## Table and Column Definitions

### CREATE TABLE Formatting
```sql
CREATE TEMP TABLE temp_participant_work (
    staging_id                      BIGINT,
    participant_primary_key         TEXT,
    first_name                      TEXT,
    last_name                       TEXT,
    start_date                      DATE,
    resolved_program_id             UUID,
    resolved_participant_id         UUID,
    resolved_participant_entity_id  UUID,
    resolved_person_id              UUID,
    resolved_enrollment_id          UUID
) ON COMMIT DROP;
```

### Align column types and constraints vertically for readability

---

## CASE Statements

### Multi-condition CASE
```sql
error_message = CASE
    WHEN resolved_program_id IS NULL THEN 'Participant resolution failed: program not resolved'
    WHEN %I IS NULL THEN 'Participant resolution failed: first name is NULL'
    WHEN %I IS NULL THEN 'Participant resolution failed: last name is NULL'
    WHEN resolved_participant_id IS NULL THEN 'Participant resolution failed: unable to create or find participant'
    ELSE COALESCE(error_message, 'Participant resolution failed: unknown error')
END
```

---

## Best Practices Summary

1. **Vertical Alignment**: Align SQL keywords, operators, and types for visual scanning
2. **Consistent Indentation**: Use 4 spaces or tabs consistently
3. **Clear Section Breaks**: Use horizontal rules for major sections
4. **Meaningful Names**: Use prefixes (p_, v_) and descriptive names
5. **Dynamic SQL Safety**: Always use %I for identifiers, %L for literals
6. **CTE Readability**: Format WITH clauses with clear indentation
7. **Table Definitions**: Align column types and constraints vertically
8. **Whitespace**: Use blank lines to separate logical blocks
