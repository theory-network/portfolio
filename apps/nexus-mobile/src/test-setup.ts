import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// jsdom doesn't implement structuredClone (https://github.com/jsdom/jsdom/issues/3363);
// AppStateService relies on it to clone its seed data, which is plain JSON-serializable.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
}

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
