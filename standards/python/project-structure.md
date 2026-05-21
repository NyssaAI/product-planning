# Python Project Structure Standards

## Overview
Python projects should follow a clear directory structure with entry points in the root directory and implementation code organized in well-named subdirectories. This promotes maintainability, testability, and clear separation of concerns.

---

## Directory Structure

### Standard Layout
```
project-root/
├── bulk_load.py                    # Entry point script
├── process_imports.py              # Entry point script
├── .env                            # Environment configuration
├── .env.example                    # Example configuration
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
│
├── src/                            # Source code directory
│   ├── __init__.py
│   ├── config/                     # Configuration management
│   │   ├── __init__.py
│   │   ├── import_config.py
│   │   └── database_config.py
│   ├── discovery/                  # File discovery
│   │   ├── __init__.py
│   │   └── file_discovery_engine.py
│   ├── transform/                  # Data transformation
│   │   ├── __init__.py
│   │   ├── data_transformation_engine.py
│   │   └── validators.py
│   ├── database/                   # Database operations
│   │   ├── __init__.py
│   │   ├── database_manager.py
│   │   └── connection_pool.py
│   └── monitoring/                 # Performance monitoring
│       ├── __init__.py
│       └── performance_monitor.py
│
├── configs/                        # JSON/YAML configurations
│   ├── arborsoft.json
│   ├── fmse.json
│   └── schema_mappings/
│
├── logs/                           # Log files (timestamped)
│   ├── 2025.01.15-14.30.22-bulk_load.log
│   └── 2025.01.15-09.15.43-process_imports.log
│
└── test/                           # Test scripts and utilities
    ├── data_reconciliation_tool.py
    └── synthetic-data-generators/
```

### Key Principles

1. **Entry Points in Root**: Main executable scripts (`bulk_load.py`, `process_imports.py`) live at project root for easy discovery
2. **Implementation in `src/`**: All reusable code organized by functional area
3. **Configs Separate**: Configuration files in dedicated `configs/` directory
4. **Logs Directory**: Timestamped logs in `logs/` directory
5. **Tests Separate**: Test utilities and scripts in `test/` directory

---

## File Organization

### Entry Point Scripts (Root Level)

Entry point scripts should be:
- **Executable**: Can be run directly with `python script_name.py`
- **Thin**: Mostly argument parsing and orchestration
- **Well-documented**: Clear docstrings and usage examples

```python
#!/usr/bin/env python3
"""
Bulk Load - Entry Point

Purpose: Load CSV data files into PostgreSQL staging tables with comprehensive
         error recovery and performance monitoring.

Usage:
    python bulk_load.py --clear                    # Clear tables and import
    python bulk_load.py --directory /custom/path   # Import from custom directory
    python bulk_load.py --force --clear            # Force import with clearing

Author: Data Engineering Team
Created: 2025-01-15
"""

import argparse
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from config.import_config import ImportConfiguration
from bulk_load.deterministic_importer import DeterministicStagingImporter
from monitoring.logging_setup import setup_timestamped_logging


def main() -> None:
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description='Bulk Load - Import CSV files to PostgreSQL staging tables',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--clear', '-c', action='store_true',
                       help='Clear staging tables before importing')
    parser.add_argument('--directory', '-d', type=str,
                       help='Custom directory to search for CSV files')
    parser.add_argument('--config', type=str,
                       help='Path to configuration file')

    args = parser.parse_args()

    # Setup logging
    setup_timestamped_logging('bulk_load')

    # Execute import
    importer = DeterministicStagingImporter(args.config)
    importer.execute_import(
        clear_tables=args.clear,
        custom_directory=args.directory
    )


if __name__ == '__main__':
    main()
```

### Component Files (src/ subdirectories)

Each component file should be:
- **Single Purpose**: Focused on one functional area
- **Well-Named**: Name clearly describes what it does
- **Self-Documenting**: Includes comprehensive frontmatter

---

## Python File Frontmatter Standard

### Required Frontmatter Structure

Every Python file MUST begin with frontmatter documenting:
1. **Hierarchical Structure**: Tree showing all classes and functions
2. **Purpose**: What the file does
3. **Input/Output**: What it accepts and produces

