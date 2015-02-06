/* global BaseModule */
'use strict';

(function() {
  var VersionChecker = function() {};
  VersionChecker.SETTINGS = [
    'deviceinfo.previous_os',
    'deviceinfo.os'
  ];
  VersionChecker.STATES = [
    'ready',
    'isUpgrading'
  ];
  BaseModule.create(VersionChecker, {
    name: 'VersionChecker',
    EVENT_PREFIX: 'osversion',
    _start: function() {
      this._version = {};
    },
    '_observe_deviceinfo.os': function(value) {
      var ready = this.ready();
      this._version.current = value;
      if (!ready && this.ready()) {
        this.publish('ready');
      }
    },
    '_observe_deviceinfo.previous_os': function(value) {
      var ready = this.ready();
      this._version.previous = value;
      if (!ready && this.ready()) {
        this.publish('ready');
      }
    },
    isUpgrading: function() {
      var prev = this._version.previous,
          curr = this._version.current,
          isUpgrade = false;
      // dont treat lack of previous version info as an upgrade
      if (prev && curr) {
        isUpgrade = curr.major > prev.major || curr.minor > prev.minor;
      }
      return isUpgrade;
    },
    ready: function() {
      return 'current' in this._version && 'previous' in this._version;
    }
  });
}());