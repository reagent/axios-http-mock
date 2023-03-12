import { Request } from "./request";
import { RequestMatcher } from "./request-matcher";
import { MatchMode } from "./types";

describe(RequestMatcher.name, () => {
  describe("matchFor", () => {
    describe("when performing a partial match", () => {
      const mode: MatchMode = "partial";

      it("returns `null` when there are no requests", () => {
        const subject = new RequestMatcher([], mode);
        expect(subject.matchFor("http://host.example")).toBeNull();
      });

      it("returns a request that matches on the provided URL", () => {
        const request = new Request("get").to("http://host.example/one");
        const match = new Request("get").to("http://host.example/two");

        const subject = new RequestMatcher([request, match], mode);

        expect(subject.matchFor("http://host.example/two")).toEqual(match);
      });

      it("returns the first matching request when matching only on URL", () => {
        const first = new Request("get").to("http://host.example");

        const second = new Request("get")
          .to("http://host.example")
          .with({ params: { key: "value" } });

        let subject = new RequestMatcher([first, second], mode);

        expect(subject.matchFor("http://host.example")).toEqual(first);

        subject = new RequestMatcher([second, first], mode);
        expect(subject.matchFor("http://host.example")).toEqual(second);
      });

      it("returns the request that matches the most options", () => {
        const verb = "post";
        const uri = "http://host.example";
        const params = { key: "value" };
        const headers = { key: "value" };
        const body = { key: "value" };

        const one = new Request(verb).to(uri);
        const two = new Request(verb).to(uri).with({ headers });
        const three = new Request(verb).to(uri).with({ headers, params });
        const four = new Request(verb).to(uri).with({ headers, params, body });

        const subject = new RequestMatcher([one, two, three, four], mode);

        expect(subject.matchFor(uri, { headers, params, body })).toEqual(four);
      });

      it("returns the first match regardless of ordering of request options", () => {
        const request = new Request("get").to("http://host.example").with({
          headers: { one: "two", three: "four" },
          params: { one: "two", three: "four" },
          body: { one: "two", three: "four" },
        });

        const match = new Request("post").to("http://host.example").with({
          headers: { three: "four", one: "two" },
          params: { three: "four", one: "two" },
          body: { three: "four", one: "two" },
        });

        const subject = new RequestMatcher([match, request], mode);

        expect(
          subject.matchFor("http://host.example", {
            headers: { one: "two", three: "four" },
            params: { one: "two", three: "four" },
            body: { one: "two", three: "four" },
          })
        ).toEqual(match);
      });

      it("requires an exact match on attributes when provided", () => {
        const full = new Request("post").to("http://host.example").with({
          headers: { key: "value" },
          params: { key: "value" },
          body: { key: "value" },
        });

        const partial = new Request("post").to("http://host.example").with({
          headers: { key: "value", other: "value" },
          params: { key: "value", other: "value" },
          body: { key: "value", other: "value" },
        });

        const subject = new RequestMatcher([partial, full], mode);

        expect(
          subject.matchFor("http://host.example", {
            headers: { key: "value" },
            params: { key: "value" },
            body: { key: "value" },
          })
        ).toEqual(full);
      });

      it("returns `null` when there are no matching requests", () => {
        const request = new Request("get")
          .to("http://host.example")
          .with({ params: { key: "value", other: "value" } });

        const subject = new RequestMatcher([request], mode);

        expect(
          subject.matchFor("http://host.example", {
            params: { key: "value" },
          })
        ).toBeNull();
      });
    });

    describe("when performing a strict match", () => {
      const mode: MatchMode = "strict";

      it("returns the first request that matches the provided URL", () => {
        const request = new Request("get")
          .to("http://host.example")
          .with({ params: { key: "value" } });

        const match = new Request("get").to("http://host.example");

        const subject = new RequestMatcher([match, request], mode);

        expect(subject.matchFor("http://host.example")).toEqual(match);
      });

      it("ignores the ordering of attributes when matching", () => {
        const request = new Request("get")
          .to("http://host.example")
          .with({ params: { one: "two", three: "four" } });

        const match = new Request("post")
          .to("http://host.example")
          .with({ params: { three: "four", one: "two" } });

        const subject = new RequestMatcher([match, request], mode);

        expect(
          subject.matchFor("http://host.example", {
            params: { one: "two", three: "four" },
          })
        ).toEqual(match);
      });

      it("retuns `null` when no requests match on all parameters", () => {
        const request = new Request("get")
          .to("http://host.example")
          .with({ headers: { key: "value" } });

        const subject = new RequestMatcher([request], mode);

        expect(subject.matchFor("http://host.example")).toBeNull();
      });
    });
  });
});
