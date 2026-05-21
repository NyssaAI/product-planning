# Python Logging Standards

## Overview
Comprehensive logging enables debugging, performance monitoring, and audit trails. All Python scripts must implement structured logging with timestamped log files, progress tracking, and performance metrics.

---

## Log File Management

### Timestamped Log Files

**Standard**: All log files MUST use timestamped filenames following the pattern:
```
YYYY.MM.DD-HH.MM.SS-script_name.log
```

**Examples**:
```
2025.01.15-14.30.22-bulk_load.log
2025.01.15-09.15.43-process_imports.log
2025.01.14-23.45.12-data_reconciliation.log
```

### Log Directory Structure
```
logs/
├── 2025.01.15-14.30.22-bulk_load.log
├── 2025.01.15-09.15.43-process_imports.log
└── 2025.01.14-23.45.12-data_reconciliation.log
```

### Setup Function
```python
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any


def setup_timestamped_logging(script_name: str, log_config: Dict[str, Any] = None) -> None:
    """
    Setup comprehensive logging with timestamped log files.

    Args:
        script_name: Name of the script (without .py extension)
        log_config: Optional logging configuration dict

    Creates:
        - Timestamped log file in logs/ directory
        - Console output to stdout
        - Structured formatting with timestamps and context
    """
    # Create logs directory
    script_dir = Path(__file__).parent
    logs_dir = script_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)

    # Create timestamped log filename: YYYY.MM.DD-HH.MM.SS-script_name.log
    timestamp = datetime.now().strftime('%Y.%m.%d-%H.%M.%S')
    log_filename = f'{timestamp}-{script_name}.log'
    log_file = logs_dir / log_filename

    # Get log level from config or default to INFO
    log_level = getattr(logging, (log_config or {}).get('level', 'INFO'))

    # Configure logging with both file and console handlers
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        handlers=[
            logging.FileHandler(log_file, mode='w', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )

    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized - Log file: {log_file}")
```

---

## Logging Levels and Usage

### Level Hierarchy
```python
logging.DEBUG    # Detailed diagnostic information
logging.INFO     # General informational messages
logging.WARNING  # Warning messages for recoverable issues
logging.ERROR    # Error messages for failures
logging.CRITICAL # Critical failures requiring immediate attention
```

### Usage Guidelines

**DEBUG**: Detailed diagnostic information
```python
logger.debug(f"Processing batch {batch_num} with {len(batch)} records")
logger.debug(f"Column mappings: {column_mappings}")
logger.debug(f"Transformed row: {transformed_row}")
```

**INFO**: Progress and status updates
```python
logger.info(f"Starting deterministic import from directory: {search_directory}")
logger.info(f"File discovery completed: {len(files)} CSV files found")
logger.info(f"Processing file: {file_path.name} → {table_name}")
logger.info(f"Batch completed: {batch_size} records at {records_per_second:.1f} records/sec")
```

**WARNING**: Recoverable issues
```python
logger.warning(f"Pattern '{pattern}' did not match any files")
logger.warning(f"Batch insert failed, attempting individual recovery: {batch_error}")
logger.warning(f"Transformation failed for value '{value}': {error}")
```

**ERROR**: Failures requiring attention
```python
logger.error(f"Configuration file not found: {config_path}")
logger.error(f"Database connection validation failed: {error}")
logger.error(f"Import process failed: {error}")
```

---

## Progress Logging

### Section Headers
Use clear visual separators for major processing sections:

```python
logger.info("")
logger.info("=" * 80)
logger.info("DETERMINISTIC STAGING IMPORT - STARTING")
logger.info("=" * 80)
logger.info(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
logger.info(f"Configuration: {config_path}")
logger.info("")
```

### Step Markers
Mark processing steps with consistent formatting:

```python
logger.info("")
logger.info("-" * 80)
logger.info("STEP 1: FILE DISCOVERY")
logger.info("-" * 80)
logger.info(f"Searching directory: {search_directory}")
logger.info(f"Patterns: {file_patterns}")
```

### Progress Updates
Log progress at key milestones:

```python
# File-level progress
logger.info(f"Processing file {current_file}/{total_files}: {file_path.name}")

# Batch-level progress
logger.info(f"Batch {batch_num}/{total_batches}: {success_count}/{batch_size} records succeeded")

# Overall progress
logger.info(f"Overall progress: {processed_records}/{total_records} records ({percentage:.1f}%)")
```

---

## Performance Metrics Logging

### Class-Based Monitoring
```python
class PerformanceMonitor:
    """
    Comprehensive performance monitoring and reporting system.
    Tracks processing rates, error rates, and generates detailed reports.
    """

    def __init__(self, log_config: Dict[str, Any]) -> None:
        """Initialize performance monitor with logging configuration."""
        self.start_time = datetime.now()
        self.files_processed = 0
        self.total_records_processed = 0
        self.total_records_successful = 0
        self.total_records_failed = 0

        logger.info("Performance monitor initialized")

    def start_file_processing(self, file_path: Path, table_name: str) -> None:
        """Log the start of file processing with timestamp."""
        self.current_file_start = time.time()
        logger.info(f"Processing file: {file_path.name} → {table_name}")

    def log_batch_completion(self, batch_size: int, success_count: int,
                            error_count: int, records_per_second: float) -> None:
        """Log batch processing completion with performance metrics."""
        if error_count > 0:
            error_rate = (error_count / batch_size) * 100
            logger.warning(
                f"Batch completed: {success_count}/{batch_size} successful "
                f"({error_rate:.1f}% errors) at {records_per_second:.1f} records/sec"
            )
        else:
            logger.info(
                f"Batch completed: {batch_size} records at {records_per_second:.1f} records/sec"
            )

    def complete_file_processing(self, file_path: Path, total_records: int,
                                 success_records: int, error_records: int) -> None:
        """Log file processing completion with comprehensive statistics."""
        processing_time = time.time() - self.current_file_start
        success_rate = (success_records / total_records * 100) if total_records > 0 else 0
        records_per_second = total_records / processing_time if processing_time > 0 else 0

        logger.info(f"File completed: {file_path.name}")
        logger.info(f"  Records: {success_records}/{total_records} successful ({success_rate:.1f}%)")
        logger.info(f"  Rate: {records_per_second:.1f} records/sec")
        logger.info(f"  Duration: {processing_time:.2f} seconds")
```

