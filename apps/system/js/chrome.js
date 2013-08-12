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
    return '<header class="chrome progress"></header>' +
    '<footer class="chrome navigation closed visible">' +
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
    this.progress = this.container.querySelector('.progress');
    this.navigation = this.container.querySelector('.navigation');
    this.backButton = this.container.querySelector('.back-button');
    this.forwardButton = this.container.querySelector('.forward-button');
    this.reloadButton = this.container.querySelector('.reload-button');
    this.bookmarkButton = this.container.querySelector('.bookmark-button');
    this.closeButton = this.container.querySelector('.close-button');
    this.puller = this.container.querySelector('.puller');

    this.puller.addEventListener('mousedown',
      this.toggleButtonBar.bind(this));

    this.closeButton.addEventListener('mousedown',
      this.toggleButtonBar.bind(this));

    this.reloadButton.addEventListener('mousedown',
      this.reload.bind(this));

    this.backButton.addEventListener('mousedown',
      this.goBack.bind(this));

    this.forwardButton.addEventListener('mousedown',
      this.goForward.bind(this));

    this.bookmarkButton.addEventListener('mousedown',
      this.addBookmark.bind(this));
  };

  Chrome.prototype.addBookmark = function chrome_addBookmark() {
    // TODO: refactor this whole function.
    if (this.bookmarkButton.dataset.disabled)
      return;

    this.clearButtonBarTimeout();
    var appConfig = this.app.config;
    var self = this;

    function selected(value) {
      if (!value)
        return;

      var name, url;
      if (value === 'origin') {
        name = config.originName;
        url = config.originURL;
      }

      if (value === 'search') {
        name = config.searchName;
        url = config.searchURL;
      }

      var activity = new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: url,
          name: name,
          icon: config.icon,
          useAsyncPanZoom: config.useAsyncPanZoom,
          iconable: false
        }
      });

      activity.onsuccess = function onsuccess() {
        // XXX: ???
        if (value === 'origin') {
          delete config.originURL;
        }

        // XXX: ???
        if (value === 'search') {
          delete config.searchURL;
        }

        if (!config.originURL &&
          !config.searchURL) {
          self.bookmarkButton.dataset.disabled = true;
        }
      };
    }

    var data = {
      title: _('add-to-home-screen'),
      options: []
    };

    if (config.originURL) {
      data.options.push({ id: 'origin', text: config.originName });
    }

    if (config.searchURL) {
      data.options.push({ id: 'search', text: config.searchName });
    }

    ModalDialog.selectOne(data, selected);
  };

  Chrome.prototype.registerApp = function chrome_registerApp() {
    // Make a observer pattern if possible.
    var browser = this.app._browser.element;
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
        this.onLocationChanged();
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
    this.app._browser.element.goForward();
  };

  Chrome.prototype.goBack = function chrome_goBack() {
    this.clearButtonBarTimeout();
    this.app._browser.element.goBack();
  };

  Chrome.prototype.reload = function chrome_reload() {
    this.clearButtonBarTimeout();
    this.app._browser.element.reload(true);
  };

  Chrome.prototype.toggleButtonBar = 
    function chrome_toggleButtonBar() {
      window.clearTimeout(this.buttonBarTimeout);
      this.navigation.classList.toggle('closed');
      this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
      if (this.isButtonBarDisplayed) {
        this.buttonBarTimeout = 
          window.setTimeout(this.toggleButtonBar.bind(this),
                            BUTTONBAR_TIMEOUT);
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
      var browser = this.app._browser.element;
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