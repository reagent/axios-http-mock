import { Request } from "./request";

describe(Request.name, () => {
  describe("isValid()", () => {
    let subject: Request;

    beforeEach(() => (subject = new Request("get")));

    it("is false by default", () => {
      expect(subject.isValid()).toBe(false);
    });

    it("is false when given only a URI", () => {
      subject.to("http://host.example");

      expect(subject.isValid()).toBe(false);
    });

    it("is true when given a URI and response", () => {
      subject.to("http://host.example");
      subject.respondWith(200);

      expect(subject.isValid()).toBe(true);
    });

    it("is true when given a URI and exception", () => {
      subject.to("http://host.example");
      subject.timeout();

      expect(subject.isValid()).toBe(true);
    });
  });

  describe("response", () => {
    let subject: Request;

    beforeEach(() => (subject = new Request("get")));

    it("throws an exception when there is no configured response", () => {
      expect(() => subject.response).toThrowError(
        'Response not configured for request: {"method":"get"}'
      );
    });

    it("throws an exception when the response should time out", () => {
      subject.timeout();
      expect(() => subject.response).toThrowError("Timeout");
    });

    it("responds the configured HTTP status and message", () => {
      subject.respondWith(200);

      expect(subject.response).toEqual({
        headers: {},
        status: 200,
        statusText: "OK",
      });
    });

    it("responds with the configured HTTP status, message, headers, and response body", () => {
      subject.respondWith(200, {
        headers: { Accept: "application/json" },
        data: { key: "value" },
      });

      expect(subject.response).toEqual({
        headers: { Accept: "application/json" },
        data: { key: "value" },
        status: 200,
        statusText: "OK",
      });
    });
  });
});
