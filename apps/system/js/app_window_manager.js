/**
 * AppWindowManager manages the life cycle of AppWindow instances.
 *
 * It on demand creates a new AppWindow instance,
 * resize an existing AppWindow instance,
 * destroy a closing AppWindow instance.
 *
 * @namespace AppWindowManager
 */

(function(window) {
  'use strict';

  var AppWindowManager = {
    /**
     * The list of currently running AppWindow instances.
     * @private
     * @type {Array}
     * @memberOf AppWindowManager
     */
    _runningApps: {},

    /**
     * The homescreen app window instance.
     * @private
     * @type {HomescreenWindow}
     *
     *
     * @memberOf AppWindowManager
     */
    _homescreenWindow: null,

    _displayedApp: null,

    /**
     * The init process of AppWindowManager:
     * 1. Create a Homescreen Window instance.
     * 2. After the HomescreenWindow instance is ready,
     *    launch FTU if necessary.
     * 3. FTU launcher would publish 'ftuskip' or 'ftudone' event,
     *    open homescreen when we get these events.
     *
     * @memberOf AppWindowManager
     */
    init: function awm_init() {
      window.addEventListener('ftuopen', this);
      window.addEventListener('ftudone', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('homescreenready', this);
      window.addEventListener('home', this);
      window.addEventListener('unlock', this);
      window.addEventListener('appopen', this);
      window.addEventListener('homescreenopen', this);

      if (Applications.ready) {
        window.addEventListener('mozChromeEvent', this);
        InitLogoHandler.animate();
        //this.safelyLaunchFTU();
        this._ensureHomescreen();
      } else {
        window.addEventListener('applicationready', this);
      }
    },

    handleEvent: function awm_handleEvent(evt) {
      switch (evt.type) {
        case 'unlock':
          this._homescreenWindow.open();
          break;

        case 'mozChromeEvent':
          var manifestURL = evt.detail.manifestURL;
          if (!manifestURL)
            return;

          var config = new BrowserConfig(evt.detail.url, evt.detail.manifestURL);

          switch (evt.detail.type) {
            case 'webapps-close':
              this._runningApps[origin].kill();
              break;

            case 'webapps-launch':
              if (config.origin == this._homescreenWindow.getConfig('origin')) {
                // No need to append a frame if is homescreen
                this.setDisplayedApp();
              } else {
                if (!(this.isRunning(config.origin))) {
                  this._runningApps[config.origin] = new AppWindow(evt.detail.url, evt.detail.manifestURL);
                }
                this.setDisplayedApp(config.origin);
              }
              break;
            }
          break;

        case 'homescreenready':
          //FtuLauncher.retrieve();
          break;

        // Animate init logo when FTU is launched.
        case 'ftuopen':
          InitLogoHandler.animate();
          break;

        case 'ftuskip':
          InitLogoHandler.animate();
        case 'ftudone':
          this.setDisplayedApp();
          break;

        case 'applicationready':
          window.removeEventListener('applicationready', this);
          window.addEventListener('mozChromeEvent', this);
          InitLogoHandler.animate();
          this._ensureHomescreen();
          break;

        case 'home':
          this.setDisplayedApp();
          break;

        case 'appopen':
        case 'homescreenopen':
          if (this.isRunning(evt.detail.origin))
            this._displayedApp = evt.detail.origin;
          break;
      }
    },

    safelyLaunchFTU: function awm_safelyLaunchFTU() {
      FtuLauncher.retrieve();
    },

    isRunning: function awm_isRunning(origin) {
      return this._runningApps.hasOwnProperty(origin);
    },

    setDisplayedApp: function awm_setDisplayedApp(origin) {
      if (this.isRunning(origin)) {
        if (origin != this._homescreenWindow.getConfig('origin')) {
          if (this._displayedApp && this._displayedApp != this._homescreenWindow.getConfig('origin')) {
            this._runningApps[this._displayedApp].close(AppWindow.transition.INVOKING);
            this._runningApps[origin].open(AppWindow.transition.INVOKED);
          } else {
            this._runningApps[origin].open();
            this._homescreenWindow.close();
          }
          return;
        }
      }
      this._homescreenWindow.open();
      if (this._displayedApp != this._homescreenWindow.getConfig('origin')) {
        this._runningApps[this._displayedApp].close();
        this._displayedApp = this._homescreenWindow.getConfig('origin');
      }
    },

    getRunningApps: function awm_getRunningApps() {
      return this._runningApps;
    },

    /**
     * The function is to ensure homescreen app window is
     * running, otherwise we will relaunch it.
     * 
     * @private
     * @memberOf AppWindowManager
     */
    _ensureHomescreen: function awm__ensureHomescreen() {
      if (!this._homescreenWindow) {
        this._homescreenWindow = new HomescreenWindow();
        this._homescreenWindow.open();
      } else {
        this._homescreenWindow.goHome();
      }
    },

    setOrientationForApp: function awm_setOrientationForApp() {

    },

    getCurrentDisplayedApp: function awm_getCurrentDisplayedApp() {
      return this._runningApps[this._displayedApp];
    },

    getOrientationForApp: function awm_getOrientationForApp(origin) {
      var app = this._runningApps[origin];

      if (!app || !app.manifest)
        return null;

      return app.manifest.orientation;
    },

    toggleHomescreen: function awm_toggleHomescreen(visible) {
      this._ensureHomescreen();
      if (this._homescreenWindow)
        this._homescreenWindow.setVisible(visible);
    },

    /**
     * @deprecated Decrecated. Use AppWindow.screenshot instead.
     * @type {Array}
     * @memberOf AppWindowManager
     */
    screenshots: []
  };

  window.AppWindowManager = AppWindowManager;
  AppWindowManager.init();
}(this));