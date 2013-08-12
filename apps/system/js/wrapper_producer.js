(function(window) {
  var WrapperProducer = {
    init: function wp_init() {
      // XXX: Hack to open bookmarks from homescreen.
      window.addEventListener('mozbrowseropenwindow', this);
    },

    handleEvent: function wp_handleEvent(evt) {
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
      var app = null;
      if (name == '_blank') {
        origin = url;

        // Just bring on top if a wrapper window is already running with this url
        if (origin in WindowManager.getRunningApps() &&
            WindowManager.getRunningApps()[origin].windowName == '_blank') {
          // XXX: Dispatch event instead of calling WM method.
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
      if (!app) {
        // Bug 807438: Move new window document OOP
        // Ignore `event.detail.frameElement` for now in order
        // to create a remote system app frame.
        // So that new window documents are going to share
        // system app content processes data jar.
        var WrapperWindow = new WrapperWindow({
          origin: origin,
          title: title,
          url: url,
          name: name,
          asyncPanZoom: useAsyncPanZoom,
          expectingSystemMessage: false,
          searchURL: searchURL,
          searchName: searchName,
          originURL: originURL,
          originName: originName
        });
      }

      WindowManager.setDisplayedApp(origin);
  };

  WrapperProducer.init();
}(this));