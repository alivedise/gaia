/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    // Listen to the first appwillopen event, where homescreen launches
    window.addEventListener('appwillopen', this);

    // Listen to appopen event
    window.addEventListener('appopen', this);

    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;
    conn.addEventListener('cardstatechange', this);
  },
  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
      case 'cardstatechange':
        this.showIfLocked();

        break;

      case 'appwillopen':
        window.removeEventListener('appwillopen', this);
        this.showIfLocked();

        break;

      case 'appopen':
        // if an app needs telephony or sms permission,
        // we will launch the unlock screen if needed.

        var app = Applications.getByManifestURL(
          evt.target.getAttribute('mozapp'));

        if (!app || !app.manifest.permissions)
          return;

        if (!('telephony' in app.manifest.permissions ||
            'sms' in app.manifest.permissions))
          return;

        this.showIfLocked();
        break;
    }
  },
  showIfLocked: function sl_showIfLocked() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    switch (conn.cardState) {
      case 'pukRequired':
      case 'pinRequired':
        ModalDialog.confirm('blahblah', 'simpin', 
          {
            callback:
              function(re) {
                var activity = new MozActivity({
                  name: 'unlock',
                  data: {
                    target: 'sim'
                  }
                });
              },
            title: 'OOOOOOK'
          }, {
            title: 'passss'
          });
        break;
      case 'ready':
      default:
        break;
    }
  }
};

SimLock.init();
