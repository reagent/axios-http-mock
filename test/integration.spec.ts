import Axios, { AxiosInstance } from "axios";
import { HttpMock, httpStatus } from "../src";

type Resource = { id: string; label: string };

class Client {
  protected httpClient: AxiosInstance;

  constructor(baseUri: string, httpClient?: AxiosInstance) {
    this.httpClient = httpClient || Axios.create();

    this.httpClient.defaults.baseURL = baseUri;

    this.httpClient.defaults.headers.common = { Accept: "application/json" };
    this.httpClient.defaults.headers.post = {
      "Content-Type": "application/json",
    };
  }

  async getResources(): Promise<Resource[]> {
    const { data } = await this.httpClient.get<Resource[]>("/resources");
    return data;
  }

  async getResource(id: string): Promise<Resource | null> {
    const { data } = await this.httpClient.get<Resource>(`/resource/${id}`);
    return data;
  }

  async createResource(label: string): Promise<Resource | null> {
    const { data } = await this.httpClient.post<Resource>("/resource");
    return data;
  }
}

describe("Integration tests", () => {
  let axios: AxiosInstance;
  let httpMock: HttpMock;

  describe("with partial matching", () => {
    beforeEach(() => {
      httpMock = new HttpMock({ matching: "partial" });
      axios = Axios.create({ adapter: httpMock.adapter });
    });

    it("get single resource returns resource", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("get")
        .to("http://host.example/resource/1")
        .respondWith(httpStatus.OK, { id: "1", label: "One" });

      await expect(client.getResource("1")).resolves.toEqual<Resource>({
        id: "1",
        label: "One",
      });
    });

    it("get multiple resources returns multiple", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("get")
        .to("http://host.example/resources")
        .respondWith<Resource[]>(httpStatus.OK, [
          { id: "1", label: "One" },
          { id: "2", label: "Two" },
        ]);

      await expect(client.getResources()).resolves.toEqual<Resource[]>([
        { id: "1", label: "One" },
        { id: "2", label: "Two" },
      ]);
    });

    it("create resource POSTs and returns resource", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("post")
        .to("http://host.example/resource")
        .respondWith(httpStatus.CREATED, { id: "1", label: "One" });

      await expect(client.createResource("One")).resolves.toEqual({
        id: "1",
        label: "One",
      });
    });

    it("bubbles up HTTP status failures", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("post")
        .to("http://host.example/resource")
        .respondWith(httpStatus.UNPROCESSABLE_ENTITY, {
          error: "Create failed",
        });

      await expect(client.createResource("One")).rejects.toThrow(
        "Request failed with status code 422"
      );
    });
  });

  describe("with strict matching", () => {
    beforeEach(() => {
      httpMock = new HttpMock({ matching: "strict" });
      axios = Axios.create({ adapter: httpMock.adapter });
    });

    it("get single resource returns resource", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("get")
        .to("http://host.example/resource/1")
        .with({ headers: { Accept: "application/json" } })
        .respondWith(httpStatus.OK, { id: "1", label: "One" });

      await expect(client.getResource("1")).resolves.toEqual<Resource>({
        id: "1",
        label: "One",
      });
    });

    it("get multiple resources returns multiple", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("get")
        .to("http://host.example/resources")
        .with({ headers: { Accept: "application/json" } })
        .respondWith<Resource[]>(httpStatus.OK, [
          { id: "1", label: "One" },
          { id: "2", label: "Two" },
        ]);

      await expect(client.getResources()).resolves.toEqual<Resource[]>([
        { id: "1", label: "One" },
        { id: "2", label: "Two" },
      ]);
    });

    it("create resource POSTs and returns resource", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("post")
        .to("http://host.example/resource")
        .with({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .respondWith(httpStatus.CREATED, { id: "1", label: "One" });

      await expect(client.createResource("One")).resolves.toEqual({
        id: "1",
        label: "One",
      });
    });

    it("bubbles up HTTP status failures", async () => {
      const client = new Client("http://host.example", axios);

      httpMock
        .on("post")
        .to("http://host.example/resource")
        .with({
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .respondWith(httpStatus.UNPROCESSABLE_ENTITY, {
          error: "Create failed",
        });

      await expect(client.createResource("One")).rejects.toThrow(
        "Request failed with status code 422"
      );
    });
  });
});
