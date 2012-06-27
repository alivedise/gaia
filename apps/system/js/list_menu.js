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
    return this.container = document.getElementById('listmenu-container');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  currentLevel: 0,

  // Listen to click event only
  init: function lm_init() {
    window.addEventListener('click', this, true);
    window.addEventListener('screenchange', this, true);
    window.addEventListener('keyup', this, true);
    this.element.addEventListener('transitionend', this, true);
  },

  // Pass an array of list items and handler for clicking on the items
  // Modified to fit contextmenu use case, loop into the menu items
  request: function lm_request(list_items, handler) {
    this.container.innerHTML = '';
    this.currentLevel = 0;
    this.internalList = [];
    this.buildMenu(list_items);
    this.internalList.forEach(function render_item(item) {
      console.log('======',item.id);
      this.container.appendChild(item);
    }, this);

    if (handler) {
      this.onreturn = handler;
    } else {
      this.onreturn = null;
    }

    this.show();
  },

  buildMenu: function lm_buildMenu(items) {
    var container_div = document.createElement('div');
    container_div.id = 'list-menu-'+this.internalList.length;
    if (this.currentLevel > 0) {
      var back_div = document.createElement('div');
      var link = document.createElement('a');
      a.textContext = 'back';
      a.href = '#' + this.currentParent.id;
      back_div.classList.add('back');
      back_div.appendChild(link);
      container_div.appendChild(back_div);
    }
    items.forEach(function traveseItems(item) {
      var item_div = document.createElement('div');
      if (item.type && item.type == 'menu') {
        this.currentLevel += 1;
        this.currentParent = container_div.id;
        this.buildMenu(item.items);
        this.currentLevel -= 1;
        item_div.classList.add('submenu');
        
        var link = document.createElement('a');
        link.href = '#' + this.currentChild.id;
      } else {
        item_div.dataset.value = item.value;
        item_div.textContent = item.label;
      }
      
      if (item.icon) {
        item_div.style.backgroundImage = 'url(' + item.icon + ')';
      }
      container_div.appendChild(item_div);
    }, this);
    if (this.currentLevel === 0) {
      container_div.classList.add('list-menu-root');
      this.previousNode = container_div;
      this.root = this.previousNode;
    }
    container_div.dataset.level = this.currentLevel;
    this.currentChild = container_div;
    this.internalList.push(container_div);
  },

  show: function lm_show() {
    this.previousNode = this.root;
    this.element.classList.add('visible');
  },

  hide: function lm_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

      case 'click':
        var action = evt.target.dataset.value;
        if (!action) {
          return;
        }
        this.hide();
        if (this.onreturn) {
          this.onreturn(action);
        }
        break;

      case 'keyup':
        if (this.visible) {
          if (evt.keyCode == evt.DOM_VK_ESCAPE ||
            evt.keyCode == evt.DOM_VK_HOME) {
            this.hide();
            evt.stopPropagation();
          }
        }
        break;

      case 'transitionend':
        // Determine the movement is go up or go down the tree
        if (this.previousNode.dataset.level > evt.target.dataset.level) {
          // Go up
          console.log('====go up the tree');
          evt.target.classList.remove('passby');
        } else {
          // Go down
          console.log('====go down the tree');
          evt.target.classList.add('passby');
        }
        this.previousNode = ev.target;
        break;
    }
  }
};

ListMenu.init();
