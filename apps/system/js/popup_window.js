'use strict';

(function(window) {
  var _id = 0;

  /**
   * PopupWindow is the wrapper for the normal <code>window.open</code>
   * instances.
   *
   * @example
   * var app = new AppWindow({
   *   url: 'http://uitest.gaiamobile.org:8080/index.html',
   *   manifestURL: 'http://uitest.gaiamobile.org:8080/manifest.webapp'
   * });
   * var popup = new PopupWindow({
   *   url: 'http://gallery.gaiamobile.org:8080/pick.html',
   *   manifestURL: 'http://gallery.gaiamobile.org:8080/manifest.webapp'
   * }, app);
   *
   * @class PopupWindow
   * @param {Object} config The configuration object of this popup.
   * @param {AppWindow|popupWindow} caller The caller of this popup.
   */
  /**
   * Fired when the popup window is created.
   * @event PopupWindow#popupcreated
   */
  /**
   * Fired when the popup window is removed.
   * @event PopupWindow#popupterminated
   */
  /**
   * Fired when the popup window is opening.
   * @event PopupWindow#popupopening
   */
  /**
   * Fired when the popup window is opened.
   * @event PopupWindow#popupopen
   */
  /**
   * Fired when the popup window is cloing.
   * @event PopupWindow#popupclosing
   */
  /**
   * Fired when the popup window is closed.
   * @event PopupWindow#popupclose
   */
  /**
   * Fired before the popup window is rendered.
   * @event PopupWindow#popupwillrender
   */
  /**
   * Fired when the popup window is rendered to the DOM tree.
   * @event PopupWindow#popuprendered
   */
  /**
   * Fired when the page visibility of the popup window is
   * changed to foreground.
   * @event PopupWindow#popupforeground
   */
  /**
   * Fired when the page visibility of the popup window is
   * changed to background.
   * @event PopupWindow#popupbackground
   */
  var PopupWindow = function PopupWindow(config, caller) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    if (caller) {
      caller.nextWindow = this;
      this.previousWindow = caller;
      // Put popup in previous window's container.
      this.containerElement = this.previousWindow.element;
    }

    this.render();
    this.publish('created');
    // We'll open ourselves automatically,
    // but maybe we should do requestOpen and let manager open us.
    this.open();
  };

  PopupWindow.prototype.__proto__ = AppWindow.prototype;

  PopupWindow.prototype.eventPrefix = 'popup';

  PopupWindow.prototype.CLASS_NAME = 'popupWindow';

  PopupWindow.prototype._DEBUG = false;

  PopupWindow.prototype.openAnimation = 'slideleft';
  PopupWindow.prototype.closeAnimation = 'slideright';

  PopupWindow.prototype.view = function acw_view() {
    this.instanceID = _id;
    return '<div class="appWindow popupWindow' +
            '" id="popup-window-' + _id++ + '">' +
            '<section role="region" class="title-container skin-organic">' +
              '<header>' +
                '<button class="close">' +
                  '<span class="icon icon-close">close</span>' +
                '</button>' +
                '<h1 class="title"></h1>' +
                '<div id="popup-throbber"></div>' +
              '</header>' +
            '</section>' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  PopupWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog
  };

  PopupWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserloadstart',
      '_localized', '_opened', '_closing'];

  PopupWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // TODO: Use BrowserConfigHelper.
    if (this.config.frameElement) {
      this.browser = {
        element: this.config.frameElement
      };
      this.browser_config = {
        url: this.config.url
      };
    } else {
      this.browser_config = {
        origin: this.origin,
        url: this.url,
        name: this.name,
        manifest: this.manifest,
        manifestURL: this.manifestURL,
        window_name: 'inline' + this.instanceID,
        oop: true
      };
      this.browser = new BrowserFrame(this.browser_config);
    }
    this.element =
      document.getElementById('popup-window-' + this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  PopupWindow.prototype._handle_mozbrowserclose =
    function pw__handle_mozbrowserclose(evt) {
      evt.stopImmediatePropagation();
      this.kill(evt);
    };

  PopupWindow.prototype.kill = function pw_kill() {
    if (this._killed) {
      return;
    }

    this._killed = true;

    if (this.isActive()) {
      var self = this;
      this.element.addEventListener('_closed', function onClose() {
        self.element.removeEventListener('_closed', onClose);
        self.publish('terminated');
        self.destroy();
      });
      this.close();
    } else {
      this.publish('terminated');
      this.destroy();
    }
  };

  /**
   * popupWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the popupwillrender event.
   */
  PopupWindow.prototype.containerElement =
    document.getElementById('windows');

  window.PopupWindow = PopupWindow;
}(this));
