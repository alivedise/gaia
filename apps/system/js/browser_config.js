(function(window){
  var isOutOfProcessDisabled = false;
  /**
   * @constructor BrowserConfig
   * This class generates browser config from manifestURL or src.
   * @return {Object} browser config object
   */
  window.BrowserConfig = function(url, manifestURL) {
    var app = Applications.getByManifestURL(manifestURL);
    this.url = url;

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
      //
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
      this.origin = url;
      this.manifestURL = '';
      this.manifest = null;
    }
  }
})(this);