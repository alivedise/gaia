'use strict';

/* globals MockNavigatorMozMobileConnections, Service */

requireApp('system/js/update_manager.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_updatable.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/shared/test/unit/mocks/mock_custom_dialog.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/service.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_wake_lock.js');
require(
  '/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_l10n.js');

requireApp('system/test/unit/mock_asyncStorage.js');
require('/test/unit/mock_update_manager.js');

var mocksForUpdateManager = new MocksHelper([
  'SystemBanner',
  'NotificationScreen',
  'UtilityTray',
  'CustomDialog',
  'SystemUpdatable',
  'AppUpdatable',
  'SettingsListener',
  'asyncStorage'
]).init();

suite('system/UpdateManager', function() {
  var realL10n;
  var realWifiManager;
  var realRequestWakeLock;
  var realNavigatorSettings;
  var realDispatchEvent;
  var realMozMobileConnections;

  var apps;
  var updatableApps;
  var uAppWithDownloadAvailable;
  var appWithDownloadAvailable;
  var fakeNode;
  var fakeToaster;
  var fakeDialog;
  var fakeWarning;

  var TINY_TIMEOUT = 10;
  var lastDispatchedEvent = null;

  var MOBILE_CONNECTION_COUNT = 2;

  mocksForUpdateManager.attachTestHelpers();
  suiteSetup(function() {
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = {
      connection: {
        status: 'connected'
      }
    };

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    for (var i = 0; i < MOBILE_CONNECTION_COUNT; i++) {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      MockNavigatorMozMobileConnections[i].data = {
        connected: !i,
        type: (!i ? 'evdo0' : undefined),
        roaming: (!i ? true : undefined)
      };
    }

    realRequestWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realDispatchEvent = UpdateManager._dispatchEvent;
    UpdateManager._dispatchEvent = function fakeDispatch(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    navigator.mozL10n = realL10n;
    navigator.mozWifiManager = realWifiManager;
    navigator.requestWakeLock = realRequestWakeLock;
    realRequestWakeLock = null;

    MockNavigatorMozMobileConnections.mTeardown();
    navigator.mozMobileConnections = realMozMobileConnections;

    UpdateManager._dispatchEvent = realDispatchEvent;
  });

  setup(function() {
    this.sinon.stub(Service, 'request', function(action) {
      if (action === 'showCustomDialog') {
        MockCustomDialog.show(arguments[1],
          arguments[2], arguments[3], arguments[4]);
      } else {
        MockCustomDialog.hide(arguments[1],
          arguments[2], arguments[3], arguments[4]);
      }
    });
    // they are automatically restored at teardown by the test agent
    this.sinon.useFakeTimers();

    UpdateManager._mgmt = MockAppsMgmt;

    apps = [new MockApp(), new MockApp(), new MockApp()];
    updatableApps = apps.map(function(app) {
      return new AppUpdatable(app);
    });
    MockAppsMgmt.mApps = apps;

    uAppWithDownloadAvailable = updatableApps[2];
    appWithDownloadAvailable = apps[2];
    appWithDownloadAvailable.downloadAvailable = true;

    fakeNode = document.createElement('div');
    fakeNode.id = 'update-manager-container';
    fakeNode.innerHTML = [
      '<div data-icon="download-circle"></div>',
      '<div class="title-container"></div>',
      '<progress></progress>'
    ].join('');

    fakeToaster = document.createElement('div');
    fakeToaster.id = 'update-manager-toaster';
    fakeToaster.innerHTML = [
      '<div class="icon">',
      '</div>',
      '<div class="message">',
      '</div>'
    ].join('');

    fakeDialog = document.createElement('form');
    fakeDialog.id = 'updates-download-dialog';
    fakeDialog.innerHTML = [
      '<section>',
        '<h1>',
          'Updates',
        '</h1>',
        '<ul>',
        '</ul>',
        '<menu>',
          '<button id="updates-later-button" type="reset">',
            'Later',
          '</button>',
          '<button id="updates-download-button" type="submit">',
            'Download',
          '</button>',
        '</menu>',
      '</section>'
    ].join('');

    fakeWarning = document.createElement('form');
    fakeWarning.id = 'updates-viaDataConnection-dialog';
    fakeWarning.innerHTML = [
      '<section>',
        '<h1>',
          'Updates',
        '</h1>',
        '<p>',
        '</p>',
        '<menu>',
          '<button id="updates-viaDataConnection-notnow-button" type="reset">',
            'Not Now',
          '</button>',
          '<button id="updates-viaDataConnection-download-button" ',
              'type="submit">',
            'Download',
          '</button>',
        '</menu>',
      '</section>'
    ].join('');

    document.body.appendChild(fakeNode);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeDialog);
    document.body.appendChild(fakeWarning);
  });

  teardown(function() {
    UpdateManager.updatableApps = [];
    UpdateManager.systemUpdatable = null;
    UpdateManager.updatesQueue = [];
    UpdateManager.downloadsQueue = [];
    UpdateManager._downloading = false;
    UpdateManager._uncompressing = false;
    UpdateManager.container = null;
    UpdateManager.message = null;
    UpdateManager.toaster = null;
    UpdateManager.toasterMessage = null;
    UpdateManager.laterButton = null;
    UpdateManager.downloadButton = null;
    UpdateManager.downloadDialog = null;
    UpdateManager.downloadDialogTitle = null;
    UpdateManager.downloadDialogList = null;
    UpdateManager.lastUpdatesAvailable = 0;
    UpdateManager._notificationTimeout = null;
    UpdateManager._errorTimeout = null;

    MockAppsMgmt.mTeardown();

    fakeNode.parentNode.removeChild(fakeNode);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeDialog.parentNode.removeChild(fakeDialog);

    lastDispatchedEvent = null;
    MockNavigatorWakeLock.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('init', function() {
    test('should get all applications', function() {
      this.sinon.stub(MockAppsMgmt, 'getAll').returns({});
      UpdateManager.init();
      sinon.assert.called(MockAppsMgmt.getAll);
    });

    test('should create AppUpdatable on init', function() {
      MockAppUpdatable.mTeardown();

      var request = {};
      this.sinon.stub(MockAppsMgmt, 'getAll').returns(request);

      UpdateManager.init();
      assert.isFunction(request.onsuccess);
      request.onsuccess({
        target: {
          result: apps
        }
      });
      assert.equal(MockAppUpdatable.mCount, apps.length);
    });

    test('should bind dom elements', function() {
      UpdateManager.init();
      assert.equal('update-manager-container', UpdateManager.container.id);
      assert.equal('title-container', UpdateManager.message.className);

      assert.equal('update-manager-toaster', UpdateManager.toaster.id);
      assert.equal('message', UpdateManager.toasterMessage.className);

      assert.equal('updates-later-button', UpdateManager.laterButton.id);
      assert.equal('updates-download-button', UpdateManager.downloadButton.id);
      assert.equal('updates-download-dialog', UpdateManager.downloadDialog.id);
      assert.equal('updates-viaDataConnection-dialog',
        UpdateManager.downloadViaDataConnectionDialog.id);
      assert.equal('updates-viaDataConnection-notnow-button',
        UpdateManager.notnowButton.id);
      assert.equal('updates-viaDataConnection-download-button',
        UpdateManager.downloadViaDataConnectionButton.id);
      assert.equal('H1', UpdateManager.downloadDialogTitle.tagName);
      assert.equal('UL', UpdateManager.downloadDialogList.tagName);
    });

    test('should bind to the click event', function() {
      UpdateManager.init();
      assert.equal(UpdateManager.containerClicked.name,
                   UpdateManager.container.onclick.name);

      assert.equal(UpdateManager.requestDownloads.name,
                   UpdateManager.downloadButton.onclick.name);

      assert.equal(UpdateManager.cancelPrompt.name,
                   UpdateManager.laterButton.onclick.name);

      assert.equal(UpdateManager.cancelDataConnectionUpdatesPrompt.name,
                  UpdateManager.notnowButton.onclick.name);

      assert.equal(UpdateManager.requestDownloads.name,
                   UpdateManager.downloadViaDataConnectionButton.onclick.name);
    });
  });

  suite('events', function() {
    suite('app install', function() {
      var installedApp;

      setup(function() {
        MockAppUpdatable.mTeardown();
        MockAppsMgmt.mApps = [];
        UpdateManager.init();

        installedApp = new MockApp();
        installedApp.downloadAvailable = true;
        MockAppsMgmt.mTriggerOninstall(installedApp);
      });

      test('should instantiate an updatable app', function() {
        assert.equal(MockAppUpdatable.mCount, 1);
      });
    });

    suite('app uninstall', function() {
      var partialApp;

      setup(function() {
        UpdateManager.init();
        UpdateManager.updatableApps = updatableApps;
        UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);

        partialApp = {
          origin: appWithDownloadAvailable.origin,
          manifestURL: appWithDownloadAvailable.manifestURL
        };
      });

      test('should remove the updatable app', function() {
        var initialLength = UpdateManager.updatableApps.length;
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.equal(initialLength - 1, UpdateManager.updatableApps.length);
      });

      test('should remove from the update queue', function() {
        var initialLength = UpdateManager.updatesQueue.length;
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
      });

      test('should remove from the update queue even if no downloadavailable',
      function() {
        uAppWithDownloadAvailable.app.downloadAvailable = false;
        var initialLength = UpdateManager.updatesQueue.length;
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
      });

      test('should call uninit on the updatable', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        var updatableApp = UpdateManager.updatesQueue[lastIndex];
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.isTrue(updatableApp.mUninitCalled);
      });
    });

    suite('system update available', function() {
      var event;

      setup(function() {
        UpdateManager.init();
        event = new MockChromeEvent({
          type: 'update-available',
          size: 42
        });
        UpdateManager.handleEvent(event);
      });

      test('should add a system updatable to the updates', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        assert.equal(undefined, UpdateManager.updatesQueue[lastIndex].app);
      });

      test('should init the updatable with the download size', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        assert.equal(42, UpdateManager.updatesQueue[lastIndex].size);
      });

      test('should not add or instanciate a system updatable if there is one',
      function() {
        var initialLength = UpdateManager.updatesQueue.length;

        UpdateManager.handleEvent(event);

        assert.equal(UpdateManager.updatesQueue.length, initialLength);
        assert.equal(MockSystemUpdatable.mInstancesCount, 1);
      });

      test('should remember that update is available', function() {
        assert.isTrue(UpdateManager.systemUpdatable.mKnownUpdate);
      });
    });

    suite('no system update available', function() {
      setup(function() {
        UpdateManager.init();
      });

      test('should not remember about the update', function() {
          assert.isUndefined(UpdateManager.systemUpdatable.mKnownUpdate);
      });
    });

    suite('device locked', function() {
      setup(function() {
        UpdateManager.init();
      });

      test('should close all dialogs', function() {
        UpdateManager.showDownloadPrompt();
        window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
        assert.isFalse(UpdateManager.downloadDialog.
          classList.contains('visible'));
        assert.isFalse(UpdateManager.downloadViaDataConnectionDialog.
          classList.contains('visible'));
        assert.isFalse(MockCustomDialog.mShown);
      });

      var testCases = [
        {
          title: 'should dispatchEvent updatepromptshown, showDownloadPrompt',
          eventType: 'updatepromptshown',
          method: 'showDownloadPrompt'
        },
        {
          title: 'should dispatchEvent updatepromptshown,' +
            'showPromptWifiPrioritized',
          eventType: 'updatepromptshown',
          method: 'showPromptWifiPrioritized'
        },
        {
          title: 'should dispatchEvent updatepromptshown,' +
            'showForbiddenDownload',
          eventType: 'updatepromptshown',
          method: 'showForbiddenDownload'
        },
        {
          title: 'should dispatchEvent updatepromptshown,' +
            'showPromptNoConnection',
          eventType: 'updatepromptshown',
          method: 'showPromptNoConnection'
        },
        {
          title: 'should dispatchEvent updateprompthidden,' +
            ' cancelPrompt',
          eventType: 'updateprompthidden',
          method: 'cancelPrompt'
        }
      ];

      testCases.forEach(function(testCase) {
        test(testCase.title, function(done) {
          window.addEventListener(testCase.eventType, function listener(evt) {
            window.removeEventListener(testCase.eventType, listener);
            assert.equal(testCase.eventType, evt.type);
            done();
          });

          switch (testCase.method) {
            case 'showDownloadPrompt':
              UpdateManager.showDownloadPrompt();
              break;
            case 'showPromptWifiPrioritized':
              UpdateManager.showPromptWifiPrioritized();
              break;
            case 'showForbiddenDownload':
              UpdateManager.showForbiddenDownload();
              break;
            case 'showPromptNoConnection':
              UpdateManager.showPromptNoConnection();
              break;
            case 'cancelPrompt':
              UpdateManager.cancelPrompt();
              break;
          }
        });
      });
    });
  });

  suite('UI', function() {
    setup(function() {

      MockAppsMgmt.mApps = [];
      UpdateManager.init();
      UpdateManager.updatableApps = updatableApps;
    });

    teardown(function() {
    });

    suite('downloading state', function() {
      test('should add the css class if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();
        var css = UpdateManager.container.classList;
        assert.isTrue(css.contains('downloading'));
      });

      test('should remove the css class if not downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();

        UpdateManager._downloading = false;
        UpdateManager.render();
        var css = UpdateManager.container.classList;
        assert.isFalse(css.contains('downloading'));
      });

      test('should show the downloading progress if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();

        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'downloadingUpdateMessage');
        assert.deepEqual(l10nAttrs.args, { progress: '0.00 bytes' });
      });

      suite('if downloading', function() {
        setup(function() {
          UpdateManager._downloading = true;
          UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);

          this.sinon.clock.tick(UpdateManager.TOASTER_TIMEOUT);
        });

        test('should not show the toaster', function() {
          var css = UpdateManager.toaster.classList;
          assert.isFalse(css.contains('displayed'));
        });
      });

      test('should show the available message if not downloading', function() {
        UpdateManager.updatesQueue = updatableApps;
        UpdateManager.render();

        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'updateAvailableInfo');
        assert.deepEqual(l10nAttrs.args, { n: 3 });
      });
    });

    suite('progress display', function() {
      setup(function() {
        UpdateManager.updatesQueue = [uAppWithDownloadAvailable];

        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        UpdateManager.startDownloads(evt);

        UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);

        UpdateManager.downloadProgressed(1234);
      });

      test('downloadedBytes should be reset by startDownloads', function() {
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        UpdateManager.startDownloads(evt);

        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'downloadingUpdateMessage');
        assert.deepEqual(l10nAttrs.args, { progress: '0.00 bytes' });
      });

      test('downloadedBytes should be reset when stopping the download',
      function() {

        UpdateManager.removeFromDownloadsQueue(uAppWithDownloadAvailable);
        UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);

        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'downloadingUpdateMessage');
        assert.deepEqual(l10nAttrs.args, { progress: '0.00 bytes' });
      });

      test('should increment the downloadedBytes', function() {
        UpdateManager.downloadProgressed(100);
        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'downloadingUpdateMessage');
        assert.deepEqual(l10nAttrs.args, { progress: '1.30 kB' });
      });

      test('should not update if bytes <= 0', function() {
        UpdateManager.downloadProgressed(-100);
        var l10nAttrs = MockL10n.getAttributes(UpdateManager.message);

        assert.equal(l10nAttrs.id, 'downloadingUpdateMessage');
        assert.deepEqual(l10nAttrs.args, { progress: '1.21 kB' });
      });

      test('should display the notification', function() {
        assert.isTrue(fakeNode.classList.contains('displayed'));
      });
    });

    suite('uncompress display', function() {
      var systemUpdatable;

      setup(function() {
        systemUpdatable = new MockSystemUpdatable();
      });

      suite('when we only have the system update', function() {
        setup(function() {
          UpdateManager.addToUpdatesQueue(systemUpdatable);
          UpdateManager.addToDownloadsQueue(systemUpdatable);
          UpdateManager.startedUncompressing();
        });

        test('should render in uncompressing mode', function() {
          assert.equal(UpdateManager.message.getAttribute('data-l10n-id'),
                       'uncompressingMessage');
        });
      });

      suite('when we have various ongoing updates', function() {
        setup(function() {
          UpdateManager.addToUpdatableApps(uAppWithDownloadAvailable);
          UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);
          UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);

          UpdateManager.addToUpdatesQueue(systemUpdatable);
          UpdateManager.addToDownloadsQueue(systemUpdatable);

          UpdateManager.startedUncompressing();
        });

        test('should stay in downloading mode', function() {
          assert.include(UpdateManager.message.getAttribute('data-l10n-id'),
                          'downloadingUpdateMessage');
        });

        suite('once the app updates are done', function() {
          setup(function() {
            UpdateManager.removeFromDownloadsQueue(uAppWithDownloadAvailable);
            UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
          });

          test('should render in uncompressing mode', function() {
            assert.equal(UpdateManager.message.getAttribute('data-l10n-id'),
                         'uncompressingMessage');
          });
        });
      });
    });

    suite('container visibility', function() {
      setup(function() {
        UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);
      });

      suite('notification behavior after addToDownloadsQueue', function() {
        setup(function() {
          var css = UpdateManager.container.classList;
          UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);
        });

        test('should be displayed only once', function() {
          var css = UpdateManager.container.classList;
          assert.isTrue(css.contains('displayed'));
          assert.equal(
            MockNotificationScreen.wasMethodCalled['addUnreadNotification'],
            1);
        });

        test('should not be displayed again after timeout', function() {
          this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

          var css = UpdateManager.container.classList;
          assert.isTrue(css.contains('displayed'));
          assert.equal(
            MockNotificationScreen
              .wasMethodCalled['addUnreadNotification'],
            1);
        });
      });

      suite('notification behavior after addToDownloadsQueue after timeout',
        function() {
        // context is: uAppWithDownloadAvailable was added to updates queue
          setup(function() {
            this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

            UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);
          });

        test('should not increment the counter if already displayed',
          function() {
            var css = UpdateManager.container.classList;
            assert.isTrue(css.contains('displayed'));
            assert.equal(
              MockNotificationScreen
                .wasMethodCalled['addUnreadNotification'],
              1);
          });
        });

      suite('displaying the container after a timeout', function() {
        // context is: uAppWithDownloadAvailable was added to updates queue
        setup(function() {
          var css = UpdateManager.container.classList;
          assert.isFalse(css.contains('displayed'));
        });

        test('should display after a timeout', function() {
          this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

          var css = UpdateManager.container.classList;
          assert.isTrue(css.contains('displayed'));
          assert.equal(
            MockNotificationScreen
              .wasMethodCalled['addUnreadNotification'],
            1);
        });

        test('should not display if there are no more updates', function() {
          UpdateManager.updatesQueue.forEach(function(uApp) {
            UpdateManager.removeFromUpdatesQueue(uApp);
          });

          this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

          var css = UpdateManager.container.classList;
          assert.isFalse(css.contains('displayed'));
        });

        test('should display an updated count', function() {
          UpdateManager.addToUpdatesQueue(updatableApps[1]);

          this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

          var l10nAttrs = MockL10n.getAttributes(
            UpdateManager.message);

          assert.equal(l10nAttrs.id, 'updateAvailableInfo');
          assert.deepEqual(l10nAttrs.args, { n: 2 });
        });

        suite('update toaster', function() {
          test('should display after a timeout', function() {
            var css = UpdateManager.container.classList;
            assert.isFalse(css.contains('displayed'));

            this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

            var css = UpdateManager.toaster.classList;
            assert.isTrue(css.contains('displayed'));
            var l10nAttrs = MockL10n.getAttributes(
              UpdateManager.toasterMessage);

            assert.equal(l10nAttrs.id, 'updateAvailableInfo');
            assert.deepEqual(l10nAttrs.args, { n: 1 });
          });

          test('should reset toaster value when notification was activated',
          function() {
            this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            var l10nAttrs = MockL10n.getAttributes(
              UpdateManager.toasterMessage);

            assert.equal(l10nAttrs.id, 'updateAvailableInfo');
            assert.deepEqual(l10nAttrs.args, { n: 1 });
          });

          test('should show the right message', function() {
            this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

            var l10nAttrs = MockL10n.getAttributes(
              UpdateManager.toasterMessage);

            assert.equal(l10nAttrs.id, 'updateAvailableInfo');
            assert.deepEqual(l10nAttrs.args, { n: 1 });
          });


          test('should hide after TOASTER_TIMEOUT', function() {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);

            this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);
            this.sinon.clock.tick(UpdateManager.TOASTER_TIMEOUT);

            var css = UpdateManager.toaster.classList;
            assert.isFalse(css.contains('displayed'));
          });

        });

        test('should add a new statusbar notification', function() {
          this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);
          var method1 = 'addUnreadNotification';
          assert.ok(MockNotificationScreen.wasMethodCalled[method1]);
        });
      });

      suite('no more updates', function() {
        setup(function() {
          UpdateManager.container.classList.add('displayed');
          UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
          UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
        });

        test('should hide the container', function() {
          var css = UpdateManager.container.classList;
          assert.isFalse(css.contains('displayed'));
        });

        test('should decrease the external notifications count', function() {
          var method1 = 'removeUnreadNotification';
          assert.ok(MockNotificationScreen.wasMethodCalled[method1]);
        });
      });
    });

    suite('after downloads', function() {
      test('should check if new updates where found', function() {
        var uApp = updatableApps[0];

        UpdateManager.updatableApps = updatableApps;
        UpdateManager.downloadsQueue = [uApp];

        UpdateManager.removeFromDownloadsQueue(uApp);
        assert.equal(uAppWithDownloadAvailable.app.mId,
                     UpdateManager.updatesQueue[0].app.mId);
      });
    });

    suite('error banner requests', function() {
      setup(function() {
        UpdateManager.init();
        UpdateManager.requestErrorBanner();
      });

      test('should wait before showing the system banner', function() {
        assert.equal(0, MockSystemBanner.mShowCount);
      });

      test('should show after NOTIFICATION_BUFFERING_TIMEOUT', function() {
        this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

        assert.equal(1, MockSystemBanner.mShowCount);
        assert.equal('downloadError', MockSystemBanner.mMessage);
      });

      test('should show only once if called multiple time', function() {
        UpdateManager.requestErrorBanner();

        this.sinon.clock.tick(UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT);

        assert.equal(1, MockSystemBanner.mShowCount);
      });
    });

    suite('humanizeSize', function() {
      test('should handle 0', function() {
        assert.equal('0.00 bytes', UpdateManager._humanizeSize(0));
      });

      test('should handle bytes size', function() {
        assert.equal('42.00 bytes', UpdateManager._humanizeSize(42));
      });

      test('should handle kilobytes size', function() {
        assert.equal('1.00 kB', UpdateManager._humanizeSize(1024));
      });

      test('should handle megabytes size', function() {
        assert.equal('4.67 MB', UpdateManager._humanizeSize(4901024));
      });

      test('should handle gigabytes size', function() {
        assert.equal('3.73 GB', UpdateManager._humanizeSize(4000901024));
      });
    });
  });

  suite('actions', function() {
    setup(function() {
      UpdateManager.init();
    });

    suite('start downloads', function() {
      var systemUpdatable, appUpdatable, evt;

      setup(function() {
        systemUpdatable = new MockSystemUpdatable();

        appUpdatable = new MockAppUpdatable(new MockApp());
        appUpdatable.name = 'Angry birds';
        appUpdatable.size = '423459';

        UpdateManager.addToUpdatableApps(appUpdatable);
        UpdateManager.addToUpdatesQueue(appUpdatable);
        UpdateManager.addToUpdatesQueue(systemUpdatable);

        UpdateManager.container.click();

        evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
      });

      suite('data connection warning', function() {
        var downloadDialog;
        setup(function() {
          downloadDialog = UpdateManager.downloadDialog;
        });

        teardown(function() {
          navigator.mozWifiManager.connection.status = 'connected';
        });

        test('should switch the online data attribute when online',
        function() {
          downloadDialog.dataset.online = false;
          window.dispatchEvent(new CustomEvent('online'));
          assert.equal(downloadDialog.dataset.online, 'true');
        });

        test('should leave the online data attribute true when online',
        function() {
          downloadDialog.dataset.online = true;
          window.dispatchEvent(new CustomEvent('online'));
          assert.equal(downloadDialog.dataset.online, 'true');
        });

        test('should switch the nowifi data attribute when connected',
        function() {
          downloadDialog.dataset.nowifi = true;
          window.dispatchEvent(new CustomEvent('wifi-statuschange'));
          assert.equal(downloadDialog.dataset.nowifi, 'false');
        });

        test('should switch the nowifi data attribute when disconnected',
        function() {
          downloadDialog.dataset.nowifi = false;
          navigator.mozWifiManager.connection.status = 'disconnected';
          window.dispatchEvent(new CustomEvent('wifi-statuschange'));
          assert.equal(downloadDialog.dataset.nowifi, 'true');
        });
      });

      test('should enable the download button', function() {
        var downloadButton = UpdateManager.downloadButton;
        assert.isFalse(downloadButton.disabled);
      });

      suite('with all the checkboxes checked', function() {
        setup(function() {
          UpdateManager.startDownloads(evt);
        });

        test('should download system updates', function() {
          assert.isTrue(systemUpdatable.mDownloadCalled);
        });

        test('should call download on checked app updatables', function() {
          assert.isTrue(appUpdatable.mDownloadCalled);
        });
      });

      suite('with no checkbox checked', function() {
        setup(function() {
          var dialog = UpdateManager.downloadDialogList;
          var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
          for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            if (checkbox.checked) {
              checkbox.click();
            }
          }

          UpdateManager.startDownloads(evt);
        });

        test('the download button should be enabled', function() {
          assert.isFalse(UpdateManager.downloadButton.disabled);
        });

        test('should still download system updates', function() {
          assert.isTrue(systemUpdatable.mDownloadCalled);
        });

        test('should not call download on unchecked app updatables',
        function() {
          assert.isFalse(appUpdatable.mDownloadCalled);
        });
      });

      suite('with only app updates', function() {
        setup(function() {
          UpdateManager.removeFromUpdatesQueue(systemUpdatable);
          UpdateManager.container.click();
        });

        suite('unchecking all the checkboxes', function() {
          var dialog, downloadButton;

          setup(function() {
            dialog = UpdateManager.downloadDialogList;
            var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
            for (var i = 0; i < checkboxes.length; i++) {
              var checkbox = checkboxes[i];
              if (checkbox.checked) {
                checkboxes[i].click();
              }
            }

            downloadButton = UpdateManager.downloadButton;
          });

          test('should disable the download button', function() {
            assert.isTrue(downloadButton.disabled);
          });

          suite('then checking one back', function() {
            setup(function() {
              var checkbox = dialog.querySelector('input[type="checkbox"]');
              checkbox.click();
            });

            test('should enable the download button back', function() {
              assert.isFalse(downloadButton.disabled);
            });
          });

          // Bug 830901 - Disabling all checkboxes in the update prompt...
          suite('cancel and reopen', function() {
            setup(function() {
              // cancel
              UpdateManager.cancelPrompt();

              // reopen
              UpdateManager.containerClicked();
            });

            test('should check all checkboxes', function() {
              var checkboxes = dialog.querySelectorAll(
                'input[type="checkbox"]'
              );
              for (var i = 0; i < checkboxes.length; i++) {
                var checkbox = checkboxes[i];
                assert.isTrue(checkbox.checked);
              }
            });

            test('should enable the download button', function() {
              assert.isFalse(downloadButton.disabled);
            });
          });
        });
      });
    });

    suite('cancel all downloads', function() {
      var systemUpdatable;

      setup(function() {
        systemUpdatable = new MockSystemUpdatable();
        UpdateManager.updatableApps = updatableApps;
        [systemUpdatable, uAppWithDownloadAvailable].forEach(
          function(updatable) {
            UpdateManager.addToUpdatesQueue(updatable);
            UpdateManager.addToDownloadsQueue(updatable);
          });

        UpdateManager.cancelAllDownloads();
      });

      test('should call cancelDownload on the app updatables', function() {
        assert.isTrue(uAppWithDownloadAvailable.mCancelCalled);
      });

      test('should call cancelDownload on the system updatable', function() {
        assert.isTrue(systemUpdatable.mCancelCalled);
      });

      test('should empty the downloads queue', function() {
        assert.equal(UpdateManager.downloadsQueue.length, 0);
      });

      test('should leave the updates available', function() {
        assert.equal(UpdateManager.updatesQueue.length, 2);
      });
    });

    suite('downloaded', function() {
      var updatableApp, downloadDialog;

      setup(function() {
        UpdateManager.init();
        var installedApp = new MockApp();
        updatableApp = new MockAppUpdatable(installedApp);
        UpdateManager.updatableApps = [updatableApp];
        downloadDialog = UpdateManager.downloadDialog;
      });

      test('should handle downloaded when started using data connection',
        function() {
          UpdateManager._startedDownloadUsingDataConnection = true;
          UpdateManager.downloaded(updatableApp);
          assert.isFalse(UpdateManager._startedDownloadUsingDataConnection);
      });

      test('should handle downloaded when started using wifi', function() {
        UpdateManager._startedDownloadUsingDataConnection = false;
        UpdateManager.downloaded(updatableApp);
        assert.isFalse(UpdateManager._startedDownloadUsingDataConnection);
      });
    });

    suite('download prompt', function() {
      setup(function() {
        MockUtilityTray.show();
        var systemUpdatable = new MockSystemUpdatable();
        systemUpdatable.size = 5296345;
        var appUpdatable = new MockAppUpdatable(new MockApp());
        appUpdatable.name = 'Angry birds';
        appUpdatable.nameID = '';
        appUpdatable.size = '423459';
        var hostedAppUpdatable = new MockAppUpdatable(new MockApp());
        hostedAppUpdatable.name = 'Twitter';
        hostedAppUpdatable.nameID = '';
        UpdateManager.updatesQueue = [hostedAppUpdatable, appUpdatable,
                                      systemUpdatable];
        UpdateManager.containerClicked();
        UpdateManager._startedDownloadUsingDataConnection = false;
        UpdateManager.downloadDialog.dataset.nowifi = false;

        navigator.mozWifiManager.connection.status = 'connected';
      });

      teardown(function() {
        MockNavigatorSettings.
          mSettings[UpdateManager.WIFI_PRIORITIZED_KEY] = true;
      });

      suite('download prompt', function() {
        test('should hide the utility tray', function() {
          assert.isFalse(MockUtilityTray.mShown);
        });

        test('should show the download dialog', function() {
          var css = UpdateManager.downloadDialog.classList;
          assert.isTrue(css.contains('visible'));
        });

        test('should set the title', function() {
          var title = fakeDialog.querySelector('h1');
          var l10nAttrs = MockL10n.getAttributes(title);

          assert.equal(l10nAttrs.id, 'numberOfUpdates');
          assert.deepEqual(l10nAttrs.args, { n: 3 });
        });

        suite('update list rendering', function() {
          test('should create an item for each update', function() {
            assert.equal(3, UpdateManager.downloadDialogList.children.length);
          });

          test('should render system update item first with required',
          function() {
            var item = UpdateManager.downloadDialogList.children[0];
            assert.equal(
              item.children[0].getAttribute('data-l10n-id'), 'required');
            assert.equal(
              item.children[1].getAttribute('data-l10n-id'), 'systemUpdate');
            assert.equal(
              item.children[2].textContent, '5.05 MB');
          });

          test('should render packaged app items alphabetically with checkbox',
          function() {
            var item = UpdateManager.downloadDialogList.children[1];
            assert.include(item.textContent, '413.53 kB');

            var name = item.querySelector('div.name');
            assert.equal(name.textContent, 'Angry birds');
            assert.isUndefined(name.dataset.l10nId);

            var checkbox = item.querySelector('input');
            assert.equal(checkbox.type, 'checkbox');
            assert.isTrue(checkbox.checked);
            assert.equal(checkbox.dataset.position, '1');
          });

          test('should render hosted app items alphabetically with checkbox',
          function() {
            var item = UpdateManager.downloadDialogList.children[2];

            var name = item.querySelector('div.name');
            assert.equal(name.textContent, 'Twitter');
            assert.isUndefined(name.dataset.l10nId);

            var checkbox = item.querySelector('input');
            assert.equal(checkbox.type, 'checkbox');
            assert.isTrue(checkbox.checked);
            assert.equal(checkbox.dataset.position, '2');
          });
        });
      });

      test('should handle cancellation', function() {
        UpdateManager.cancelPrompt();

        var css = UpdateManager.downloadDialog.classList;
        assert.isFalse(css.contains('visible'));
      });
    });

    suite('cancel prompt', function() {
      setup(function() {
        UpdateManager._downloading = true;
        MockUtilityTray.show();
        UpdateManager.containerClicked();
      });

      test('should show the cancel', function() {
        assert.isTrue(MockCustomDialog.mShown);
        assert.isFalse(MockUtilityTray.mShown);

        assert.equal(
          'cancelAllDownloads',
          MockCustomDialog.mShowedTitle
        );
        assert.equal('wantToCancelAll', MockCustomDialog.mShowedMsg);

        assert.equal('no', MockCustomDialog.mShowedCancel.title);
        assert.equal('yes', MockCustomDialog.mShowedConfirm.title);
      });

      test('should handle cancellation', function() {
        assert.equal('um_cancelPrompt',
                     MockCustomDialog.mShowedCancel.callback.name);

        UpdateManager.cancelPrompt();
        assert.isFalse(MockCustomDialog.mShown);
      });

      test('should handle confirmation', function() {
        assert.equal('um_cancelAllDownloads',
                     MockCustomDialog.mShowedConfirm.callback.name);

        UpdateManager.cancelAllDownloads();
        assert.isFalse(MockCustomDialog.mShown);
      });
    });

    suite('cancel prompt continued', function() {
      setup(function() {
        var systemUpdatable = new MockSystemUpdatable();
        UpdateManager.addToUpdatesQueue(systemUpdatable);
        UpdateManager.addToDownloadsQueue(systemUpdatable);
        UpdateManager.startedUncompressing();
        MockUtilityTray.show();
        UpdateManager.containerClicked();
      });

      test('should not display prompt while uncompressing', function() {
        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(MockUtilityTray.mShown);
      });
    });

    suite('check for updates', function() {
      setup(function() {
        UpdateManager.init();
      });

      test('should observe the setting', function() {
        assert.equal('gaia.system.checkForUpdates', MockSettingsListener.mName);
        assert.equal(false, MockSettingsListener.mDefaultValue);
        assert.equal(UpdateManager.checkForUpdates.name,
                     MockSettingsListener.mCallback.name);
      });

      suite('when asked to check', function() {
        setup(function() {
          UpdateManager.checkForUpdates(true);
        });

        test('should dispatch force update event if asked for', function() {
          assert.equal('force-update-check', lastDispatchedEvent.type);
        });

        test('should set the setting back to false', function() {
          var setting = 'gaia.system.checkForUpdates';
          assert.isFalse(MockNavigatorSettings.mSettings[setting]);
        });
      });

      test('should not dispatch force update event if not asked', function() {
        UpdateManager.checkForUpdates(false);
        assert.isNull(lastDispatchedEvent);
      });
    });
  });

  suite('System updates', function() {

    var showForbiddenDwnSpy;
    var checkWifiPrioritizedSpy;
    var realStartDownloadsFunc;
    var startDownloadsSpy;
    var showPromptWifiPrioritizedSpy;
    var showAdditionalCostIfNeededSpy;
    var getDataRoamingSettingSpy;
    var checkUpdate2gEnabled;
    var showPromptNoConnectionSpy;
    var mockMozWifiManager;
    var mockMozMobileConnections;
    var realOnLine;
    var isOnLine = true;

    function navigatorOnLine() {
      return isOnLine;
    }

    function setNavigatorOnLine(value) {
      isOnLine = value;
    }

    setup(function() {
      this.sinon.useFakeTimers();
      realStartDownloadsFunc = UpdateManager.startDownloads;
      UpdateManager.startDownloads = function() {
        UpdateManager.downloadDialog.classList.remove('visible');
        return true;
      };
      mockMozWifiManager = navigator.mozWifiManager;
      mockMozMobileConnections = navigator.mozMobileConnections;
      realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: navigatorOnLine,
        set: setNavigatorOnLine
      });

      showForbiddenDwnSpy =
        this.sinon.spy(UpdateManager, 'showForbiddenDownload');
      checkWifiPrioritizedSpy =
        this.sinon.spy(UpdateManager, 'getWifiPrioritized');
      showPromptWifiPrioritizedSpy =
        this.sinon.spy(UpdateManager, 'showPromptWifiPrioritized');
      startDownloadsSpy =
        this.sinon.spy(UpdateManager, 'startDownloads');
      showAdditionalCostIfNeededSpy =
        this.sinon.spy(UpdateManager, 'showPrompt3GAdditionalCostIfNeeded');
      getDataRoamingSettingSpy =
        this.sinon.spy(UpdateManager, '_getDataRoamingSetting');
      checkUpdate2gEnabled =
        this.sinon.spy(UpdateManager, 'getUpdate2GEnabled');
      showPromptNoConnectionSpy =
        this.sinon.spy(UpdateManager, 'showPromptNoConnection');
      UpdateManager.init();
    });

    teardown(function() {
      this.sinon.clock.restore();
      UpdateManager.startDownloads = realStartDownloadsFunc;
      UpdateManager.downloadDialog.dataset.online = true;

      if (realOnLine) {
        Object.defineProperty(navigator, 'onLine', realOnLine);
      }
      navigator.mozWifiManager = mockMozWifiManager;
      navigator.mozMobileConnections = mockMozMobileConnections;
      navigator.mozWifiManager.connection.status = 'connected';
    });

    // 3G -> conn: 'evdo0',
    // 2G -> conn: 'gprs',

    var testCases = [
      {
        title: 'WIFI, 2G, no Setting update2G, wifi prioritized' +
          '-> download available',
        wifi: true,
        conns: [
          {
            type: 'gprs',
            connected: true
          },
          {
            connected: false
          }
        ],
        wifiPrioritized: true,
        testResult: 'startDownloads'
      },
      {
        title: 'WIFI, 2G, Setting update2G is true, wifi prioritized' +
          '-> download available',
        wifi: true,
        conns: [
          {
            connected: false
          },
          {
            type: 'gprs',
            connected: true
          }
        ],

        update2g: true,
        wifiPrioritized: true,
        testResult: 'startDownloads'
      },
      {
        title: 'WIFI, 2G, no Setting update2G, wifi not prioritized' +
          '-> download available',
        wifi: true,
        conns: [
          {
            type: 'gprs',
            connected: true
          },
          {
            connected: false
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        testResult: 'startDownloads'
      },
      {
        title: 'WIFI, 2G, Setting update2G is true, wifi not prioritized' +
          '-> download available',
        wifi: true,
        conns: [
          {
            type: 'gprs',
            connected: true
          },
          {
            connected: false
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        testResult: 'startDownloads'
      },
      {
        title: 'WIFI, 3G, Setting update2G is true, wifi not prioritized' +
          '-> download available',
        wifi: true,
        conns: [
          {
            type: 'gprs',
            connected: true
          },
          {
            connected: false
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        testResult: 'startDownloads'
      },
      {
        title: 'Not WIFI, 3G, no Setting update2G, wifi not prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'evdo0',
            connected: true
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        testResult: 'additionalCostIfNeeded'
      },
      {
        title: 'Not WIFI, 3G, Setting update2G is true, wifi not prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'evdo0',
            connected: true
          }
        ],
        update2g: true,
        wifiPrioritized: false,
        testResult: 'additionalCostIfNeeded'
      },
      {
        title: 'Not WIFI, 3G, no Setting update2G, wifi prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'evdo0',
            connected: true
          }
        ],
        update2g: false,
        wifiPrioritized: true,
        testResult: 'wifiPrioritized'
      },
      {
        title: 'Not WIFI, 3G, Setting update2G is true, wifi prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            type: 'evdo0',
            connected: false
          },
          {
            connected: true
          }
        ],
        update2g: true,
        wifiPrioritized: true,
        testResult: 'wifiPrioritized'
      },
      {
        title: 'Not WIFI, 2G, Setting update2G is true, wifi prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            type: 'gprs',
            connected: false
          },
          {
            connected: true
          }
        ],
        update2g: true,
        wifiPrioritized: true,
        testResult: 'wifiPrioritized'
      },
      {
        title: 'Not WIFI, 2G, Setting update2G is true, wifi not prioritized' +
          '-> download available',
        wifi: false,
        conns: [
          {
            type: 'gprs',
            connected: false
          },
          {
            connected: true
          }
        ],
        update2g: true,
        wifiPrioritized: false,
        testResult: 'additionalCostIfNeeded'
      },
      {
        title: 'Not WIFI, 2G, Setting update2G is true, wifi not prioritized,' +
          'roaming -> download available',
        wifi: false,
        conns: [
          {
            type: 'gprs',
            connected: false
          },
          {
            connected: true
          }
        ],
        update2g: true,
        wifiPrioritized: false,
        testResult: 'roamingDialog',
        roaming: true
      },
      {
        title: 'Not WIFI, 2G, no Setting update2G, wifi prioritized' +
          '-> download not available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'gprs',
            connected: true
          }
        ],
        update2g: false,
        wifiPrioritized: true,
        testResult: 'forbidden'
      },
      {
        title: 'Not WIFI, 2G, no Setting update2G, wifi not prioritized' +
          '-> download not available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'gprs',
            connected: true
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        testResult: 'forbidden'
      },
      {
        title: 'Not WIFI, No Data connection -> download not available',
        wifi: false,
        conns: [
          {
            connected: false
          },
          {
            type: 'gprs',
            connected: false
          }
        ],
        update2g: false,
        wifiPrioritized: false,
        noConnection: true,
        testResult: 'noConnection'
      },
      {
        title: 'B2G/Mulet download, navigator online -> download available',
        onLine: true,
        testResult: 'startDownloads'
      },
      {
        title: 'B2G/Mulet download, navigator offline' +
          '-> download not available',
        onLine: false,
        testResult: 'noConnection'
      },
      {
        title: 'Connections undefined -> download not available',
        testResult: 'noConnection'
      }
    ];

    testCases.forEach(function(testCase) {
      test(testCase.title, function(done) {
        if (testCase.update2g === undefined) {
          delete MockNavigatorSettings.mSettings[UpdateManager.UPDATE_2G_SETT];
        } else {
          MockNavigatorSettings.mSettings[UpdateManager.UPDATE_2G_SETT] =
            testCase.update2g;
        }
        if (testCase.wifiPrioritized === undefined) {
          delete MockNavigatorSettings.
            mSettings[UpdateManager.WIFI_PRIORITIZED_KEY];
        } else {
          MockNavigatorSettings.mSettings[UpdateManager.WIFI_PRIORITIZED_KEY] =
            testCase.wifiPrioritized;
        }
        if (testCase.onLine === undefined) {
          navigator.mozWifiManager.connection.status =
            testCase.wifi ? 'connected' : 'disconnected';
        } else {
          navigator.mozWifiManager = null;
          navigator.onLine = testCase.onLine ? true : false;
        }
        MockNavigatorSettings.mSettings['ril.data.roaming_enabled'] =
          testCase.roaming ? true : false;

        if (testCase.conns === undefined) {
          navigator.mozMobileConnections = null;
        } else {
          for (var i = 0, iLen = testCase.conns.length;
               i < iLen && i < MOBILE_CONNECTION_COUNT;
               i++) {
            MockNavigatorMozMobileConnections[i].data = {
              connected: testCase.conns[i].connected,
              type: testCase.conns[i].type,
              roaming: (testCase.roaming ? true : false)
            };
          }
        }

        if (testCase.noConnection) {
          UpdateManager.downloadDialog.dataset.online = false;
        }

        UpdateManager.promptOrDownload();
        this.sinon.clock.tick(TINY_TIMEOUT);

        switch (testCase.testResult) {
          case 'startDownloads':
            assert.isTrue(startDownloadsSpy.lastCall.returnValue);
            assert.ok(startDownloadsSpy.calledOnce,
              'wifi is connected so the download is available');
            done();
            break;
          case 'additionalCostIfNeeded':
            Promise.all([checkWifiPrioritizedSpy.lastCall.returnValue,
              checkUpdate2gEnabled.lastCall.returnValue]).then(function() {
              getDataRoamingSettingSpy.lastCall.returnValue.then(function() {
                assert.ok(showAdditionalCostIfNeededSpy.calledOnce,
                  'check if the user is currently roaming');
                assert.ok(startDownloadsSpy.calledOnce,
                  'roaming is not enabled, so the download can start');
              }).then(done, done);
            }).then(done, done);
            break;
          case 'wifiPrioritized':
            Promise.all([checkWifiPrioritizedSpy.lastCall.returnValue,
              checkUpdate2gEnabled.lastCall.returnValue]).then(function() {
              assert.ok(showPromptWifiPrioritizedSpy.calledWith(),
                'wifi prioritized dialog is shown to the user');
            }).then(done, done);
            break;
          case 'forbidden':
            Promise.all([checkWifiPrioritizedSpy.lastCall.returnValue,
              checkUpdate2gEnabled.lastCall.returnValue]).then(function() {
              assert.ok(showForbiddenDwnSpy.calledOnce,
                'forbidden download');
            }).then(done, done);
            break;
          case 'roamingDialog':
            Promise.all([checkWifiPrioritizedSpy.lastCall.returnValue,
              checkUpdate2gEnabled.lastCall.returnValue]).then(function() {
              getDataRoamingSettingSpy.lastCall.returnValue.then(function() {
                var css = UpdateManager.downloadViaDataConnectionDialog.
                  classList;
                var titleL10nId =
                  UpdateManager.downloadViaDataConnectionTitle
                  .getAttribute('data-l10n-id');
                var messageL10nId =
                  UpdateManager.downloadViaDataConnectionMessage
                  .getAttribute('data-l10n-id');

                assert.isTrue(css.contains('visible'));
                assert.equal(titleL10nId,
                  'downloadUpdatesViaDataRoamingConnection');
                assert.equal(messageL10nId,
                  'downloadUpdatesViaDataRoamingConnectionMessage');
              }).then(done, done);
            }).then(done, done);
            break;
          case 'noConnection':
            assert.isTrue(showPromptNoConnectionSpy.calledOnce);
            done();
            break;
        }
      });
    });
  });

  suite('queues support', function() {
    suite('updates queue', function() {
      suite('addToUpdatesQueue', function() {
        setup(function() {
          UpdateManager.init();

          var installedApp = new MockApp();
          var updatableApp = new MockAppUpdatable(installedApp);

          var pendingApp = new MockApp({ installState: 'pending' }),
              uPendingApp = new MockAppUpdatable(pendingApp);

          UpdateManager.updatableApps = [updatableApp, uPendingApp];
        });

        test('should add the updatable app to the array', function() {
          var updatableApp = UpdateManager.updatableApps[0];

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength + 1, UpdateManager.updatesQueue.length);
        });

        test('should render', function() {
          var updatableApp = UpdateManager.updatableApps[0];

          UpdateManager.addToUpdatesQueue(updatableApp);
          var l10nAttrs = MockL10n.getAttributes(
            UpdateManager.message);

          assert.equal(l10nAttrs.id, 'updateAvailableInfo');
          assert.deepEqual(l10nAttrs.args, { n: 1 });
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockAppUpdatable(new MockApp);
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should add a system update to the array', function() {
          var systemUpdate = new MockSystemUpdatable();

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(systemUpdate);
          assert.equal(initialLength + 1, UpdateManager.updatesQueue.length);
        });

        test('should not add more than one system update', function() {
          var systemUpdate = new MockSystemUpdatable();

          UpdateManager.updatesQueue.push(new MockSystemUpdatable());
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(systemUpdate);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should not add if app already in the array', function() {
          var updatableApp = UpdateManager.updatableApps[0];
          UpdateManager.addToUpdatesQueue(updatableApp);

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should not add if downloading', function() {
          UpdateManager._downloading = true;
          var updatableApp = UpdateManager.updatableApps[0];

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should not add a pending app to the array', function() {
          var updatableApp = UpdateManager.updatableApps[1];

          var initialLength = UpdateManager.updatesQueue.length;

          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(UpdateManager.updatesQueue.length, initialLength);
        });

      });

      suite('removeFromUpdatesQueue', function() {
        var updatableApp;

        setup(function() {
          UpdateManager.init();

          var installedApp = new MockApp();
          updatableApp = new MockAppUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
          UpdateManager.updatesQueue = [updatableApp];
        });

        test('should remove if in updatesQueue array', function() {
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.removeFromUpdatesQueue(updatableApp);
          assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
        });

        test('should render', function() {
          UpdateManager.removeFromUpdatesQueue(updatableApp);
          var l10nAttrs = MockL10n.getAttributes(
            UpdateManager.message);

          assert.equal(l10nAttrs.id, 'updateAvailableInfo');
          assert.deepEqual(l10nAttrs.args, { n: 0 });
        });

        test('should remove system updates too', function() {
          var systemUpdate = new MockSystemUpdatable();
          UpdateManager.updatesQueue.push(systemUpdate);

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.removeFromUpdatesQueue(systemUpdate);
          assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
        });
      });
    });

    suite('downloads queue', function() {
      suite('addToDownloadsQueue', function() {
        var updatableApp;

        setup(function() {
          UpdateManager.init();

          var installedApp = new MockApp();
          updatableApp = new MockAppUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
        });

        test('should add the updatable to the array', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should add system updates too', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable());
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should not add more than one system updates', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable());
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable());
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        suite('switching to downloading mode on first add', function() {
          setup(function() {
            UpdateManager.addToDownloadsQueue(updatableApp);
          });

          test('should add css class', function() {
            var css = UpdateManager.container.classList;
            assert.isTrue(css.contains('downloading'));
          });

          test('should ask for statusbar indicator', function() {
            var incMethod = 'incDownloads';
            assert.isTrue(Service.request.calledWith(incMethod));
          });

          test('should request wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isFalse(MockNavigatorWakeLock.mLastWakeLock.released);
          });
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockAppUpdatable(new MockApp);
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.downloadsQueue.length);
        });

        test('should not add if already in the array', function() {
          UpdateManager.addToDownloadsQueue(updatableApp);

          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.downloadsQueue.length);
        });
      });

      suite('removeFromDownloadsQueue', function() {
        var updatableApp;

        setup(function() {
          UpdateManager.init();

          var installedApp = new MockApp();
          updatableApp = new MockAppUpdatable(installedApp);

          UpdateManager.addToUpdatableApps(updatableApp);
          UpdateManager.addToDownloadsQueue(updatableApp);
        });

        test('should remove if in downloadsQueue array', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });

        suite('should switch off downloading mode on last remove', function() {
          setup(function() {
            UpdateManager.removeFromDownloadsQueue(updatableApp);
          });

          test('should remove css class', function() {
            var css = UpdateManager.container.classList;
            assert.isFalse(css.contains('downloading'));
          });

          test('should remove statusbar indicator', function() {
            var decMethod = 'decDownloads';
            assert.isTrue(Service.request.calledWith(decMethod));
          });

          test('should release the wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
          });
        });

        test('should not break if wifi unlock throws an exception',
             function() {
          MockNavigatorWakeLock.mThrowAtNextUnlock();
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.ok(true);
        });

        test('should remove system updates too', function() {
          var systemUpdate = new MockSystemUpdatable();
          UpdateManager.downloadsQueue.push(systemUpdate);

          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(systemUpdate);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });
      });
    });
  });
});
