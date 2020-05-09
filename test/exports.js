/* --------------------
 * @overlook/plugin-serve-http module
 * Tests
 * Test function to ensure all exports present
 * ------------------*/

/* eslint-disable jest/no-export */

'use strict';

// Exports

module.exports = function itExports(serveHttpPlugin) {
	describe('symbols', () => {
		it.each([
			'SERVER',
			'PORT',
			'GET_PORT',
			'REQ',
			'RES',
			'URL_STR',
			'URL_OBJ',
			'METHOD',
			'QUERY_STR',
			'QUERY',
			'SOCKETS',
			'IS_IDLE',
			'IS_STOPPING'
		])('%s', (key) => {
			expect(typeof serveHttpPlugin[key]).toBe('symbol');
		});
	});
};
