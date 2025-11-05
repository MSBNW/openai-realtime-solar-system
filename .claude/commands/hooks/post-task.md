# post-task

Hook executed after task completion.

## Usage
```bash
npx claude-flow hooks post-task [options]
```

## Options
- `--task-id <id>` - Task identifier
- `--analyze-performance` - Analyze task performance
- `--update-memory` - Update swarm memory

## Examples
```bash
# Basic post-task
npx claude-flow hooks post-task --task-id task-123

# With performance analysis
npx claude-flow hooks post-task --task-id task-123 --analyze-performance

# Update memory
npx claude-flow hooks post-task --task-id task-123 --update-memory
```