### Metrics to Track

**File-Level Metrics**:
```python
logger.info(f"  Files Discovered: {files_found}")
logger.info(f"  Files Processed: {files_processed}")
logger.info(f"  Processing Success Rate: {(files_processed / files_found * 100):.1f}%")
```

**Record-Level Metrics**:
```python
logger.info(f"  Total Records Processed: {total_processed:,}")
logger.info(f"  Successful Records: {total_success:,}")
logger.info(f"  Failed Records: {total_failed:,}")
logger.info(f"  Overall Success Rate: {success_rate:.2f}%")
```

**Performance Metrics**:
```python
logger.info(f"  Overall Processing Rate: {overall_rate:.1f} records/second")
logger.info(f"  Average Batch Rate: {avg_batch_rate:.1f} records/second")
logger.info(f"  Peak Memory Usage: {peak_memory_mb:.1f} MB")
logger.info(f"  Average File Processing Time: {avg_file_time:.2f} seconds")
```

---

## Comprehensive Report Generation

### End-of-Run Summary Report
```python
def generate_comprehensive_report(self) -> None:
    """Generate detailed performance and summary report."""
    total_duration = datetime.now() - self.start_time
    overall_success_rate = (
        self.total_records_successful / self.total_records_processed * 100
        if self.total_records_processed > 0 else 0
    )
    overall_processing_rate = (
        self.total_records_processed / total_duration.total_seconds()
        if total_duration.total_seconds() > 0 else 0
    )

    report = f"""
═══════════════════════════════════════════════════════════════════════════════
DETERMINISTIC STAGING IMPORT - COMPREHENSIVE REPORT
═══════════════════════════════════════════════════════════════════════════════
Date: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}
Duration: {total_duration}
Status: {'SUCCESS' if self.total_records_failed == 0 else 'COMPLETED WITH ERRORS'}

FILE PROCESSING SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files Discovered: {self.total_files_found}
Files Processed: {self.files_processed}
Processing Success Rate: {(self.files_processed / self.total_files_found * 100):.1f}%

RECORD PROCESSING SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Records Processed: {self.total_records_processed:,}
Successful Records: {self.total_records_successful:,}
Failed Records: {self.total_records_failed:,}
Overall Success Rate: {overall_success_rate:.2f}%

PERFORMANCE METRICS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Processing Rate: {overall_processing_rate:.1f} records/second
Average Batch Rate: {self.avg_batch_rate:.1f} records/second
Peak Memory Usage: {self.peak_memory_mb:.1f} MB
Average File Processing Time: {self.avg_file_time:.2f} seconds

ERROR ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Errors: {len(self.errors_encountered)}
Error Rate: {(self.total_records_failed / self.total_records_processed * 100):.3f}%
Recovery Success: {(self.total_records_successful / self.total_records_processed * 100):.2f}%
═══════════════════════════════════════════════════════════════════════════════
    """

    print(report)
    logger.info("Comprehensive import report generated")
```

---

## Error Logging Patterns

### Exception Handling with Context
```python
try:
    result = process_file(file_path, config)
except FileNotFoundError as e:
    logger.error(f"File not found: {file_path} - {e}")
    raise
except ValueError as e:
    logger.error(f"Invalid configuration: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error processing {file_path}: {e}", exc_info=True)
    raise
```

### Batch Error Recovery Logging
```python
try:
    # Attempt batch insert
    self._execute_batch_insert(sql, values)
    logger.info(f"Batch insert successful: {len(batch)} records")
except Exception as batch_error:
    logger.warning(f"Batch insert failed, attempting individual recovery: {batch_error}")

    # Individual record recovery
    success_count = 0
    error_count = 0

    for i, record_values in enumerate(values):
        try:
            self._insert_single_row(record_values)
            success_count += 1
        except Exception as record_error:
            error_count += 1
            logger.debug(f"Record {i} failed: {record_error} - Data: {record_values}")

    logger.info(f"Recovery complete: {success_count} succeeded, {error_count} failed")
```

---

## Best Practices Summary

1. **Timestamped Log Files**: Use YYYY.MM.DD-HH.MM.SS-script_name.log format
2. **Dual Output**: Log to both file and console
3. **Structured Format**: Include timestamp, level, function, line number, and message
4. **Section Separators**: Use visual separators (=, -, ━) for major sections
5. **Progress Updates**: Log at file, batch, and record levels
6. **Performance Metrics**: Track and log rates, durations, and resource usage
7. **Comprehensive Reports**: Generate detailed summary reports at completion
8. **Error Context**: Include exc_info=True for stack traces on unexpected errors
9. **Appropriate Levels**: Use DEBUG for diagnostics, INFO for progress, WARNING for recoverable issues, ERROR for failures
10. **Consistent Formatting**: Use f-strings with clear metric labels and units
