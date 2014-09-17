/* global System */
'use strict';

(function(exports) {
  var AirplaneModeServiceHelper = function() {};
  AirplaneModeServiceHelper.SETTINGS = [
    'ril.data.enabled',
    'ril.data.suspended',
    'bluetooth.enabled',
    'bluetooth.suspended',
    'wifi.enabled',
    'wifi.suspended',
    'geolocation.enabled',
    'geolocation.suspended',
    'nfc.enabled',
    'nfc.suspended'
  ];
  System.create(AirplaneModeServiceHelper, {}, {
    name: 'AirplaneModeServiceHelper',
    _settings: {},
    '_pre_observe': function(setting, value) {
      if (setting.indexOf('enabled') >= 0 && value) {
        this._unsuspend(setting.replace('enabled', 'suspended'));
      }
      this._settings[setting] = value;
    },
    // turn off the mozSetting corresponding to `key'
    // and remember its initial state by storing it in another setting
    _suspend: function(key) {
      var enabled = this._settings[key + '.enabled'];
      var suspended = this._settings[key + '.suspended'];

      if (suspended) {
        return;
      }

      // remember the state before switching it to false
      var sset = {};
      sset[key + '.suspended'] = enabled;
      System.notifyObserver(sset);

      // switch the state to false if necessary
      if (enabled) {
        var eset = {};
        eset[key + '.enabled'] = false;
        System.notifyObserver(eset);
      }
    },
    // turn on the mozSetting corresponding to `key'
    // if it has been suspended by the airplane mode
    _restore: function(key) {
      var suspended = this._settings[key + '.suspended'];

      // clear the 'suspended' state
      var sset = {};
      sset[key + '.suspended'] = false;
      System.notifyObserver(sset);

      // switch the state to true if it was suspended
      if (suspended) {
        var rset = {};
        rset[key + '.enabled'] = true;
        System.notifyObserver(rset);
      }
    },
    _unsuspend: function(settingSuspendedID) {
      // clear the 'suspended' state
      var sset = {};
      sset[settingSuspendedID] = false;
      System.notifyObserver(sset);
    },
    isEnabled: function(key) {
      return this._settings[key + '.enabled'];
    },
    isSuspended: function(key) {
      return this._settings[key + '.suspended'];
    },
    updateStatus: function(value) {
      // FM Radio will be turned off in Gecko, more detailed about why we do
      // this in Gecko instead, please check bug 997064.
      var bluetooth = window.navigator.mozBluetooth;
      var wifiManager = window.navigator.mozWifiManager;
      var nfc = window.navigator.mozNfc;

      window.dispatchEvent(new CustomEvent(!!value ?
        'airplanemode-enabled' : 'airplanemode-disabled'));

      if (value) {

        // Turn off mobile data:
        // we toggle the mozSettings value here just for the sake of UI,
        // platform RIL disconnects mobile data when
        // 'ril.radio.disabled' is true.
        this._suspend('ril.data');

        // Turn off Bluetooth.
        if (bluetooth) {
          this._suspend('bluetooth');
        }

        // Turn off Wifi and Wifi tethering.
        if (wifiManager) {
          this._suspend('wifi');
          System.notifyObserver({
            'tethering.wifi.enabled': false
          });
        }

        // Turn off Geolocation.
        this._suspend('geolocation');

        // Turn off NFC
        if (nfc) {
          this._suspend('nfc');
        }
      } else {
        // Note that we don't restore Wifi tethering when leaving airplane mode
        // because Wifi tethering can't be switched on before data connection is
        // established.

        // Don't attempt to turn on mobile data if it's already on
        if (!this._settings['ril.data.enabled']) {
          this._restore('ril.data');
        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled) {
          this._restore('bluetooth');
        }

        // Don't attempt to turn on Wifi if it's already on
        if (wifiManager && !wifiManager.enabled) {
          this._restore('wifi');
        }

        // Don't attempt to turn on Geolocation if it's already on
        if (!this._settings['geolocation.enabled']) {
          this._restore('geolocation');
        }

        // Don't attempt to turn on NFC if it's already on
        if (nfc && !this._settings['nfc.enabled']) {
          this._restore('nfc');
        }
      }
    }
  });
  exports.AirplaneModeServiceHelper = AirplaneModeServiceHelper;
}(window));
