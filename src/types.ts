import { Request } from "./request";

const METHODS = [
  "get",
  "delete",
  "head",
  "options",
  "post",
  "put",
  "patch",
  "purge",
  "link",
  "unlink",
] as const;

type MockRegistry = Record<Method, Request[]>;
type Method = typeof METHODS[number];
type Params = Record<string, string | number | undefined>;
type Headers = Record<string, string>;
type MatchMode = "strict" | "partial";

type RequestOptions = {
  params?: Params;
  body?: any;
  headers?: Headers;
};

// type MatchOptions = RequestOptions & { uri: string };

export {
  METHODS,
  Method,
  Params,
  Headers,
  RequestOptions,
  // MatchOptions,
  MockRegistry,
  MatchMode,
};
