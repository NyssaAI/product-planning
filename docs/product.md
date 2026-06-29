# Product

code-indexer is a repository-agnostic code/module-graph generator. It scans a repo and produces 
scoped planning context under `docs/code-index/`: a code map (symbol + endpoint index), 
a module map (dependency graph), and a per-module architecture file for each detected module.

## Problem

Coding agents plan better when they load the minimum relevant context instead of the whole
codebase. code-indexer scans the code base, auto-detects modules and public api endpoint and 
emits progressive-disclosure context for the ai coding agent to use in developing software. 

