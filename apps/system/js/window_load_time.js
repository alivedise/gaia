(function(window) {
  'use strict';

  var LoadTime = {
    // Updated when
    // (1) Before app is opening.
    // (2) After app is rendered.
    _start: 0,

    _onOpen: function aw_lt_onOpen() {
      if (this._unloaded) {
        this.publish('loadtime', {
          time: parseInt(Date.now() - this._start),
          type: 'c',
          src: this.config.url
        });
      }
    },

    _onRendered: function aw_lt_onRendered() {
      // add 'mozbrowserloadend' event listener to mozbrowser element
    },

    _onLoadend: function aw_lt_onLoaded() {
      if (!this._unloaded) {
        this.publish('loadtime', {
          time: parseInt(Date.now() - this._start),
          type: 'c',
          src: this.config.url
        });
      }
    }
  };

  AppWindow.addMixin(LoadTime);
}(this));