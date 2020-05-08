/* --------------------
 * @overlook/plugin-serve-http module
 * Tests
 * ------------------*/

/* eslint-disable jest/no-standalone-expect */

'use strict';

// Modules
const http = require('http'),
	Route = require('@overlook/route'),
	Plugin = require('@overlook/plugin'),
	startPlugin = require('@overlook/plugin-start'),
	{START, STOP, START_ROUTE, STOP_ROUTE} = startPlugin,
	{REQ_TYPE, PATH} = require('@overlook/plugin-request'),
	axios = require('axios'),
	serveHttpPlugin = require('@overlook/plugin-serve-http');

const {
	SERVER, PORT, GET_PORT, REQ, RES, METHOD, URL_STR, URL_OBJ, QUERY_STR, QUERY
} = serveHttpPlugin;

// Imports
const {tick, defer, spy, promiseSpy, waitFor} = require('./support/utils.js');

// Init
require('./support/index.js');

// Constants
const TEST_PORT = 5000;

// Tests

describe('plugin', () => {
	it('is a Plugin', () => {
		expect(serveHttpPlugin).toBeInstanceOf(Plugin);
	});

	describe('exposes symbols', () => {
		it.each([
			'SERVER', 'PORT', 'GET_PORT',
			'REQ', 'RES', 'METHOD', 'URL', 'URL_OBJ', 'QUERY_STR', 'QUERY',
			'SOCKETS', 'IS_IDLE', 'IS_STOPPING'
		])('%s', (name) => {
			expect(typeof serveHttpPlugin[name]).toBe('symbol');
		});

		it('URL_STR (alias of URL)', () => { // eslint-disable-line jest/lowercase-name
			expect(typeof serveHttpPlugin.URL_STR).toBe('symbol');
			expect(serveHttpPlugin.URL_STR).toBe(serveHttpPlugin.URL);
		});
	});
});

const ServerRoute = Route.extend(serveHttpPlugin);

