import assert from "assert";

import { Request } from "./request";
import { MatchMode, RequestOptions } from "./types";

type Matchable = Record<string, unknown> | undefined;
type MatchFn = (expected: Matchable, actual: Matchable) => boolean;

const eq: MatchFn = (expected, actual) => {
  let match = false;

  try {
    assert.deepEqual(expected, actual);
    match = true;
  } catch {
    // no-op
  }

  return match;
};

const score = (expected: Matchable, actual: Matchable): number => {
  let multiplier = 0;

  if (expected && actual) {
    multiplier = 2;
  }

  return (ok(expected, actual) ? 1 : 0) * multiplier;
};

const ok: MatchFn = (expected, actual) => {
  if (!expected || !actual) {
    return true;
  }

  return eq(expected, actual);
};

class FilterableRequest {
  protected readonly matcherKeys: (keyof RequestOptions)[] = [
    "headers",
    "params",
    "body",
  ];

  constructor(readonly request: Request) {}

  for(uri: string): boolean {
    return this.request.uri === uri && this.request.isInvokable();
  }

  pass(options: RequestOptions): boolean {
    return this.matcherKeys.reduce(
      (k, key) =>
        (k = k && (!options[key] || ok(options[key], this.request[key]))),
      true
    );
  }

  score(options: RequestOptions): number {
    return this.matcherKeys.reduce(
      (sum, key) => (sum += score(this.request[key], options[key])),
      0
    );
  }

  eq(options: RequestOptions): boolean {
    return (
      eq(this.request.headers, options.headers) &&
      eq(this.request.params, options.params) &&
      eq(this.request.body, options.body)
    );
  }
}

class RequestMatcher {
  constructor(protected requests: Request[], protected mode: MatchMode) {}

  protected get filterable(): FilterableRequest[] {
    return this.requests.map((r) => new FilterableRequest(r));
  }

  matchFor(uri: string, options?: RequestOptions): Request | null {
    const matchOptions = options || {};
    let match: FilterableRequest | undefined = undefined;

    const requests = this.filterable.filter((r) => r.for(uri));

    if (this.mode === "partial") {
      const sorted = requests
        .filter((r) => r.pass(matchOptions))
        .sort((a, b) => b.score(matchOptions) - a.score(matchOptions));

      match = sorted[0];
    } else {
      match = requests.find((r) => r.eq(matchOptions));
    }

    return match?.request || null;
  }
}

export { RequestMatcher };
