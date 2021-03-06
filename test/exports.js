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
			'URL',
			'URL_OBJ',
			'METHOD',
			'QUERY_STR',
			'QUERY',
			'SOCKETS',
			'IS_IDLE',
			'IS_STOPPING',
			// From @overlook/plugin-start
			'START',
			'START_ROUTE',
			'START_CHILDREN',
			'STOP',
			'STOP_ROUTE',
			'STOP_CHILDREN',
			'START_STATE',
			// From @overlook/plugin-request
			'REQ_TYPE',
			'PATH'
		])('%s', (key) => {
			expect(typeof serveHttpPlugin[key]).toBe('symbol');
		});

		it('URL_STR (alias of URL)', () => { // eslint-disable-line jest/lowercase-name
			expect(typeof serveHttpPlugin.URL_STR).toBe('symbol');
			expect(serveHttpPlugin.URL_STR).toBe(serveHttpPlugin.URL);
		});
	});
};
