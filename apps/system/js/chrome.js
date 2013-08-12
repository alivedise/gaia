(function(window) {
  var _ = navigator.mozL10n.get;

  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  var Chrome = function Chrome(app, config) {
    this.app = app;
    this.config = config;
    this.container = app.element;
    this.render();
    this.registerApp(app);
  };

  Chrome.className = 'chrome';

  Chrome.prototype.__proto__ = SystemUI.prototype;

  Chrome.prototype.isButtonBarDisplayed = false;

  Chrome.prototype.buttonBarTimeout = null;

  Chrome.prototype.view = function chrome_view() {
    return '<header class="progress"></header>' +
    '<footer class="navigation closed">' +
      '<div class="puller"></div>' +
      '<menu type="buttonbar">' +
        '<button type="button" class="back-button" data-disabled="disabled"></button>' +
        '<button type="button" class="forward-button" data-disabled="disabled"></button>' +
        '<button type="button" class="reload-button"></button>' +
        '<button type="button" class="bookmark-button" data-disabled="disabled"></button>' +
        '<button type="button" class="close-button"></button>' +
      '</menu>' +
    '</footer>';
  };

  Chrome.prototype.getAllElements = function chrome_getAllElements() {
    this.element = this.container.querySelector(Chrome.className);
    this.progress = this.element.querySelector('.progress');
    this.navigation = this.element.querySelector('.navigation');
    this.backButton = this.element.querySelector('.back-button');
    this.forwardButton = this.element.querySelector('.forward-button');
    this.reloadButton = this.element.querySelector('.reload-button');
    this.bookmarkButton = this.element.querySelector('.bookmark-button');
    this.closeButton = this.element.querySelector('.close-button');
  };

  Chrome.prototype.registerApp = function chrome_registerApp() {
    // Make a observer pattern if possible.
    var browser = this.app.browser.element;
    browser.addEventListener('mozbrowserloadstart',
      function() {
        this.show(this.progress);
      }.bind(this));

    browser.addEventListener('mozbrowserloadend',
      function() {
        this.hide(this.progress);
      }.bind(this));

    browser.addEventListener('mozbrowserlocationchange',
      function() {

      }.bind(this));
  };

  Chrome.prototype.clearButtonBarTimeout =
    function chrome_clearButtonBarTimeout() {
      clearTimeout(this.buttonBarTimeout);
      this.buttonBarTimeout =
        setTimeout(this.toggleButtonBar.bind(this), BUTTONBAR_TIMEOUT);
    }

  Chrome.prototype.goForward = function chrome_goForward() {
    this.clearButtonBarTimeout();
    this.app.browser.element.goForward();
  };

  Chrome.prototype.goBack = function chrome_goBack() {
    this.clearButtonBarTimeout();
    this.app.browser.element.goBack();
  };

  Chrome.prototype.reload = function chrome_reload() {
    this.clearButtonBarTimeout();
    this.app.browser.element.reload(true);
  };

  Chrome.prototype.toggleButtonBar = 
    function chrome_toggleButtonBar(time) {
      window.clearTimeout(this.buttonBarTimeout);
      this.navigation.classList.toggle('closed');
      this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
      if (isButtonBarDisplayed) {
        this.buttonBarTimeout = 
          window.setTimeout(this.toggleButtonBar.bind(this),
                            time || BUTTONBAR_TIMEOUT);
      }
    };

  Chrome.prototype.onDisplayedApplicationChange = 
    function chrome_onDisplayedApplicationChange() {
      this.toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);

      var dataset = currentAppIframe().dataset;
      if (dataset.originURL || dataset.searchURL) {
        delete this.bookmarkButton.dataset.disabled;
        return;
      }

      this.bookmarkButton.dataset.disabled = true;
    };

  Chrome.prototype.onLocationChanged =
    function chrome_onLocationChanged() {
      var browser = this.app.browser.element;
      var self = this;
      browser.getCanGoForward().onsuccess =
        function forwardSuccess(evt) {
          if (evt.target.result === true) {
            delete self.forwardButton.dataset.disabled;
          } else {
            self.forwardButton.dataset.disabled = true;
          }
        };

      browser.getCanGoBack().onsuccess = function backSuccess(evt) {
        if (evt.target.result === true) {
          delete self.backButton.dataset.disabled;
        } else {
          self.backButton.dataset.disabled = true;
        }
      };
    };

  window.Chrome = Chrome;
}(this));