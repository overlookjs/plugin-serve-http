/* --------------------
 * @overlook/plugin-serve-http
 * Tests set-up
 * ------------------*/

'use strict';

// Modules
const defer = require('p-defer');

// Exports

module.exports = {
	tick,
	defer,
	spy: jest.fn
};

function tick(ms) {
	return new Promise(resolve => setTimeout(resolve, ms || 0));
}
