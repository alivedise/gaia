(function (window){
  var UI = function UI(config) {
    this.config = config;
    this.render();
  };

  UI.prototype.view = function ui_view() {
    // Override me.
    return '';
  };

  // Override me.
  UI.prototype.container = document.body;

  // Override me.
  UI.prototype.eventPrefix = 'ui';

  UI.prototype.render = function ui_render() {
    this.container.insertAdjacentHTML('beforeend', this.view());
    this.getAllElements();
  };

  UI.prototype.show = function ui_show(element) {
    var target = element || this.element;
    target.classList.add('visible');
  };

  UI.prototype.hide = function ui_hide(element) {
    var target = element || this.element;
    target.classList.remove('visible');
  };

  UI.prototype.getAllElements = function ui_getAllElements() {
    // Implement me.
  };

  UI.prototype.publish = function ui_publish(event) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(this.eventPrefix + event,
                        true, false, this);
    if (this.element) {
      this.element.dispatchEvent(evt);
    } else {
      window.dispatchEvent(evt);
    }
  };

  // XXX: Introduce namespace pattern later.
  window.SystemUI = UI;
}(this));