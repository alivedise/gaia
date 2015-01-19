/* global BaseModule */
'use strict';

window.addEventListener('load', function startup() {
  window.performance.mark('loadEnd');
  window.settingsCore = BaseModule.instantiate('SettingsCore');
  window.settingsCore.start();
  window.launcher = BaseModule.instantiate('Launcher');
  window.launcher.ready().then(function() {
    window.core = BaseModule.instantiate('Core');
    window.core && window.core.start();
  });
});