describe('methods', () => {
	let route;
	beforeEach(() => {
		route = new ServerRoute();
		route.init();
	});

	describe('[START]', () => {
		describe('starts server on port defined by [PORT]', () => {
			beforeEach(async () => {
				route[PORT] = TEST_PORT;
				await route[START]();
			});

			afterEach((done) => {
				route[SERVER].close(done);
			});

			it('records HTTP server as [SERVER]', () => {
				expect(route[SERVER]).toBeInstanceOf(http.Server);
			});

			it('starts server listening', () => {
				expect(route[SERVER].listening).toBeTrue();
			});
		});

		describe('starts server on port defined by [GET_PORT]', () => {
			beforeEach(async () => {
				route[GET_PORT] = () => TEST_PORT;
				await route[START]();
			});

			afterEach((done) => {
				route[SERVER].close(done);
			});

			it('records HTTP server as [SERVER]', () => {
				expect(route[SERVER]).toBeInstanceOf(http.Server);
			});

			it('starts server listening', () => {
				expect(route[SERVER].listening).toBeTrue();
			});
		});

		describe('starts server', () => {
			let promise, child1, child2, deferred1, deferred2;
			beforeEach(async () => {
				route = new ServerRoute({[PORT]: TEST_PORT});

				const StartRoute = Route.extend(startPlugin);

				child1 = new StartRoute();
				deferred1 = defer();
				child1[START_ROUTE] = spy(() => deferred1.promise);
				route.attachChild(child1);

				child2 = new StartRoute();
				deferred2 = defer();
				child2[START_ROUTE] = spy(() => deferred2.promise);
				route.attachChild(child2);

				route.init();
				promise = route[START]();
			});

			afterEach(() => promise);
			afterEach((done) => {
				route[SERVER].close(done);
			});

			it('after all children have started', async () => {
				const resolveSpy = promiseSpy(promise);

				await tick();
				expect(child1[START_ROUTE]).toHaveBeenCalledTimes(1);
				expect(child2[START_ROUTE]).toHaveBeenCalledTimes(1);
				expect(resolveSpy).not.toHaveBeenCalled();
				expect(route[SERVER]).toBeUndefined();

				deferred1.resolve();
				await tick();
				expect(resolveSpy).not.toHaveBeenCalled();
				expect(route[SERVER]).toBeUndefined();

				deferred2.resolve();
				await tick();
				expect(resolveSpy).toHaveBeenCalledTimes(1);
				expect(route[SERVER]).not.toBeUndefined();
			});
		});

		it('errors if [PORT] and [GET_PORT] undefined', async () => {
			await expect(route[START]()).rejects.toThrow('Port must be a number - received null');
		});

		it('errors if port already in use', async () => {
			const otherServer = new http.Server(() => {});
			await new Promise((resolve, reject) => {
				otherServer.once('error', reject);
				otherServer.listen(TEST_PORT, resolve);
			});

			try {
				route[PORT] = TEST_PORT;
				await expect(route[START]()).rejects.toThrow('listen EADDRINUSE: address already in use');
			} finally {
				// Clean up other server
				await new Promise((resolve, reject) => {
					otherServer.close(err => (err ? reject(err) : resolve()));
				});
			}
		});
	});

	describe('routes requests to `.handle()', () => {
		beforeEach(async () => {
			route[PORT] = TEST_PORT;
			route.handle = spy(req => req[RES].end(`serving ${req[URL_STR]}`));
			await route[START]();
		});

		afterEach(async () => {
			await route[STOP]();
		});

		describe('first request', () => {
			let axiosRes;
			beforeEach(async () => {
				// Sanity check
				expect(route.handle).not.toHaveBeenCalled();

				axiosRes = await axios(`http://localhost:${TEST_PORT}/abc/def?x=123&y=456`);
			});

			it('calls .handle()', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
			});

			describe('calls .handle() with request', () => {
				let req;
				beforeEach(() => {
					// Sanity check
					expect(route.handle).toHaveBeenCalledTimes(1);

					const args = route.handle.mock.calls[0];

					// Sanity check
					expect(args).toBeArrayOfSize(1);

					req = args[0];
				});

				it('object', () => {
					expect(req).toBeObject();
				});

				it('with HTTP request as [REQ]', () => {
					expect(req[REQ]).toBeInstanceOf(http.IncomingMessage);
				});

				it('with HTTP response as [RES]', () => {
					expect(req[RES]).toBeInstanceOf(http.ServerResponse);
				});

				it("with 'HTTP' as [REQ_TYPE]", () => {
					expect(req[REQ_TYPE]).toBe('HTTP');
				});

				it('with HTTP method as [METHOD]', () => {
					expect(req[METHOD]).toBe('GET');
				});

				it('with URL as [URL]/[URL_STR]', () => {
					// NB URL_STR is alias of URL (tested for above)
					expect(req[URL_STR]).toBe('/abc/def?x=123&y=456');
				});

				it('with parsed URL object as [URL_OBJ]', () => {
					expect(req[URL_OBJ]).toBeInstanceOf(URL);
					expect(req[URL_OBJ].pathname).toBe('/abc/def');
				});

				it('with path as [PATH]', () => {
					expect(req[PATH]).toBe('/abc/def');
				});

				it('with query string as [QUERY_STR]', () => {
					expect(req[QUERY_STR]).toBe('?x=123&y=456');
				});

				it('with query object as [QUERY]', () => {
					expect(req[QUERY]).toEqual({x: '123', y: '456'});
				});
			});

			it('returns response to client', () => {
				expect(axiosRes.status).toBe(200);
				expect(axiosRes.data).toBe('serving /abc/def?x=123&y=456');
			});
		});

		describe('later requests', () => {
			let axiosRes;
			beforeEach(async () => {
				// Sanity check
				expect(route.handle).not.toHaveBeenCalled();

				await axios(`http://localhost:${TEST_PORT}/abc`);

				// Sanity check
				expect(route.handle).toHaveBeenCalledTimes(1);

				axiosRes = await axios(`http://localhost:${TEST_PORT}/def`);
			});

			it('calls .handle()', () => {
				expect(route.handle).toHaveBeenCalledTimes(2);
			});

			describe('calls .handle() with request', () => {
				let req;
				beforeEach(() => {
					// Sanity check
					expect(route.handle).toHaveBeenCalledTimes(2);

					const args = route.handle.mock.calls[1];

					// Sanity check
					expect(args).toBeArrayOfSize(1);

					req = args[0];
				});

				it('object', () => {
					expect(req).toBeObject();
				});

				it('with HTTP request as [REQ]', () => {
					expect(req[REQ]).toBeInstanceOf(http.IncomingMessage);
				});

				it('with HTTP response as [RES]', () => {
					expect(req[RES]).toBeInstanceOf(http.ServerResponse);
				});

				it("with 'HTTP' as [REQ_TYPE]", () => {
					expect(req[REQ_TYPE]).toBe('HTTP');
				});

				it('with HTTP method as [METHOD]', () => {
					expect(req[METHOD]).toBe('GET');
				});

				it('with URL as [URL]/[URL_STR]', () => {
					// NB URL_STR is alias of URL (tested for above)
					expect(req[URL_STR]).toBe('/def');
				});

				it('with parsed URL object as [URL_OBJ]', () => {
					expect(req[URL_OBJ]).toBeInstanceOf(URL);
					expect(req[URL_OBJ].pathname).toBe('/def');
				});

				it('with path as [PATH]', () => {
					expect(req[PATH]).toBe('/def');
				});

				it('with query string as [QUERY_STR]', () => {
					expect(req[QUERY_STR]).toBe('');
				});

				it('with query object as [QUERY]', () => {
					expect(req[QUERY]).toEqual({});
				});
			});

			it('returns response to client', () => {
				expect(axiosRes.status).toBe(200);
				expect(axiosRes.data).toBe('serving /def');
			});
		});
	});

	describe('[STOP]', () => {
		beforeEach(async () => {
			route[PORT] = TEST_PORT;
		});

		it('stops server listening', async () => {
			await route[START]();
			const server = route[SERVER];
			expect(server.listening).toBeTrue();
			await route[STOP]();
			expect(server.listening).toBeFalse();
		});

		it('prevents server receiving connections', async () => {
			await route[START]();
			await route[STOP]();
			await expect(axios(`http://localhost:${TEST_PORT}/`)).rejects.toThrow('connect ECONNREFUSED');
		});

		it('clears [SERVER]', async () => {
			await route[START]();
			expect(route[SERVER]).not.toBeUndefined();
			await route[STOP]();
			expect(route[SERVER]).toBeUndefined();
		});

		it('stops server before stopping children', async () => {
			route = new ServerRoute();

			const StartRoute = Route.extend(startPlugin);
			const child = new StartRoute();
			child[STOP_ROUTE] = spy();
			route.attachChild(child);

			route[PORT] = TEST_PORT;
			route.init();
			await route[START]();
			const server = route[SERVER];

			expect(server.listening).toBeTrue();
			const promise = route[STOP]();
			expect(server.listening).toBeFalse();

			expect(child[STOP_ROUTE]).not.toHaveBeenCalled();
			await promise;
			expect(child[STOP_ROUTE]).toHaveBeenCalledTimes(1);
		});

		it('waits for in flight request to finish before shutdown', async () => {
			let res;
			route.handle = (req) => { res = req[RES]; };
			await route[START]();
			const server = route[SERVER];

			const axiosPromise = axios(`http://localhost:${TEST_PORT}/`);
			await waitFor(() => res); // Wait for request to hit server

			expect(server.listening).toBeTrue();
			const stopPromise = route[STOP]();
			const stopResolveSpy = promiseSpy(stopPromise);
			expect(server.listening).toBeFalse();

			await tick();
			expect(stopResolveSpy).not.toHaveBeenCalled();

			res.end('Done');
			await tick();
			expect(stopResolveSpy).toHaveBeenCalledTimes(1);

			const axiosRes = await axiosPromise;
			expect(axiosRes.data).toBe('Done');

			await stopPromise;
		});

		it('waits for in flight keep-alive request to finish before shutdown', async () => {
			let res;
			route.handle = (req) => { res = req[RES]; };
			await route[START]();
			const server = route[SERVER];

			const axiosPromise = axios(`http://localhost:${TEST_PORT}/`, {
				httpAgent: new http.Agent({keepAlive: true})
			});
			await waitFor(() => res); // Wait for request to hit server

			expect(server.listening).toBeTrue();
			const stopPromise = route[STOP]();
			const stopResolveSpy = promiseSpy(stopPromise);
			expect(server.listening).toBeFalse();

			await tick();
			expect(stopResolveSpy).not.toHaveBeenCalled();

			res.end('Done');
			await tick();
			expect(stopResolveSpy).toHaveBeenCalledTimes(1);

			const axiosRes = await axiosPromise;
			expect(axiosRes.data).toBe('Done');

			await stopPromise;
		});

		it('terminates idle keep-alive connections', async () => {
			route.handle = req => req[RES].end(`serving ${req[URL_STR]}`);
			await route[START]();

			await axios(`http://localhost:${TEST_PORT}/`, {
				httpAgent: new http.Agent({keepAlive: true})
			});

			await route[STOP]();
			expect(route[SERVER]).toBeUndefined();
		});
	});
});
