(function(window) {
  /**
   * ActivityWindow is exactly an specific app window but contains
   * a mozbrowser iframe runnign as an inline activity.
   * 
   * An ActivityWindow instance is created, managed by another AppWindow instance.
   *
   * That means an ActivityWindow instance could also opens another ActivityWindow instance.
   *
   * @param {AppWindow} app    The ActivityWindow opener. Will be stored at |this.parentWindow|.
   * @param {Object} config The configuration of the inline activity window.
   *
   * @extends {AppWindow}
   * @requires AppWindow
   * @class  ActivityWindow
   *
   * @example
   * var app = new AppWindow('http://uitest.gaiamobile.org:8080/index.html',
   *                         'http://uitest.gaiamobile.org:8080/manifest.webapp');
   * app.inlineActivityWindow = new ActivityWindow(app, new BrowserConfig(ACTIVITY_CONFIG));
   */
  window.ActivityWindow = function ActivityWindow(app, config) {
    this.config = config;

    /**
     * Specify we're belong to which appWindow instance.
     * @member {AppWindow}
     * @type {AppWindow}
     */
    this.parentWindow = app;

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('activitywillopen', true, true, { origin: config.origin });

    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame = createFrame(null, origin, url, name, manifest, manifestURL);
    var iframe = frame.firstChild;
    frame.classList.add('inlineActivity');
    iframe.dataset.frameType = 'inline-activity';

    iframe.setAttribute('expecting-system-message',
                        'expecting-system-message');
    maybeSetFrameIsCritical(iframe, origin);

    // Give a name to the frame for differentiating between main frame and
    // inline frame. With the name we can get frames of the same app using the
    // window.open method.
    iframe.name = 'inline';
    iframe.dataset.start = Date.now();

    this.resize();

    frame.addEventListener('mozbrowserloadend', function activityloaded(e) {
      e.target.removeEventListener(e.type, activityloaded, true);

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('activityloadtime', true, false, {
        time: parseInt(Date.now() - iframe.dataset.start),
        type: 'c', // Activity is always cold booted now.
        src: iframe.src
      });
      iframe.dispatchEvent(evt);
    }, true);

    // Add the iframe to the document
    windows.appendChild(frame);

    // Open the frame, first, store the reference
    openFrame = frame;

    setVisibilityForInlineActivity(true);

    setVisibilityForCurrentApp(false);

    if ('orientation' in manifest) {
      frame.dataset.orientation = manifest.orientation;
      setOrientationForInlineActivity(frame);
    }

    setFrameBackground(openFrame, function gotBackground() {
      // Start the transition when this async/sync callback is called.
      openFrame.classList.add('active');
      if (inlineActivityFrames.length == 1)
        activityCallerOrigin = displayedApp;
      if ('wrapper' in runningApps[displayedApp].frame.dataset) {
        wrapperFooter.classList.remove('visible');
        wrapperHeader.classList.remove('visible');
      }
    });

    this.config.iframe = this.iframe = iframe;
    this.config.frame = this.frame = frame;
  };

  /**
   * ActivityWindow is inherited from appWindow;
   */
  ActivityWindow.prototype.__proto__ = AppWindow.prototype;

  /**
   * The super class reference.
   * @private
   * @type {Function}
   */
  ActivityWindow.prototype._super = AppWindow;

  /**
   * Class name is used to add a type-specific class on the element.
   * We also use the CLASSNAME + _id to specify <code>element.id</code>.
   * @static
   * @type {String}
   */
  ActivityWindow.prototype.CLASSNAME = 'inlineActivity';

  ActivityWindow.prototype.resize = function actw_resize(width, height) {
    // Borrow the window size from parent window
    // Copy the dimension of the currently displayed app
    if (!this.parentWindow)
      return;

    // Traverse the inline activity chain to resize the latest one.
    if (this.inlineActivityWindow) {
      this.inlineActivityWindow.resize(width, height);
    } else {
      this.element.style.width = width;
      this.element.style.height = height;
    }
  }

  /**
   * Event prefix presents the object type
   * when publishing an event from the element.
   * @type {String}
   */
  ActivityWindow.eventPrefix = 'activity';

  /**
   * Destroy the window and release the resource.
   */
  ActivityWindow.prototype.kill = function actw_kill() {
    this.parentWindow = null;
    // If frame is transitioning we should remove the reference

    // If frame is never set visible, we can remove the frame directly
    // without closing transition
    if (!this.element.classList.contains('active')) {
      /**
       * @event ActivityWindow#activityterminated
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
}(this));