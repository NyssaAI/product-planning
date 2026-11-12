# plan-product Feature Inventory

| Feature Group | Complete / Total | % Complete |
| --- | --- | --- |
| Group 00: Workspace Setup & Customization | 3 / 3 | 100% |
| Group 01: Feature & Use Case Definition | 3 / 3 | 100% |
| Group 03: Development Plan Sequencing | 1 / 1 | 100% |
| Group 04: Planning Maintenance & Upgrade | 1 / 1 | 100% |
| **Overall** | **8 / 8** | **100%** |

---

## How to Use This Feature Inventory

This document catalogs product capabilities organized by functional area so you can see what belongs together at a glance.

| Numbering Pattern | Canonical Name | Segment Definitions | Path / Location |
| :--- | :--- | :--- | :--- |
| **`C-nn`**<br>*(e.g. `C-01`)* | **Concept ID** | • **`nn` = Concept Number** (`01`–`99`): Sequential atomic domain model or cross-feature macro-flow. | `docs/concepts/c-nn-short-slug.md` |
| **`F-gg.nn`**<br>*(e.g. `F-01.02`)* | **Feature ID** | • **`gg` = Feature Group** (`00`–`99`): Cohesive functional area clustering related features (`00` = Foundation).<br>• **`nn` = Feature Number** (`01`–`99`): Sequential feature within that Feature Group. | `docs/features/f-gg.nn/feature.md` |
| **`UC-gg.nn.uu`**<br>*(e.g. `UC-01.02.01`)* | **Use Case ID** | • **`gg` = Feature Group** (`00`–`99`): Inherited from parent Feature.<br>• **`nn` = Feature Number** (`01`–`99`): Inherited from parent Feature.<br>• **`uu` = Use Case Number** (`01`–`99`): Sequential actor workflow within `F-gg.nn`. | `docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md` |
| **`DP-pp.ss`**<br>*(e.g. `DP-01.03`)* | **Development Plan Step ID** | • **`pp` = Phase** (`00`–`99` or `01`–`99`): Technical delivery stage in build order.<br>• **`ss` = Step** (`01`–`99`): Ordered unit of delivery work within Phase `pp` that completes/verifies target `UC-gg.nn.uu`s (or `F-gg.nn` fallback). | `docs/plans/development-plan.md` |

---

## Feature Checklist Summary

### Group 00: Workspace Setup & Customization

- [x] F-00.01: Custom Planning Locations
- [x] F-00.02: Core Product Overview Documents
- [x] F-00.03: Customizable Document Templates

### Group 01: Feature & Use Case Definition

- [x] F-01.01: Feature Catalog & Progress Tracking
- [x] F-01.02: Feature Scope Guides & Actor Use Cases
- [x] F-01.03: Functional Feature Grouping

### Group 03: Development Plan Sequencing

- [x] F-03.01: Phased Development Plan

### Group 04: Planning Maintenance & Upgrade

- [x] F-04.01: Legacy Planning Document Upgrade

---

## Feature Inventory

### Group 00: Workspace Setup & Customization

**F-00.01: Custom Planning Locations**  
Choose where product, glossary, feature, and development plan documents live so planning fits naturally into any project's folder structure and works across team members' machines.  
[Feature Guide: Custom Planning Locations](features/f-00.01/feature.md)

**F-00.02: Core Product Overview Documents**  
Capture the product's vision, shared domain vocabulary, target users, core problem, and high-level technology context in a predictable set of overview documents before diving into individual features.  
[Feature Guide: Core Product Overview Documents](features/f-00.02/feature.md)

**F-00.03: Customizable Document Templates**  
Start new product, glossary, concept, feature, use-case, and development plan documents from editable templates that match your team's preferred format without overwriting notes you have already written.  
[Feature Guide: Customizable Document Templates](features/f-00.03/feature.md)

### Group 01: Feature & Use Case Definition

**F-01.01: Feature Catalog & Progress Tracking**  
Browse every planned and completed product capability in one readable catalog with clear completion counts across functional areas.  
[Feature Guide: Feature Catalog & Progress Tracking](features/f-01.01/feature.md)

**F-01.02: Feature Scope Guides & Actor Use Cases**  
Define what each capability does for users, what is explicitly out of scope, and how actors step through concrete workflows—including decision branches and failure handling.  
[Feature Guide: Feature Scope Guides & Actor Use Cases](features/f-01.02/feature.md)

**F-01.03: Functional Feature Grouping**  
Keep related capabilities clustered together in numbered functional groups so the catalog stays easy to scan even as the product grows past dozens of features.  
[Feature Guide: Functional Feature Grouping](features/f-01.03/feature.md)

### Group 03: Development Plan Sequencing

**F-03.01: Phased Development Plan**  
Order delivery work into technical phases and steps with clear dependencies and observable verification checkpoints, independent of how features are grouped in the catalog.  
[Feature Guide: Phased Development Plan](features/f-03.01/feature.md)

### Group 04: Planning Maintenance & Upgrade

**F-04.01: Legacy Planning Document Upgrade**  
Upgrade older planning documents and feature folders to the current numbering and grouping model automatically without losing existing product decisions or notes.  
[Feature Guide: Legacy Planning Document Upgrade](features/f-04.01/feature.md)
