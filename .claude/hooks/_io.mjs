/** Shared helpers for Claude Code hooks. Read stdin JSON; emit decisions. */
export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** PreToolUse: deny with a reason the agent will see. */
export function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Blocking feedback (PostToolUse / Stop): stderr goes to the agent. */
export function block(message) {
  process.stderr.write(message.endsWith('\n') ? message : message + '\n');
  process.exit(2);
}

export function allow() {
  process.exit(0);
}
