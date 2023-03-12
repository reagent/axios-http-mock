import { AxiosRequestConfig } from "axios";
import { Request } from "./request";
import { Headers, Method, MockRegistry, RequestOptions } from "./types";
import { extractRequestHeaders } from "./util";

type SerializedConfig = {
  baseURL?: string;
  url?: string;
  method?: string;
  headers?: Headers;
  params?: Record<string, string>;
  data: any;
};

const serializeConfig = (config: AxiosRequestConfig): SerializedConfig => {
  let headers: Headers | undefined = undefined;

  if (config.headers) {
    headers = extractRequestHeaders(config.headers);
  }

  return {
    baseURL: config.baseURL,
    url: config.url,
    method: config.method,
    params: config.params,
    data: config.data,
    headers,
  };
};

class UnconfiguredResponseError extends Error {
  constructor(options: {
    method: Method;
    uri?: string;
    options?: RequestOptions;
  }) {
    super(`Response not configured for request: ${JSON.stringify(options)}`);
  }
}

class HttpMockError extends Error {}

class InvalidRequestsError extends HttpMockError {
  constructor(requests: Request[]) {
    super(
      [
        "Invalid requests encountered:",
        "",
        JSON.stringify(requests, null, 2),
      ].join("\n")
    );
  }
}

class RequestNotFoundError extends HttpMockError {
  constructor(
    readonly config: AxiosRequestConfig,
    readonly registry: MockRegistry
  ) {
    super(
      [
        "No match found for request:",
        JSON.stringify(serializeConfig(config), null, 2),
        "",
        "Available request matchers:",
        JSON.stringify(Object.values(registry).flat(), null, 2),
      ].join("\n")
    );
  }
}

export {
  HttpMockError,
  InvalidRequestsError,
  RequestNotFoundError,
  UnconfiguredResponseError,
};
