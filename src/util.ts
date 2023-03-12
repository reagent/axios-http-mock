import {
  AxiosError,
  AxiosPromise,
  AxiosRequestConfig,
  RawAxiosRequestHeaders,
} from "axios";
import { Request } from "./request";
import { Headers, Method, METHODS } from "./types";

// Reimplementation of the same function from Axios source as this is no longer
// exported. See:
//   https://github.com/axios/axios/blob/f2547d0e030eab3dfa22d39b4a71c8f90fd8c2b9/lib/core/settle.js
//
const settle = (request: Request, config: AxiosRequestConfig): AxiosPromise => {
  return new Promise((resolve, reject) => {
    const response = { ...request.response, config: config };

    const validateStatus = config.validateStatus;
    if (
      !response.status ||
      !validateStatus ||
      validateStatus(response.status)
    ) {
      resolve(response);
    } else {
      reject(
        new AxiosError(
          "Request failed with status code " + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
            Math.floor(response.status / 100) - 4
          ],
          config,
          request,
          response
        )
      );
    }
  });
};

const joinUri = (
  base: string | undefined,
  ...remain: (string | undefined)[]
): string => {
  const parts: string[] = [];

  if (base) {
    parts.push(base.replace(/\/$/, ""));
  }

  return [...parts, ...remain].filter((e) => !!e).join("");
};

const extractRequestHeaders = (
  incoming: RawAxiosRequestHeaders
): Headers | undefined => {
  let commonHeaders,
    remainingHeaders: Headers | undefined = undefined;

  const { common, ...remaining } = incoming;

  if (common) {
    commonHeaders = Object.entries(common).reduce<Headers>(
      (headers, [key, value]) => ({ ...headers, [key]: value }),
      {}
    );
  }

  if (remaining) {
    remainingHeaders = Object.entries(remaining).reduce<Headers>(
      (headers, [key, rawValue]) => {
        if (!rawValue || METHODS.includes(key as Method)) {
          return headers;
        }

        let value: string;

        if (Array.isArray(rawValue)) {
          value = rawValue.map((v) => v.toString()).join("; ");
        } else {
          value = rawValue?.toString();
        }

        return { ...headers, [key]: value };
      },
      {}
    );
  }

  if (!commonHeaders && !remainingHeaders) {
    return undefined;
  }

  return { ...commonHeaders, ...remainingHeaders };
};

export { settle, joinUri, extractRequestHeaders };
