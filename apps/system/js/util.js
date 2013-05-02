'use strict';

(function(window) {
  window.utils = {
    /**
     * @function util.extendOptions
     * For extending the options on default configurations
     * @param  {Object} default_options The default configuration.
     * Every item should be defined here or else it won't be copied to the target..
     * @param  {Object} user_options    The user-defined configurations
     * @return {Object}                 Extended configuration object
     *
     * @description XXX: Please note that if the configuration object becomes more than
     * one level in the future, we ought to support mulit-level object copy here.
     */
    extendOptions: function utils_extendOptions(default_options, user_options) {
      var o = {};
      for (var prop in default_options) {
        if (default_options.hasOwnProperty(prop)) {
          o[prop] = user_options[prop];   
        } else {
          o[prop] = default_options[prop];
        }
      }
      return o;
    }
  };
})(this);