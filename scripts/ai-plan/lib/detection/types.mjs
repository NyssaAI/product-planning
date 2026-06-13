/**
 * Shared types for language-agnostic module detection.
 *
 * The detection core consumes a `FileGraph` (produced by a per-language
 * `StackGraphAdapter`) plus the directory tree, and emits `DetectedModule[]`.
 * Nothing here is language-specific.
 *
 * @typedef {object} Symbol
 * @property {string} name
 * @property {string} kind
 * @property {number} line
 *
 * @typedef {object} GraphFile
 * @property {string} path     repo-relative, forward-slashed
 * @property {Symbol[]} symbols
 *
 * @typedef {object} Edge
 * @property {string} from     source file path
 * @property {string} to       target file path
 * @property {number} weight   aggregated reference count
 *
 * @typedef {object} FileGraph
 * @property {GraphFile[]} files
 * @property {Edge[]} edges     file -> file dependency edges
 *
 * @typedef {object} StackGraphAdapter
 * @property {string} id                                   e.g. 'csharp'
 * @property {(repoRoot: string) => boolean} matches       stack detection
 * @property {(repoRoot: string, files: string[]) => FileGraph} extract
 *
 * @typedef {object} Pin
 * @property {string} root                authoritative directory boundary
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [description]
 * @property {string[]} [capabilities]
 * @property {string[]} [doesNotOwn]
 * @property {boolean} [exclude]          exclude this dir from being a module
 *
 * @typedef {object} DetectedModule
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} description
 * @property {'derived' | 'pinned'} source
 * @property {string[]} [flags]           advisory merge/split notes
 */

export {};
