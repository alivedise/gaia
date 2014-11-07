/* global AppCore */
'use strict';

(function() {
  var AppCore = function() {};
  AppCore.IMPORTS = [
    'js/app_modal_dialog.js',
    'js/app_chrome.js',
    'js/attention_toaster.js',
    'js/app_transition_controller.js',
    'js/app_authentication_dialog.js',
    'js/browser_mixin.js',
    'js/app_window.js',
    'js/lock_screen_window.js',
    'js/lock_screen_input_window.js',
    'js/secure_window.js',
    'js/attention_window.js',
    'js/callscreen_window.js',
    'js/activity_window.js',
    'js/homescreen_window.js',
    'js/popup_window.js',
    'js/search_window.js',
    'js/browser_context_menu.js',
    'js/child_window_factory.js'
  ];
  AppCore.SUB_MODULES = [
    'Applications',
    'AppWindowManager',
    'HomescreenWindowManager',
    'LockScreenWindowManager',
    'SecureWindowManager',
    'SuspendingAppPriorityManager',
    'AttentionWindowManager',
    'ActivityWindowManager',
    'AppWindowFactory',
    'HomescreenLauncher',
    'HomescreenWindowManager',
    'WrapperFactory',
    'StackManager',
    'SheetsTransition',
    'EdgeSwipeDetector',
    'Browser',
    'Rocketbar',
    'AppInstallManager',
    'TaskManager',
    'Updatable',
    'UpdateManager'
  ];
  BaseModule.create(AppCore, {
    name: 'AppCore',
    DEBUG: true
  });
}());
