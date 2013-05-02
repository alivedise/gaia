(function(window) {
  window.SystemUI = function() {
    this.render();
    this.update();
  };

  SystemUI.prototype.default_options = {
    // replace me
  };

  SystemUI.prototype.extendOptions = function() {
    utils.extendOptions(this.default_options, arguments[0]);
  };
  
  SystemUI.prototype.render = function() {
      this.constructor.CONTAINER.insertAdjacentHTML('beforeend', this.view());
      this.getAllElements();
      this.bindAllEvents();
  };
  
  SystemUI.prototype.update = function() {
    // implement me
  };
  
  SystemUI.prototype.getAllElements = function() {
    // implement me
    // fetch all elements after rendering
  };
  
  System.prototype.bindAllEvents = function() {
    // implement me
    // bind all events
  };
  
  SystemUI.prototype.resize = function() {
    // Usually we're called by Parent or an resize event
  };
  
  // replace me
  SystemUI.CONTAINER = document.body;

  SystemUI.prototype.publish = function() {

  };
})(this);
