(function(exports) {
  var Spammer = function() {};
  Spammer.prototype = {
    LAUNCH_COUNT: 5,
    LAUNCH_TIMEOUT: 100,
    LAUNCH_DELAY: 0,
    start: function() {
      this._launchApps = [];
      for (var manifestURL in applications.installedApps) {
        var app = applications.installedApps[manifestURL];
        if (!app.manifest.role) {
          this._launchApps.push(app);
        }
      }
      this.launch();
    },
    launch: function() {
      this.shuffle(this._launchApps);
      for (var i = 0; i < this.LAUNCH_COUNT; i++) {
        (function(self, app) {
          window.setTimeout(function() {
            app.launch();
          }, self.LAUNCH_DELAY);
        }(this, this._launchApps[i]));
      }
      for (var i = 0; i < this.LAUNCH_COUNT; i++) {
        (function(self, app) {
          window.setTimeout(function() {
            app.launch();
          }, self.LAUNCH_DELAY);
        }(this, this._launchApps[i]));
      }
    },
    stop: function() {
      this._launchApps = [];
      window.clearInterval(this._interval);
    },
    shuffle: function(array) {
      var currentIndex = array.length, temporaryValue, randomIndex ;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }
  };
  exports.Spammer = Spammer;
}(window));