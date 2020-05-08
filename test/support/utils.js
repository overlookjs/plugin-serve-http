/* --------------------
 * @overlook/plugin-serve-http
 * Tests set-up
 * ------------------*/

'use strict';

// Modules
const defer = require('p-defer');

// Exports

const spy = jest.fn;

module.exports = {
	tick,
	defer,
	spy,
	promiseSpy,
	waitFor
};

function tick(ms) {
	return new Promise(resolve => setTimeout(resolve, ms || 0));
}

// Return spy which is called when promise resolves/rejects
function promiseSpy(promise) {
	const resolveSpy = spy();
	promise.then(resolveSpy, resolveSpy);
	return resolveSpy;
}

// Wait until `fn()` returns true
async function waitFor(fn) {
	while (!fn()) {
		await tick();
	}
}
