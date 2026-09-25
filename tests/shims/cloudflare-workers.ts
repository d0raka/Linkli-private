/** Test replacement for `cloudflare:workers`: a mutable env populated by the test setup. */
export const env: Record<string, unknown> = {};

export function resetEnv(values: Record<string, unknown>) {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, values);
}
