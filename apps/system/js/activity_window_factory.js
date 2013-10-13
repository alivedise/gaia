(function(window) {
  var ActivityWindowFactory = {
    _currentActivity: null,

    init: function acwf_init() {
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('launchapp', this);
    },

    handleEvent: function acwf_handleEvent(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          if (evt.detail.type == 'activity-done') {
            console.log('alive:1');
            if (this._currentActivity) {
              console.log('alive:2');
              this._currentActivity.close();
            }
          }
          break;

        case 'launchapp':
          console.log('alive', JSON.stringify(evt.detail));
          if (evt.detail.isActivity && evt.detail.inline) {
            console.log('alive:1111');
            var activity = new ActivityWindow(evt.detail);
            activity.open();
            this._currentActivity = activity;
          }
          break;
      }
    }
  };

  ActivityWindowFactory.init();
}(this));
