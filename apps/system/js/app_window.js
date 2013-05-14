(function(window) {
  var nextID = 0;
  var screenElement = document.getElementById('screen');
  var kTransitionTimeout = 1000;

  function AppWindow(url, manifestURL) {
    this.id = nextID++;
    this.config = System.extend(new BrowserConfig(url, manifestURL), this.default_config);
    this._browser = new BrowserFrame(this.config);
    this._splash = this.getIconForSplash();

    // XXX Remove this
    //this.iframe.unloaded = true;

    this.appIdentity = this._browser.element.dataset.origin;
    System.UI.call(this, this.config);
    this.publish('appcreated', this.config);
  };

  AppWindow.prototype = {
    __proto__: System.UI.prototype,

    windowType: 'app',

    ELEMENTS: [],

    isFullscreen: false,

    CONTAINER: document.getElementById('windows'),

    CLASSNAME: 'appWindow',

    _unloaded: true,

    /**
     * Icon for splash
     * @type {String}
     */
    _splash: null,

    /**
     * This transition is implemented in css3 animation
     * or transition in |window.css|.
     * We catch the |animationend| or |transitionend|
     * event in |this.transitionHandler|.
     *
     * If your app has specific transition,
     * inherit from appWindow,
     * implement your own transition in |window.css|,
     * name it, and replace the config here.
     * @type {String}
     */
    openTransition: 'opening',

    closeTransition: 'closing',

    /**
     * Store the recent screenshot of the app window.
     * @type {[type]}
     */
    _screenshot: null,

    get screenshot() {
      if (this._browser.currentStatus == 'error') {

      } else {

      }
    },

    /**
     * mozbrowser iframe getter
     */
    get iframe() {
      return this._browser ? this._browser.element : null;
    },

    /**
      * Record the current status of page visibility.
      * @type {Boolean}
      */
    _visible: false,

    /**
     * Initialize the appWindow.
     */
    _onrenderend: function() {
      this._visible = true;
      this._browser.onstatus = this.onStatusChange.bind(this);
      this.element.appendChild(this._browser.element);
      this.element.addEventListener('transitionend', this._transitionHandler.bind(this));
      this.element.addEventListener('animationend', this._transitionHandler.bind(this));
      this.toForeground();
      this.resize();

      if (System.AppError)
        this.error = new System.AppError(this);

      if (System.AppCrash)
        this.crash = new System.AppCrash(this);

      // Show inline activities
      window.addEventListener('mozChromeEvent', this);
    },

    handleEvent: function() {

    },

    view: function() {
      return '<div class="' + this.__proto__.CLASSNAME + 
        ' windowContainer" id="' + this.ID + '">' +
        '<div>';
    },

    /** 
     * We're asked by WindowManager to do resize
     * according to StatusBar height and ourself's fullscreen config.
     */
    resize: function() {
      var cssWidth = window.innerWidth + 'px';
      var cssHeight = window.innerHeight - StatusBar.height - KeyboardManager.getHeight();
      if (this.isWrapper) {
        cssHeight -= 10;
      }
      cssHeight += 'px';

      if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisible() &&
          this.requireFullScreen()) {
        cssHeight = window.innerHeight + 'px';
      }

      this.element.style.width = cssWidth;
      this.element.style.height = cssHeight;

      this.publish('resize');
    },

    /**
     * Check the app requires fullscreen or not.
     * Remember the fullscreen attibute
     * @return {Boolean} The app requires fullscreen in manifest
     * or not.
     */
    requireFullScreen: function requireFullscreen() {
      if (this.isFullscreen !== null)
        return this.isFullscreen;

      this.isFullscreen = 
        new ManifestHelper(manifest).fullscreen ? true: false;
      return this.isFullscreen;
    },

    isFullScreen: null,

    _clearTransition: function() {
      delete this.element.dataset.transition;
    },

    /**
     * Open the app window.
     * We shouldn't direcly modify this.
     */
    open: function() {
      if (this.element.dataset.transition ||
          this.element.classList.contains('active')) {
        // Do nothing if we are transitioning or
        // we are already active.
        return;
      }
      if (this._unloaded) {
        console.log(this._splash);
        this.element.style.backgroundImage = 'url(' + this._splash + ')';
      }
      this.publish('appwillopen', { origin: this.config.origin });
      if (this._preopen)
        this._preopen();
      this.toForeground();
      
      this.element.dataset.transition = this.openTransition;
    },

    /**
     * Close the app window.
     * We shouldn't direcly modify this.
     */
    close: function() {
      if (this.element.dataset.transition ||
          !this.element.classList.contains('active')) {
        // Do nothing if we are transitioning or
        // we are already inactive.
        return;
      }
      this.publish('appwillclose', { origin: this.config.origin });
      this._browser.element.blur();
      if (this._preclose) 
        this._preclose();
      this.element.dataset.transition = this.closeTransition;
    },

    /**
     * Implement app swap out transtion here.
     * @param  {Function} callback Callback to be called
     * after swapping done.
     */
    swapOut: function(callback) {
      if (this.element.dataset.transition ||
          !this.element.classList.contains('active')) {
        // Do nothing if we are transitioning or
        // we are already inactive.
        return;
      }
      if (this._preclose)
        this._preclose();
      this.element.dataset.transition = 'swap-out';
    },

    /**
     * Implement app swap in transtion here.
     * @param  {Function} callback Callback to be called
     * after swapping done.
     */
    swapIn: function(callback) {
      if (this.element.dataset.transition ||
          this.element.classList.contains('active')) {
        // Do nothing if we are transitioning or
        // we are already active.
        return;
      }
      if (this._preopen)
        this._preopen();
      this.toForeground();
      this.element.dataset.transition = 'swap-in';
    },

    toBackground: function() {
      // Bring app to background
      this.element.classList.remove('active');
      if (this._visible) {
        var self = this;
        this.getScreenshot(
          function(e) {
            if (e.target.result) {
              self._screenshot = URL.createObjectURL(e.target.result);
            }

            self._visible = false;
            self.setVisible(false);
          });
      } else {
        this._visible = false;
        this.setVisible(false);
      }
    },

    toForeground: function() {
      // Bring app to foreground;
      this._visible = true;
      this.setVisible(true);
      this.element.classList.add('active');
    },

    /**
     * The flow of appWindow opening transition:
     * 1.Pre-opening:
     *   * appWindow.iframe is unsplashed.
     *   * Bring appWindow.iframe to foreground.
     * 2.Opening:
     *   * appWindow.element is the one doing transition.
     * 3.Open-end:
     *   * appWindow.iframe is shown,
     *     or wait for the loadend event to show.
     *     * After loadend, the iframe is from now on
     *       splashed.
     *
     * The flow of appWindow closing transition:
     * 1.Pre-closing:
     *   * blur the appWindow.iframe
     * 2.Closing:
     *   * appWindow.element is the one doing transition.
     * 3.Close-end:
     *   * Bring appWindow.iframe to background.
     */

    /**
     * Handle the transition event.
     */
    _transitionHandler: function() {
      switch (this.element.dataset.transition) {
        case 'opening':
          delete this.element.dataset.transition;
          if (this.iframe) {

          } else {

          }
          if (this._onopened)
            this._onopened();
          break;
        case 'closing':
          delete this.element.dataset.transition;
          this.toBackground();
          this.publish('appclose')
          if (this._onclosed)
            this._onclosed();
          break;
        case 'swap-in':
          delete this.element.dataset.transition;
          if (this._onopened)
            this._onopened();
          break;
        case 'swap-out':
          delete this.element.dataset.transition;
          this.toBackground();
          this.publish('appclose');
          if (this._onclosed)
            this._onclosed();
          break;
      }
    },

    onWindowOpened: function(evt) {
      var iframe = this.iframe;
      if (!iframe)
        return;

      // Give the focus to the frame
      iframe.focus();
      
      this.publish('appopen', true, false, {
        manifestURL: this.config.manifestURL,
        origin: this.config.origin,
        isHomescreen: this.config.isHomescreen
      });
    },

    waitForNextPaint: function(callback) {
      function onNextPaint() {
        clearTimeout(timeout);
        callback();
      }

      var iframe = this.iframe;

      if (!iframe)
        return;

      // Register a timeout in case we don't receive
      // nextpaint in an acceptable time frame.
      var timeout = setTimeout(function() {
        if ('removeNextPaintListener' in iframe)
          iframe.removeNextPaintListener(onNextPaint);
        callback();
      }, kTransitionTimeout);

      if ('addNextPaintListener' in iframe)
        iframe.addNextPaintListener(onNextPaint);
    },

    onStatusChange: function(evt) {
      var evtName = evt.type.replace(BrowserFrame.prefix, '');
      /**
       * We could on demand
       */

      switch (evtName) {
        case 'loadstart':
          break;
        case 'loadend':
          // XXX: Remove this
          //delete this.iframe.dataset.unloaded;
          //this.onReady(evt);
          this._unloaded = false;
          break;
        case 'locationchange':
          break;
        case 'titlechange':
          break;
        case 'iconchange':
          break;
        case 'showmodalprompt':
          this.ModalDialog.handleEvent(evt);
          break;
        case 'open':
          break;
        case 'close':
          break;
        case 'securitychange':
          break;
        case 'contextmenu':
          break;
        case 'error':
          if (evt.detail.type == 'fatal') {
            this.kill(evt);
          }
          break;
        case 'scroll':
          break;
        case 'securitychange':
          break;
        case 'requireusernameandpassword':
          break;
      }
    },

    kill: function(evt) {
      if (!this._browser)
        return;

      this.publish('appterminated',
        {
          origin: this.config.origin,
          windowType: this.windowType
        });

      this.element.removeChild(this._browser.element);
      this._browser = null;
      this.destroy();
    },

    destroy: function() {
      this.publish('appWindow.removed', this);
      this.container.removeChild(this.element);
    },

    go: function() {
      if (this._browser && 'go' in this._browser.element)
        this._browser.element.go();
    },

    stop: function() {
      if (this._browser && 'stop' in this._browser.element)
        this._browser.element.stop();
    },

    reload: function() {
      if (this._browser && 'reload' in this._browser.element)
        this._browser.element.reload();
    },

    goBack: function() {
      if (this._browser && 'goBack' in this._browser.element)
        this._browser.element.goBack();
    },

    goForward: function() {
      if (this._browser && 'goForward' in this._browser.element)
        this._browser.element.goForward();
    },

    canGoBack: function(callback) {
      if (this._browser && 'canGoBack' in this._browser.element)
        this._browser.element.canGoBack().onsuccess = callback;
    },

    canGoForward: function(callback) {
      if (this._browser && 'canGoForward' in this._browser.element)
        this._browser.element.canGoForward().onsuccess = callback;
    },

    getScreenshot: function(callback) {
      if (this._browser && 'getScreenshot' in this._browser.element) {
        var req = this._browser.element.getScreenshot(window.innerWidth,
          window.innerHeight);
        req.onsuccess = callback;
      }
    },

    setVisible: function(visible) {
      if (this._browser && 'setVisible' in this._browser.element)
        this._browser.element.setVisible(visible);
    },

    getVisible: function(callback) {
      if (this._browser && 'getVisible' in this._browser.element) {
        var req = this._browser.element.getVisible();
        req.onsuccess = callback;
      }
    },

    /**
     * Lock the orientation for this app.
     * @return {[type]} [description]
     */
    lockOrientation: function(orientation) {
      var manifest = this.config.manifest;

      if (manifest.orientation) {
        var rv = screen.mozLockOrientation(manifest.orientation);
        if (rv === false) {
          console.warn('screen.mozLockOrientation() returned false for',
                       this.config.origin, 'orientation', manifest.orientation);
        }
      } else {
        // If no orientation was requested, then let it rotate
        screen.mozUnlockOrientation();
      }
    },

    /**
     * screen.lockOrientation is for whole screen only
     * However, sometimes we want to lock only the orientation of
     * a specfic frame.
     * This function tries to rotate the frame to pretend
     * its orientation is being locked.
     * @return {[type]} [description]
     */
    _lockOrientation: function(orientation) {
      var manifest = this.config.manifest;
      if (manifest.orientation) {
        this.element.dataset.orientation = manifest.orientation;
      } else {
        this.element.dataset.orientation = screen.orientation;
      }
    },

    /**
     * Fetch the splash icon,
     * used when we open the app.
     */
    getIconForSplash: function() {
      if (this._splash)
        return this._splash;

      var manifest = this.config.manifest;
      var icons = 'icons' in manifest ? manifest['icons'] : null;
      if (!icons) {
        return null;
      } else if (!this._preloadSplash) {
        var a = document.createElement('a');
        a.href = this.config.origin;
        var splash = a.protocol + '//' + a.hostname + ':' + (a.port || 80) + splash;

        // Start to load the image in background to avoid flickering if possible.
        this._preloadSplash = new Image();
        this._preloadSplash.src = splash;
      }

      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });

      sizes.sort(function(x, y) { return y - x; });

      this._splash = icons[sizes[0]];
      return icons[sizes[0]];
    }
  }

  System.AppWindow = AppWindow;
})(this);
