//'use strict';

/**
 * WrapperManager
 */

(function() {
  /**
   * WrapperManager is waiting for a special `mozbrowseropenwindow` event.
   * Usually it's from the homescreen app in order to open:
   * 1) Everything.me apps
   * 2) Bookmarked webpages in homescreen
   * via window.open(url, name, 'remote').
   *
   * We have three different `mozbrowseropenwindow` event handlers now:
   * 1) AttentionScreen: for window.open(url, name, 'attention')
   * 2) WrapperManager: for window.open(url, name, 'remote')
   * 3) PopupManager: for window.open(url, name)
   */
  window.addEventListener('mozbrowseropenwindow', function handleWrapper(evt) {
    var detail = evt.detail;
    var features;
    try {
      features = JSON.parse(detail.features);
    } catch (e) {
      features = {};
    }

    // Handles only call to window.open with `{remote: true}` feature.
    if (!features.remote)
      return;

    // XXX bug 819882: for now, only allows homescreen to open oop windows
    var callerIframe = evt.target;
    var callerFrame = callerIframe.parentNode;
    var manifestURL = callerIframe.getAttribute('mozapp');
    var callerApp = Applications.getByManifestURL(manifestURL);
    if (!callerApp || !callerFrame.classList.contains('homescreen'))
      return;
    var callerOrigin = callerApp.origin;

    // So, we are going to open a remote window.
    // Now, avoid PopupManager listener to be fired.
    evt.stopImmediatePropagation();

    var name = detail.name;
    var url = detail.url;

    // Use fake origin for named windows in order to be able to reuse them,
    // otherwise always open a new window for '_blank'.
    var origin = null;
    if (name == '_blank') {
      origin = url;

      // Just bring on top if a wrapper window is already running with this url
      if (origin in WindowManager.getRunningApps() &&
          WindowManager.getRunningApps()[origin].windowName == '_blank') {
        WindowManager.setDisplayedApp(origin);
        return;
      }
    } else {
      origin = 'window:' + name + ',source:' + callerOrigin;

      var runningApp = WindowManager.getRunningApps()[origin];
      if (runningApp && runningApp.windowName === name) {
        if (runningApp.iframe.src === url) {
          // If the url is already loaded, just display the app
          WindowManager.setDisplayedApp(origin);
          return;
        } else {
          // Wrapper context shouldn't be shared between two apps -> killing
          WindowManager.kill(origin);
        }
      }
    }

    var title = '', icon = '', remote = false, useAsyncPanZoom = false;
    var originName, originURL, searchName, searchURL;

    try {
      var features = JSON.parse(detail.features);
      var regExp = new RegExp('&nbsp;', 'g');

      title = features.name.replace(regExp, ' ') || url;
      icon = features.icon || '';

      if (features.origin) {
        originName = features.origin.name.replace(regExp, ' ');
        originURL = decodeURIComponent(features.origin.url);
      }

      if (features.search) {
        searchName = features.search.name.replace(regExp, ' ');
        searchURL = decodeURIComponent(features.search.url);
      }

      if (features.useAsyncPanZoom)
        useAsyncPanZoom = true;
    } catch (ex) { }

    // If we don't reuse an existing app, open a brand new one
    var iframe;
    // Bug 807438: Move new window document OOP
    // Ignore `event.detail.frameElement` for now in order
    // to create a remote system app frame.
    // So that new window documents are going to share
    // system app content processes data jar.

    // Create a new OOP mozbrowser iframe using BrowserFrame
    var browserFrame = new BrowserFrame(origin, null, null, null, /* OOP */ true);
    iframe = browserFrame.element;

    // `mozasyncpanzoom` only works when added before attaching the iframe
    // node to the document.
    if (useAsyncPanZoom) {
      iframe.dataset.useAsyncPanZoom = true;
      iframe.setAttribute('mozasyncpanzoom', 'true');
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('wrapperappend', true, false, {
      iframe: iframe,
      origin: origin,
      url: url,
      title: title
    });
    window.dispatchEvent(evt);

    iframe.dataset.name = title;
    iframe.dataset.icon = icon;

    if (originName)
      iframe.dataset.originName = originName;
    if (originURL)
      iframe.dataset.originURL = originURL;

    if (searchName)
      iframe.dataset.searchName = searchName;
    if (searchURL)
      iframe.dataset.searchURL = searchURL;

    // First load blank page in order to hide previous website
    iframe.src = url;

    WindowManager.setDisplayedApp(origin);
  }, true); // Use capture in order to catch the event before PopupManager does

})();