```python
#!/usr/bin/env python3
"""
HIERARCHICAL STRUCTURE OF CLASSES AND FUNCTIONS IN THIS FILE:

Deterministic Staging Import Architecture:
├── class ImportConfiguration
│   ├── __init__(self, config_path: Optional[str] = None) -> None
│   ├── _load_config(self) -> Dict[str, Any]
│   ├── _validate_config(self) -> None
│   ├── get_table_config(self, table_name: str) -> Dict[str, Any]
│   ├── get_import_settings(self) -> Dict[str, Any]
│   └── get_logging_config(self) -> Dict[str, Any]
├── class DataTransformationEngine
│   ├── __init__(self, null_values: List[str]) -> None
│   ├── transform_value(self, value: str, transform_config: Dict[str, Any]) -> Any
│   ├── _clean_currency(self, value: str, config: Dict[str, Any]) -> Optional[Decimal]
│   ├── _parse_date(self, value: str, config: Dict[str, Any]) -> Optional[str]
│   ├── _parse_timestamp(self, value: str, config: Dict[str, Any]) -> Optional[str]
│   └── _clean_uuid(self, value: str) -> Optional[str]
├── class FileDiscoveryEngine
│   ├── __init__(self, import_settings: Dict[str, Any]) -> None
│   ├── discover_files(self, directory: str, file_patterns: List[str]) -> List[Path]
│   ├── read_csv_in_batches(self, file_path: Path) -> Iterator[Tuple[List[Dict], int]]
│   └── _find_header_line_smart(self, csvfile) -> Optional[int]
├── class DatabaseManager
│   ├── __init__(self, schema: str) -> None
│   ├── _establish_connection(self) -> psycopg2.connection
│   ├── insert_batch_with_recovery(self, table: str, batch: List[Dict]) -> Tuple[int, int]
│   └── close_connection(self) -> None
├── class PerformanceMonitor
│   ├── __init__(self, log_config: Dict[str, Any]) -> None
│   ├── start_file_processing(self, file_path: Path, table_name: str) -> None
│   ├── complete_file_processing(self, file_path: Path, total: int, success: int) -> None
│   └── generate_comprehensive_report(self) -> None
├── function setup_timestamped_logging(log_config: Dict[str, Any]) -> None
└── function main() -> None

Purpose: Deterministic staging data import with comprehensive error recovery and performance monitoring
Input: Raw CSV files matching configured patterns
Output: Processed data in PostgreSQL staging tables with detailed performance reports
"""

import argparse
import csv
import logging
# ... rest of imports
```

### Frontmatter Template

```python
"""
HIERARCHICAL STRUCTURE OF CLASSES AND FUNCTIONS IN THIS FILE:

[Component Name]:
├── class ClassName
│   ├── method_name(self, param: Type) -> ReturnType
│   ├── _private_method(self) -> None
│   └── property_name(self) -> Type
├── function standalone_function(param: Type) -> ReturnType
└── function helper_function() -> None

Purpose: [Brief description of what this file does]
Input: [What data/parameters it accepts]
Output: [What it produces/returns]
"""
```

---

## Component Naming Conventions

### Classes
- **PascalCase**: `ImportConfiguration`, `DataTransformationEngine`
- **Descriptive**: Name clearly indicates purpose
- **Nouns**: Classes are things

### Functions
- **snake_case**: `setup_timestamped_logging`, `validate_database_connection`
- **Verbs**: Functions do things
- **Specific**: `discover_files` not `get_stuff`

### Files
- **snake_case**: `file_discovery_engine.py`, `data_transformation_engine.py`
- **Descriptive**: Name matches primary class/function
- **Organized**: Group related functionality

### Examples

```
Good File Names:
  ✓ database_manager.py           # Contains DatabaseManager class
  ✓ performance_monitor.py        # Contains PerformanceMonitor class
  ✓ logging_setup.py              # Contains logging setup functions

Bad File Names:
  ✗ utils.py                      # Too generic
  ✗ helpers.py                    # Too vague
  ✗ stuff.py                      # Meaningless
```

---

## Import Organization

### Standard Import Order
```python
# 1. Standard library imports
import argparse
import csv
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# 2. Third-party imports
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# 3. Local application imports
from config.import_config import ImportConfiguration
from discovery.file_discovery_engine import FileDiscoveryEngine
from transform.data_transformation_engine import DataTransformationEngine
```

### Path Management for Root Entry Points
```python
# Add src to path for imports (in root-level entry point scripts)
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))

# Now can import from src modules
from config.import_config import ImportConfiguration
```

---

## Best Practices Summary

1. **Entry Points at Root**: Main scripts at project root for easy execution
2. **Code in src/**: Implementation organized by functional area
3. **Comprehensive Frontmatter**: Every file documents its structure, purpose, input/output
4. **Descriptive Names**: Files, classes, and functions have clear, specific names
5. **Single Responsibility**: Each file focuses on one functional area
6. **Standard Imports**: Follow standard library → third-party → local order
7. **Path Management**: Root scripts add src/ to path for imports
8. **Separation of Concerns**: Config, discovery, transform, database, monitoring in separate modules
