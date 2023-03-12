# Axios HTTP Mocking Library

Mock adapter for [Axios][axios] HTTP client with a fluent type-safe interface.

## Installation

Install from NPM:

```
$ yarn add @reagent/axios-http-mock
```

## Usage

Creating an instance of `HttpMock` will expose an adapter to use when
configuring your Axios client:

```ts
import Axios from 'axios';
import { HttpMock, HttpStatus } from '@reagent/axios-http-mock';

const httpMock = new HttpMock();
const axios = Axios.create({ adapter: httpMock.adapter });
```

From there, you can configure mock responses using the fluent interface:

```ts
httpMock.on('get').to('https://host.example/path').respondWith(200);
```

### Match Modes

By default the mock implements strict matching, which means that all elements
of the request that Axios sends must match the arguments to your mock request.

Keep in mind that Axios will always send an `Accept` header with the value
`'application/json, text/plain, */*'`, which means you must override this in
your request, or match this default value explicitly:

```ts
const httpMock = new HttpMock();

const axios = Axios.create({
  adapter: httpMock.adapter,
  baseURL: 'https://host.example',
});

httpMock
  .on('get')
  .to('https://host.example/path')
  .with({
    headers: { Accept: 'application/json, text/plain, */*' },
  })
  .respondWith(HttpStatus.OK);

expect(axios.get('/path', { params: { status: 'new' } })).rejects.toThrow(
  'No match found'
);
```

Alternatively, a `partial` match can match only on verb and URI:

```ts
const httpMock = new HttpMock({ matching: 'partial' });

const axios = Axios.create({
  adapter: httpMock.adapter,
  baseURL: 'https://host.example',
});

httpMock
  .on('get')
  .to('https://host.example/path')
  .respondWith(HttpStatus.OK, { key: 'value' });

const { status, data } = await axios.get('/path', {
  params: { status: 'new' },
});

expect(data).toEqual({ key: 'value' });
expect(status).toEqual(200);
```

## Multiple Configured Matches

In partial match mode, the request that matches the most configured options is
chosen:

```ts
// ...

httpMock
  .on('get')
  .to('https://host.example/path')
  .respondWith(HttpStatus.UNAUTHORIZED);

httpMock
  .on('get')
  .to('https://host.example/path')
  .with({ params: { status: 'new' } })
  .respondWith(HttpStatus.OK, { ok: 'pal' });

expect(
  axios.get('/path', { params: { status: 'new' } })
).resolves.toMatchObject({ status: 200 });
```

## Raising Connectivity Errors

Using the specific `timeout()` method will cause a simulated network timeout
error to be raised:

```ts
// ...

httpMock.on('get').to('https://host.example/path').timeout();
expect(axios.get('/path')).rejects.toThrow('Timeout');
```

## Matching a Request Only Once

By default requests can be matched multiple times, but you can configure a
single match and have subsequent requests fail:

```ts
httpMock
  .on('get')
  .to('https://host.example/path')
  .respondWith(HttpStatus.OK)
  .once();

expect(axios.get('/path')).resolves.toMatchObject({ status: 200 });
expect(axios.get('/path')).rejects.toThrow();
```

## Resetting Configured Matches Between Tests

In the event that you have a shared test setup, you can easily clear all
configured request methods by calling `reset()` in your before hook:

```ts
beforeEach(() => httpMock.reset());
```

[axios]: https://axios-http.com/
