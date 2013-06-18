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
          //this._homescreenWindow.open();
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
                debugger;
                if (!(this.isRunning(config.origin))) {
                  this._runningApps[config.origin] = new AppWindow(evt.detail.url, evt.detail.manifestURL);
                }
                this.setDisplayedApp(config.origin);
                window.removeEventListener('mozChromeEvent', this);
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
          if (this._displayedApp != this._homescreenWindow.getConfig('origin')) {
            this._runningApps[this._displayedApp].close();
            this._homescreenWindow.open(); 
          }
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
      if (!origin || this.isRunning(origin)) {
        this._ensureHomescreen();
        return;
      }

      this._runningApps[origin].open();
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
      } else {
        this._homescreenWindow.goHome();
      }
    },

    /**
     * @deprecated Moved into AppWindow.
     * @memberOf AppWindowManager
     */
    launch: function awm_launch() {
    },

    /**
     * @deprecated Moved into AppWindow.
     * @memberOf AppWindowManager
     */
    kill: function awm_kill() {
    },

    /**
     * @deprecated Moved into AppWindow.
     * @memberOf AppWindowManager
     */
    reload: function awn_reload() {

    },

    setOrientationForApp: function awm_setOrientationForApp() {

    },

    getAppFrame: function awm_getAppFrame() {

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