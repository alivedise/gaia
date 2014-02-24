'use strict';

(function(exports) {
  var WindowResizer = function WindowResizer(app) {
    this.app = app;
    this.render();
  };

  WindowResizer.prototype.template = function() {
    return '<div class="menu">..</div>';
  };

  WindowResizer.prototype.render = function(first_argument) {
    var container = this.app.element;
    if (!container || this._rendered) {
      return;
    }
    this._rendered = true;
    container.classList.add('resizer');
    container.insertAdjacentHTML('beforeend', this.template());
    container.addEventListener('touchstart', function(evt) {
      this._startX = evt.touches[0].pageX;
      this._startY = evt.touches[0].pageY;
      var rect = this.app.element.getBoundingClientRect();
      this._appStartX = rect.left;
      this._appStartY = rect.top;
      this._appStartW = rect.width;
      this._appStartH = rect.height;
      this.app.publish('requestfocus');
    }.bind(this));
    container.addEventListener('touchmove', function(evt) {
      var x = evt.touches[0].pageX;
      var y = evt.touches[0].pageY;
      var dx = x - this._startX;
      var dy = y - this._startY;
      this.app.element.style.top = this._appStartY + dy + 'px';
      this.app.element.style.left = this._appStartX + dx + 'px';
    }.bind(this));
    container.addEventListener('touchstop', function(evt) {
    }.bind(this));
  };

  exports.WindowResizer = WindowResizer;
}(window));
