(function(window) {
  var _ = navigator.mozL10n.get;
  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  function AppWrapper(app) {
    this.CONTAINER = app.element;
    this.app = app;
    System.UI.apply(this, arguments);
  };

  AppWrapper.prototype = {
    __proto__: System.UI.prototype,

    ELEMENTS: ['header', 'footer', 'reload',
      'forward', 'back', 'close', 'bookmark', 'toggler'],

    _buttonBarTimeout: null,

    isButtonBarDisplayed: false,

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'loadstart':
          this.header.classList.add('visible');
          break;
        case 'loadend':
          this.header.classList.remove('visible');
          break;
        case 'keyboardchange':
          this.footer.classList.remove('visible');
          break;
        case 'keyboardhide':
          this.footer.classList.add('visible');
          break;
      }
    },

    show: function() {
      this.onLocationChange();
      this.onDisplayedApplicationChange();
    },

    hide: function() {
      clearTimeout(this._buttonBarTimeout);
      this.footer.classList.add('closed');
      ths.isButtonBarDisplayed = false;
    },

    view: function() {
      return '<header class="wrapper-activity-indicator visible header"></header>' +
        '<footer class="wrapper-footer visible footer" class="closed">' +
          '<div class="toggler"></div>' +
          '<menu type="buttonbar">' +
            '<button type="button" class="back" alt="Back" data-disabled="disabled"></button>' +
            '<button type="button" class="forward" alt="Forward" data-disabled="disabled"></button>' +
            '<button type="button" class="reload" alt="Reload"></button>' +
            '<button type="button" class="bookmark" alt="Bookmark" data-disabled="disabled"></button>' +
            '<button type="button" class="close" alt="Close"></button>' +
          '</menu>' +
        '</footer>';
    },

    _onrenderend: function() {
      this.elements.toggler.addEventListener('mousedown', this);
      this.elements.close.addEventListener('mousedown', this);
      this.elements.reload.addEventListener('click', this);
      this.elements.back.addEventListener('click', this);
      this.elements.forward.addEventListener('click', this);
      this.elements.bookmark.addEventListener('click', this);
    },

    toggleButtonBar: function(time) {
      clearTimeout(this._buttonBarTimeout);
      this.footer.classList.toggle('closed');
      this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
      if (this.isButtonBarDisplayed) {
        this._buttonBarTimeout = setTimeout(this.toggleButtonBar, time || BUTTONBAR_TIMEOUT);
      }
    },

    clearButtonBarTimeout: function() {
      clearTimeout(this._buttonBarTimeout);
      this._buttonBarTimeout =
        setTimeout(this.toggleButtonBar.bind(this), BUTTONBAR_TIMEOUT);
    },

    onLocationChange: function() {
      var self = this;
      this.app.getCanGoForward(function forwardSuccess(evt) {
          if (e.target.result === true) {
            delete self.forward.dataset.disabled;
          } else {
            self.forward.dataset.disabled = true;
          }
        });

      this.app.getCanGoBack(function backSuccess(evt) {
        if (e.target.result === true) {
          delete self.back.dataset.disabled;
        } else {
          self.back.dataset.disabled = true;
        }
      });
    },

    onDisplayedApplicationChange: function() {
      this.toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);

      var dataset = this.app.iframe.dataset;
      if (dataset.originURL || dataset.searchURL) {
        delete bookmarkButton.dataset.disabled;
        return;
      }

      this.bookmarkButton.dataset.disabled = true;
    },

    doBookmark: function() {
      if (this.bookmarkButton.dataset.disabled)
        return;

      this.clearButtonBarTimeout();
      var dataset = this.app.iframe.dataset;

      function selected(value) {
        if (!value)
          return;

        var name, url;
        if (value === 'origin') {
          name = dataset.originName;
          url = dataset.originURL;
        }

        if (value === 'search') {
          name = dataset.searchName;
          url = dataset.searchURL;
        }

        var activity = new MozActivity({
          name: 'save-bookmark',
          data: {
            type: 'url',
            url: url,
            name: name,
            icon: dataset.icon,
            useAsyncPanZoom: dataset.useAsyncPanZoom,
            iconable: false
          }
        });

        activity.onsuccess = function onsuccess() {
          if (value === 'origin') {
            delete currentAppIframe().dataset.originURL;
          }

          if (value === 'search') {
            delete currentAppIframe().dataset.searchURL;
          }

          if (!currentAppIframe().dataset.originURL &&
            !currentAppIframe().dataset.searchURL) {
            bookmarkButton.dataset.disabled = true;
          }
        };
      }

      var data = {
        title: _('add-to-home-screen'),
        options: []
      };

      if (dataset.originURL) {
        data.options.push({ id: 'origin', text: dataset.originName });
      }

      if (dataset.searchURL) {
        data.options.push({ id: 'search', text: dataset.searchName });
      }

      ModalDialog.selectOne(data, selected);
    }
  }

  System.AppWrapper = AppWrapper;
}(this));
