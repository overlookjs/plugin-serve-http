/* --------------------
 * @overlook/plugin-serve-http module
 * Entry point
 * ------------------*/

'use strict';

// Modules
const {Server} = require('http'),
	Plugin = require('@overlook/plugin'),
	{INIT_PROPS} = require('@overlook/route'),
	startPlugin = require('@overlook/plugin-start'),
	{REQ_TYPE, PATH} = require('@overlook/plugin-request'),
	onFinished = require('on-finished'),
	{isPositiveInteger} = require('is-it-type'),
	invariant = require('simple-invariant');

// Imports
const pkg = require('../package.json');

// Exports

const serveHttpPlugin = new Plugin(
	pkg,
	{
		symbols: [
			// Public properties
			'SERVER', 'PORT', 'GET_PORT',
			// Public request properties
			'REQ', 'RES', 'URL', 'URL_OBJ', 'METHOD', 'QUERY_STR', 'QUERY',
			// Private properties
			'SOCKETS', 'IS_IDLE', 'IS_STOPPING'
		]
	},
	extend
);

// Alias URL symbol as URL_STR to avoid namespace clash with global `URL` class
serveHttpPlugin.URL_STR = serveHttpPlugin.URL;

module.exports = serveHttpPlugin;

const {
	SERVER, PORT, GET_PORT,
	REQ, RES, URL_STR, URL_OBJ, METHOD, QUERY_STR, QUERY,
	SOCKETS, IS_IDLE, IS_STOPPING
} = serveHttpPlugin;
const {START_CHILDREN, STOP_CHILDREN} = startPlugin;

function extend(Route) {
	Route = Route.extend(startPlugin);

	return class HttpServerRoute extends Route {
		[INIT_PROPS](props) {
			super[INIT_PROPS](props);
			this[SERVER] = undefined;
			this[PORT] = undefined;
		}

		/**
		 * Start server.
		 * Starts server *after* all children have started.
		 */
		async [START_CHILDREN]() {
			// Delegate to superiors
			await super[START_CHILDREN]();

			// Get port
			let port = this[PORT];
			if (port == null) port = this[GET_PORT]();
			invariant(isPositiveInteger(port), `Port must be a positive integer - received ${port}`);

			// Create server
			const server = new Server();
			this[SERVER] = server;

			// Track sockets in use and whether they are idle or not.
			// This allows shutting down server gracefully without terminating any requests in flight.
			// Tracking whether sockets are idle or not is required
			// to avoid hanging during shutdown if keep-alive connections are present.
			// Keep-alive connections can be safely closed
			const sockets = new Set();
			server[SOCKETS] = sockets;
			server[IS_STOPPING] = false;

			server.on('connection', (socket) => {
				socket[IS_IDLE] = true;
				sockets.add(socket);

				socket.on('close', () => {
					sockets.delete(socket);
				});
			});

			server.on('request', (req, res) => {
				// Track socket state.
				// If shutdown in progress, close socket when request completes.
				const {socket} = req;
				socket[IS_IDLE] = false;

				onFinished(res, () => {
					socket[IS_IDLE] = true;
					if (server[IS_STOPPING]) {
						socket.destroy();
						sockets.delete(socket);
					}
				});

				// Handle request
				// Reference req and res on each other
				req.res = res;
				res.req = req;

				// Parse URL
				const urlStr = req.url;
				let {host} = req.headers;
				if (!host) host = port === 80 ? 'localhost' : `localhost:${port}`;
				const urlObj = new URL(urlStr, `http://${host}/`);

				const query = {};
				for (const [key, value] of urlObj.searchParams) {
					query[key] = value;
				}

				// Construct Overlook request object
				const request = {
					[REQ_TYPE]: 'HTTP',
					[REQ]: req,
					[RES]: res,
					[METHOD]: req.method,
					[URL_STR]: urlStr,
					[URL_OBJ]: urlObj,
					[PATH]: urlObj.pathname,
					[QUERY_STR]: urlObj.search,
					[QUERY]: query
				};

				// Pass request to handle method
				this.handle(request);
			});

			// Start server listening
			await new Promise((resolve, reject) => {
				server.once('error', reject);
				server.listen(port, () => {
					server.off('error', reject);
					resolve();
				});
			});
		}

		/**
		 * Stop server gracefully.
		 * Stops server receiving new connections immediately and closes any idle connections.
		 * Any active connections (i.e. request in flight) are closed once the request has finished.
		 * Stops server before stopping children.
		 */
		async [STOP_CHILDREN]() {
			// Flag server as stopping.
			// Any requests in flight will close their sockets when they finish.
			const server = this[SERVER];
			server[IS_STOPPING] = true;

			// Close idle sockets
			const sockets = server[SOCKETS];
			for (const socket of sockets) {
				if (socket[IS_IDLE]) {
					socket.destroy();
					sockets.delete(socket);
				}
			}

			// Close server.
			// Promise will resolve when all sockets closed.
			await new Promise((resolve, reject) => {
				server.close(err => (err ? reject(err) : resolve()));
			});

			// Remove reference to server
			this[SERVER] = undefined;

			// Delegate to superiors
			await super[STOP_CHILDREN]();
		}

		/**
		 * Get port to start server on.
		 * Intended to be overridden by subclasses.
		 */
		[GET_PORT]() { // eslint-disable-line class-methods-use-this
			return undefined;
		}
	};
}
