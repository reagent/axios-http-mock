import httpStatus from "http-status";
import { UnconfiguredResponseError } from "./errors";

import { Headers, Method, Params, RequestOptions } from "./types";

type Response = {
  status: number;
  statusText: string;
  data: any;
  headers: Headers;
};

type ResponseWithHeaders<T> = { data: T; headers: Headers };
type ReplayableResponse<T = any> = T | ResponseWithHeaders<T>;

const isResponseWithHeaders = <T>(
  response: T | ResponseWithHeaders<T>
): response is ResponseWithHeaders<T> => {
  const responseWithHeaders = response as ResponseWithHeaders<T>;

  return (
    responseWithHeaders.data !== undefined &&
    responseWithHeaders.headers !== undefined
  );
};

class Request {
  protected _uri?: string;
  protected options?: RequestOptions;

  protected exception?: Error;
  protected _response?: Response;

  protected invocationCount = 0;
  protected maxInvocationCount: number | undefined = undefined;

  constructor(readonly method: Method) {}

  to(uri: string): this {
    this._uri = uri;
    return this;
  }

  with(options: RequestOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  once(): this {
    this.maxInvocationCount = 1;
    return this;
  }

  timeout(): void {
    this.exception = new Error("Timeout");
  }

  respondWith<T>(status: number, response?: ReplayableResponse<T>): this {
    let data: any = undefined;
    let headers: Headers = {};

    if (response) {
      if (isResponseWithHeaders(response)) {
        ({ data, headers } = response);
      } else {
        data = response;
      }
    }

    this._response = {
      status,
      data,
      headers,
      statusText: httpStatus[status] as string,
    };

    return this;
  }

  isInvokable(): boolean {
    return (
      !this.maxInvocationCount || this.invocationCount < this.maxInvocationCount
    );
  }

  isValid(): boolean {
    return !!this.uri && (!!this._response || !!this.exception);
  }

  toJSON(): Record<string, unknown> {
    const { method, uri, headers, params, body } = this;
    return { method, uri, headers, params, body };
  }

  get uri(): string | undefined {
    return this._uri;
  }

  get headers(): Headers | undefined {
    return this.options?.headers;
  }

  get body(): any {
    return this.options?.body;
  }

  get params(): Params | undefined {
    return this.options?.params;
  }

  get response(): Response {
    this.invocationCount++;

    if (this.exception) {
      throw this.exception;
    }

    if (!this._response) {
      throw new UnconfiguredResponseError({
        method: this.method,
        uri: this.uri,
        options: this.options,
      });
    }

    return this._response;
  }
}

export { Request };
