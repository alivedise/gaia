(function(window){
  function HomescreenWindow() {
    /**
     * Make sure we're a singleton.
     */
    if (HomescreenWindow._instance)
      return;

    this._id = 0;
    this.elements = {};
    this.preInit();
    HomescreenWindow._instance = this;
  };

  HomescreenWindow.prototype = {
    _instance: null,

    __proto__: System.AppWindow.prototype,

    /**
     * HomescreenWindow has specific opening/closing
     * transitions, see |window.css| for implementation
     * info.
     * @type {String}
     */
    openTransition: 'zoom-in',

    closeTransition: 'zoom-out',

    /**
     * Ensure we're alive before going to homescreen.
     * (HomescreenWindow.open()).
     */
    preopen: function() {
      this.ensure();
    },

    /**
     * Restart homescreen if the browser iframe
     * doesn't exist.
     */
    ensure: function() {
      if (!this._browser) {
        this._browser = new BrowserFrame(this.config);
        this.update();
      }
    },

    update: function() {
      this.element.appendChild(this._browser);
      this.resize();
    },

    preInit: function() {
      var lock = navigator.mozSettings.createLock();
      var setting = lock.get('homescreen.manifestURL');
      var self = this;
      setting.onsuccess = function() {
        var app =
          Applications.getByManifestURL(this.result['homescreen.manifestURL']);

        if (app) {
          var homescreenManifestURL = app.manifestURL;
          var homescreenURL = app.origin + '/index.html#root';
          self.config = new BrowserConfig(homescreenURL, homescreenManifestURL);
          self.config.isHomescreen = true;
          self._browser = new BrowserFrame(self.config);

          self.appIdentity = self._browser.element.dataset.origin;
          
          self.id = "homescreen";

          self.render();

          self.element.dataset.homescreen = true;
        }

        // Dispatch an event here for battery check.
        self.publish('homescreen-ready');
      };
    },

    destroy: function() {
      /**
       * Override AppWindow.destroy().
       * We should restart ourselves instead of
       * being removed immediately when crashed.
       */
      this.element.removeChild(this._browser.element);
      this._browser = null;
    }
  };
  System.HomescreenWindow = HomescreenWindow;
})(this);