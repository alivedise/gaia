(function(window){
  'use strict';
  var isOutOfProcessDisabled = false;
  /**
   * This class generates browser configuration object from manifestURL or src provided.
   * The configuration is for BrowserFrame generation.
 
   *
   * * If manifestURL is provided, we would treat it as a web app,
   *   and then use Applications to fetch the remaining info we need
   *   to construct the options for mozbrowser iframe.
   *
   * * If only URL is provided, we would treat it as a web page.
   *
   *
   * The returned configuration object contains:
   * * Origin: the same as appURL.
   * * manifestURL: the same as manifestURL.
   * * manifest: the parsed manifest object.
   * * name: the name of the app, retrieved from manifest.
   * * oop: indicate it's running out of process or in process.
   *
   * @param {String} appURL The URL of the app or the page to be opened.
   * @param {String} [manifestURL] The manifest URL of the app.
   *
   * @see BrowserFrame
   * @requires Applications
   * @class BrowserConfig
   */
  window.BrowserConfig = function(appURL, manifestURL) {
    var app = Applications.getByManifestURL(manifestURL);
    this.url = appURL;

    if (app) {
      var manifest = app.manifest;
      var name = new ManifestHelper(manifest).name;
      var origin = app.origin;

      // Check if it's a virtual app from a entry point.
      // If so, change the app name and origin to the
      // entry point.
      var entryPoints = manifest.entry_points;
      if (entryPoints && manifest.type == 'certified') {
        var givenPath = e.detail.url.substr(origin.length);

        // Workaround here until the bug (to be filed) is fixed
        // Basicly, gecko is sending the URL without launch_path sometimes
        for (var ep in entryPoints) {
          var currentEp = entryPoints[ep];
          var path = givenPath;
          if (path.indexOf('?') != -1) {
            path = path.substr(0, path.indexOf('?'));
          }

          //Remove the origin and / to find if if the url is the entry point
          if (path.indexOf('/' + ep) == 0 &&
              (currentEp.launch_path == path)) {
            origin = origin + currentEp.launch_path;
            name = new ManifestHelper(currentEp).name;
          }
        }
      }

      // These apps currently have bugs preventing them from being
      // run out of process. All other apps will be run OOP.
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
      var protocol = document.location.protocol + '//';
      var browserManifestUrl =
        protocol + 'browser.' + domain + '/manifest.webapp';
      var outOfProcessBlackList = [
        browserManifestUrl
        // Requires nested content processes (bug 761935).  This is not
        // on the schedule for v1.
      ];

      if (!isOutOfProcessDisabled &&
          outOfProcessBlackList.indexOf(manifestURL) === -1) {
        // FIXME: content shouldn't control this directly
        this.oop = true;
      }

      this.name = name;
      this.manifestURL = manifestURL;
      this.origin = origin;
      this.manifest = app.manifest;
    } else {
      // Not an app but a wrapper.
      this.name = '';
      this.origin = appURL;
      this.manifestURL = '';
      this.manifest = null;
    }
  }
})(this);