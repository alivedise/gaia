/* global UrlHelper, AppWindow, BrowserConfigHelper, LazyLoader */

(function() {

  'use strict';

  function handleOpenUrl(url, isPrivate) {
    var config = new BrowserConfigHelper({url: url});
    config.oop = true;
    config.isPrivate = isPrivate;
    var newApp = new AppWindow(config);

    newApp.requestOpen();
  }

  function handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    var data = activity.source.data;
    switch (data.type) {
      case 'url':
        if (!window.UrlHelper) {
          LazyLoader.load(['shared/js/url_helper.js']).then(function() {
            handleOpenUrl(UrlHelper.getUrlFromInput(data.url), data.isPrivate);
          }).catch(function(err) {
            console.error(err);
          });
        } else {
          handleOpenUrl(UrlHelper.getUrlFromInput(data.url), data.isPrivate);
        }
        break;
    }
  }

  window.navigator.mozSetMessageHandler('activity', handleActivity);

}());
