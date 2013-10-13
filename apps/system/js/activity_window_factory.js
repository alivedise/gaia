(function(window) {
  var ActivityWindowFactory = {
    init: function acwf_init() {
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('launchapp', this);
    },

    handleEvent: function acwf_handleEvent(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          if (evt.detail.type == 'activity-done') {
            console.log('alive:' + JSON.stringify(evt.detail));
          }
          break;

        case 'launchapp':
          if (evt.detail.isActivity && evt.detail.inline) {
            // Inline activities behaves more like a dialog,
            // let's deal them here.
            var activity = new ActivityWindow(evt.detail);
            activity.open();
          }
          break;
      }
    }
  };

  ActivityWindowFactory.init();
}(this));
