[![NPM version](https://img.shields.io/npm/v/@overlook/plugin-serve-http.svg)](https://www.npmjs.com/package/@overlook/plugin-serve-http)
[![Build Status](https://img.shields.io/travis/overlookjs/plugin-serve-http/master.svg)](http://travis-ci.org/overlookjs/plugin-serve-http)
[![Dependency Status](https://img.shields.io/david/overlookjs/plugin-serve-http.svg)](https://david-dm.org/overlookjs/plugin-serve-http)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookjs/plugin-serve-http.svg)](https://david-dm.org/overlookjs/plugin-serve-http)
[![Greenkeeper badge](https://badges.greenkeeper.io/overlookjs/plugin-serve-http.svg)](https://greenkeeper.io/)
[![Coverage Status](https://img.shields.io/coveralls/overlookjs/plugin-serve-http/master.svg)](https://coveralls.io/r/overlookjs/plugin-serve-http)

# Overlook framework HTTP server plugin

Part of the [Overlook framework](https://overlookjs.github.io/).

## Usage

Use to add an HTTP server to an application.

The server is a basic NodeJS HTTP server with no middleware - middleware needs to be added by other plugins.

Typically, you would use this plugin on the root route of the application and use something like [@overlook/plugin-path](https://www.npmjs.com/package/@overlook/plugin-path) to route the requests to the right route in the router tree.

But it's also possible to create [multiple servers](#multiple-servers) listening on different ports on different routes, or use another plugin to add e.g. a WebSocket server too.

### Set port

Set `[PORT]` or define `[GET_PORT]()` method.

```js
const Route = require('@overlook/route');
const httpPlugin = require('@overlook/plugin-serve-http');
const { PORT } = httpPlugin;

const HttpRoute = Route.extend( httpPlugin );

const router = new HttpRoute( {
  [PORT]: 3000
} );
```

```js
const Route = require('@overlook/route');
const httpPlugin = require('@overlook/plugin-serve-http');
const { GET_PORT } = httpPlugin;

const HttpRoute = Route.extend( httpPlugin );

class HttpOnPort3000Route extends HttpRoute {
  [GET_PORT]() {
    return 3000;
  }
}

const router = new HttpOnPort3000Route();
```

### Start server

`plugin-serve-http` uses [@overlook/plugin-start](https://www.npmjs.com/package/@overlook/plugin-start).

Start the server by using `[START]()` method provided by [@overlook/plugin-start](https://www.npmjs.com/package/@overlook/plugin-start).

```js
const { START } = require('@overlook/plugin-start');
await router[START]();
```

Server will be started up last, after any child routes with `[START_ROUTE]()` methods have completed start-up, so the whole app is ready to serve requests before the server starts.

### Stop server

Stop the server by using `[STOP]()` method provided by [@overlook/plugin-start](https://www.npmjs.com/package/@overlook/plugin-start).

```js
const { STOP } = require('@overlook/plugin-start');
await router[STOP]();
```

Shutdown is graceful. Server immediately stops accepting new connections, and closes all current connections. Any requests currently in flight will be allowed to complete before their connection is closed.

Server will be stopped before any child routes with `[STOP_ROUTE]()` methods have commenced their shutdown. This prevents disruption of last requests before shutdown.

### Handling requests

When the server receives requests, `.handle()` will be called on the route with a request object.

Request objects have the following properties:

* `[REQ_TYPE]`: `'HTTP'`
* `[REQ]`: NodeJS native [IncomingMessage](https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_class_http_incomingmessage) object
* `[RES]`: NodeJS native [ServerResponse](https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_class_http_serverresponse) object
* `[METHOD]`: HTTP method e.g. `'GET'`, `'POST'`
* `[URL]`: Request URL (not including protocol, host, or port) e.g. `'/abc/def?foo=bar'`
* `[URL_OBJ]`: Parsed [URL](https://nodejs.org/api/url.html#url_class_url) object
* `[PATH]`: Request path (not including query string) e.g. `'/abc/def'`
* `[QUERY_STR]`: Request query string e.g. `'?foo=bar'`
* `[QUERY]`: Query object e.g. `{ foo: 'bar' }`

All the above symbols (`[REQ]` etc) are exported as properties of this plugin. `[REQ_TYPE]` and `[PATH]` are re-exported from [@overlook/plugin-request](https://www.npmjs.com/package/@overlook/plugin-request).

Typically, you'd use something like [@overlook/plugin-path](https://www.npmjs.com/package/@overlook/plugin-path) to handle requests, but you can write your own handler too.

Request body, auth and cookies are not parsed - you need to parse them yourself from `[REQ]`, or use plugins to do this.

```js
const Route = require('@overlook/route');
const httpPlugin = require('@overlook/plugin-serve-http');
const { PORT, METHOD, URL, RES } = httpPlugin;

const HttpRoute = Route.extend( httpPlugin );

class MyHttpRoute extends HttpRoute {
  async handle( req ) {
    // Delegate to superior handlers
    // NB No `await` here
    const result = super.handle( req );
    if ( result != null ) return result;

    // Some async processing
    const responseBody = await Promise.resolve(
      `Serving ${req[METHOD]} ${req[URL]}`
    );

    // Send response
    const res = req[RES];
    res.end( responseBody );
  }
}

const router = new MyHttpRoute( {
  PORT: 3000
} );
```

### Multiple servers

Servers can be attached to any route in the router tree, not just the root.

However, to ensure `[START]` and `[STOP]` calls are propogated through the router tree to reach these routes, make sure the root route and all intermediary routes use the [@overlook/plugin-start](https://www.npmjs.com/package/@overlook/plugin-start) plugin.

## Versioning

This module follows [semver](https://semver.org/). Breaking changes will only be made in major version updates.

All active NodeJS release lines are supported (v10+ at time of writing). After a release line of NodeJS reaches end of life according to [Node's LTS schedule](https://nodejs.org/en/about/releases/), support for that version of Node may be dropped at any time, and this will not be considered a breaking change. Dropping support for a Node version will be made in a minor version update (e.g. 1.2.0 to 1.3.0). If you are using a Node version which is approaching end of life, pin your dependency of this module to patch updates only using tilde (`~`) e.g. `~1.2.3` to avoid breakages.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

## Changelog

See [changelog.md](https://github.com/overlookjs/plugin-serve-http/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookjs/plugin-serve-http/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add tests for new features
* document new functionality/API additions in README
* do not add an entry to Changelog (Changelog is created when cutting releases)
