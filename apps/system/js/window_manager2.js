var WindowManager = (function(window){
  /**
   * Internal variables.
   */
  var windows, screenElement, homescreen;

  windows = document.getElementById('windows');

  var runningApps = {};

  var screenshots = {};

  /**
   * @param {String} app The ManifestURL or Origin
   */
  function setDisplayedApp(url, manifestURL) {
    if (document.mozFullScreen)
      document.mozCancelFullScreen();

    if (runningApps[src]) {
      if (src == homescreen.config.url) {
        runningApps[displayedApp].close();
      } else {
        runningApps[src].open();
      }
    } else {
      //runningApps[src] = new AppWindow(src);
    }
  };

  window.addEventListener('home', function() {
    //setDisplayedApp(homescreen);
  });

  windows.addEventListener('appWindow.created', function(evt) {
    var app = evt.detail;
    if (app.windowType == 'app' ||
        app.windowType == 'wrapper') {
      runningApps[app.config.origin] = app;
    }
  });

  windows.addEventListener('appWindow.removed', function(evt) {
    var app = evt.detail;
    if (app.config.origin in runningApps &&
        app.windowType == 'app') {
      delete runningApps[app.config.origin]
    }
  });

  /**
   * init function.
   * Its duty is to fetch all elements it needs.
   * And bind event handlers.
   */
  function init() {
    InitLogoHandler.animate();
    // Some document elements we use
    var windows = document.getElementById('windows');
    var screenElement = document.getElementById('screen');

    if (FtuLauncher && FtuLauncher.enabled) {
      setDisplayedApp(FtuLauncher.origin);
    } else {
    }

    // We add orientation attribute to screen element
    // to do _virtualLockOrientation for app in css.
    screen.addEventListener('orientationchange', function() {
      screenElement.dataset.orientation = screen.orientation;
    });
  };

  function launch() {

  };

  function kill() {

  };

  function reload() {

  };

  function getDisplayedApp() {

  };

  function setOrientationForApp() {

  };

  function getAppFrame() {

  };

  function getRunningApps() {
      //return runningApps;
  };

  function getCurrentDisplayedApp() {
      //return runningApps[displayedApp];
  };
  function getOrientationForApp(origin) {
      
  };
  function toggleHomescreen(){};
  // Return the object that holds the public API
  return {
    launch: launch,
    kill: kill,
    reload: reload,
    getDisplayedApp: getDisplayedApp,
    setOrientationForApp: setOrientationForApp,
    getAppFrame: getAppFrame,
    getRunningApps: function() {
      return runningApps;
    },
    setDisplayedApp: setDisplayedApp,
    getCurrentDisplayedApp: function() {
      return runningApps[displayedApp];
    },
    getOrientationForApp: function(origin) {
      var app = runningApps[origin];

      if (!app || !app.manifest)
        return;

      return app.manifest.orientation;
    },
    toggleHomescreen: toggleHomescreen,
    screenshots: screenshots,
    init: init,
    h: homescreen
  };
}(this));