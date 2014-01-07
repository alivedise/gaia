(function(window) {
  var AttentionWindowManager = {
    _intances: {},

    init: function attwm_init() {
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionrequestclose', this);
      window.addEventListener('home', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      switch (evt.type) {
        case 'attentioncreated':
          var attention = evt.detail;
          this._intances[attention.instanceID] = attention;
          break;
        case 'attentionterminated':
          var attention = evt.detail;
          this._intances[attention.instanceID] = null;
          break;
        case 'attentionrequestclose':
          var attention = evt.detail;
          attention.close();
          break;
        case 'home':
          console.log('alive:', this._intances);
          for (var id in this._intances) {
            this._intances[id].close();
          }
          break;
      }
    }
  };

  AttentionWindowManager.init();
}(this));
