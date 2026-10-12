#!/usr/bin/env node
import { checkMapFreshness } from '../lib/map-freshness.mjs';
import { findProjectRoot } from '../module-map/lib/project-root.mjs';

const result = checkMapFreshness(findProjectRoot());
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.fresh ? 0 : 1;
