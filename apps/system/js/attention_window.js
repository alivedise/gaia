'use strict';

(function(window) {
  var _id = 0;

  /**
   * AttentionWindow is the wrapper for the inline attention instances.
   * For window disposition attention, they are done in AppWindow.
   *
   * ##### Flow chart
   * <a href="http://i.imgur.com/4O1Frs3.png" target="_blank">
   * <img src="http://i.imgur.com/4O1Frs3.png"></img>
   * </a>
   *
   * @example
   * var app = new AppWindow({
   *   url: 'http://uitest.gaiamobile.org:8080/index.html',
   *   manifestURL: 'http://uitest.gaiamobile.org:8080/manifest.webapp'
   * });
   * var attention = new AttentionWindow({
   *   url: 'http://gallery.gaiamobile.org:8080/pick.html',
   *   manifestURL: 'http://gallery.gaiamobile.org:8080/manifest.webapp'
   * }, app);
   *
   * @class AttentionWindow
   * @param {Object} config The configuration object of this attention.
   * @param {AppWindow|AttentionWindow} caller The caller of this attention.
   */
  /**
   * Fired when the attention window is created.
   * @event AttentionWindow#attentioncreated
   */
  /**
   * Fired when the attention window is removed.
   * @event AttentionWindow#attentionterminated
   */
  /**
   * Fired when the attention window is opening.
   * @event AttentionWindow#attentionopening
   */
  /**
   * Fired when the attention window is opened.
   * @event AttentionWindow#attentionopen
   */
  /**
   * Fired when the attention window is cloing.
   * @event AttentionWindow#attentionclosing
   */
  /**
   * Fired when the attention window is closed.
   * @event AttentionWindow#attentionclose
   */
  /**
   * Fired before the attention window is rendered.
   * @event AttentionWindow#attentionwillrender
   */
  /**
   * Fired when the attention window is rendered to the DOM tree.
   * @event AttentionWindow#attentionrendered
   */
  /**
   * Fired when the page visibility of the attention window is
   * changed to foreground.
   * @event AttentionWindow#attentionforeground
   */
  /**
   * Fired when the page visibility of the attention window is
   * changed to background.
   * @event AttentionWindow#attentionbackground
   */
  var AttentionWindow = function AttentionWindow(config) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    this.render();
    this.publish('created');

    // We'll open ourselves automatically,
    // but maybe we should do requestOpen and let manager open us.
    var self = this;
    if (!this.loaded) {
      this.element.addEventListener('_loaded', function onLoaded() {
        self.element.removeEventListener('_loaded', onLoaded);
        self.open();
      });
    } else {
      this.open();
    }
  };

  AttentionWindow.prototype.__proto__ = AppWindow.prototype;

  AttentionWindow.prototype.eventPrefix = 'attention';

  AttentionWindow.prototype.CLASS_NAME = 'AttentionWindow';

  /**
   * Turn on this flag to dump debugging messages for all attention windows.
   * @type {Boolean}
   */
  AttentionWindow.prototype._DEBUG = true;

  AttentionWindow.prototype.openAnimation = 'slidedown';
  AttentionWindow.prototype.closeAnimation = 'slideup';

  AttentionWindow.prototype.view = function acw_view() {
    this.instanceID = _id;
    return '<div class="appWindow attentionWindow' +
            '" id="attention-window-' + _id++ + '">' +
            '<div class="attention-bar></div>' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  AttentionWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog
  };

  AttentionWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowserattentiondone', 'mozbrowserloadstart',
      '_localized', '_opened', '_closing', 'mozbrowserresize'];

  AttentionWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // the iframe is provided already.
    this.browser = {
      element: this.config.iframe
    };
    this.element =
      document.getElementById('attention-window-' + this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');
    /*
      this.attentionBar = this.element.querySelector('.attention-bar');
      this.attentionBar.addEventListener('click', function() {
        this.open();
      }.bind(this));
    */

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  /**
   * AttentionWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the attentionwillrender event.
   */
  AttentionWindow.prototype.containerElement =
    document.getElementById('windows');

  window.AttentionWindow = AttentionWindow;

}(this));
