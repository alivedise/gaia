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
    'closing': [null, null, 'closed', 'closed', 'opened'],
    'opening': [null, null, 'opened', 'opened', 'closed']
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
   * Every callback here is for internal usage and would be executed only once.
   *
   * However you could utilize inner event in other functions.
   * 
   *
   * @mixin WindowTransition
   */
  /**
   * @event AppWindow#_onTransitionOpen
   * @private
   * @memberof AppWindow
   */
  /**
   * @event AppWindow#_onTransitionClose
   * @private
   * @memberof AppWindow
   */
  /**
   * @event AppWindow#_onTransitionEnd
   * @private
   * @memberof AppWindow
   */
  /**
   * @event AppWindow#_onTransitionFinish
   * @private
   * @memberof AppWindow
   */
  /**
   * @event AppWindow#_onTransitionCancel
   * @private
   * @memberof AppWindow
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
      
      this.element.classList.add('active');
      
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
      this.element.classList.remove('active');
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
      
      if (from == 'opened') {
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

      this.leaveState(from, to, evt);
      this.onEvent(from, to, evt);
      this.enterState(from, to, evt);

      this._previousTransitionState = from;
      this._transitionState = to;

      try {
        throw new Error('t');
      } catch (e) {
        console.log(e.stack);
      }
      System.debug('From: ' + from + ' To: ' + to + ' By: ' + _EVTARRAY[evt]);
    },

    enterState: function aw_enterState(from, to, evt) {
      var funcName = '_enter' + capitalize(to.toLowerCase());
      if (typeof(this[funcName]) == 'function') {
        setTimeout(function(){
          this[funcName](from, to, evt);
        }.bind(this), 0);
      } else if (this[funcName] && Array.isArray(this[funcName])) {
        this[funcName].forEach(function(func) {
          setTimeout(function(){
            func(from, to, evt);
          }.bind(this), 0);
        }, this);
      }
    },

    leaveState: function aw_leaveState(from, to, evt) {
      var funcName = '_leave' + capitalize(from.toLowerCase());
      if (typeof(this[funcName]) == 'function') {
        setTimeout(function(){
          this[funcName](from, to, evt);
        }.bind(this), 0);
      } else if (this[funcName] && Array.isArray(this[funcName])) {
        this[funcName].forEach(function(func) {
          setTimeout(function(){
            func(from, to, evt);
          }.bind(this), 0);
        }, this);
      }
    },

    onEvent: function aw_onEvent(from, to, evt) {
      var funcName = '_onTransition' + capitalize(_EVTARRAY[evt].toLowerCase());
      this._invoke(funcName);
    },

    _enterOpened: function aw__enterOpened(from, to, evt) {
      this._cancelTransition();
      if (this._openingTransitionTimer) {
        window.clearTimeout(this._openingTransitionTimer);
        this._openingTransitionTimer = null;
      }
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