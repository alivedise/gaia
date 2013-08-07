(function(window) {
  var WindowMonitor = {
    init: function wmo_init() {
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
    },

    handleEvent: function wmo_handleEvent(evt) {
      switch (evt.type) {
        case 'appcreated':
          var element = evt.detail.element;
          console.log(element);
          var observer = new MutationObserver(function(mutations) {
            /**
             * We could iterate the mutations here,
             * but I don't really care it now.
             */
            var st = window.getComputedStyle(element, null);
            var tr = st.getPropertyValue("-webkit-transform") ||
                     st.getPropertyValue("-moz-transform") ||
                     st.getPropertyValue("-ms-transform") ||
                     st.getPropertyValue("-o-transform") ||
                     st.getPropertyValue("transform");

            // rotation matrix - http://en.wikipedia.org/wiki/Rotation_matrix

            // works!
            console.log('zIndex: '+st.getPropertyValue('z-index') + ' ;visible: ' +  st.getPropertyValue('visibility') + ' ;classList: ' + element.classList);
          });
          /**
            * Configuration of mutation observer.
            */
          var config = { attributes: true, childList: true, characterData: true };

          /**
           * pass in the target node, as well as the observer options
           */
          observer.observe(element, config);
          break;
        case 'appterminated':
          break;
      }
    }
  };

  WindowMonitor.init();
}(this));