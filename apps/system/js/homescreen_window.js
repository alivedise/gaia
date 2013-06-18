(function(window){
  /**
   * HomescreenWindow is a special AppWindow.
   *
   * It launches and manages the homescreen app.
   * 
   * It's a singleton. Only one HomescreenWindow instance running at one time.
   *
   * @extends {AppWindow}
   * @requires AppWindow
   * @class  HomescreenWindow
   *
   * @example
   * var home = new HomescreenWindow();
   */
  function HomescreenWindow(callback) {
    /**
     * Make sure we're a singleton.
     */
    if (HomescreenWindow._instance)
      return HomescreenWindow._instance;

    this._id = 0;
    this.preInit(callback);
    HomescreenWindow._instance = this;
  };

  HomescreenWindow.prototype = {
    _instance: null,

    __proto__: AppWindow.prototype,

    _super: AppWindow,

    eventPrefix: 'homescreen',

    className: 'homescreen appWindow',

    constructor: HomescreenWindow,

    defaultTransition: {
      'open': 'transition-zoomout',
      'close': 'transition-zoomin'
    },

    /**
     * HomescreenWindow has specific opening/closing
     * transitions, see |window.css| for implementation
     * info.
     * @type {String}
     */
    _transition: {
      'open': 'transition-zoomout',
      'close': 'transition-zoomin'
    },

    /**
     * Ensure we're alive before going to homescreen.
     * (HomescreenWindow.open()).
     */
    _leaveClosed: function hw__leaveNone(from, to, evt) {
      if (to == 'opening') {
        this.ensure();
      }
    },

    /**
     * Restart homescreen if the browser iframe
     * doesn't exist.
     */
    ensure: function hw_ensure() {
      if (!this.element) {
        this.render();
      }
      this.resize();
    },

    goHome: function hw_goHome() {
      this._browser.src = homescreenURL;
      this.resize();
    },

    preInit: function hw_preInit(callback) {
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

          self.render();
          self.resize();
          // Dispatch an event here for battery check.
          self.publish('ready');
        }
      };
    },

    kill: function hw_kill() {
      // We don't need to transition when homescreen is killed.
      this.element.parentNode.removeChild(this.element);
      this.element = null;
      this.ensure();
    }
  };

  window.HomescreenWindow = HomescreenWindow;
})(this);