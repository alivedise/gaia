(function(window) {
  var AttentionWindowManager = {
    _instances: {},

    init: function attwm_init() {
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionrequestclose', this);
      window.addEventListener('attentionrequestopen', this);
      window.addEventListener('home', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      switch (evt.type) {
        case 'attentioncreated':
          var attention = evt.detail;
          console.log(attention.instanceID);
          this._instances[attention.instanceID] = attention;
          break;

        case 'attentionterminated':
          var attention = evt.detail;
          console.log(attention.instanceID);
          this._instances[attention.instanceID] = null;
          break;

        case 'attentionrequestclose':
          var attention = evt.detail;
          attention.close();
          break;

        case 'attentionrequestopen':
          console.log('00000');
          var attention = evt.detail;
          attention.ready(function() {
            console.log('c');
            attention.open();
          });
          break;

        case 'home':
          for (var id in this._instances) {
            console.log(id);
            this._instances[id].close();
          }
          break;
      }
    }
  };

  AttentionWindowManager.init();
}(this));
