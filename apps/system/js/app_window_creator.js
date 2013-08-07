/**
 * AppWindowCreator manages the life cycle of AppWindow instances.
 *
 * It on demand creates a new AppWindow instance.
 *
 * @namespace AppWindowManager
 * @requires Applications
 * @requires FTUWindow
 * @requires AppWindow
 * @requires HomescreenWindow
 */

(function(window) {
  'use strict';

  var AppWindowCreator = {
    init: function awc_init() {
      /**
       * Wait for applicationready event to do the following work.
       */
      if (Applications.ready) {
        window.addEventListener('mozChromeEvent', this);
        InitLogoHandler.animate();
        //this.launchFTU();
        this.launchHomescreen();
      } else {
        window.addEventListener('applicationready', this);
      }
    },

    handleEvent: function awc_handleEvent(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          var manifestURL = evt.detail.manifestURL;
          if (!manifestURL)
            break;

          var config = new BrowserConfig(evt.detail.url, evt.detail.manifestURL);
          switch (evt.detail.type) {
            case 'webapps-close':
              // TODO: where to put this?
              break;

            case 'webapps-launch':
              if (config.origin == this._homescreenWindow.getConfig('origin')) {
              } else {
                if (!(AppWindowManager.isRunning(config.origin))) {
                  new AppWindow(evt.detail.url, evt.detail.manifestURL);
                } else {
                  AppWindowManager.setDisplayedApp(config.origin);
                  System.debug('App of ' + config.origin + 'is already created and managed by AppWindowCreator');
                }
              }
              break;
            }
          break;

        case 'applicationready':
          window.removeEventListener('applicationready', this);
          window.addEventListener('mozChromeEvent', this);
          InitLogoHandler.animate();
          this.launchHomescreen();
          break;
      }
    },

    setDisplayedApp: function awc_setDisplayedApp() {
      // TODO
    },

    launchFTU: function awc_launchFTU() {
      this._FTUWindow = new FTUWindow();
    },

    launchHomescreen: function awc_launchHomescreen() {
      this._homescreenWindow = new HomescreenWindow();
    }
  };

  window.AppWindowCreator = AppWindowCreator;
  AppWindowCreator.init();
}(this));