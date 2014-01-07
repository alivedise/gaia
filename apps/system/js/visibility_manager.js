(function(window) {
  var DEBUG = false;
  // When an UI layer is overlapping the current app,
  // WindowManager should set the visibility of app iframe to false
  // And reset to true when the layer is gone.
  // We may need to handle windowclosing, windowopened in the future.
  window.VisibilityManager = {
    _normalAudioChannelActive: false,

    _deviceLockedTimer: 0,

    overlayEvents: [
      'lock',
      'will-unlock',
      'attentionopened',
      'attentionclosing',
      'mozChromeEvent',
      'apprequestforeground',
      'activityrequestforeground',
      'popuprequestforeground'
    ],

    init: function vm_init() {
      this.overlayEvents.forEach(function overlayEventIterator(event) {
        window.addEventListener(event, this);
      }, this);
    },

    handleEvent: function vm_handleEvent(evt) {
      this.debug(' handling ' + evt.type);
      switch (evt.type) {
        case 'apprequestforeground':
        case 'activityrequestforeground':
        case 'popuprequestforeground':
          if (LockScreen.locked || AttentionWindowManager.hasActiveWindow()) {
            return;
          }
          var app = evt.detail;
          app.setVisible(true);
          break;

        case 'attentionclosing':
        case 'will-unlock':
          if (LockScreen.locked)
            return;

          this.publish('showwindows');
          this.publish('showwindow', { type: evt.type });
          this._resetDeviceLockedTimer();
          break;
        case 'lock':
          this.publish('hidewindows');
          // If the audio is active, the app should not set non-visible
          // otherwise it will be muted.
          // TODO: Remove this hack.
          this.debug('locking, hide the whole windows',
            this._normalAudioChannelActive);
          if (!this._normalAudioChannelActive) {
            this.publish('hidewindow',
              { screenshoting: false, type: evt.type });
          }
          this._resetDeviceLockedTimer();
          break;

        case 'status-inactive':
          if (!AttentionWindowManager.hasAliveWindow())
            return;
        case 'attentionopened':
          var detail = evt.detail;
          this.publish('hidewindow',
            { screenshoting: true, type: evt.type, origin: detail.origin });
          break;
        case 'mozChromeEvent':
          if (evt.detail.type == 'visible-audio-channel-changed') {
            this._resetDeviceLockedTimer();

            if (this._normalAudioChannelActive &&
                evt.detail.channel !== 'normal' &&
                LockScreen.locked) {
              this._deviceLockedTimer = setTimeout(function setVisibility() {
                this.publish('hidewindow',
                  { screenshoting: false, type: evt.type });
              }.bind(this), 3000);
            }

            this._normalAudioChannelActive = (evt.detail.channel === 'normal');
            this.debug('Normal AudioChannel changes to ',
              evt.detail.channel, this._normalAudioChannelActive);
          }
          break;
      }
    },

    _resetDeviceLockedTimer: function vm_resetDeviceLockedTimer() {
      if (this._deviceLockedTimer) {
        clearTimeout(this._deviceLockedTimer);
        this._deviceLockedTimer = 0;
      }
    },

    publish: function vm_publish(eventName, detail) {
      this.debug('publishing: ', eventName);
      var evt = new CustomEvent(eventName, { detail: detail });
      window.dispatchEvent(evt);
    },

    debug: function vm_debug() {
      if (DEBUG) {
        console.log('[VisibilityManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    }
  };

  VisibilityManager.init();
}(this));
