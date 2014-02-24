'use strict';

(function(exports) {
  var AppTaskManager = function(stackManager) {
    this.stackManager = stackManager;
    this.render();
    this._fetchElements();
    this._registerEvents();
  };
  AppTaskManager.prototype.__proto__ = window.BaseUI.prototype;
  AppTaskManager.prototype.containerElement = document.getElementById('screen');
  AppTaskManager.prototype.view = function() {
    return '<div class="app-task-manager" ' +
    ' data-z-index-level="app-task-manager"></div>';
  };
  AppTaskManager.prototype._registerEvents = function() {
    window.addEventListener('stackchanged', this);
  };
  AppTaskManager.prototype._fetchElements = function() {
    this.element = document.querySelector('.app-task-manager');
  };
  AppTaskManager.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'stackchanged':
        this.element.innerHTML = '';
        var html = '';
        for (var id in this.stackManager._stack) {
          html += '<button>' + this.stackManager._stack[id].name + '</button>';
        }
        this.element.innerHTML = html;
        break;
    }
  };
  exports.AppTaskManager = AppTaskManager;
}(window));