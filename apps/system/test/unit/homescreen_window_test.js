'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'AppWindowManager', 'Applications', 'ManifestHelper',
      'HomescreenWindow', 'AttentionScreen', 'OrientationManager', 'System',
      'AppWindow', 'BrowserFrame', 'BrowserConfigHelper', 'BrowserMixin']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');

var mocksForHomescreenWindow = new MocksHelper([
  'OrientationManager',
  'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'AppWindowManager'
]).init();

suite('system/HomescreenWindow', function() {
  mocksForHomescreenWindow.attachTestHelpers();
  var homescreenWindow;
  var clock, stubById;

  setup(function(done) {
    clock = sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/homescreen_window.js', done);
  });

  teardown(function() {
    clock.restore();
    stubById.restore();
  });

  suite('homescreen window instance.', function() {
    setup(function() {
      MockApplications.mRegisterMockApp({
        manifestURL: 'fakeManifestURL',
        origin: 'fakeOrigin',
        manifest: {

        }
      });

      homescreenWindow = new HomescreenWindow('fakeManifestURL');
      if (!'setVisible' in homescreenWindow.browser.element) {
        homescreenWindow.browser.element.setVisible = function() {};
      }
    });
    teardown(function() {
    });
    test('Homescreen browser frame', function() {
      assert.equal(homescreenWindow.browser.element.name, 'main');
      assert.equal(
        homescreenWindow.browser.element.getAttribute('mozapptype'),
        'homescreen');
    });
    test('homescree is created', function() {
      assert.isTrue(homescreenWindow.isHomescreen);
    });
    suite('homescreen is crashed', function() {
      var stubRender;
      var stubKill;
      setup(function() {
        stubRender = this.sinon.stub(homescreenWindow, 'render');
        stubKill = this.sinon.stub(homescreenWindow, 'kill');
      });

      teardown(function() {
        stubRender.restore();
        stubKill.restore();
      });

      test('Homescreen is crashed at foreground:' +
          'rerender right away.', function() {
        homescreenWindow._visibilityState = 'foreground';
        homescreenWindow.restart();
        assert.isTrue(stubKill.called);
        clock.tick(1);
        assert.isTrue(stubRender.called);
      });

      test('Homescreen is crashed at background: killed', function() {
        homescreenWindow._visibilityState = 'background';
        homescreenWindow.restart();
        assert.isTrue(stubKill.called);
      });
    });
  });
});
