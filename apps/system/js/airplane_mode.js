/* global AirplaneMode, BaseModule */
'use strict';

(function() {
  // main
  var AirplaneMode = function() {
  };
  AirplaneMode.SETTINGS = [
    'airplaneMode.enabled'
  ];
  AirplaneMode.EVENTS = [
    'radiostatechange',
    'request-airplane-mode-enable',
    'request-airplane-mode-disable'
  ];
  AirplaneMode.SUB_MODULES = [
    'AirplaneModeServiceHelper'
  ];
  BaseModule.create(AirplaneMode, {
    name: 'AirplaneMode',

    /*
     * This is an internal key to store current state of AirplaneMode
     */
    _enabled: null,

    /*
     * This is an event mapping table that will help us wait for
     * specific event from its manager to make sure we are now
     * in airplane mode or not.
     */
    _checkedActionsMap: {
      wifi: {
        enabled: 'wifi-enabled',
        disabled: 'wifi-disabled'
      },
      bluetooth: {
        enabled: 'bluetooth-adapter-added',
        disabled: 'bluetooth-disabled'
      },
      radio: {
        enabled: 'radio-enabled',
        disabled: 'radio-disabled'
      }
    },

    '_observe_airplaneMode.enabled': function(value) {
      this.enabled = value;
    },

    /*
     * If we are in airplane mode and the user just dial out an
     * emergency call, we have to exit airplane mode.
     */
    _handle_radiostatechange: function(state) {
      if (state === 'enabled' && this._enabled === true) {
        this.enabled = false;
      }
    },

    '_handle_request-airplane-mode-enable': function() {
      if (this.enabled === false) {
        this.enabled = true;
      }
    },

    '_handle_request-airplane-mode-disable': function() {
      if (this.enabled === true) {
        this.enabled = false;
      }
    },

    /*
     * When turning on / off airplane mode, we will start watching
     * needed events to make sure we are in airplane mode or not.
     *
     * @param {boolean} value
     * @param {Object} checkedActions
     */
    watchEvents: function(value, checkedActions) {
      var self = this;
      // We don't want to wait until the first event reacts in order to
      // update the status, because we can set the status to 'enabling' or
      // 'disabling' already through `_updateAirplaneModeStatus`.
      self._updateAirplaneModeStatus(checkedActions);
      for (var serviceName in this._checkedActionsMap) {

        // if we are waiting for specific service
        if (serviceName in checkedActions) {
          var action = value ? 'disabled' : 'enabled';
          var eventName = this._checkedActionsMap[serviceName][action];

          // then we will start watch events coming from its manager
          window.addEventListener(eventName,
            (function(eventName, serviceName) {
              return function toUpdateAirplaneMode() {
                self.debug('handling ' + eventName);
                window.removeEventListener(eventName, toUpdateAirplaneMode);
                checkedActions[serviceName] = true;
                self._updateAirplaneModeStatus(checkedActions);
              };
          }(eventName, serviceName)));
        }
      }
    },

    /*
     * In order to make sure all needed managers work successfully. We have to
     * use this method to update airplaneMode related keys to tell
     * AirplaneModeHelper our current states and is finised or not.
     */
    _updateAirplaneModeStatus: function(checkActions) {
      var self = this;
      var areAllActionsDone;

      areAllActionsDone = this._areCheckedActionsAllDone(checkActions);

      if (areAllActionsDone) {
        this.debug('write settings...', this._enabled);
        this.writeSetting({
          'airplaneMode.enabled': this._enabled,
          'airplaneMode.status': this._enabled ? 'enabled' : 'disabled',
          // NOTE
          // this is for backward compatibility,
          // because we will update this value only when airplane mode
          // is on / off, it will not affect apps using this value
          'ril.radio.disabled': this._enabled
        });
      } else {
        // keep updating the status to reflect current status
        this.writeSetting({
          'airplaneMode.status': this._enabled ? 'enabling' : 'disabling'
        });
      }
    },

    _ready: false,

    ready: function() {
      var self = this;
      Promise.all([System.request('getAPI', 'mobileConnections'),
        System.request('getAPI', 'bluetooth'),
        System.request('getAPI', 'wifi')]).then(function(p1, p2, p3) {
          self._ready = true;
          console.log(p1, p2, p3);
        });
    },

    /*
     * By default, these three API takes longer time and with success / error
     * callback. we just have to wait for these three items.
     *
     * @param {boolean} value
     * @return {Object} checkedActions
     */
    _getCheckedActions: function(value) {
      // we have to re-init all need-to-check managers
      var checkedActions = {};

      if (value === true) {
        // check connection
        System.request('getAPI', 'mobileConnections').then(function(value) {
          if (!value) {
            return;
          }
          checkedActions.radio = false;
        });

        // check bluetooth
        if (this.airplaneModeServiceHelper.isEnabled('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this.airplaneModeServiceHelper.isEnabled('wifi')) {
          checkedActions.wifi = false;
        }
      } else {
        System.request('getAPI', 'mobileConnections').then(function(value) {
          if (!value) {
            return;
          }
          checkedActions.radio = false;
        });

        // check bluetooth
        if (this.airplaneModeServiceHelper.isSuspended('bluetooth')) {
          checkedActions.bluetooth = false;
        }

        // check wifi
        if (this.airplaneModeServiceHelper.isSuspended('wifi')) {
          checkedActions.wifi = false;
        }
      }

      return checkedActions;
    },

    /*
     * We have to use this method to check whether all actions
     * are done or not.
     *
     * @return {boolean}
     */
    _areCheckedActionsAllDone: function(checkedActions) {
      this.debug('checking action is all done ?');
      for (var key in checkedActions) {
        if (checkedActions[key] === false) {
          this.debug(key + '...not yet.');
          return false;
        }
      }
      this.debug('...all done');
      return true;
    }
  }, {
    enabled: {
      configurable: false,
      /*
       * This is a ES5 feature that can help the others easily get/set
       * AirplaneMode.
       *
       * @param {boolean} value
       */
      set: function(value) {
        this.debug('current: ' + this._enabled);
        if (value !== this._enabled) {
          this.debug('turned to ' + value);
          this._enabled = value;

          // start watching events
          this.watchEvents(value, this._getCheckedActions(value));

          // tell services to do their own operations
          this.airplaneModeServiceHelper.updateStatus(value);
        }
      },

      /*
       * This is a ES5 feature that can help the others easily get AirplaneMode
       * states.
       *
       * @return {boolean}
       */
      get: function() {
        return this._enabled;
      }
    }
  });
})();
