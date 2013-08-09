(function(window) {
  var WindowLayoutManager = {
    transitionQueue: [],

    init: function wlm_init() {
      window.addEventListener('appwillopen', this);
      window.addEventListener('requestopen', this);
      window.addEventListener('requestclose', this);
    },

    handleEvent: function wlm_handleEvent(evt) {
      var object = evt.detail;
      if (!'open' in object && !'close' in object)
        return;

      switch (evt.type) {
        case 'requestopen':
          object.open();
          break;

        case 'requestclose':
          object.close();
          break;
      }
    }
  };

  WindowLayoutManager.init();
}(this));