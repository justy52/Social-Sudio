import { config } from 'dotenv';

let isLoaded = false;

export function loadServerEnv(env: NodeJS.ProcessEnv = process.env) {
  if (isLoaded) {
    return;
  }

  isLoaded = true;

  if (env.NODE_ENV === 'production' || env.NODE_TEST_CONTEXT) {
    return;
  }

  config({ path: '.env.local', override: false, quiet: true });
  config({ path: '.env', override: false, quiet: true });
}
