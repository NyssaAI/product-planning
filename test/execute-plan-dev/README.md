# Execute-plan integration evals

Manual integration tests that scaffold a minimal project with a design + plan, then run Claude Code with **`dev-tools:execute-plan`**.

## Usage

```bash
cd test/execute-plan-dev
./run-test.sh go-fractals
./run-test.sh svelte-todo --plugin-dir /path/to/dev-tools
```

Requires Claude Code CLI and dev-tools plugin. Output goes under `/tmp/dev-tools-tests/`.
