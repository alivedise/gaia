(function(window) {
  'use strict';
  var nextID = 0;
  var screenElement = document.getElementById('screen');

  /**
   * AppWindow creates, contains, manages a mozbrowser iframe.
   * AppWindow is directly managed by Window Manager,
   * by call resize(), open(), close() on AppWindow.
   *
   * Basically AppWindow would manipulate all mozbrowser events
   * fired from the mozbrowser iframe by itself and show relevant UI.
   *
   * AppWindow is also the parent class of ActivityWindow and PopupWindow.
   * Mostly they do the same thing but is different at some points
   * like the way transitioning.
   *
   * About creating an AppWindow,
   * you need to provide at least the web app/page URL.
   * If you have also provided the manifest,
   * then you would get an AppWindow object which is a web app.
   * Otherwise you would get an AppWindow which is in 'Wrapper' type.
   * The only one different thing between web app and web page is
   * just the manifest URL.
   * If you are a wrapper type AppWindow, there would be some
   * navigation UI for a wrapper like goBack, goForward, refresh.
   *
   * @example
   * var app = new AppWindow('http://uitest.gaiamobile.org:8080/index.html',
   *                         'http://uitest.gaiamobile.org:8080/manifest.webapp');
   * app.open();
   *
   * @constructor AppWindow
   * @mixes TransitionStateMachine into AppWindow.prototype
   */
  

  window.AppWindow = function AppWindow(url, manifestURL) {
    this._id = nextID++;
    this.config = new BrowserConfig(url, manifestURL);
    this._splash = this.getIconForSplash();
    
    this.render();
    // We keep the appError object here for the purpose that
    // we may need to export the error state of AppWindow instance
    // to the other module in the future.
    if (window.AppError) {
      this.appError = new AppError(this);
    }

    /** 
     * AppWindow is created.
     * 
     * @event AppWindow#appcreated
     * @type {object}
     * @property {string} origin - The origin of this appWindow instance.
     */
    this.publish('created', this.config);
  };

  /**
   * Mixin the appWindow prototype with {mixin} object.
   * @param  {Object} mixin The object to be mixed.
   */
  AppWindow.addMixin = function (mixin) {    
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        this.prototype[prop] = mixin[prop];
      }
    }
  };

  /**
   * @static
   * @type {Object}
   */
  AppWindow.transition = {
    'ENLARGING': 'transition-enlarging',
    'REDUCING': 'transition-reducing',
    'ZOOMIN': 'transition-zoomin',
    'ZOOMOUT': 'transition-zoomout',
    'INVOKED': 'transition-invoked',
    'INVOKING': 'transition-invoking',
    'SLIDEUP': 'transition-slideup',
    'SLIDEDOWN': 'transition-slidedown'
  };

  /**
   * Container element is where |this.element| lives in.
   *
   * All app window instance should exist under '#windows' element.
   *
   * However, ActivityWindow and PopupWindow live under their opener element,
   * which is also an app window instance.
   * @type {DOMElement}
   */
  AppWindow.prototype.containerElement = document.getElementById('windows');

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
   *
   * The name must be prefixed with "transition-".
   *
   * Default open transition is "transition-enlaring",
   * and close transition is "transition-reducing".
   *
   * @property {String} open The name of opening transition.
   * @property {String} close The name of closing transition.
   * 
   * @type {Object}
   */
  
  AppWindow.defaultTransition = {
    'open': AppWindow.transition.ENLARGING,
    'close': AppWindow.transition.REDUCING
  };

  AppWindow.prototype._transition = {
    'open': AppWindow.transition.ENLARGING,
    'close': AppWindow.transition.REDUCING
  };

  AppWindow.prototype._transitionTimeout = 300;

  AppWindow.prototype._unloaded = true;

  /**
   * Open the app window.
   * We shouldn't direcly modify this.
   *
   * Currently we have these predefined opening transition in window.css:
   *
   * @example
   * app.open(AppWindow.defaultTransition.ENLARGING);
   * app.open(AppWindow.defaultTransition.ZOOMOUT);
   * app.open(AppWindow.defaultTransition.INVOKED);
   *
   * @param {String} [transition] The capitalized name of css transition.
   */
  AppWindow.prototype.open = function aw_open(transition) {
    if (transition) {
      transition = transition.toLowerCase();
    }
    if (transition && transition.indexOf('transition-') < 0) {
      transition = 'transition-' + transition;
    }
    if (this._unloaded) {
      this._appendSplash();
    } else {
      this._removeSplash();
    }
    this._setTransition('open', transition || this.constructor.defaultTransition['open']);
    this._processTransitionEvent(this.TRANSITION_EVENT.OPEN);
    this._setTransition('open', this.constructor.defaultTransition['open']);
  };

  /**
   * Close the app window.
   * We shouldn't direcly modify this.
   *
   * @example
   * app.close(AppWindow.defaultTransition.REDUCING);
   * app.close(AppWindow.defaultTransition.ZOOMIN);
   * app.close(AppWindow.defaultTransition.INVOKING);
   *
   * @param {String} [transition] The capitalized name of css transition.
   */
  AppWindow.prototype.close = function aw_close(transition) {
    if (transition) {
      transition = transition.toLowerCase();
    }
    if (transition && transition.indexOf('transition-') < 0) {
      transition = 'transition-' + transition;
    }
    this._setTransition('close', transition || this.constructor.defaultTransition['close']);
    this._processTransitionEvent(this.TRANSITION_EVENT.CLOSE);
    this._setTransition('close', this.constructor.defaultTransition['close']);
  };

  AppWindow.prototype._removeSplash = function aw_removeSplash(first_argument) {
    if (this.element)
      this.element.style.backgroundImage = '';
  };

  AppWindow.prototype._appendSplash = function aw_appendSplash(first_argument) {
    if (this.element)
      this.element.style.backgroundImage = 'url(' + this._splash + ')';
  };
  
  /**
   * Fetch the splash icon,
   * used when we open the app.
   */
  AppWindow.prototype.getIconForSplash = function aw_getIconForSplash() {
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
  };

  /**
   * Class name is used to add a type-specific class on the element.
   * We also use the className + _id to specify <code>element.id</code>.
   * @static
   * @type {String}
   */
  AppWindow.prototype.className = 'appWindow';

  AppWindow.prototype.windowType = 'window';

  /**
   * Represent the current visibility state,
   * i.e. what is currently visible. Possible value:
   * 'frame': the actual app iframe
   * 'screenshot': the screenshot overlay,
   *               serve as a placeholder for visible but not active apps.
   * 'none': nothing is currently visible.
   */
  AppWindow.prototype._visibilityState = 'frame',

  /**
   * The current orientation of this app window corresponding to screen
   * orientation.
   */
  AppWindow.prototype.currentOrientation = 'portrait-primary',

  /**
   * In order to prevent flashing of unpainted frame/screenshot overlay
   * during switching from one to another,
   * many event listener & callbacks are employed.
   *
   * 1. Switching from 'frame' to 'screenshot' state:
   *   _showScreenshotOverlay() is called
   *   get screenshot from frame
   *   when getting the screenshot,
   *   show the screenshot overlay and hide the frame
   *
   * 2. Switching from 'screenshot' to 'frame' state:
   *   _showFrame() is called
   *   register next paint listener, and set the frame to visible
   *   finally, when next painted, hide the screenshot
   *
   * 3. Switching from 'none' to 'frame' state:
   *   _showFrame() is called
   *
   * 4. Switching from 'frame' to 'none' state:
   *   _hideFrame() is called
   *
   * 5. Switching from 'none' to 'screenshot' state:
   *   get screenshot from frame
   *   when getting the screenshot, show the screenshot overlay
   *
   * 6. Switching from 'screenshot' to 'none' state:
   *   _hideScreenshotOverlay is called
   *
   * @memberOf AppWindow
   *
   */

  AppWindow.prototype.setVisible =
    function aw_setVisible(visible, screenshotIfInvisible) {
      if (visible) {
        this._visibilityState = 'frame';
        this._showFrame();
      } else {
        if (screenshotIfInvisible) {
          this._visibilityState = 'screenshot';
          this._showScreenshotOverlay();
        } else {
          this._visibilityState = 'none';
          this._hideFrame();
          this._hideScreenshotOverlay();
        }
      }
    };

  /**
   * _showFrame will check |this._visibilityState|
   * and then turn on the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._showFrame = function aw__showFrame() {
    if (this._visibilityState != 'frame')
      return;

    // Require a next paint event
    // to remove the screenshot overlay if it exists.
    if (this.screenshotOverlay.classList.contains('visible')) {
      this._waitForNextPaint(this._hideScreenshotOverlay.bind(this));
    }

    this._browser.element.classList.remove('hidden');
    this._browser.element.setVisible(true);
  };

  /**
   * _hideFrame will check |this._visibilityState|
   * and then turn off the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._hideFrame = function aw__hideFrame() {
    if (this._visibilityState !== 'frame') {
      this._browser.element.setVisible(false);
      this._browser.element.classList.add('hidden');
    }
  };

  AppWindow.prototype.reload = function aw_reload() {
    this._browser.element.reload(true);
  };

  AppWindow.prototype.kill = function aw_kill() {
    if (this._screenshotURL) {
      URL.revokeObjectURL(this._screenshotURL);
    }

    // If we're active window, perform a close transition
    // before being removed.
    if (this.isActive) {
      this.close(this.destroy.bind(this));
    } else {
      this.destroy();
    }
  };

  AppWindow.prototype.handleEvent = function(evt) {
    console.log(evt, this);
    switch (evt.type) {
      case 'mozbrowserloadend':
        delete this._unloaded;
        this._removeSplash();
        break;
    }
  };

  AppWindow.prototype.render = function aw_render() {
    var element = document.createElement('div');
    element.id = this.className.replace(' ', '-') + this._id;
    this.className.split(' ').forEach(function iterator(name) {
      element.classList.add(name);
    });
    this._browser = new BrowserFrame(this.config);
    this._browser.element.addEventListener('mozbrowserloadstart', this.handleEvent.bind(this));
    this._browser.element.addEventListener('mozbrowserloadend', this.handleEvent.bind(this));
    this._start = Date.now();
    element.appendChild(this._browser.element);
    this.containerElement.appendChild(element);

    this.element = this.frame = element;

    this.element.addEventListener('transitionend', this._transitionHandler.bind(this));
    this.element.addEventListener('animationend', this._transitionHandler.bind(this));

    var screenshotOverlay = document.createElement('div');
    screenshotOverlay.classList.add('screenshot-overlay');
    this.frame.appendChild(screenshotOverlay);
    this.screenshotOverlay = screenshotOverlay;
  };

  /**
   * A temp variable to store current screenshot object URL.
   */
  AppWindow.prototype._screenshotURL = undefined;

  /**
   * A static timeout to make sure
   * the next event don't happen too late.
   * (The same as WindowManager: kTransitionTimeout)
   */
  AppWindow.prototype.NEXTPAINT_TIMEOUT = 1000;

  AppWindow.prototype.debug = function aw_debug(msg) {
    console.log('[appWindow][' + this.origin + ']' +
                '[' + new Date().getTime() / 1000 + ']' + msg);
  };

  /**
   * Wait for a next paint event from mozbrowser iframe,
   * The callback would be called in this.NEXTPAINT_TIMEOUT ms
   * if the next paint event doesn't happen.
   * The use case is for the moment just before we turn on
   * the iframe visibility, so the TIMEOUT isn't too long.
   * @param  {Function} callback The callback function to be invoked
   *                             after we get next paint event.
   */
  AppWindow.prototype._waitForNextPaint =
    function aw__waitForNextPaint(callback) {
      if (!callback)
        return;

      var nextPaintTimer;
      var iframe = this._browser.element;
      var onNextPaint = function aw_onNextPaint() {
        iframe.removeNextPaintListener(onNextPaint);
        clearTimeout(nextPaintTimer);

        callback();
      };

      nextPaintTimer = setTimeout(function ifNextPaintIsTooLate() {
        iframe.removeNextPaintListener(onNextPaint);

        callback();
      }, this.NEXTPAINT_TIMEOUT);

      iframe.addNextPaintListener(onNextPaint);
    };

  /**
   * Currently this happens to active app window when:
   * Attentionscreen shows no matter it's fresh newly created
   * or slide down from active-statusbar mode.
   */
  AppWindow.prototype._showScreenshotOverlay =
    function aw__showScreenshotOverlay() {
      if (this._nextPaintTimer) {
        clearTimeout(this._nextPaintTimer);
        this._nextPaintTimer = null;
      }

      this.getScreenshot(function onGettingScreenshot(screenshot) {
        // If the callback is too late,
        // and we're brought to foreground by somebody.
        if (this._visibilityState == 'frame')
          return;

        if (!screenshot) {
          // If no screenshot,
          // still hide the frame.
          this._hideFrame();
          return;
        }

        this._screenshotURL = URL.createObjectURL(screenshot);
        this.screenshotOverlay.style.backgroundImage =
          'url(' + this._screenshotURL + ')';
        this.screenshotOverlay.classList.add('visible');

        if (!this._browser.element.classList.contains('hidden'))
          this._hideFrame();

        // XXX: we ought not to change screenshots at Window Manager
        // here. In the long run Window Manager should replace
        // its screenshots variable with appWindow._screenshotURL.
        if (WindowManager.screenshots[this.origin]) {
          URL.revokeObjectURL(WindowManager.screenshots[this.origin]);
        }
        WindowManager.screenshots[this.origin] = this._screenshotURL;
      }.bind(this));
    };

  /**
   * Check if current visibility state is screenshot or not,
   * to hide the screenshot overlay.
   */
  AppWindow.prototype._hideScreenshotOverlay =
    function aw__hideScreenshotOverlay() {
      if (this._visibilityState != 'screenshot' &&
          this.screenshotOverlay.classList.contains('visible'))
        this.screenshotOverlay.classList.remove('visible');
    };

  /**
   * get the screenshot of mozbrowser iframe.
   * @param  {Function} callback The callback function to be invoked
   *                             after we get the screenshot.
   */
  AppWindow.prototype.getScreenshot = function aw_getScreenshot(callback) {
    // XXX: We had better store offsetWidth/offsetHeight.

    // We don't need the screenshot of homescreen because:
    // 1. Homescreen background is transparent,
    //    currently gecko only sends JPG to us.
    //    See bug 878003.
    // 2. Homescreen screenshot isn't required by card view.
    //    Since getScreenshot takes additional memory usage,
    //    let's early return here.

    // XXX: Determine |this.isHomescreen| or not on our own in
    // appWindow.
    if (this.isHomescreen) {
      callback();
      return;
    }

    var req = this._browser.element.getScreenshot(
      this._browser.element.offsetWidth, this._browser.element.offsetHeight);

    req.onsuccess = function gotScreenshotFromFrame(evt) {
      var result = evt.target.result;
      callback(result);
    };

    req.onerror = function gotScreenshotFromFrameError(evt) {
      callback();
    };
  };

  /**
   * We will rotate the app window during app transition per current screen
   * orientation and app's orientation. The width and height would be
   * temporarily changed during the transition in this function.
   *
   * For example, when browser app is opened from
   * homescreen and the current device orientation is
   * 1) 'portrait-primary' :   Do nothing.
   * 2) 'landscape-primary':   Rotate app frame by 90 degrees and set
   *    width/height to device height/width correspondingly. Move frame position
   *    to counter the position change due to rotation.
   * 3) 'portrait-secondary':  Rotate app frame by 180 degrees.
   * 4) 'landscape-secondary': Rotate app frame by 270 degrees and set
   *    width/height to device height/width correspondingly. Move frame position
   *    to counter the position change due to rotation.
   */
  AppWindow.prototype.setRotateTransition = function aw_setRotateTransition() {
    var statusBarHeight = StatusBar.height;
    var softkeyHeight = SoftwareButtonManager.height;

    var width;
    var height;

    var appOrientation = this.manifest.orientation;
    var orientation = OrientationObserver.determine(appOrientation);

    this.frame.classList.remove(this.currentOrientation);
    this.currentOrientation = orientation;
    this.frame.classList.add(orientation);

    if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisible() &&
      this.isFullScreen()) {
      statusBarHeight = 0;
    }

    // Rotate the frame if needed
    if (orientation == 'landscape-primary' ||
        orientation == 'landscape-secondary') {
      width = window.innerHeight;
      height = window.innerWidth - statusBarHeight - softkeyHeight;
      this.frame.style.left = ((height - width) / 2) + 'px';
      this.frame.style.top = ((width - height) / 2) + 'px';
    } else {
      width = window.innerWidth;
      height = window.innerHeight - statusBarHeight - softkeyHeight;
    }
    this.frame.style.width = width + 'px';
    this.frame.style.height = height + 'px';
  };

  // Detect whether this is a full screen app by its manifest.
  AppWindow.prototype.isFullScreen = function aw_isFullScreen() {
    return this._fullScreen;
  };

  // Queueing a cleaning task for styles set for rotate transition.
  // We need to clear rotate after orientation changes; however when
  // orientation changes didn't raise (ex: user rotates the device during
  // transition; or the device is always in portrait primary;
  // we should do cleanup on appopen / appclose instead)
  AppWindow.prototype.addClearRotateTransition =
    function aw_clearRotateTransition() {
      var self = this;
      var onClearRotate = function aw_onClearRotate(evt) {
        window.screen.removeEventListener('mozorientationchange',
                                          onClearRotate);
        window.removeEventListener('appopen', onClearRotate);
        window.removeEventListener('appclose', onClearRotate);

        self.frame.style.left = '';
        self.frame.style.top = '';
        self.frame.classList.remove(self.currentOrientation);

        if (self.currentOrientation != screen.mozOrientation &&
            evt.type != 'appclose') {
          self.resize();
        }
      };

      window.screen.addEventListener('mozorientationchange', onClearRotate);
      window.addEventListener('appopen', onClearRotate);
      window.addEventListener('appclose', onClearRotate);
    };

  /**
   * Trace the current inline activity window opened by
   * this app window.
   * Note: an inline activity window may also opens a
   * new inline activity window.
   * @type {AppWindow}
   */
  AppWindow.prototype.inlineActivityWindow = null;

  /**
   * Get the configuration of this app window object.
   * @param  {String} name The key of configuration, e.g. "url".
   * @return {Object|String|Boolean} The configuration value of specific key
   */
  AppWindow.prototype.getConfig = function aw_getConfig(name) {
    return this.config[name];
  };

  /**
   * A public method used by Window Manager.
   * Currently we don't know who wants to open the inline activity,
   * but since web activity could only be triggered by user action,
   * we could assume that only the focused app could invoke inline activity.
   * And Window Manager is the one who knows which app window is active now.
   * @param  {Object} config The configuration of the inline activity frame.
   */
  AppWindow.prototype.startInlineActivity = function(config) {
    // If the same inline activity frame is existed and showing,
    // we reuse its iframe.
    var focusedActivityWindow = this.getFocusedActivityWindow();
    if (focusedActivityWindow &&
        focusedActivityWindow.getConfig('url') == config.url) {
        return;
    }
    this.inlineActivityWindow = new ActivityWindow(this, config);
  };

  /**
   * Go through this.inlineActivityWindow to find the latest window.
   * @return {ActivityWindow} The focused activity window.
   */
  AppWindow.prototype.getFocusedActivityWindow = function() {
    if (this.inlineActivityWindow) {
      return this.inlineActivityWindow.getFocusedActivityWindow();
    } else if (this instanceof ActivityWindow) {
      // If this is an instance of ActivityWindow and
      // doesn't have another inlineActivityWindow,
      // return itself.
      return this;
    } else {
      return null;
    }
  };

  /**
   * Event prefix presents the object type
   * when publishing an event from the element.
   *
   * For example, before an AppWindow instance is opened,
   * it would publish 'appwillopen' event. But when an ActivityWindow instance
   * is opened, it would publish 'activitywillopen' event.
   * 
   * @type {String}
   */
  AppWindow.prototype.eventPrefix = 'app';

  /**
   * Publish an event.
   * 
   * @param  {String} event  Event name, without object type prefix.
   * @param  {Object} detail Parameters in JSON format.
   */
  AppWindow.prototype.publish = function(event, detail) {
    console.log('publish: ', this.eventPrefix + event);
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(this.eventPrefix + event,
                        true, false, detail || this.config);
    this.element.dispatchEvent(evt);
  };

  /**
   * Remove the DOM and release the resource.
   */
  AppWindow.prototype.destroy = function() {
    if (this._killed)
      return;

    // Avoid to be killed twice.
    this._killed = true;

    // Destroy inline activity window if we have one.
    // This would recursively destroy the chained inline activities.
    if (this.inlineActivityWindow) {
      this.inlineActivityWindow.destroy();
    }

    // If frame is never set visible, we can remove the frame directly
    // without closing transition
    // 
    // @todo defer the transition state.
    // 
    if (!this.element.classList.contains('active')) {
      /**
       * The appWindow is terminated or killed. 
       * 
       * @event AppWindow#appterminated
       * @memberOf AppWindow
       * @type {object}
       * @property {string} origin - The origin of this appWindow instance.
       */
      this.publish('terminated');
      this.element.parentNode.removeChild(this.element);
      return;
    } else {
      var self = this;
      this._leaveClosing = function _leaveClosingCallback() {
        self._leaveClosing = function() {};
        self.publish('terminated');
        self.element.parentNode.removeChild(self.element);
      }
      this.close();
    }
    // Take keyboard focus away from the closing window
    this.element.firstChild.blur();
  };

  AppWindow.prototype.requireFullscreen = function aw_requireFullscreen() {
    if (this._fullscreen !== undefined) {
      return this._fullscreen;
    }

    var manifest = this.config.manifest;
    if ('entry_points' in manifest && manifest.entry_points &&
        manifest.type == 'certified') {
       manifest = manifest.entry_points[origin.split('/')[3]];
    }

    this._fullscreen = 'fullscreen' in manifest ? manifest.fullscreen : false;

    return this._fullscreen;
  };

  /**
   * Resize the app window.
   *
   * If width and height are not provided,
   * We will use these parameters to calulate width and height.
   *
   * 1. Statusbar.Height
   * 2. Fullscreen or not
   * 3. Keyboard.getHeight()
   * 
   * @param  {Number} [width] The width of the app window.
   * @param  {Number} [height] The height of the app window.
   * @param {Boolean} [ignoreKeyboard] Ignore keyboard height or not.
   */
  AppWindow.prototype.resize = function aw_resize(width, height, ignoreKeyboard) {
    if (this.inlineActivityWindow) {
      this.inlineActivityWindow.resize(width, height);
      return;
    }
  
    if (width && height) {
      this.element.style.width = width + 'px';
      this.element.style.height = height + 'px';
      return;
    }

    // If width and height is not provided, calculate it on our own.
    var manifest = this.config.manifest;

    var cssWidth = window.innerWidth + 'px';
    var cssHeight = window.innerHeight - StatusBar.height - (ignoreKeyboard ? 0 : KeyboardManager.getHeight()) + 'px';

    if (!screenElement.classList.contains('attention') &&
        this.requireFullscreen()) {
      cssHeight = window.innerHeight - (ignoreKeyboard ? 0 : KeyboardManager.getHeight()) + 'px';
    }

    this.element.style.width = cssWidth;
    this.element.style.height = cssHeight;
  };

}(this));
