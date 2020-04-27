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
	{isInteger} = require('is-it-type');

// Imports
const pkg = require('../package.json');

// Exports

const serveHttpPlugin = new Plugin(
	pkg,
	{symbols: ['SERVER', 'PORT', 'GET_PORT']},
	extend
);

module.exports = serveHttpPlugin;

const {SERVER, PORT, GET_PORT} = serveHttpPlugin,
	{START_ROUTE, STOP_ROUTE} = startPlugin;

function extend(Route) {
	Route = Route.extend(startPlugin);

	return class HttpServerRoute extends Route {
		[INIT_PROPS](props) {
			super[INIT_PROPS](props);
			this[SERVER] = undefined;
			this[PORT] = undefined;
		}

		/**
		 * Start server
		 */
		async [START_ROUTE]() {
			// Delegate to superiors
			await super[START_ROUTE]();

			// Get port
			let port = this[PORT];
			if (port == null) port = this[GET_PORT]();
			if (!isInteger(port)) throw new Error(`Port must be a number - received ${port}`);

			// Create server and start listening
			const server = new Server((req, res) => {
				req.res = res;
				this.handle(req);
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
		 * Stop server
		 */
		async [STOP_ROUTE]() {
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
			await super[STOP_ROUTE]();
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
