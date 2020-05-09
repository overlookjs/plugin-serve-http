/* --------------------
 * @overlook/plugin-serve-http module
 * Tests
 * CJS export
 * ------------------*/

'use strict';

// Modules
const Plugin = require('@overlook/plugin'),
	serveHttpPlugin = require('@overlook/plugin-serve-http');

// Imports
const itExports = require('./exports.js');

// Tests

describe('CJS export', () => { // eslint-disable-line jest/lowercase-name
	it('is an instance of Plugin class', () => {
		expect(serveHttpPlugin).toBeInstanceOf(Plugin);
	});

	describe('has properties', () => {
		itExports(serveHttpPlugin);
	});
});
