import Axios, { AxiosHeaders } from "axios";
import httpStatus from "http-status";

import {
  HttpMock,
  RequestNotFoundError,
  InvalidRequestsError,
} from "./http-mock";

describe(HttpMock.name, () => {
  describe("GET request matchers", () => {
    it("returns the configured response headers", async () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      httpMock
        .on("get")
        .to("http://host.example/path")
        .respondWith(httpStatus.OK, {
          data: { body: "value" },
          headers: { header: "value" },
        });

      const receivedResponse = await client.get("http://host.example/path");
      const { data, headers } = receivedResponse;

      expect(data).toEqual({ body: "value" });
      expect(headers).toEqual(AxiosHeaders.from({ header: "value" }));
    });

    describe("when performing `strict` matching", () => {
      const httpMock = new HttpMock();
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("get").respondWith(200, { key: "value" });
        const request = client.get("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is` no response configured", async () => {
        httpMock.on("get").to("https://host.example/path");
        const request = client.get("https://host.example/path");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("returns the configured response when matching on the default headers", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          // Axios sends this header by default
          .with({ headers: { Accept: "application/json, text/plain, */*" } })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.get("https://host.example/path");

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("returns the configured response when matching on both `headers` and `params`", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({
            headers: { Accept: "application/json" },
            params: { query: "value" },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.get("https://host.example/path", {
          headers: { Accept: "application/json" },
          params: { query: "value" },
        });

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("respects the `baseURL` configuration attribute when matching a request", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" });

        let { data, status } = await client.get("/path", {
          baseURL: "https://host.example/",
          headers: { Accept: "application/json" },
        });

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);

        ({ data, status } = await client.get("/path", {
          baseURL: "https://host.example",
          headers: { Accept: "application/json" },
        }));

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("throws an error when the mock is configured to throw a timeout error", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .timeout();

        const operation = client.get("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(operation).rejects.toThrow("Timeout");
      });

      it("matches a configured request only once when using the `once()` modifier", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" })
          .once();

        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(201, { key: "other" })
          .once();

        const request = () =>
          client.get("https://host.example/path", {
            headers: { Accept: "application/json" },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "other" });
        expect(status).toBe(201);

        await expect(request()).rejects.toThrow();
      });

      it("always uses the first configured response when matching a request", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" });

        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(404, { error: "not found" });

        const request = () =>
          client.get("https://host.example/path", {
            headers: { Accept: "application/json" },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);
      });

      it("throws a `RequestNotFound` error when no matching request is found", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .respondWith(200, { type: "generic" });

        const request = client.get("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("throws an Axios error when encountering an invalid HTTP status code", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(404, { error: "not found" });

        const request = client.get("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(
          "Request failed with status code 404"
        );

        const { data, status } = await client.get("https://host.example/path", {
          headers: { Accept: "application/json" },
          validateStatus: (_status) => true,
        });

        expect(data).toEqual({ error: "not found" });
        expect(status).toEqual(404);
      });

      it("throws a `RequestNotFoundError` when no requests are configured", async () => {
        const operation = client.get("https://host.example");
        await expect(operation).rejects.toThrow(RequestNotFoundError);
      });

      it("does not match other request methods", async () => {
        const url = "https://host.example.path";
        const params = { query: "value" };
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        httpMock
          .on("post")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("put")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("delete")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("get")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.OK);

        const { status } = await client.get(url, { headers, params });

        expect(status).toBe(httpStatus.OK);
      });
    });

    describe("when performing `partial` matching", () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("get").respondWith(200, { key: "value" });
        const request = client.get("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is no response configured", async () => {
        httpMock.on("get").to("https://host.example");
        const request = client.get("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("matches the most appropriate request even if a previous one is a partial URL match", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .respondWith(200, { match: "generic" });

        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({
            params: { query: "value" },
          })
          .respondWith(201, { match: "specific" });

        const { data, status } = await client.get("https://host.example/path", {
          params: { query: "value" },
        });

        expect(data).toEqual({ match: "specific" });
        expect(status).toBe(201);
      });

      it("requires a full match on `params` when they are present", async () => {
        httpMock
          .on("get")
          .to("https://host.example/path")
          .with({ params: { query: "value", other: "value" } })
          .respondWith(200, { key: "value" });

        const request = client.get("https://host.example/path", {
          params: { query: "value" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });
    });
  });

  describe("POST request matchers", () => {
    it("returns the configured response headers", async () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({
        adapter: httpMock.adapter,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      httpMock
        .on("post")
        .to("http://host.example/path")
        .with({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .respondWith(httpStatus.OK, {
          headers: { key: "value" },
          data: { body: "value" },
        });

      const { data, headers } = await client.post(
        "http://host.example/path",
        undefined,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      expect(data).toEqual({ body: "value" });
      expect(headers).toEqual(AxiosHeaders.from({ key: "value" }));
    });

    describe("when performing `strict` matching", () => {
      const httpMock = new HttpMock();
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("post").respondWith(200, { key: "value" });
        const request = client.post("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is` no response configured", async () => {
        httpMock.on("post").to("https://host.example/path");
        const request = client.post("https://host.example/path");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("returns the configured response when matching on the default headers", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          // Axios sends these headers by default
          .with({
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.post("https://host.example/path");

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("returns the configured response when matching on `headers`, `body` and `params`", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: { key: "value" },
            params: { query: "value" },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.post(
          "https://host.example/path",
          { key: "value" },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("respects the `baseURL` configuration attribute when matching a request", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.post("/path", undefined, {
          baseURL: "https://host.example",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("throws an error when the mock is configured to throw a timeout error", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .timeout();

        const operation = client.post("https://host.example/path", undefined, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        await expect(operation).rejects.toThrow("Timeout");
      });

      it("matches a configured request only once when using the `once()` modifier", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" })
          .once();

        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(201, { key: "other" })
          .once();

        const request = () =>
          client.post("https://host.example/path", undefined, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "other" });
        expect(status).toBe(201);

        await expect(request()).rejects.toThrow();
      });

      it("always uses the first configured response when matching a request", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" });

        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(404, { error: "not found" });

        const request = () =>
          client.post("https://host.example/path", undefined, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);
      });

      it("throws a `RequestNotFound` error when no matching request is found", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .respondWith(200, { type: "generic" });

        const request = client.post("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("throws an Axios error when encountering a non-2xx status", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(404, { error: "not found" });

        const request = client.post("https://host.example/path", undefined, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        await expect(request).rejects.toThrow(
          "Request failed with status code 404"
        );
      });

      it("throws a `RequestNotFoundError` when no requests are configured", async () => {
        const operation = client.post("https://host.example");
        await expect(operation).rejects.toThrow(RequestNotFoundError);
      });

      it("does not match other request methods", async () => {
        const url = "https://host.example.path";
        const params = { query: "value" };
        const body = { key: "value" };
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        httpMock
          .on("put")
          .to(url)
          .with({ headers, body, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("delete")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("get")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("post")
          .to(url)
          .with({ headers, body, params })
          .respondWith(httpStatus.OK);

        const { status } = await client.post(url, body, { headers, params });

        expect(status).toBe(httpStatus.OK);
      });
    });

    describe("when performing `partial` matching", () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("post").respondWith(200, { key: "value" });
        const request = client.post("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is no response configured", async () => {
        httpMock.on("post").to("https://host.example");
        const request = client.post("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("best match", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .respondWith(200, { match: "generic" });

        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({ params: { query: "value" }, body: { key: "value" } })
          .respondWith(201, { match: "specific" });

        const { data, status } = await client.post(
          "https://host.example/path",
          { key: "value" },
          {
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ match: "specific" });
        expect(status).toBe(201);
      });

      it("requires a full match on `params` when they are present", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            params: { query: "value", other: "value" },
            body: { key: "value" },
          })
          .respondWith(200, { key: "value" });

        const request = client.post("https://host.example/path", undefined, {
          params: { query: "value" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("requires a full match on `body` when it is present", async () => {
        httpMock
          .on("post")
          .to("https://host.example/path")
          .with({
            body: { key: "value", other: "value" },
          })
          .respondWith(200, { key: "value" });

        const request = client.post("https://host.example/path", {
          query: "value",
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });
    });
  });

  describe("PUT request matchers", () => {
    it("returns the configured response headers", async () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      httpMock
        .on("put")
        .to("http://host.example/path")
        .respondWith(httpStatus.OK, {
          data: { body: "value" },
          headers: { header: "value" },
        });

      const { data, headers } = await client.put("http://host.example/path");

      expect(data).toEqual({ body: "value" });
      expect(headers).toEqual(AxiosHeaders.from({ header: "value" }));
    });

    describe("when performing `strict` matching", () => {
      const httpMock = new HttpMock();
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("put").respondWith(200, { key: "value" });
        const request = client.put("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is` no response configured", async () => {
        httpMock.on("put").to("https://host.example/path");
        const request = client.put("https://host.example/path");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("returns the configured response when matching on the default headers", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          // Axios sends these headers by default
          .with({
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.put("https://host.example/path");

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("returns the configured response when matching on `headers`, `body` and `params`", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: { key: "value" },
            params: { query: "value" },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.put(
          "https://host.example/path",
          { key: "value" },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("respects the `baseURL` configuration attribute when matching a request", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.put("/path", undefined, {
          baseURL: "https://host.example",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("throws an error when the mock is configured to throw a timeout error", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .timeout();

        const operation = client.put("https://host.example/path", undefined, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        await expect(operation).rejects.toThrow("Timeout");
      });

      it("matches a configured request only once when using the `once()` modifier", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" })
          .once();

        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(201, { key: "other" })
          .once();

        const request = () =>
          client.put("https://host.example/path", undefined, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "other" });
        expect(status).toBe(201);

        await expect(request()).rejects.toThrow();
      });

      it("always uses the first configured response when matching a request", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(200, { key: "value" });

        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(404, { error: "not found" });

        const request = () =>
          client.put("https://host.example/path", undefined, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);
      });

      it("throws a `RequestNotFound` error when no matching request is found", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .respondWith(200, { type: "generic" });

        const request = client.put("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("throws an Axios error when encountering a non-2xx status", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
          .respondWith(404, { error: "not found" });

        const request = client.put("https://host.example/path", undefined, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        await expect(request).rejects.toThrow(
          "Request failed with status code 404"
        );
      });

      it("throws a `RequestNotFoundError` when no requests are configured", async () => {
        const operation = client.put("https://host.example");
        await expect(operation).rejects.toThrow(RequestNotFoundError);
      });

      it("does not match other request methods", async () => {
        const url = "https://host.example.path";
        const params = { query: "value" };
        const body = { key: "value" };
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        httpMock
          .on("get")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("post")
          .to(url)
          .with({ headers, body, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("delete")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("put")
          .to(url)
          .with({ headers, body, params })
          .respondWith(httpStatus.OK);

        const { status } = await client.put(url, body, { headers, params });

        expect(status).toBe(httpStatus.OK);
      });
    });

    describe("when performing `partial` matching", () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("put").respondWith(200, { key: "value" });
        const request = client.put("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is no response configured", async () => {
        httpMock.on("put").to("https://host.example");
        const request = client.put("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("best", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .respondWith(200, { match: "generic" });

        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({ params: { query: "value" }, body: { key: "value" } })
          .respondWith(201, { match: "specific" });

        const { data, status } = await client.put(
          "https://host.example/path",
          { key: "value" },
          {
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ match: "specific" });
        expect(status).toBe(201);
      });

      it("requires a full match on `params` when they are present", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            params: { query: "value", other: "value" },
            body: { key: "value" },
          })
          .respondWith(200, { key: "value" });

        const request = client.put("https://host.example/path", undefined, {
          params: { query: "value" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("requires a full match on `body` when it is present", async () => {
        httpMock
          .on("put")
          .to("https://host.example/path")
          .with({
            body: { key: "value", other: "value" },
          })
          .respondWith(200, { key: "value" });

        const request = client.put("https://host.example/path", {
          query: "value",
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });
    });
  });

  describe("DELETE request matchers", () => {
    it("returns the configured response headers", async () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({ adapter: httpMock.adapter });

      httpMock
        .on("delete")
        .to("http://host.example/path")
        .respondWith(httpStatus.OK, {
          data: { body: "value" },
          headers: { header: "value" },
        });

      const { data, headers } = await client.delete("http://host.example/path");

      expect(data).toEqual({ body: "value" });
      expect(headers).toEqual(AxiosHeaders.from({ header: "value" }));
    });

    describe("when performing `strict` matching", () => {
      const httpMock = new HttpMock();
      const client = Axios.create({ adapter: httpMock.adapter });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("delete").respondWith(200, { key: "value" });
        const request = client.delete("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is` no response configured", async () => {
        httpMock.on("delete").to("https://host.example/path");
        const request = client.delete("https://host.example/path");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("returns the configured response when matching on the default headers", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          // Axios sends this header by default
          .with({ headers: { Accept: "application/json, text/plain, */*" } })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.delete(
          "https://host.example/path"
        );

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("returns the configured response when matching on both `headers` and `params`", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({
            headers: { Accept: "application/json" },
            params: { query: "value" },
          })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.delete(
          "https://host.example/path",
          {
            headers: { Accept: "application/json" },
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("respects the `baseURL` configuration attribute when matching a request", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" });

        const { data, status } = await client.delete("/path", {
          baseURL: "https://host.example",
          headers: { Accept: "application/json" },
        });

        expect(data).toEqual({ key: "value" });
        expect(status).toBe(200);
      });

      it("throws an error when the mock is configured to throw a timeout error", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .timeout();

        const operation = client.delete("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(operation).rejects.toThrow("Timeout");
      });

      it("matches a configured request only once when using the `once()` modifier", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" })
          .once();

        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(201, { key: "other" })
          .once();

        const request = () =>
          client.delete("https://host.example/path", {
            headers: { Accept: "application/json" },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "other" });
        expect(status).toBe(201);

        await expect(request()).rejects.toThrow();
      });

      it("always uses the first configured response when matching a request", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { key: "value" });

        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(404, { error: "not found" });

        const request = () =>
          client.delete("https://host.example/path", {
            headers: { Accept: "application/json" },
          });

        let { data, status } = await request();

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);

        ({ data, status } = await request());

        expect(data).toEqual({ key: "value" });
        expect(status).toEqual(200);
      });

      it("throws a `RequestNotFound` error when no matching request is found", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .respondWith(200, { type: "generic" });

        const request = client.delete("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });

      it("throws an Axios error when encountering a non-2xx status", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(404, { error: "not found" });

        const request = client.delete("https://host.example/path", {
          headers: { Accept: "application/json" },
        });

        await expect(request).rejects.toThrow(
          "Request failed with status code 404"
        );
      });

      it("throws a `RequestNotFoundError` when no requests are configured", async () => {
        const operation = client.delete("https://host.example");
        await expect(operation).rejects.toThrow(RequestNotFoundError);
      });

      it("does not match other request methods", async () => {
        const url = "https://host.example/path";
        const params = { query: "value" };
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        httpMock
          .on("get")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("post")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("put")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.UNAUTHORIZED);

        httpMock
          .on("delete")
          .to(url)
          .with({ headers, params })
          .respondWith(httpStatus.OK);

        const { status } = await client.delete(url, { headers, params });

        expect(status).toBe(httpStatus.OK);
      });
    });

    describe("when performing `partial` matching", () => {
      const httpMock = new HttpMock({ matching: "partial" });
      const client = Axios.create({
        adapter: httpMock.adapter,
        headers: { Accept: "application/json" },
      });

      beforeEach(() => httpMock.reset());

      it("throws an `InvalidRequestsError` when there is no URI configured", async () => {
        httpMock.on("delete").respondWith(200, { key: "value" });
        const request = client.delete("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("throws an `InvalidRequestsError` when there is no response configured", async () => {
        httpMock.on("delete").to("https://host.example");
        const request = client.delete("https://host.example");

        await expect(request).rejects.toThrow(InvalidRequestsError);
      });

      it("matches the most appropriate request even if a previous one is a partial URL match", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ headers: { Accept: "application/json" } })
          .respondWith(200, { match: "generic" });

        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({
            headers: { Accept: "application/json" },
            params: { query: "value" },
          })
          .respondWith(201, { match: "specific" });

        const { data, status } = await client.delete(
          "https://host.example/path",
          {
            params: { query: "value" },
          }
        );

        expect(data).toEqual({ match: "specific" });
        expect(status).toBe(201);
      });

      it("requires a full match on `params` when they are present", async () => {
        httpMock
          .on("delete")
          .to("https://host.example/path")
          .with({ params: { query: "value", other: "value" } })
          .respondWith(200, { key: "value" });

        const request = client.delete("https://host.example/path", {
          params: { query: "value" },
        });

        await expect(request).rejects.toThrow(RequestNotFoundError);
      });
    });
  });
});
