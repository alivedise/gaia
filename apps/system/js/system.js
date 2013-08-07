(function(window) {
  var System = {
    DEBUG: true,

    debug: function s_debug(msg) {
      if (this.DEBUG)
        console.log('[System]' + msg);
    },

    publish: function s_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event,
                          true, false, detail);
      window.dispatchEvent(evt);
    }
  }
  window.System = System;
}(this));