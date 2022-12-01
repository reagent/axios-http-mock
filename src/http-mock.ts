import { AxiosAdapter } from "axios";

import {
  Headers,
  Method,
  MatchMode,
  RequestOptions,
  MockRegistry,
} from "./types";
import { InvalidRequestsError, RequestNotFoundError } from "./errors";
import { Request } from "./request";
import { RequestMatcher } from "./request-matcher";
import { extractRequestHeaders, joinUri, settle } from "./util";

type MockOptions = {
  matching: MatchMode;
};

class HttpMock {
  protected registry: MockRegistry;
  protected mode: MatchMode;

  constructor(options?: MockOptions) {
    // TODO: reduce ??
    this.registry = {
      get: [],
      post: [],
      put: [],
      delete: [],
      head: [],
      link: [],
      options: [],
      patch: [],
      purge: [],
      unlink: [],
    };

    this.mode = options?.matching ?? "strict";
  }

  reset(): void {
    for (const method of Object.keys(this.registry)) {
      this.registry[method as Method] = [];
    }
  }

  on(method: Method): Request {
    const matcher = new Request(method);
    this.registry[method].push(matcher);

    return matcher;
  }

  get adapter(): AxiosAdapter {
    return (config) => {
      const invalidRequests: Request[] = [];

      for (const request of Object.values(this.registry).flat()) {
        if (!request.isValid()) {
          invalidRequests.push(request);
        }
      }

      if (invalidRequests.length > 0) {
        throw new InvalidRequestsError(invalidRequests);
      }

      const method = config.method as Method;
      const uri = joinUri(config.baseURL, config.url);

      const matcher = new RequestMatcher(this.registry[method], this.mode);

      let headers: Headers | undefined = undefined;
      let body;

      if (config.data) {
        body = JSON.parse(config.data); // TODO, we don't always do JSON
      }

      // These will always be present in practice
      if (config.headers) {
        headers = extractRequestHeaders(config.headers);
      }

      const options: RequestOptions = {
        body,
        headers,
        params: config.params,
      };

      const request = matcher.matchFor(uri, options);

      if (!request) {
        throw new RequestNotFoundError(config, this.registry);
      }

      return settle(request, config);
    };
  }
}

export { RequestNotFoundError, InvalidRequestsError, HttpMock };
