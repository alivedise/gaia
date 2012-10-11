/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ListMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('listmenu');
  },

  get container() {
    delete this.container;
    return this.container = document.querySelector('#listmenu menu');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  // Listen to click event only
  init: function lm_init() {
    window.addEventListener('click', this, true);
    window.addEventListener('screenchange', this, true);
    window.addEventListener('home', this);
  },

  // Pass an array of list items and handler for clicking on the items
  // Modified to fit contextmenu use case, loop into the menu items
  request: function lm_request(listItems, title, successCb, errorCb) {
    this.element.innerHTML = '';
    this.currentLevel = 0;
    this.internalList = [];
    this.setTitle(title);
    this.buildMenu(listItems);
    this.internalList.forEach(function render_item(item) {
      this.element.appendChild(item);
    }, this);

    this.onreturn = successCb || function() {};
    this.oncancel = errorCb || function() {};

    this.show();
  },

  buildMenu: function lm_buildMenu(items) {
    var container = document.createElement('menu');
    var _ = navigator.mozL10n.get;

    if (this.currentLevel === 0) {
      container.classList.add('list-menu-root');
      container.id = 'list-menu-root';
    } else {
      container.id = 'list-menu-' + this.internalList.length;
    }
    this.internalList.push(container);

    items.forEach(function traveseItems(item) {
      var button = document.createElement('button');
      if (item.type && item.type == 'menu') {
        this.currentLevel += 1;
        this.currentParent = container.id;
        this.buildMenu(item.items);
        this.currentLevel -= 1;

        button.href = '#' + this.currentChild;
        button.textContent = item.label;
      } else if (item.type == 'menuitem') {
        button.dataset.value = item.id;
        button.textContent = item.label;
      } else {
        button.dataset.value = item.value;
        button.textContent = item.label;
      }

      if (item.icon) {
        button.style.backgroundImage = 'url(' + item.icon + ')';
        button.classList.add('icon');
      }
      container.appendChild(button);
    }, this);

    if (this.currentLevel > 0) {
      var button = document.createElement('button');
      button.textContent = _('back');
      button.href = '#' + this.currentParent;
      container.appendChild(button);
    } else {
      var cancel = document.createElement('button');
      cancel.textContent = _('cancel');
      cancel.dataset.action = 'cancel';
      container.appendChild(cancel);
    }

    container.dataset.level = this.currentLevel;
    this.currentChild = container.id;
  },

  setTitle: function lm_setTitle(title) {
    if (!title)
      return;

    var titleElement = document.createElement('h3');
    titleElement.textContent = title;
    this.element.appendChild(titleElement);
  },

  show: function lm_show() {
    this.container.classList.remove('slidedown');
    this.element.classList.add('visible');
  },

  hide: function lm_hide() {
    var self = this;
    this.container.addEventListener('transitionend',
      function onTransitionEnd() {
        self.element.classList.remove('visible');
        self.container.removeEventListener('transitionend', onTransitionEnd);
      });
    this.container.classList.add('slidedown');
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

      case 'click':
        if (!this.visible)
          return;

        var cancel = evt.target.dataset.action;
        if (cancel && cancel == 'cancel') {
          this.hide();
          this.oncancel();
          return;
        }

        var value = evt.target.dataset.value;
        if (!value) {
          return;
        }

        this.hide();
        this.onreturn(value);
        break;

      case 'home':
        if (this.visible) {
          this.hide();
          this.oncancel();
        }
        break;
    }
  }
};

ListMenu.init();
