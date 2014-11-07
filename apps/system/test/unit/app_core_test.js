/* global MockPromise, BaseModule, MockSIMSlotManager */
'use strict';

require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/system.js');
requireApp('system/js/base_module.js');
requireApp('system/js/app_core.js');

var mocksForAppCore = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/AppCore', function() {
  mocksForAppCore.attachTestHelpers();
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('AppCore', 
      MockNavigatormozApps);
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('init', function() {
    assert.equal(subject.name, 'AppCore');
  });
});
