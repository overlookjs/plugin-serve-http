/* --------------------
 * @overlook/plugin-serve-http module
 * Tests
 * ESM export
 * ------------------*/

// Modules
import Plugin from '@overlook/plugin';
import serveHttpPlugin, * as namedExports from '@overlook/plugin-serve-http/es';

// Imports
import itExports from './exports.js';

// Tests

describe('ESM export', () => { // eslint-disable-line jest/lowercase-name
	it('default export is an instance of Plugin class', () => {
		expect(serveHttpPlugin).toBeInstanceOf(Plugin);
	});

	describe('default export has properties', () => {
		itExports(serveHttpPlugin);
	});

	describe('named exports', () => {
		itExports(namedExports);
	});
});
