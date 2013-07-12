(function() {
  var runningObservers = [];
  window.addEventListener('appcreated', function onCreateCallback(evt) {
    var target = evt.target;
    var observer = new MutationObserver(function(mutations) {
      var st = window.getComputedStyle(target, null);

      var tr = st.getPropertyValue("-moz-transform") ||
             st.getPropertyValue("transform");

      var values = tr.split('(')[1];
      values = values.split(')')[0];
      values = values.split(',');
      var a = values[0];
      var b = values[1];
      var c = values[2];
      var d = values[3];

      var scale = Math.sqrt(a*a + b*b);
      var sin = b/scale;
      var angle = Math.round(Math.asin(sin) * (180/Math.PI));

      dump('AppMonitor: [' + new Date().getTime()/1000 + '][' + evt.detail.origin + ']');
      dump('  -> ID: ' + target.id + '; Class List: <' + target.classList + '>');
      dump('  -> z-index: ' + st.getPropertyValue("z-index") +
        '; Scale: ' + scale + '; Rotate: ' + angle + ' deg; CSS Visibility: ' + 
        st.getPropertyValue('visibility'));
    });
    var config = { attributes: true, childList: true, characterData: true };

    observer.observe(target, config);
    runningObservers[evt.detail.origin] = observer;
  });

  window.addEventListener('appterminated', function onDestroyCallback(evt) {
    if (runningObservers[evt.detail.origin]) {
      runningObservers[evt.detail.origin].disconnect();
      delete runningObservers[evt.detail.origin];
    }
  });
}());