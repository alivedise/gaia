'use strict';

(function(window) {
  var screenElement = document.getElementById('screen');
  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];

  // XXX: Move all transition related functions into a mixin.
  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, null, 'opened', 'opened'],
    'closing': [null, null, 'closed', 'closed']
  };

  /**
   * TransitionStateMixin is a sub module of appWindow class.
   * We need to be mixed into appWindow class or any class
   * has the same interface as appWindow.
   */
  var TransitionStateMixin = {
    _transitionState: 'closed',

    _transitionHandler: function tsm__transitionHandler(evt) {
      if (evt.target !== this.element)
        return;

      this._processTransitionEvent('complete');
    },

    _processTransitionEvent:
      function tsm__processTransitionEvent(evt, callback) {
        var currentState = this._transitionState;
        var evtIndex = TransitionEvents.indexOf(evt);
        var state = TransitionStateTable[currentState][evtIndex];
        this.debug(evt, currentState, state);
        if (!state) {
          return;
        }

        if (callback) {
          var s = evt == 'open' ? 'opened' : 'closed';
          this.one('transition', s, callback);
        }
        this._changeTransitionState(state);
        this.debug('transition state changed from ' +
          currentState, ' to ', state, ' by ', evt);
        this._callbackTransitonStateChange(currentState, state, evt);
      },

    _changeTransitionState: function tsm__changeTransitionState(state) {
      this._transitionState = state;
      this.element.setAttribute('data-transitionState', this._transitionState);
    },

    _callbackTransitonStateChange:
      function tsm__callbackTransitonStateChange(previous, current, evt) {
        // The design of three type of callbacks here is for flexibility.
        // If we want to do something one by one we could use that.
        // The order is: leave state -> on event occur -> enter state.
        if (typeof(this['_leave_' + previous]) == 'function') {
          this['_leave_' + previous](current, evt);
        }

        if (typeof(this['_on_' + evt]) == 'function') {
          this['_on_' + evt](previous, current);
        }

        if (typeof(this['_enter_' + current]) == 'function') {
          this['_enter_' + current](previous, evt);
        }
      },

    _transitionTimeout: 10000,

    _enter_opening: function tsm__enter_opening(prev, evt) {
      // Establish a timer to force finish the opening state.
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout * 1.3);
      this.element.classList.add('active');
      this.element.classList.add(this.openAnimation);
      this.element.classList.add('transition-opening');
      this.launchTime = Date.now();
      this.publish('opening');
    },

    _leave_opened: function tsm__leave_opened(next, evt) {
      this.publish('willclose');
    },

    _enter_closing: function tsm__enter_closing(prev, evt) {
      // Establish a timer to force finish the closing state.
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout);
      this.element.classList.add(this.closeAnimation);
      this.element.classList.add('transition-closing');
      // Make window invisible to screenreader
      // XXX: Move to _enter_closed ?
      this.element.setAttribute('aria-hidden', 'true');
      this.setRotateTransition();
      this.publish('closing');
      if (this.browser)
        this.browser.element.blur();
    },

    _enter_opened: function tsm__enter_opened(prev, evt) {
      this.resetTransition();
      // XXX: Do we still need this?
      this._waitForNextPaint(function makeWindowActive() {
        this.element.classList.add('render');
      }.bind(this));
      if (this.browser)
        this.browser.element.focus();
      this.publish('open');
    },

    _enter_closed: function tsm__enter_closed(prev, evt) {
      // XXX: Workaround to avoid trustedUI opener to be killed.
      if (TrustedUIManager.hasTrustedUI(this.origin)) {
        if (this.closeAnimation == 'to-card-view') {
          this.setVisible(false, true);
        } else {
          this.setVisible(false);
        }
      }

      this.element.classList.remove('active');
      // XXX: Fix me
      if (this.closeAnimation !== 'to-card-view') {
        this.resetTransition();
        this.addClearRotateTransition();
      }
      this.publish('close');
    },

    _leave_closed: function tsm__leave_closed(next, evt) {
      // XXX: Fix SimLock
      this.publish('willopen');

      // XXX: Decouple AttentionScreen
      if (!AttentionScreen.isFullyVisible())
        this.setVisible(true);
      this.resetTransition();
      if (this.isFullScreen()) {
        screenElement.classList.add('fullscreen-app');
      }
      this.resize();
      this.setOrientation();
      var iframe = this.iframe;

      // Set iframe.dataset.enableAppLoaded so that the iframe's
      // mozbrowserloadend or appopen event listener (appLoadedHandler) can
      // run.
      //
      // |unpainted in iframe.dataset| means that the app is cold booting.  If
      // it is, we listen for Browser API's loadend event, which is fired when
      // the iframe's document load finishes.
      //
      // If the app is not cold booting (its process is alive), we listen to
      // the appopen event, which is fired when the transition to the app
      // window completes.

      if (this._loadState == 'unloaded') {
        // XXX: enter opening after this.
        this.setFrameBackground();
        iframe.dataset.enableAppLoaded = 'mozbrowserloadend';
      } else {
        iframe.dataset.start = Date.now();
        this._startTime = iframe.dataset.start;
        iframe.dataset.enableAppLoaded = 'appopen';
      }
    },

    resetTransition: function tsm_resetTransition() {
      if (this._transitionStateTimeout) {
        window.clearTimeout(this._transitionStateTimeout);
        this._transitionStateTimeout = null;
      }
      console.log(this.openAnimation);
      console.log(this.closeAnimation);
      if (this.openAnimation)
        this.element.classList.remove(this.openAnimation);
      if (this.closeAnimation)
        this.element.classList.remove(this.closeAnimation);
      this.element.classList.remove('transition-closing');
      this.element.classList.remove('transition-opening');
    },

    defaultTransition: {
      open: 'enlarging',
      close: 'reducing'
    }
  };

  window.TransitionStateTable = TransitionStateTable;
  window.TransitionStateMixin = TransitionStateMixin;
}(this));
