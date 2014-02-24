'use strict';
/* global AppWindow, Applications, BrowserConfigHelper */

(function(exports) {
  var _id = 0;
  /**
   * KeyboardWindow creates a instance of keyboard by given manifestURL.
   *
   * @class KeyboardWindow
   * @param {String} manifestURL The manifestURL of the keyboard app.
   */
  var KeyboardWindow = function KeyboardWindow(config) {
    this.config = config.
    this.instanceID = 'keyboard' + _id++;
    this.setBrowserConfig(config.manifestURL);
    this.render();
    this.publish('created');
    return this;
  };

  /**
   * Fired when the keyboard window is created.
   * @event KeyboardWindow#keyboardcreated
   */
  /**
   * Fired when the keyboard window is removed.
   * @event KeyboardWindow#keyboardterminated
   */
  /**
   * Fired when the keyboard window is opening.
   * @event KeyboardWindow#keyboardopening
   */
  /**
   * Fired when the keyboard window is opened.
   * @event KeyboardWindow#keyboardopen
   */
  /**
   * Fired when the keyboard window is cloing.
   * @event KeyboardWindow#keyboardclosing
   */
  /**
   * Fired when the keyboard window is closed.
   * @event KeyboardWindow#keyboardclose
   */
  /**
   * Fired before the keyboard window is rendered.
   * @event KeyboardWindow#keyboardwillrender
   */
  /**
   * Fired when the keyboard window is rendered to the DOM tree.
   * @event KeyboardWindow#keyboardrendered
   */
  /**
   * Fired when the page visibility of the keyboard window is
   * changed to foreground.
   * @event KeyboardWindow#keyboardforeground
   */
  /**
   * Fired when the page visibility of the keyboard window is
   * changed to background.
   * @event KeyboardWindow#keyboardbackground
   */

  KeyboardWindow.prototype.__proto__ = AppWindow.prototype;

  KeyboardWindow.prototype._DEBUG = false;

  KeyboardWindow.prototype.CLASS_NAME = 'KeyboardWindow';

  /**
   * Construct browser config object by manifestURL.
   * @param {String} manifestURL The manifestURL of keyboard.
   */
  KeyboardWindow.prototype.setBrowserConfig =
    function hw_setBrowserConfig() {
      var app = Applications.getByManifestURL(this.config.manifestURL);
      this.origin = app.origin;
      this.manifestURL = app.manifestURL;
      this.url = app.origin + this.config.path;

      this.browser_config =
        new BrowserConfigHelper(this.origin, this.manifestURL);

      // Necessary for b2gperf now.
      this.name = this.browser_config.name;

      this.manifest = this.browser_config.manifest;
      // XXX: Remove this hardcode
      this.browser_config.url = this.url;
    };

  KeyboardWindow.REGISTERED_EVENTS =
    ['_opening', 'mozbrowserclose', 'mozbrowsererror',
      'mozbrowservisibilitychange', 'mozbrowserloadend', 'mozbrowserresize'];

  KeyboardWindow.SUB_COMPONENTS = {};

  KeyboardWindow.prototype.openAnimation = 'slide-up';
  KeyboardWindow.prototype.closeAnimation = 'slide-down';
  KeyboardWindow.prototype.containerElement =
    document.getElementById('keyboard');

  KeyboardWindow.prototype._handle__opening = function hw__handle__opening() {
    this.ensure();
  };

  KeyboardWindow.prototype._handle_mozbrowserclose =
    function hw__handle_mozbrowserclose(evt) {
      evt.stopImmediatePropagation();
      this.restart();
    };

  KeyboardWindow.prototype._handle_mozbrowsererror =
    function hw__handle_mozbrowsererror(evt) {
      if (evt.detail.type == 'fatal') {
        evt.stopImmediatePropagation();
        this.publish('crashed');
        this.restart();
      }
    };

  KeyboardWindow.prototype.restart = function hw_restart() {
    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)

    // If we're displayed, restart immediately.
    if (this.isActive()) {
      this.kill();

      // XXX workaround bug 810431.
      // we need this here and not in other situations
      // as it is expected that keyboard frame is available.
      setTimeout(function() {
        this.render();
        this.open();
      }.bind(this));
    } else {
      // Otherwise wait until next opening request.
      this.kill();
    }
  };

  KeyboardWindow.prototype.kill = function hw_kill() {
    this.destroy();
    this.publish('terminated');
  };

  KeyboardWindow.prototype.view = function hw_view() {
    return '<div class="appWindow keyboard" id="keyboard">' +
              '<div class="fade-overlay"></div>' +
           '</div>';
  };

  KeyboardWindow.prototype.eventPrefix = 'keyboard';

  KeyboardWindow.prototype.toggle = function hw_toggle(visible) {
    this.ensure();
    if (this.browser.element) {
      this.setVisible(visible);
    }
  };

  // Ensure the keyboard is loaded and return its frame.  Restarts
  // the keyboard app if it was killed in the background.
  // Note: this function would not invoke openWindow(keyboard),
  // which should be handled in setDisplayedApp and in closeWindow()
  KeyboardWindow.prototype.ensure = function hw_ensure(reset) {
    if (!this.element) {
      this.render();
    } else if (reset) {
      this.browser.element.src = this.browser_config.url + new Date();
    }

    return this.element;
  };

  /**
   * Render the mozbrowser iframe and some overlays.
   * @inner
   */
  KeyboardWindow.prototype._render = function kw__render() {
    if (this.element) {
      return;
    }
    /**
     * Fired before this element is appended to the DOM tree.
     * @event AppWindow#appwillrender
     */
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new self.BrowserFrame(this.browser_config);
    this.element = document.getElementById(this.instanceID);
    this.browser.element.setAttribute('mozapptype', 'inputmethod');
    this.browser.element.setAttribute('mozbrowser', 'true');
    this.browser.element.setAttribute('mozpasspointerevents', 'true');
    this.browser.element.setAttribute('mozapp', this.layout.manifestURL);

    if (this._enableOOP) {
      this.browser.element.setAttribute('remote', 'true');
      this.browser.element.setAttribute('ignoreuserfocus', 'true');
    }

    // For gaiauitest usage.
    this.element.dataset.manifestName = this.manifest ? this.manifest.name : '';

    this.element.appendChild(this.browser.element);
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');

    /**
     * Fired after the app window element is appended to the DOM tree.
     * @event AppWindow#apprendered
     */
    this.publish('rendered');
    this._rendered = true;
  };

  exports.KeyboardWindow = KeyboardWindow;
}(window));
