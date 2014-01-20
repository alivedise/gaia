(function(window) {
  var DEBUG = true;
  var AttentionWindowManager = {
    _instances: {},
    _count: 0,
    _activeAttentionWindow: null,

    debug: function aw_debug() {
      if (DEBUG) {
        console.log('[AttentionWindowManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    hasActiveWindow: function attwm_hasActiveWindow() {
      return !(this._activeAttentionWindow === null);
    },

    hasAliveWindow: function attwm_hasAliveWindow() {
      return (this._count !== 0);
    },

    isAtBarMode: function attwm_isAtBarMode() {
      return (this.hasAliveWindow() && !this.hasActiveWindow());
    },

    screen: document.getElementById('screen'),

    updateClass: function attwm_updateClass() {
      this.screen.classList.toggle('active-statusbar', this.isAtBarMode());
    },

    barHeight: function attwm_barHeight() {
      for (var id in this._instances) {
        return this._cacheHeight ||
          (this._cacheHeight =
            this._instances[id].getBarHeight());
      }
      return 0;
    },

    init: function attwm_init() {
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionrequestclose', this);
      window.addEventListener('attentionrequestopen', this);
      window.addEventListener('attentionopened', this);
      window.addEventListener('attentionclosed', this);
      window.addEventListener('home', this);
      window.addEventListener('emergencyalert', this);
      window.addEventListener('attention-resize', this);

      // Request from ScreenManager: show the call screen.
      window.addEventListener('show-callscreen', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      this.debug('active attention window is ' +
        (this._activeAttentionWindow ?
          this._activeAttentionWindow.name : null));
      switch (evt.type) {
        case 'show-callscreen':
          for (var id in this._instances) {
            if (this._instances[id].hasTelephonyPermission()) {
              this._instances[id].requestOpen();
              break;
            }
          }
          break;

        case 'attentionopened':
          var attention = evt.detail;
          this.debug(attention.instanceID);
          this._activeAttentionWindow = attention;
          this.updateClass();
          break;

        case 'attentionclosed':
          var attention = evt.detail;
          this.debug(attention);
          if (this._activeAttentionWindow &&
              this._activeAttentionWindow.instanceID === attention.instanceID) {
            this._activeAttentionWindow = null;
          }
          this.updateClass();
          break;

        case 'attentioncreated':
          var attention = evt.detail;
          this._instances[attention.instanceID] = attention;
          this._count++;
          break;

        case 'attentionterminated':
          var attention = evt.detail;
          delete this._instances[attention.instanceID];
          if (this._activeAttentionWindow &&
              this._activeAttentionWindow.instanceID === attention.instanceID) {
            this._activeAttentionWindow = null;
          }
          this._count--;
          break;

        case 'attentionrequestclose':
          var attention = evt.detail;
          attention.close();
          break;

        case 'attentionrequestopen':
          if (this._activeAttentionWindow &&
              this._activeAttentionWindow.hasTelephonyPermission()) {
            // Close the attention window,
            // because call is important than other attention.
            attention.close();
          } else {
            var attention = evt.detail;
            attention.ready(function() {
              attention.open();
            });
          }
          break;

        case 'home':
        case 'emergencyalert':
          if (this._activeAttentionWindow) {
            this._activeAttentionWindow.close();
          }
          break;

        case 'attention-resize':
          if (this._activeAttentionWindow) {
            this._activeAttentionWindow.resize();
          }
          break;
      }
    }
  };

  AttentionWindowManager.init();
  window.AttentionWindowManager = AttentionWindowManager;
}(this));
