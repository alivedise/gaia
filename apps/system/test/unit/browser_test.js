'use strict';

/* Unit test of browser.js */
requireApp('system/js/browser.js');

suite('browser class > ', function() {
	test('Simple browser instance creation..', function() {
		var browserElement = new Browser('unit-test.gaia');
		assert.equal(browserElement.element.getAttribute('mozbrowser'), 'true');
	});
});

