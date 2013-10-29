'use strict';

(function(window) {
  var DEBUG = false;
  window.System = {
    _start: new Date().getTime() / 1000,

    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    slowTransition: false,

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomeEvent(eventName, { detail: detail });
      window.dispatchEvent(evt);
    },

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[System]' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    },

    _dump: function sys__dump() {
      try {
        throw new Error('dump');
      } catch (e) {
        console.log(e.stack);
      }
    }
  };
}(this));
