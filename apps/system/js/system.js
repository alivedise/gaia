(function(window) {
  window.System = {
    DEBUG: true,

    extend: function(target, input) {
      for (var key in input) {
        if (hasOwnProperty.call(input, key)) {
          target[key] = input[key];
        }
      }

      return target;
    },
    
    /**
     * Creates a calendar namespace.
     *
     *    // Export a view
     *    Calendar.ns('Views').Month = Month;
     *
     * @param {String} namespace like "Views".
     * @param {Boolean} checkOnly will not create new namespaces when true.
     * @return {Object} namespace ref.
     */
    namespace: function(path, checkOnly) {
      var parts = path.split('.');
      var lastPart = this;
      var i = 0;
      var len = parts.length;

      for (; i < len; i++) {
        var part = parts[i];
        if (!(part in lastPart)) {
          if (checkOnly)
            return false;

          lastPart[part] = {};
        }
        lastPart = lastPart[part];
      }

      if (checkOnly)
        return true;

      return lastPart;
    },

    debug: function(msg) {
      if (this.DEBUG) {
        console.log('System:', this.toString(), ':', msg);
      }
    }
  }
})(this);