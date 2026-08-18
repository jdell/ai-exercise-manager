/**
 * Stand-in for Node built-ins (`node:fs`, `node:path`) in the browser bundle.
 *
 * The Anthropic SDK imports them for its credential-resolution chain — reading
 * `~/.config/anthropic` profiles and identity-token files. This app always
 * constructs the client with an explicit `apiKey`, so that chain never runs and
 * the modules are never touched. Aliasing them here keeps the build output
 * clean instead of emitting a dozen "externalized for browser compatibility"
 * warnings on every build.
 *
 * Every property access throws, so if that code path is ever reached the
 * failure is loud rather than a silent `undefined`.
 */
const unavailable = (name: string) => () => {
  throw new Error(
    `Node built-in "${name}" is not available in the browser. ` +
      'The Anthropic client must be constructed with an explicit apiKey.',
  );
};

export default new Proxy(
  {},
  {
    get: (_target, prop) => unavailable(String(prop)),
  },
);
