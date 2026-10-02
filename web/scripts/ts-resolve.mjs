// Node runs TypeScript itself (type stripping), but doesn't add file extensions:
// we resolve `./config` imports from src/ as `./config.ts`. Registered with: node --import.
import { register } from 'node:module';

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(spec, ctx, next) {
      try {
        return await next(spec, ctx);
      } catch (e) {
        if (spec.startsWith('.') && !/\\.\\w+$/.test(spec)) return next(spec + '.ts', ctx);
        throw e;
      }
    }
  `)}`,
);
