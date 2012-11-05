/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('volumeup', function() {
    changeVolume(1);
  });
  window.addEventListener('volumedown', function() {
    changeVolume(-1);
  });

  // This event is generated in shell.js in response to bluetooth headset.
  // Bluetooth headset always assign audio volume to a specific value when
  // pressing its volume-up/volume-down buttons.
  //
  // Bluetooth earphone setting is supenior to the phone setting itself.
  window.addEventListener('mozChromeEvent', function(e) {
    var type = e.detail.type;
    if (type == 'bluetooth-volumeset') {
      changeVolume(e.detail.value - currentVolume['bluetooth'], 'bluetooth');
    }
    // We need to manipulate music type bluetooth earphone after v1
    //
    // platform would send mozChromeEvent about which channel is using now
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=811222
  });


  var currentVolume = {
    'voice': 5,
    'system': 5,
    'alarm': 5,
    'fm': 5,
    'bt': 5
  };
  var pendingRequestCount = 0;

  // We have three virtual states here:
  // OFF -> VIBRATION -> MUTE
  var muteState = 'OFF';

  SettingsListener.observe('audio.volume.voice_call', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['voice'] = volume;
  });
  
  SettingsListener.observe('audio.volume.fm', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['fm'] = volume;
  });
  
  SettingsListener.observe('audio.volume.alarm', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['alarm'] = volume;
  });
  
  SettingsListener.observe('audio.volume.bt_sco', 5, function(volume) {
    if (pendingRequestCount)
      return;

    currentVolume['bt'] = volume;
  });

  var activeTimeout = 0;

  function checkPermission(app) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return false;

    var value = mozPerms.get(permissions[app.manifest.mainStreamType],
                             app.manifestURL, app.origin, false);

    return (value === 'allow');
  };

  function onCall() {
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
      return (call.state == 'connected');
    });
  };

  function BTEarphoneConnecting() {
    // Need platform API support for check the bluetooth earphone is connected.
    var bluetooth = navigator.mozBluetooth;
    if (!bluetooth)
      return false;

    return navigator.mozBluetooth.isConnected(0x111E);
  };

  var currentStream = 'system';

  function getStream(volume) {
    var app = WindowManager.getCurrentDisplayedApp();
    if (BTEarphoneConnecting() && onCall()) {
      return 'bluetooth';
    } else if (onCall()) { 
      return 'voice';
    } else {
      return 'system';
    }
  };

  function changeVolume(delta, stream) {
    if (!stream) {
      stream = getStream();
    }

    if (currentVolume[stream] == 0 ||
        ((currentVolume[stream] + delta) <= 0)) {
      if (delta < 0) {
        if (muteState == 'OFF') {
          muteState = 'VIBRATION';
        } else {
          muteState = 'MUTE';
        }
      } else {
        if (muteState == 'MUTE') {
          delta = 0;
          muteState = 'VIBRATION';
        } else {
          muteState = 'OFF';
        }
      }
    }

    var volume = currentVolume[stream] + delta;
    currentVolume[stream] = volume = Math.max(0, Math.min(10, volume));

    var overlay = document.getElementById('system-overlay');
    var notification = document.getElementById('volume');
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (muteState) {
      case 'OFF':
        classes.remove('vibration');
        classes.remove('mute');
        break;
      case 'VIBRATION':
        classes.add('vibration');
        classes.add('mute');
        SettingsListener.getSettingsLock().set({
          'vibration.enabled': true
        });
        break;
      case 'MUTE':
        classes.remove('vibration');
        classes.add('mute');
        SettingsListener.getSettingsLock().set({
          'vibration.enabled': false
        });
        break;
    }

    var steps =
      Array.prototype.slice.call(notification.querySelectorAll('div'), 0);

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    }

    overlayClasses.add('volume');
    classes.add('visible');
    window.clearTimeout(activeTimeout);
    activeTimeout = window.setTimeout(function hideSound() {
      overlayClasses.remove('volume');
      classes.remove('visible');
    }, 1500);

    if (!window.navigator.mozSettings)
      return;

    pendingRequestCount++;

    var req;

    switch (stream) {
      case 'voice':
        req = SettingsListener.getSettingsLock().set({
          'audio.volume.voice_call': currentVolume['voice']
        });
        break;
      case 'bluetooth':
        req = SettingsListener.getSettingsLock().set({
          'audio.volume.bt_sco': currentVolume['bluetooth']
        });
        break;
      case 'fm':
        req = SettingsListener.getSettingsLock().set({
          'audio.volume.fm': currentVolume['fm']
        }); 
        break;
      case 'alarm':
        req = SettingsListener.getSettingsLock().set({
          'audio.volume.alarm': currentVolume['alarm']
        });
        break;
      default:
        req = SettingsListener.getSettingsLock().set({
            'audio.volume.system': currentVolume['system']
        });
        break;
    }

    notification.dataset.streamType = stream;

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;
    };

    req.onerror = function onError() {
      pendingRequestCount--;
    };
  }
})();
