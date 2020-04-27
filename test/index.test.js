/* --------------------
 * @overlook/plugin-serve-http module
 * Tests
 * ------------------*/

'use strict';

// Modules
const serveHttpPlugin = require('@overlook/plugin-serve-http');

// Init
require('./support/index.js');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(serveHttpPlugin).not.toBeUndefined();
	});
});
