/* --------------------
 * @overlook/plugin-serve-http module
 * ESM entry point
 * Re-export CJS with named exports
 * ------------------*/

// Exports

import serveHttpPlugin from '../lib/index.js';

export default serveHttpPlugin;
export const {
	SERVER,
	PORT,
	GET_PORT,
	REQ,
	RES,
	URL,
	URL_STR,
	URL_OBJ,
	METHOD,
	QUERY_STR,
	QUERY,
	SOCKETS,
	IS_IDLE,
	IS_STOPPING,
	REQ_TYPE,
	PATH
} = serveHttpPlugin;
