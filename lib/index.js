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
	{isInteger} = require('is-it-type');

// Imports
const pkg = require('../package.json');

// Exports

const serveHttpPlugin = new Plugin(
	pkg,
	{
		symbols: [
			'SERVER', 'PORT', 'GET_PORT',
			'REQ', 'RES', 'URL', 'URL_OBJ', 'METHOD', 'QUERY_STR', 'QUERY'
		]
	},
	extend
);

// Alias URL symbol as URL_STR to avoid namespace clash with global `URL` class
serveHttpPlugin.URL_STR = serveHttpPlugin.URL;

module.exports = serveHttpPlugin;

const {
	SERVER, PORT, GET_PORT,
	REQ, RES, URL_STR, URL_OBJ, METHOD, QUERY_STR, QUERY
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
			if (!isInteger(port)) throw new Error(`Port must be a number - received ${port}`);

			// Create server and start listening
			const server = new Server((req, res) => {
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

			this[SERVER] = server;

			await new Promise((resolve, reject) => {
				server.once('error', reject);
				server.listen(port, () => {
					server.off('error', reject);
					resolve();
				});
			});
		}

		/**
		 * Stop server.
		 * Stops server immediately - before stopping children.
		 */
		async [STOP_CHILDREN]() {
			// Stop server
			await new Promise((resolve, reject) => {
				this[SERVER].close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			this[SERVER] = undefined;

			// Delegate to superiors
			await super[STOP_CHILDREN]();
		}

		/**
		 * Get port to start server on.
		 * Intended to be overridden by subclasses.
		 */
		[GET_PORT]() { // eslint-disable-line class-methods-use-this
			return null;
		}
	};
}
