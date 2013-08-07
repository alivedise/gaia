/**
 * AppWindowManager manages the opened AppWindow instances.
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
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('homescreenopen', this);
      window.addEventListener('appwillclose', this);
    },

    handleEvent: function awm_handleEvent(evt) {
      switch (evt.type) {
        case 'unlock':
          this.setDisplayedApp();
          break;

        case 'homescreenready':
          this._homescreenWindow = evt.detail;
          break;

        case 'ftudone':
          this.setDisplayedApp();
          break;

        case 'home':
          this.setDisplayedApp();
          break;

        case 'appopen':
        case 'homescreenopen':
          if (this.isRunning(evt.detail.config.origin))
            this._displayedApp = evt.detail.config.origin;
          break;

        case 'appcreated':
          this._runningApps[evt.detail.config.origin] = evt.detail;
          System.publish('requestopen', evt.detail);
          break;

        case 'appterminated':
          if (this.isRunning(evt.detail.config.origin)) {
            delete this._runningApps[evt.detail.config.origin];
          }
          break;

        case 'appwillclose':
          // show homescreen is an app is closed by itself.
          break;
      }
    },

    isRunning: function awm_isRunning(origin) {
      return this._runningApps.hasOwnProperty(origin);
    },

    setDisplayedApp: function awm_setDisplayedApp(origin) {
      if (this.isRunning(origin)) {
        if (origin != this._homescreenWindow.getConfig('origin')) {
          if (this._displayedApp && this._displayedApp != this._homescreenWindow.getConfig('origin')) {
            // Require a next paint before opening,
            // because after turning on the visibility it takes some time to paint.
            this._runningApps[origin]._waitForNextPaint(function onNextPaint() {
              this._runningApps[this._displayedApp].close(AppWindow.transition.INVOKING);
            }.bind(this), 300);
            this._runningApps[origin].open(AppWindow.transition.INVOKED);
          } else {
            this._runningApps[origin]._waitForNextPaint(function onNextPaint() {
              this._homescreenWindow.close();
            }.bind(this), 300);
            this._runningApps[origin].open();
          }
          return;
        }
      }
      
      if (this._displayedApp != this._homescreenWindow.getConfig('origin')) {
        this._homescreenWindow._waitForNextPaint(function onNextPaint() {
          this._runningApps[this._displayedApp].close();
        }.bind(this), 300);
      }
      this._homescreenWindow.open();
    },

    getRunningApps: function awm_getRunningApps() {
      return this._runningApps;
    }
  };

  window.AppWindowManager = AppWindowManager;
  AppWindowManager.init();
}(this));
