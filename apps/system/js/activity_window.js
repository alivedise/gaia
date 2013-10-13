'use strict';

(function(window) {
  var _id = 0;

  var ActivityWindow = function ActivityWindow(config) {
    this.browser_config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    this.render();
    this.publish('created');
    this.open();
  };

  ActivityWindow.prototype.__proto__ = AppWindow.prototype;

  ActivityWindow.prototype.eventPrefix = 'activity';

  ActivityWindow.prototype.view = function acw_view() {
    this.instanceID = _id;
    var className = this.browser_config.inline ?
      'inline-activity' : 'window-activity';
    return '<div class="appWindow activityWindow active' +
            '" id="activity-window-' + _id++ + '">' +
            '<div class="screenshot-overlay></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  ActivityWindow.prototype._registerEvents = function acw__registerEvents() {
    this.element.
      addEventListener('transitionend', this._transitionHandler.bind(this));
  };

  ActivityWindow.prototype._transitionHandler =
    function acw__transitionHandler(evt) {
      //evt.stopImmeidiatePropagation();
      if (this.element.classList.contains('inline-activity')) {
        this.publish('open');
      }
    };

  ActivityWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame({
      origin: this.origin,
      url: this.url,
      name: this.name,
      manifest: this.manifest,
      manifestURL: this.manifestURL,
      oop: true
    });
    this.element =
      document.getElementById('activity-window-' + this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this._registerEvents();
    if (window.AppError) {
      this.error = new AppError(this);
    }
    this.publish('rendered');
  };

  /**
   * ActivityWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the activitywillrender event.
   */
  ActivityWindow.prototype.containerElement =
    document.getElementById('windows');

  ActivityWindow.prototype.open = function acw_open() {
    this.element.classList.add('inline-activity');
  };

  ActivityWindow.prototype.close = function acw_close() {
    this.element.classList.remove('inline-activity');
  };

  window.ActivityWindow = ActivityWindow;

}(this));
