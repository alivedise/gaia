'use strict';

(function(window) {
  var _id = 0;

  var ActivityWindow = function ActivityWindow(config, caller) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    if (caller) {
      caller.setActivityCallee(this);
      this.activityCaller = caller;
      // TODO: Put us inside the caller element.
    }

    this.render();
    this.publish('created');
    // We'll open ourselves automatically,
    // but maybe we should do requestOpen and let manager open us.
    this.open();
  };

  ActivityWindow.prototype.__proto__ = AppWindow.prototype;

  ActivityWindow.prototype.eventPrefix = 'activity';

  ActivityWindow.prototype.CLASS_NAME = 'ActivityWindow';

  ActivityWindow.prototype._DEBUG = false;

  ActivityWindow.prototype.openAnimation = 'slide-left';
  ActivityWindow.prototype.closeAnimation = 'slide-right';

  // Current policy is to copy the caller's orientation.
  // So we just overwrite resize method.
  ActivityWindow.prototype.setOrientation =
    function acw_setOrientation(noCapture) {
      if (this.isActive()) {
        var manifest = this.activityCaller ?
                        this.activityCaller.manifest :
                        (this.manifest || this.config.manifest);

        var orientation = manifest ? (manifest.orientation ||
                          OrientationManager.globalOrientation) :
                          OrientationManager.globalOrientation;
        if (orientation) {
          var rv = false;
          if ('lockOrientation' in screen) {
            rv = screen.lockOrientation(orientation);
          } else if ('mozLockOrientation' in screen) {
            rv = screen.mozLockOrientation(orientation);
          }
          if (rv === false) {
            console.warn('screen.mozLockOrientation() returned false for',
                         this.origin, 'orientation', orientation);
          }
        } else {  // If no orientation was requested, then let it rotate
          if ('unlockOrientation' in screen) {
            screen.unlockOrientation();
          } else if ('mozUnlockOrientation' in screen) {
            screen.mozUnlockOrientation();
          }
        }
      }

      if (!noCapture && this.activityCallee &&
          this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.setOrientation(noCapture);
      }
    };

  ActivityWindow.prototype.view = function acw_view() {
    this.instanceID = _id;
    return '<div class="appWindow activityWindow inline-activity' +
            '" id="activity-window-' + _id++ + '">' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  ActivityWindow.subComponents = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog
  };

  ActivityWindow.registeredEvents =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
      '_localized', '_opened', '_closed'];

  ActivityWindow.prototype._handle__closed =
    function acw__handle__closed() {
      this.restoreCaller();
    };

  ActivityWindow.prototype._handle_mozbrowseractivitydone =
    function aw__handle_mozbrowseractivitydone() {
      this.kill();
    };

  /**
   * Kill ActivityWindow. We overwrite the default behavior of
   * AppWindow.kill here.
   */
  ActivityWindow.prototype.kill = function acw_kill(evt) {
    if (this._killed)
      return;
    this._killed = true;
    if (evt && 'stopPropagation' in evt) {
      evt.stopPropagation();
    }
    if (this.isActive()) {
      var self = this;
      this.element.addEventListener('_closed', function onClose() {
        self.element.addEventListener('_closed', onClose);
        self.publish('terminated');
        // If caller is an instance of appWindow,
        // tell AppWindowManager to open it.
        // XXX: Call this.activityCaller.open() if open logic is done.
        if (self.activityCallee) {
          self.activityCallee.kill();
        }
        if (self.activityCaller instanceof AppWindow) {
          // If we're killed by event handler, display the caller.
          if (evt) {
            self.activityCaller.requestOpen();
          }
        } else if (self.activityCaller instanceof ActivityWindow) {
          self.activityCaller.open();
        } else {
          console.warn('unknown window type of activity caller.');
        }
        self.containerElement.removeChild(this.element);
      }.bind(this));
      this.close();
    } else {
      this.publish('terminated');
      if (this.activityCallee) {
        this.activityCallee.kill();
      }
      this.containerElement.removeChild(this.element);
    }
    this.debug('killed by ', evt ? evt.type : 'direct function call.');
    this.activityCaller.unsetActivityCallee();
  };

  ActivityWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame({
      origin: this.origin,
      url: this.url,
      name: this.name,
      manifest: this.manifest,
      manifestURL: this.manifestURL,
      window_name: 'inline' + this.instanceID,
      oop: true
    });
    this.element =
      document.getElementById('activity-window-' + this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  /**
   * ActivityWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the activitywillrender event.
   */
  ActivityWindow.prototype.containerElement =
    document.getElementById('windows');

  ActivityWindow.prototype.restoreCaller = function restoreCaller() {
    var app = this.activityCaller;
    // Do nothing if app is not active.
    if (!app || !app.isActive())
      return;

    // Do not bubble the orientation lock this time.
    app.setOrientation(true);
    if (app instanceof AppWindow) {
      app.iframe.focus();
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
    } else if (app instanceof ActivityWindow) {
      app.show();
      app.iframe.focus();
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
    }
  };

  ActivityWindow.prototype._handle__opened =
    function acw__handle__opened() {
      var app = this.activityCaller;
      // Set page visibility of focused app to false
      // once inline activity frame's transition is ended.
      // XXX: We have trouble to make all inline activity
      // openers being sent to background now,
      // because of OOM killer may kill them accidently.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=914412,
      // and https://bugzilla.mozilla.org/show_bug.cgi?id=822325.
      // So we only set browser app(in-process)'s page visibility
      // to false now to resolve 914412.
      if (app && app instanceof AppWindow && app.iframe &&
          'contentWindow' in app.iframe &&
          app.iframe.contentWindow != null) {
        app.setVisible(false);
      }
      if (this.openCallback)
        this.openCallback();
    };

  window.ActivityWindow = ActivityWindow;

}(this));
