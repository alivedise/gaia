'use strict';

/* Unit test of browser.js */
requireApp('system/js/browser_element.js');

suite('browser class > ', function() {
	test('Simple browser instance creation..', function() {
		var browserElement = new BrowserElement('unit-test.gaia');
		assert.equal(browserElement.element.getAttribute('mozbrowser'), 'true');
	});
});

