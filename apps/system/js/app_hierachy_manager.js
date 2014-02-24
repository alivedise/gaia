'use strict';

(function(exports) {
  var AppHierachyManager = function() {
  };
  AppHierachyManager.prototype.start = function() {
    window.addEventListener('apprequestfocus', this);
  };
  AppHierachyManager.prototype.handleEvent = function(evt) {
    console.log(evt);
    switch (evt.type) {
      case 'apprequestfocus':
        var app = evt.detail;
        app.toFront();
        break;
    }
  };
  exports.appHierachyManager = new AppHierachyManager();
  exports.appHierachyManager.start();
}(window));