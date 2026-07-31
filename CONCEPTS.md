# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Code Mapping

### Code Map
The generated, per-repository index of source symbols and runtime endpoints that gives planning agents scoped context without reading whole files. It is regenerated from source, never hand-edited, and is the deepest disclosure level an agent loads during planning.

### Endpoint Index
The portion of the Code Map that records externally reachable runtime surfaces — HTTP routes and MCP tool declarations — detected statically per language and framework. Each entry carries a confidence level; a medium-confidence entry means the surface is real but its recorded path may be a fragment (for example, a route registered through a router group whose prefix could not be resolved locally).

### Module Graph
The generated map of a repository's application modules with directed depends-on and used-by edges. It is consumed for implementation-task ordering and scoped context selection, not pasted wholesale into an agent's context. `docs/features.md` owns features; the Module Graph owns code structure.

### Stack-Graph Adapter
The per-language component that turns a repository's source files into a file graph — files, their symbols, and import edges — that feeds module derivation. Exactly one adapter is selected per repository (first match wins), and an adapter degrades gracefully: on failure it yields an empty graph rather than aborting generation. Adding a language means adding an adapter, not changing the pipeline.

### Cohesion Detection
The primary module-discovery mechanism: it clusters the Stack-Graph Adapter's file graph into feature-level modules using dependency cohesion. It runs before Stack Profiles, so when it produces any modules, profile-based discovery never executes. Repositories below its minimum-size thresholds silently fall back to coarser discovery.

### Stack Profile
A per-technology fallback that proposes modules from a repository's conventional layout when Cohesion Detection yields nothing. Profiles are checked in priority order and only the first matching profile contributes. Because Cohesion Detection pre-empts them on healthy repositories, profile behavior is only observable on small or unusually shaped repositories.
