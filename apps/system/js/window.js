'use strict';

(function(window) {
  'use strict';
  var DEBUG = false;
  var _id = 0;
  var _start = new Date().getTime() / 1000;

  /**
   * Basic window wrapper.
   * @param {Object} configuration BrowserConfig object
   */
  window.AppWindow = function AppWindow(configuration) {
    this.reConfig(configuration);
    this.render();
    this.publish('created');

    if (DEBUG) {
      AppWindow[this.instanceID] = this;
    }

    this._start = Date.now();

    return this;
  };

  AppWindow.prototype.generateID = function() {
    if (!this.instanceID) {
      this.instanceID = this.CLASS_NAME + '-' + _id;
      _id++;
    }
  };

  /**
   * Generate all configurations we need.
   * @param  {Object} configuration Initial configuration object
   *  Includes manifestURL, manifest, url, origin, name
   */
  AppWindow.prototype.reConfig = function aw_reConfig(configuration) {
    // Some modules are querying appWindow.manifestURL or appWindow.origin
    // so we inject all configurations into appWindow first.
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    this.browser_config = configuration;
    // Store initial configuration in this.config
    this.config = configuration;
    this.config.chrome = (this.manifest && this.manifest.chrome) ?
      this.manifest.chrome :
      this.config.chrome;

    // Get icon splash
    this.getIconForSplash();
    this.preloadSplash();

    this.generateID();
  };

  AppWindow.prototype._DEBUG = false;

  /**
   * Represent the current screenshoting state,
   * i.e. what is currently visible. Possible value:
   * 'frame': the actual app iframe
   * 'screenshot': the screenshot overlay,
   *               serve as a placeholder for visible but not active apps.
   * 'none': nothing is currently visible.
   */
  AppWindow.prototype._screenshotOverlayState = 'frame';

  /**
   * Represent the current pagee visibility state,
   * i.e. what is currently visible. Possible value:
   * 'foreground': setVisible(true)
   * 'background': setVisible(false)
   *
   * Default value is foreground.
   */
  AppWindow.prototype._visibilityState = 'foreground';

  /**
   * The rotating degree of current frame.
   */
  AppWindow.prototype.rotatingDegree = 0;

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
   */

  AppWindow.prototype.setVisible =
    function aw_setVisible(visible, screenshotIfInvisible) {
      this.debug('set visibility -> ', visible);
      if (visible) {
        this.element.removeAttribute('aria-hidden');
        this._screenshotOverlayState = 'frame';
        this._showFrame();
      } else {
        this.element.setAttribute('aria-hidden', 'true');
        if (screenshotIfInvisible) {
          this._screenshotOverlayState = 'screenshot';
          this._showScreenshotOverlay();
        } else {
          this._screenshotOverlayState = 'none';
          this._hideFrame();
          this._hideScreenshotOverlay();
        }
      }

      this.debug('screenshot state -> ', this._screenshotOverlayState);
    };

  /**
   * _showFrame will check |this._screenshotOverlayState|
   * and then turn on the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._showFrame = function aw__showFrame() {
    if (this._screenshotOverlayState != 'frame')
      return;

    this.browser.element.classList.remove('hidden');
    this._setVisible(true);

    // Getting a new screenshot to force compositing before
    // removing the screenshot overlay if it exists.
    if (this.screenshotOverlay.classList.contains('visible')) {
      this.ensureFullRepaint(this._hideScreenshotOverlay.bind(this));
    }
  };

  /**
   * _hideFrame will check |this._screenshotOverlayState|
   * and then turn off the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._hideFrame = function aw__hideFrame() {
    if (this._screenshotOverlayState !== 'frame') {
      this._setVisible(false);
      this.iframe.classList.add('hidden');
    }
  };

  AppWindow.prototype.isActive = function aw_isActive() {
    if (this.transitionController) {
      return (this.transitionController._transitionState == 'opened' ||
              this.transitionController._transitionState == 'opening');
    } else {
      // Fallback
      return (this._visibilityState == 'foreground' ||
            this.element.classList.contains('active'));
    }
  };

  AppWindow.prototype.kill = function aw_kill() {
    // As we can't immediatly remove runningApps entry,
    // we flag it as being killed in order to avoid trying to remove it twice.
    // (Check required because of bug 814583)
    if (this._killed) {
      return;
    }
    this.killed = true;

    if (DEBUG) {
      AppWindow[this.instanceID] = null;
    }

    // Clear observers
    if (this._observers && this._observers.length > 0) {
      this._observers.forEach(function iterator(observer) {
        observer.disconnect();
      }, this);
    }

    // Remove callee <-> caller reference before we remove the window.
    if (this.activityCaller) {
      delete this.activityCaller.activityCallee;
      delete this.activityCaller;
    }

    if (this.activityCallee) {
      if (this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.kill();
      } else if (this.activityCallee instanceof AppWindow) {
        delete this.activityCallee.activityCaller;
        delete this.activityCallee;
      } else {
        // TODO: any new Window type is manipulated here.
      }
    }

    // If the app is the currently displayed app, switch to the homescreen
    if (this.isActive() && !this.isHomescreen) {
      // XXX: Refine this in transition state controller.
      var self = this;
      this.element.addEventListener('_closed', function onClosed() {
        window.removeEventListener('_closed', onClosed);
        self.destroy();
      });
      this.requestClose();
    } else {
      this.destroy();
    }
    this.publish('terminated');
  };

  AppWindow.prototype.destroy = function aw_destroy() {
    this.publish('willdestroy');
    this.uninstallSubComponents();
    if (this.element) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
    this.publish('destroyed');
  };

  AppWindow.prototype.containerElement = document.getElementById('windows');

  AppWindow.prototype.view = function aw_view() {
    return '<div class="appWindow" id="' + this.instanceID +
            '" transition-state="closed">' +
              '<div class="screenshot-overlay"></div>' +
              '<div class="fade-overlay"></div>' +
           '</div>';
  };

  AppWindow.prototype._render = function aw__render() {
    if (this._rendered)
      return;
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame(this.browser_config);
    this.element = document.getElementById(this.instanceID);

    // For gaiauitest usage.
    this.element.dataset.manifestName = this.manifest ? this.manifest.name : '';

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.iframe.dataset.frameType = 'window';
    this.iframe.dataset.frameOrigin = this.origin;

    if (this.isFullScreen()) {
      this.element.classList.add('fullscreen-app');
    }

    this.element.appendChild(this.browser.element);
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    // Launched as background: set visibility and overlay screenshot.
    if (this.config.stayBackground) {
      this.setVisible(false);
    }

    this.publish('rendered');
    this._rendered = true;
  };

  AppWindow.prototype.render = function aw_render() {
    this._render();
    this._registerEvents();
    this.installSubComponents();
    // Pre determine the rotation degree.
    this.determineRotationDegree();
  };

  AppWindow.registeredEvents =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
      '_localized', 'swipein', 'swipeout'];

  AppWindow.subComponents = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog
  };

  AppWindow.prototype.openAnimation = 'enlarge';
  AppWindow.prototype.closeAnimation = 'reduce';

  AppWindow.prototype.installSubComponents =
    function aw_installSubComponents() {
      this.debug('installing sub components...');
      for (var componentName in this.constructor.subComponents) {
        if (this.constructor.subComponents[componentName]) {
          this[componentName] =
            new this.constructor.subComponents[componentName](this);
        }
      }

      if (this.config.chrome) {
        this.appChrome = new AppChrome(this);
      }
    };

  AppWindow.prototype.uninstallSubComponents =
    function aw_uninstallSubComponents() {
      for (var componentName in this.subComponents) {
        if (this[componentName]) {
          this[componentName].destroy();
          this[componentName] = null;
        }
      }

      if (this.config.chrome) {
        this.appChrome.destroy();
        this.appChrome = null;
      }
    };

  AppWindow.prototype._handle__localized = function aw__handle__localized() {
    if (!this.manifest)
      return;
    this.name = new ManifestHelper(this.manifest).name;
    // For uitest.
    this.element.dataset.localizedName = this.name;
  };

  AppWindow.prototype._handle_mozbrowservisibilitychange =
    function aw__handle_mozbrowservisibilitychange(evt) {
      var type = evt.detail.visible ? 'foreground' : 'background';
      this.publish(type);
    };

  AppWindow.prototype._handle_mozbrowseractivitydone =
    function aw__handle_mozbrowseractivitydone(evt) {
      // In case we're not ActivityWindow but we're launched
      // as window disposition activity.
      if (this.activityCaller &&
          this.activityCaller instanceof AppWindow) {
        this.activityCaller = null;
        this.activityCaller.activityCallee = null;
        this.activityCaller.requestOpen();
      }
    };

  AppWindow.prototype._handle_mozbrowserclose =
    function aw__handle_mozbrowserclose(evt) {
      this.kill();
    };

  AppWindow.prototype._handle_mozbrowsererror =
    function aw__handle_mozbrowsererror(evt) {
      if (evt.detail.type !== 'fatal')
        return;
      // If the crashing app is currently displayed, we will present
      // the user with a banner notification.
      if (this.isActive()) {
        CrashReporter.setAppName(this.name);
      }
      this.kill();
    };

  AppWindow.prototype._handle_mozbrowserloadstart =
    function aw__handle_mozbrowserloadstart(evt) {
      this.loading = true;
      this._changeState('loading', true);
      this.publish('loading');
    };

  AppWindow.prototype._handle_mozbrowserloadend =
    function aw__handle_mozbrowserloadend(evt) {
      if (!this.loaded) {
        this.publish('loadtime', {
          time: parseInt(Date.now() - this._start),
          type: 'c'
        });
      }
      this.loading = false;
      this.loaded = true;
      this._changeState('loading', false);
      this.publish('loaded');
      var backgroundColor = evt.detail.backgroundColor;
      this.debug('bgcolor= ', backgroundColor);
      /* When rotating the screen, the child may take some time to reflow.
       * If the child takes longer than layers.orientation.sync.timeout
       * to respond, gecko will go ahead and draw anyways. This code
       * uses a simple heuristic to guess the least distracting color
       * we should draw in the blank space. */

      /* Only allow opaque colors */
      // TODOEVME - this kept throwing errors when homescreen launched,
      // bgcolor was null
      if (backgroundColor && backgroundColor.indexOf('rgb(') != -1) {
        this.debug('setting background color..');
        this.browser.element.style.backgroundColor = backgroundColor;
      }
    };

  AppWindow.prototype._handle_mozbrowserlocationchange =
    function aw__handle_mozbrowserlocationchange() {
      this.config.url = evt.detail;
    };

  AppWindow.prototype._registerEvents = function aw__registerEvents() {
    this.constructor.registeredEvents.forEach(function iterator(evt) {
      this.element.addEventListener(evt, this);
    }, this);
  };

  /**
   * General event handler interface.
   * Child classes shouldn't change this.
   * @param  {DOMEvent} evt The event
   */
  AppWindow.prototype.handleEvent = function aw_handleEvent(evt) {
    this.debug(' Handling ' + evt.type + ' event...');
    if (this['_handle_' + evt.type]) {
      this.debug(' Handling ' + evt.type + ' event...');
      this['_handle_' + evt.type](evt);
    }
  };

  /**
   * A temp variable to store current screenshot blob.
   * We should store the blob and create objectURL
   * once we need to display the image,
   * and revoke right away after we finish rendering the image.
   */
  AppWindow.prototype._screenshotBlob = undefined;

  AppWindow.prototype.CLASS_NAME = 'AppWindow';

  AppWindow.prototype.debug = function aw_debug(msg) {
    if (DEBUG || this._DEBUG) {
      console.log('[' + this.CLASS_NAME + ']' +
        '[' + (this.name || this.origin) + ']' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };

  // Force debug output.
  AppWindow.prototype.forceDebug = function aw_debug(msg) {
    console.log('[' + this.CLASS_NAME + ']' +
      '[' + (this.name || this.origin) + ']' +
      '[' + System.currentTime() + ']' +
      Array.slice(arguments).concat());
  };

  AppWindow.prototype.show = function aw_show() {
    if (!this.isActive()) {
      this.element.classList.add('active');
    }
  };

  AppWindow.prototype.hide = function aw_hide() {
    if (this.isActive()) {
      this.element.classList.remove('active');
    }
  };

  /**
   * Wait for a full repaint of the mozbrowser iframe.
   */
  AppWindow.prototype.ensureFullRepaint = function onFullRepaint(callback) {
    if (!callback)
      return;

    this.getScreenshot(function() {
      setTimeout(callback);
    }, 1, 1);
  };

  /**
   * Request a screenshot ObjectURL temporarily.
   * The image would be discarded after 200ms or the revoke callback
   * is invoked.
   */
  AppWindow.prototype.requestScreenshotURL =
    function aw__requestScreenshotURL() {
      if (!this._screenshotBlob) {
        return null;
      }
      var screenshotURL = URL.createObjectURL(this._screenshotBlob);
      var self = this;
      setTimeout(function onTimeout() {
        if (screenshotURL) {
          URL.revokeObjectURL(screenshotURL);
          screenshotURL = null;
        }
      }, 200);

      return screenshotURL;
    };

  /**
   * Show screenshot overlay and hide the iframe.
   */
  AppWindow.prototype._showScreenshotOverlay =
    function aw__showScreenshotOverlay() {
      this.getScreenshot(function onGettingScreenshot(screenshotBlob) {
        // If the callback is too late,
        // and we're brought to foreground by somebody.
        if (this._screenshotOverlayState == 'frame')
          return;

        if (!screenshotBlob) {
          // If no screenshot,
          // still hide the frame.
          this._hideFrame();
          return;
        }

        var screenshotURL = this.requestScreenshotURL();

        this.screenshotOverlay.style.backgroundImage =
          'url(' + screenshotURL + ')';
        this.screenshotOverlay.classList.add('visible');

        if (!this.iframe.classList.contains('hidden'))
          this._hideFrame();
      }.bind(this));
    };

  /**
   * Check if current visibility state is screenshot or not,
   * to hide the screenshot overlay.
   */
  AppWindow.prototype._hideScreenshotOverlay =
    function aw__hideScreenshotOverlay() {
      if (this._screenshotOverlayState != 'screenshot' &&
          this.screenshotOverlay.classList.contains('visible'))
        this.screenshotOverlay.classList.remove('visible');
    };

  // Get cached screenshot Blob if there is one.
  // Note: the caller should revoke the created ObjectURL once it's finishing.
  AppWindow.prototype.getCachedScreenshotBlob =
    function aw_getCachedScreenshotBlob() {
      return this._screenshotBlob;
    };

  // Save and update screenshot Blob.
  AppWindow.prototype.renewCachedScreenshotBlob =
    function aw_renewScreenshot(screenshotBlob) {
      this._screenshotBlob = screenshotBlob;
    };

  /**
   * Event prefix presents the object type
   * when publishing an event from the element.
   * Always 'app' for now.
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
    // Dispatch internal event before external events.
    this.broadcast(event, detail);
    var evt = new CustomEvent(this.eventPrefix + event,
                {
                  bubbles: true,
                  detail: detail || this
                });

    this.debug(' publishing external event: ' + event);

    // Publish external event.
    window.dispatchEvent(evt);
  };

  AppWindow.prototype.broadcast = function aw_broadcast(event, detail) {
    // Broadcast internal event.
    if (this.element) {
      var internalEvent = new CustomEvent('_' + event,
                            {
                              bubbles: false,
                              detail: detail || this
                            });

      this.debug(' publishing internal event: ' + event);
      this.element.dispatchEvent(internalEvent);
    }
  };

  var OrientationRotationArray = [
    'portrait-primary', 'portrait-secondary', 'portrait',
    'landscape-primary', 'landscape-secondary', 'landscape', 'default'];

  var OrientationRotationTable = {
    'portrait-primary': [0, 180, 0, 90,
                270, 90, OrientationManager.isDefaultPortrait() ? 0 : 90],
    'landscape-primary': [270, 90, 270, 0,
                180, 0, OrientationManager.isDefaultPortrait() ? 270 : 0],
    'portrait-secondary': [180, 0, 180, 270,
                90, 270, OrientationManager.isDefaultPortrait() ? 180 : 270],
    'landscape-secondary': [90, 270, 90, 180,
                0, 180, OrientationManager.isDefaultPortrait() ? 180 : 90]
  };

  AppWindow.prototype.determineRotationDegree =
    function aw__determineRotationDegree() {
      if (!this.manifest)
        return 0;

      var appOrientation = this.manifest.orientation;
      var orientation = this.determineOrientation(appOrientation);
      var table =
        OrientationRotationTable[OrientationManager.defaultOrientation];
      var degree = table[OrientationRotationArray.indexOf(orientation)];
      this.rotatingDegree = degree;
      if (degree == 90 || degree == 270) {
        this.element.classList.add('perpendicular');
      }
      return degree;
    };

  AppWindow.prototype.determineClosingRotationDegree =
    function aw__determineClosingRotationDegree() {
      if (!this.manifest)
        return 0;

      // XXX: Assume homescreen's orientation is just device default.
      var homeOrientation = OrientationManager.defaultOrientation;
      var currentOrientation = OrientationManager.fetchCurrentOrientation();
      this.debug(currentOrientation);
      var table = OrientationRotationTable[homeOrientation];
      var degree = table[OrientationRotationArray.indexOf(currentOrientation)];
      return Math.abs(360 - degree) % 360;
    };

  /**
   * Detect whether this is a full screen app by its manifest.
   * @return {Boolean} We're a fullscreen app or not.
   */
  AppWindow.prototype.isFullScreen = function aw_isFullScreen() {
    if (typeof(this._fullScreen) !== 'undefined') {
      return this._fullScreen;
    }
    // Fullscreen
    this._fullScreen = this.manifest &&
      ('fullscreen' in this.manifest ? this.manifest.fullscreen : false);

    return this._fullScreen;
  };

  AppWindow.prototype._defaultOrientation = null;

  AppWindow.prototype.determineOrientation =
    function aw_determineOrientation(orientation) {
      if (this._defaultOrientation) {
        return this._defaultOrientation;
      } else if (!orientation) {
        this._defaultOrientation = 'default';
        return this._defaultOrientation;
      }

      if (!Array.isArray(orientation))
        orientation = [orientation];

      this._defaultOrientation = orientation[0];

      return this._defaultOrientation;
    };

  AppWindow.prototype.calibratedHeight = function aw_calibratedHeight() {
    if (this.appChrome &&
        !this.appChrome.hidingNavigation) {
      return -5;
    } else {
      return 0;
    }
  };

  AppWindow.prototype._resize = function aw__resize() {
    this.debug('force RESIZE...active? ', this.isActive());
    if (LayoutManager.keyboardEnabled) {
      this.broadcast('withkeyboard');
    } else {
      this.broadcast('withoutkeyboard');
    }
    if (this.isFullScreen()) {
      this.height = LayoutManager.fullscreenHeight + this.calibratedHeight();
    } else {
      this.height = LayoutManager.usualHeight + this.calibratedHeight();
    }

    // If we have sidebar in the future, change LayoutManager then.
    this.width = LayoutManager.width;

    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';

    this.publish('resize');
    this.debug('W:', this.width, 'H:', this.height);

    // TODO: Put ActivityWindow resize logic inside AppWindow
    // seems strange.
    if (this.activityCallee &&
        this.activityCallee instanceof ActivityWindow) {
      this.activityCallee.resize();
    }
  };

  // Set the size of the app's iframe to match the size of the screen.
  // We have to call this on resize events (which happen when the
  // phone orientation is changed). And also when an app is launched
  // and each time an app is brought to the front, since the
  // orientation could have changed since it was last displayed
  //
  // An appWindow instance only resizes if it's active.
  // Since we already pre-config the size in window.css,
  // if an app is launched by system message we don't need to resize
  // it.
  AppWindow.prototype.resize = function aw_resize() {
    this.debug('request RESIZE...active? ', this.isActive());
    if (!this.isActive()) {
      return;
    }
    this._resize();
    this.resized = true;
  };

  AppWindow.prototype.setOrientation =
    function aw_setOrientation(noCapture) {
      var manifest = this.manifest || this.config.manifest;
      var orientation = manifest ? (manifest.orientation ||
                        OrientationManager.globalOrientation) :
                        OrientationManager.globalOrientation;
      if (orientation) {
        var rv = false;
        if ('lockOrientation' in screen) {
          rv = screen.lockOrientation(orientation);
        } else if ('mozLockOrientation' in screen) {
          rv = screen.mozLockOrientation(orientation);
        }
        if (rv === false) {
          console.warn('screen.mozLockOrientation() returned false for',
                       this.origin, 'orientation', orientation);
        } else {
          this.debug(' locking screen orientation to ' + orientation);
        }
      } else {  // If no orientation was requested, then let it rotate
        if ('unlockOrientation' in screen) {
          screen.unlockOrientation();
        } else if ('mozUnlockOrientation' in screen) {
          screen.mozUnlockOrientation();
        }
        this.debug(' Unlocking screen orientation..');
      }

      // TODO: Mayb have orientation manager to do this.
      if (!noCapture && this.activityCallee &&
          this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.setOrientation(noCapture);
      }
    };


  AppWindow.prototype.fadeOut = function aw__fadeout() {
    this.element.classList.add('fadeout');
    this.debug(' fade out >>>> ');
  };

  AppWindow.prototype.fadeIn = function aw__fadein() {
    this.element.classList.remove('fadeout');
    this.debug(' fade in <<<<< ');
  };

  AppWindow.prototype.setActivityCallee =
    function aw_setActivityCallee(callee) {
      this.activityCallee = callee;
    };

  AppWindow.prototype.unsetActivityCallee =
    function aw_setActivityCallee() {
      this.activityCallee = null;
    };

  /**
   * Acquire one-time callback of certain type of state
   * XXX: Still unstable.
   */
  AppWindow.prototype.one = function aw_one(type, state, callback) {
    var self = this;
    var observer = new MutationObserver(function(mr, o) {
      if (self.element.getAttribute(type + '-state') === state) {
        self.debug('observing ' + type + ' ===> ' + state);
        callback();
        o.disconnect();
      }
    });

    // configuration of the observer:
    // we only care dataset change here.
    var config = { attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(this.element, config);
  };


  /**
   * Continues monitor certain type of state change.
   * XXX: Still unstable
   */
  AppWindow.prototype.once = function aw_once(type, state, callback) {
    var self = this;
    var observer = new MutationObserver(function(mr, o) {
      if (self.element.getAttribute(type + '-state') === state) {
        self.debug('observing ' + type + ' ===> ' + state);
        callback();
      }
    });

    // configuration of the observer:
    // we only care dataset change here.
    var config = { attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(this.element, config);

    // Store the new observers.
    if (!this._observers) {
      this._observers = [];
    }

    this._observers.push(observer);
  };

  /**
   * Modify an attribute on this.element
   * @param  {String} type  State type.
   * @param  {String} state State name.
   */
  AppWindow.prototype._changeState = function aw__changeState(type, state) {
    if (this.element)
      this.element.setAttribute(type + '-state', state.toString());
  };

  /**
   * Mixin the appWindow prototype with {mixin} object.
   * @param  {Object} mixin The object to be mixed.
   */
  AppWindow.addMixin = function AW_addMixin(mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        // Put event handler function into an array,
        // if the name of the propery is '_on'.
        if (!this.prototype.hasOwnProperty(prop)) {
          this.prototype[prop] = mixin[prop];
        }
      }
    }
  };

  AppWindow.prototype.preloadSplash = function aw_preloadSplash() {
    if (this._splash || this.config.icon) {
      var a = document.createElement('a');
      a.href = this.config.origin;
      if (this.config.icon) {
        this._splash = this.config.icon;
      } else {
        this._splash = a.protocol + '//' + a.hostname + ':' +
                    (a.port || 80) + this._splash;
      }
      // Start to load the image in background to avoid flickering if possible.
      var img = new Image();
      img.src = this._splash;
      setTimeout(this.setFrameBackground.bind(this));
    }
  };

  AppWindow.prototype.getIconForSplash =
    function aw_getIconForSplash(manifest) {
      var icons = this.manifest ?
        ('icons' in this.manifest ? this.manifest['icons'] : null) : null;
      if (!icons) {
        return null;
      }

      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });

      sizes.sort(function(x, y) { return y - x; });

      var index = 0;
      var width = LayoutManager.clientWidth;
      for (var i = 0; i < sizes.length; i++) {
        if (sizes[i] < width) {
          index = i;
          break;
        }
      }

      this._splash = icons[sizes[index]];

      return icons[sizes[index]];
    };

  /**
   * Set splash as our inital background.
   * If the content is loaded then just skip.
   */
  AppWindow.prototype.setFrameBackground =
    function aw_setFrameBackground() {
      if (!this.loaded && !this.splashed) {
        this.splashed = true;
        this.element.style.backgroundImage = 'url("' + this._splash + '")';
      }
    };

  AppWindow.prototype.requestOpen = function aw_requestOpen() {
    this.publish('requestopen');
  };

  AppWindow.prototype.requestClose = function aw_requestClose() {
    this.publish('requestclose');
  };

  /**
   * Change URL only when we're at background.
   * @param  {String} url URL.
   */
  AppWindow.prototype.modifyURLatBackground = function aw_changeURL(url) {
    // If the app is in foreground, it's too risky to change it's
    // URL. We'll ignore this request.
    if (!this.isActive()) {
      var iframe = this.browser.element;
      // If the app is opened and it is loaded to the correct page,
      // then th=ere is nothing to do.
      if (iframe.src !== url) {
        // Rewrite the URL of the app frame to the requested URL.
        // XXX: We could ended opening URls not for the app frame
        // in the app frame. But we don't care.
        iframe.src = url;
      }
    }
  };

  /**
   * Do resize and/or ensure repaint before opening the app.
   * @param  {Function} callback Callback when app is ready to be opened.
   */
  AppWindow.prototype.ready = function aw_ready(callback) {
    if (this.loaded) {
      this._start = Date.now();
    }
    if (this.element) {
      this.debug('requesting to open');
      if (!this.loaded) {
        this.debug('loaded yet');
        // Only resize after the resize function is called once.
        if (this.resized) {
          // We would trigger reflow if the element is resized before.
          this._resize();
          // Reset resized.
          this.resized = false;
        }
        setTimeout(callback);
      } else {
        this.debug('loaded');
        var invoked = false;
        // Only resize after the resize function is called once.
        if (this.resized) {
          // We would trigger reflow if the element is resized before.
          this._resize();
          // Reset resized.
          this.resized = false;
        }
        this.waitForNextPaint(function() {
          if (invoked)
            return;
          invoked = true;
          setTimeout(callback);
        });
        this.ensureFullRepaint(function() {
          if (invoked)
            return;
          invoked = true;
          setTimeout(callback);
        });
      }
    }
  };

  /**
   * Open the window; the detail is done in appTransitionController.
   * @param  {[String} animation The animation class name
   */
  AppWindow.prototype.open = function aw_open(animation) {
    // Request "open" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.requireOpen(animation);
    }
  };

  /**
   * Close the window; the detail is done in appTransitionController.
   * @param  {String} animation The animation class name
   */
  AppWindow.prototype.close = function aw_close(animation) {
    // Request "close" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.requireClose(animation);
    }
  };

  AppWindow.prototype._handle_swipein = function aw_swipein() {
    // Request "open" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.changeTransitionState('opened');
    }
  };

  AppWindow.prototype._handle_swipeout = function aw_swipeout() {
    // Request "close" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.changeTransitionState('closed');
    }
  };

}(this));
