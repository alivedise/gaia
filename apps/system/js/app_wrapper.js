/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(window) {
  var _ = navigator.mozL10n.get;
  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  window.AppWrapper = function AppWrapper(app) {
    var self = this;
    this.app = app;
    this.container = app.frame;

    // XXX: `appopen` `appXXXX` event should be fired on appWindow directly.
    // Since appWrapper is part UI of appWindow,
    // we ought to be capable to directly invoked by appWindow.
    window.addEventListener('appopen', function onAppOpen(e) {
      self.onLocationChange();
      self.onDisplayedApplicationChange();
    });

    window.addEventListener('appwillclose', function onAppClose(e) {
      if (self.container.isWrapper) {
        window.removeEventListener('mozbrowserlocationchange', onLocationChange);
        clearTimeout(buttonBarTimeout);
        self.footer.classList.add('closed');
        isButtonBarDisplayed = false;
      }
    });

    window.addEventListener('keyboardchange', function onKeyboardChange(e) {
      if (self.container.isWrapper) {
        if (self.footer.classList.contains('visible')) {
          self.footer.classList.remove('visible');
        }
      }
    });

    window.addEventListener('keyboardhide', function onKeyboardChange(e) {
      if ('wrapper' in currentAppFrame().dataset) {
        if (!footer.classList.contains('visible')) {
          footer.classList.add('visible');
        }
      }
    });

    this.app.iframe.addEventListener('mozbrowserloadstart', function start() {
      self.app.iframe.dataset.loading = true;
      self.header.classList.add('visible');
    });

    this.app.iframe.addEventListener('mozbrowserloadend', function end() {
      delete self.app.iframe.dataset.loading;
      self.header.classList.remove('visible');
    });

    this.container.addEventListener('mozbrowserlocationchange', function() {
      self.onLocationChange();
    });
    return this;
  };

  AppWrapper.prototype.view = function view() {
    return '<header class="wrapper-activity-indicator"></header>' +
      '<footer class="wrapper-footer" class="closed">' +
        '<div class="handler"></div>' +
        '<menu type="buttonbar">' +
          '<button type="button" class="back-button" alt="Back" data-disabled="disabled"></button>' +
          '<button type="button" class="forward-button" alt="Forward" data-disabled="disabled"></button>' +
          '<button type="button" class="reload-button" alt="Reload"></button>' +
          '<button type="button" class="bookmark-button" alt="Bookmark" data-disabled="disabled"></button>' +
          '<button type="button" class="close-button" alt="Close"></button>' +
        '</menu>' +
      '</footer>';
  };

  AppWrapper.prototype.render = function render() {
    this.container.insertAdjacentHTML('beforeend', this.view());
    this.header = this.container.querySelector('.wrapper-activity-indicator');
    this.footer = this.container.querySelector('.wrapper-footer');
    this.container.querySelector('.handler').addEventListener(
      'mousedown', function open() { toggleButtonBar() });
    this.container.querySelector('.close-button').addEventListener(
      'mousedown', function close() { toggleButtonBar() });
    this.reload = this.container.querySelector('.reload-button');
    this.reload.addEventListener('click', function doReload(evt) {
      clearButtonBarTimeout();
      currentAppIframe().reload(true);
    });

    this.back = this.container.querySelector('.back-button');
    this.back.addEventListener('click', function goBack() {
      clearButtonBarTimeout();
      currentAppIframe().goBack();
    });

    this.orward = this.container.querySelector('.forward-button');
    this.forward.addEventListener('click', function goForward() {
      clearButtonBarTimeout();
      currentAppIframe().goForward();
    });

    this.bookmarkButton = this.container.querySelector('.bookmark-button');
    this.bookmark-button.addEventListener('click', function() {
      self.doBookmark();
    });
  }

  AppWrapper.prototype.buttonBarTimeout = null;

  AppWrapper.prototype.isButtonBarDisplayed = false;

  AppWrapper.prototype.toggleButtonBar = function toggleButtonBar(time) {
    clearTimeout(this.buttonBarTimeout);
    this.footer.classList.toggle('closed');
    this.isButtonBarDisplayed = !this.isButtonBarDisplayed;
    if (this.isButtonBarDisplayed) {
      this.buttonBarTimeout = setTimeout(this.toggleButtonBar, time || BUTTONBAR_TIMEOUT);
    }
  }

  AppWrapper.prototype.clearButtonBarTimeout = function clearButtonBarTimeout() {
    clearTimeout(buttonBarTimeout);
    buttonBarTimeout = setTimeout(toggleButtonBar, BUTTONBAR_TIMEOUT);
  }

  AppWrapper.prototype.onLocationChange = function onLocationChange() {
    currentAppIframe().getCanGoForward().onsuccess =
      function forwardSuccess(e) {
        if (e.target.result === true) {
          delete forward.dataset.disabled;
        } else {
          forward.dataset.disabled = true;
        }
      };

    currentAppIframe().getCanGoBack().onsuccess = function backSuccess(e) {
      if (e.target.result === true) {
        delete back.dataset.disabled;
      } else {
        back.dataset.disabled = true;
      }
    };
  }

  AppWrapper.prototype.onDisplayedApplicationChange = function onDisplayedApplicationChange() {
    this.toggleButtonBar(BUTTONBAR_INITIAL_OPEN_TIMEOUT);

    var dataset = this.app.iframe.dataset;
    if (dataset.originURL || dataset.searchURL) {
      delete bookmarkButton.dataset.disabled;
      return;
    }

    this.bookmarkButton.dataset.disabled = true;
  };

  AppWrapper.prototype.doBookmark = function doBookmark() {
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
  };
}(this));
