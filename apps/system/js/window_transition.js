(function(window) {
  'use strict';

  function capitalize(string)
  {
      return string.charAt(0).toUpperCase() + string.slice(1);
  };

  /**
   * This object declares all transition event enum:
   *
   * * OPEN
   * * CLOSE
   * * FINISH
   * * END
   * * CANCEL
   *
   * @static
   * @namespace TransitionEvent
   * @type {Object}
   */
  var EVT = {
    OPEN: 0,
    CLOSE: 1,
    FINISH: 2,
    END: 3,
    CANCEL: 4
  };

  var _EVTARRAY = ['OPEN', 'CLOSE', 'FINISH', 'END', 'CANCEL'];

  /**
   * Describe the transition state table.
   *
   * @example
   * var toState = transitionTable[currentState][event];
   *
   * The value "null" indicates that the transition won't happen.
   * 
   * @type {Object}
   */
  var transitionTable = {
              /* OPEN|CLOSE|FINISH|END|CANCEL */
    'closed':  ['opening', null, null, null, null],
    'opened':  [null, 'closing', null, null, null],
    'closing': ['opened', null, 'closed', 'closed', 'opened'],
    'opening': [null, 'closed', 'opened', 'opened', 'closed']
  };

  /**
   * This provides methods and attributes used for transition state handling. It's not meant to
   * be used directly.
   *
   * The finite state machine of transition is working as(being from normal state):
   * 
   * * `closed`  ---*event* **OPEN** ----------------> `opening`
   * * `opening` ---*event* **END/FINISH/CANCEL** ---> `opened`
   * * `opened`  ---*event* **CLOSE** ---------------> `closing`
   * * `closing` ---*event* **END/FINISH/CANCEL** ---> `closed`
   *
   * If you want to reuse this mixin in your object, you need to define these attributes: `this.element`
   *
   * And these method: `this.setVisible()` `this.publish()`
   *
   * The following callback functions are executed only when the transition state are successfully switched:
   * `_onOpen`
   * `_onClose`
   * `_onEnd`
   * `_onFinish`
   * `_onCancel`
   * `_leaveOpened`
   * `_enterOpened`
   * `_leaveClosed`
   * `_enterClosed`
   * `_leaveClosing`
   * `_enterClosing`
   * `_leaveOpening`
   * `_enterOpening`
   *
   * @mixin WindowTransition
   */
  var WindowTransition = {
    TRANSITION_EVENT: EVT,

    /**
     * _transitionState indicates current transition state of appWindow.
     *
     * @memberOf WindowTransition
     * @default
     * @type {String}
     */
    _transitionState: 'closed',

    /**
     * Record the previous transition state.
     *
     * **Only updated if the state changes successfully.**
     * 
     * @type {String|null}
     * @memberOf WindowTransition
     */
    _previousTransitionState: null,

    /**
     * Handle the transition event.
     * @memberOf WindowTransition
     */
    _transitionHandler: function aw__transitionHandler() {
      this._cancelTransition();
      this._processTransitionEvent(EVT.FINISH);
    },

    _cancelTransition: function aw__cancelTransition() {
      this.element.className.split(/\s+/).forEach(function(className) {
        if (className.indexOf('transition-') >= 0) {
          this.element.classList.remove(className);
        }
      }, this);
    },

    _enterOpening: function aw__enterOpening(from, to, evt) {
      /**
       * @todo set this._unloaded
       */
      
      this.resize(null, null, true);
      if (this._unloaded) {
        //this.element.style.backgroundImage = 'url(' + this._splash + ')';
      }

      // Turn of visibility once we're entering opening state.
      this.setVisible(true);

      // Make sure the transition is terminated.
      this._openingTransitionTimer = window.setTimeout(function() {
        if (this._previousTransitionState &&
            this._previousTransitionState == from &&
            this._transitionState == to) {
          this._processTransitionEvent(EVT.END);
        }
      }.bind(this), this._transitionTimeout*1.2);

      /**
       * @event AppWindow#appwillopen
       * @memberof AppWindow
       */
      if (from !== 'opened') {
        // Only publish |willopen| event when previous state is "closed".
        this.publish('willopen');
      }
      this.element.classList.add('transition-opening');
      this.element.classList.add(this._transition['open']);
    },

    _enterClosing: function aw__enterClosing(from, to, evt) {
      // Make sure the transition is terminated.
      this._closingTransitionTimer = window.setTimeout(function() {
        if (this._previousTransitionState &&
            this._previousTransitionState == from &&
            this._transitionState == to) {
          this._processTransitionEvent(EVT.END);
        }
      }.bind(this), this._transitionTimeout*1.2);

      /**
       * @event AppWindow#appwillclose
       * @memberof AppWindow
       */
      
      if (from !== 'opened') {
        // Only publish |willclose| event when previous state is "opened".
        this.publish('willclose');
      }
      this.element.classList.add('transition-closing');
      this.element.classList.add(this._transition['close']);
    },
    
    _processTransitionEvent: function aw__processTransitionEvent(evt) {
      var to = transitionTable[this._transitionState][evt];

      if (to === null) {
        return;
      }

      var from = this._transitionState;

      this._leaveState(from, to, evt);
      this._onEvent(from, to, evt);
      this._enterState(from, to, evt);

      this._previousTransitionState = from;
      this._transitionState = to;
    },

    _enterState: function aw__enterState(from, to, evt) {
      if (typeof(this['_enter' + capitalize(to.toLowerCase())]) == 'function') {
        this['_enter' + capitalize(to.toLowerCase())](from, to, evt);
      }
    },

    _leaveState: function aw__leaveState(from, to, evt) {
      if (typeof(this['_leave' + capitalize(from.toLowerCase())]) == 'function') {
        this['_leave' + capitalize(from.toLowerCase())](from, to, evt);
      }
    },

    _onEvent: function aw__onEvent(from, to, evt) {
      if (typeof(this['_on' + capitalize(_EVTARRAY[evt].toLowerCase())]) == 'function') {
        this['_on' + capitalize(_EVTARRAY[evt].toLowerCase())](from, to, evt);
      }
    },

    _enterOpened: function aw__enterOpened(from, to, evt) {
      this._cancelTransition();
      if (this._openingTransitionTimer) {
        window.clearTimeout(this._openingTransitionTimer);
        this._openingTransitionTimer = null;
      }
      this.element.classList.add('active');
      /**
       * @event AppWindow#appopen
       * @memberOf AppWindow
       */
      
      if (from == 'opening') {
        // Only publish |open| event when previous state is "opening".
        this.publish('open');
      }
    },

    _enterClosed: function aw__enterClosed(from, to, evt) {
      this._cancelTransition();
      if (this._closingTransitionTimer) {
        window.clearTimeout(this._closingTransitionTimer);
        this._closingTransitionTimer = null;
      }
      this.element.classList.remove('active');
      this.setVisible(false);

      /**
       * @event AppWindow#appclose
       * @memberof AppWindow
       */
      if (from == 'closing') {
        // Only publish |close| event when previous state is "closing".
        this.publish('close');
      }
    },

    /**
     * Set the transition way of opening or closing transition.
     * @param  {String} type       'open' or 'close'
     * @param  {String} transition The CSS rule name about window transition.
     * @memberOf WindowTransition
     */
    _setTransition: function aw__setTransition(type, transition) {
      if (type != 'open' && type != 'close')
        return;

      this._transition[type] = transition;
    }
  };

  AppWindow.addMixin(WindowTransition);
}(this));