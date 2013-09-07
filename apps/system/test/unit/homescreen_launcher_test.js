'use strict';

mocha.globals(['Applications', 'HomescreenWindow',
              'SettingsListener', 'HomescreenLauncher']);

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('system/HomescreenLauncher', function() {
  var reals = {};
  var homescreen;

  setup(function(done) {
    switchProperty(window, 'Applications', MockApplications, reals);
    switchProperty(window, 'HomescreenWindow', MockHomescreenWindow, reals);
    switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
    MockApplications.ready = true;
    requireApp('system/js/homescreen_launcher.js', done);
  });

  teardown(function() {
    MockSettingsListener.mTeardown();
    MockApplications.mTeardown();
    restoreProperty(window, 'Applications', reals);
    restoreProperty(window, 'HomescreenWindow', reals);
    restoreProperty(window, 'SettingsListener', reals);
  });

  test('init a homescreen', function() {
    var ready = false;
    window.addEventListener('homescreen-ready', function homescreenReady() {
      window.removeEventListener('homescreen-ready', homescreenReady);
      ready = true;
    });
    HomescreenLauncher.init();
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(homescreen.isHomescreen);
    assert.isTrue(ready);
  });

  test('replace the homescreen', function() {
    var changed = false;
    window.addEventListener('homescreen-changed', function homescreenChange() {
      window.removeEventListener('homescreen-changed', homescreenChange);
      changed = true;
    });
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubReconstruct = this.sinon.stub(homescreen, 'reconstruct');
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('second.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(stubReconstruct.calledWith('second.home'));
    assert.isTrue(changed);
    stubReconstruct.restore();
  });

  test('homescreen is the same', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubEnsure = this.sinon.stub(homescreen, 'ensure');
    var stubReconstruct = this.sinon.stub(homescreen, 'reconstruct');
    var changed = false;
    window.addEventListener('homescreen-changed', function homescreenChange2() {
      console.log('roz');
      window.removeEventListener('homescreen-changed', homescreenChange2);
      changed = true;
    });
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(stubEnsure.called);
    assert.isFalse(stubReconstruct.called);
    assert.isFalse(changed);
    stubReconstruct.restore();
    stubEnsure.restore();
  });

  test('homescreen ensure', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubEnsure = this.sinon.stub(homescreen, 'ensure');
    homescreen = HomescreenLauncher.getHomescreen();
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(stubEnsure.calledTwice);
    stubEnsure.restore();
  });
});
