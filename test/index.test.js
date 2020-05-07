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
	axios = require('axios'),
	serveHttpPlugin = require('@overlook/plugin-serve-http');

const {SERVER, PORT, GET_PORT} = serveHttpPlugin;

// Imports
const {tick, defer, spy} = require('./support/utils.js');

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
		it.each(['SERVER', 'PORT', 'GET_PORT'])('%s', (name) => {
			expect(typeof serveHttpPlugin[name]).toBe('symbol');
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
				const resolveSpy = spy();
				promise.then(resolveSpy, resolveSpy);

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
			route.handle = spy(req => req.res.end(`serving ${req.url}`));
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

				axiosRes = await axios(`http://localhost:${TEST_PORT}/abc`);
			});

			it('calls .handle()', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
			});

			it('calls .handle() with req', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
				const args = route.handle.mock.calls[0];
				expect(args).toBeArrayOfSize(1);
				const req = args[0];
				expect(req).toBeInstanceOf(http.IncomingMessage);
			});

			it('calls .handle() with req.method', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
				const req = route.handle.mock.calls[0][0];
				expect(req.method).toBe('GET');
			});

			it('calls .handle() with req.url', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
				const req = route.handle.mock.calls[0][0];
				expect(req.url).toBe('/abc');
			});

			it('calls .handle() with req.res', () => {
				expect(route.handle).toHaveBeenCalledTimes(1);
				const req = route.handle.mock.calls[0][0];
				expect(req.res).toBeInstanceOf(http.ServerResponse);
			});

			it('returns response to client', () => {
				expect(axiosRes.status).toBe(200);
				expect(axiosRes.data).toBe('serving /abc');
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

			it('calls .handle() with req', () => {
				expect(route.handle).toHaveBeenCalledTimes(2);
				const args = route.handle.mock.calls[1];
				expect(args).toBeArrayOfSize(1);
				const req = args[0];
				expect(req).toBeInstanceOf(http.IncomingMessage);
			});

			it('calls .handle() with req.method', () => {
				expect(route.handle).toHaveBeenCalledTimes(2);
				const req = route.handle.mock.calls[1][0];
				expect(req.method).toBe('GET');
			});

			it('calls .handle() with req.url', () => {
				expect(route.handle).toHaveBeenCalledTimes(2);
				const req = route.handle.mock.calls[1][0];
				expect(req.url).toBe('/def');
			});

			it('calls .handle() with req.res', () => {
				expect(route.handle).toHaveBeenCalledTimes(2);
				const req = route.handle.mock.calls[1][0];
				expect(req.res).toBeInstanceOf(http.ServerResponse);
			});

			it('returns response to client', () => {
				expect(axiosRes.status).toBe(200);
				expect(axiosRes.data).toBe('serving /def');
			});
		});
	});

	describe('[STOP]', () => {
		let server;
		beforeEach(async () => {
			route[PORT] = TEST_PORT;
		});

		it('stops server listening', async () => {
			await route[START]();
			server = route[SERVER];
			expect(server.listening).toBeTrue();
			await route[STOP]();
			expect(server.listening).toBeFalse();
		});

		it('prevents server receiving connections', async () => {
			await route[START]();
			server = route[SERVER];
			await route[STOP]();
			await expect(axios(`http://localhost:${TEST_PORT}/`)).rejects.toThrow('connect ECONNREFUSED');
		});

		it('clears [SERVER]', async () => {
			await route[START]();
			server = route[SERVER];
			expect(route[SERVER]).toBe(server);
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
			server = route[SERVER];

			expect(server.listening).toBeTrue();
			const promise = route[STOP]();
			expect(server.listening).toBeFalse();

			expect(child[STOP_ROUTE]).not.toHaveBeenCalled();
			await promise;
			expect(child[STOP_ROUTE]).toHaveBeenCalledTimes(1);
		});
	});
});
