#!/usr/bin/env node
import { run } from "./cli";

process.exitCode = await run(process.argv.slice(2));
