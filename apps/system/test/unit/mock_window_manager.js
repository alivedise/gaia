var MockWindowManager = {
  getDisplayedApp: function mwm_getDisplayedApp() {
    return this.mDisplayedApp;
  },

  kill: function mwm_kill(origin) {
    this.mLastKilledOrigin = origin;
  },

  isFtuRunning: function mwm_isFtuRunning() {
    return this.mFtuRunning;
  },

  mFtuRunning: false,
  mDisplayedApp: {},
  mLastKilledOrigin: '',
  mTeardown: function() {
    this.mDisplayedApp = {};
    this.mLastKilledOrigin = '';
    this.mFtuRunning = false;
  }
};
