/* global Symbol */
define([
  'nbd/Class',
  './Rule',
  '../util/css',
  '../util/detectScoped'
], function(Class, Rule, css, compat) {
  'use strict';

  function genId() {
    return '__focss__' + genId.i++;
  }
  genId.i = 1;

  var Engine = Class.extend({
    init: function(root) {
      var target = root || document.body;
      this.rules = [];
      this.style = document.createElement('style');
      this.style.setAttribute('scoped', 'scoped');
      target.insertBefore(this.style, target.firstChild);

      if (compat.scopeSupported || target === document.body) {
        this._prefix = '';
      }
      else {
        this._prefix = '#' + (root.id || (root.id = genId())) + ' ';
      }
    },

    destroy: function() {
      this.rules.forEach(function(rule) {
        rule.destroy();
      });
      this.rules.length = 0;
      this.style.parentNode.removeChild(this.style);
    },

    process: function(payload) {
      this._state = payload;
      this.rules.forEach(this._process, this);
    },

    _process: function(rule, i) {
      rule.process(this._state);
      var selector = rule.getSelector(this._prefix);
      // Selector has changed
      if (selector !== this.cssRules[i].selectorText) {
        if (compat.changeSelectorTextAllowed) {
          this.cssRules[i].selectorText = selector;
        }
        else {
          this.sheet.deleteRule(i);
          this.sheet.insertRule(rule.getSelector(this._prefix) + '{}', i);
        }
      }
      css.apply(this.cssRules[i], rule.result);
    },

    insert: function(selector, spec) {
      var rule = new this.constructor.Rule(selector, spec),
          i = this.rules.length;

      if (rule.isComputed) {
        // Placeholder rule
        this.sheet.insertRule(':scope {}', i);
      }
      else {
        this.sheet.insertRule(rule.getSelector(this._prefix) + '{}', i);
      }
      this.rules.push(rule);

      if (this._state) {
        this._process(rule, i);
      }
      return rule;
    }
  }, {
    Rule: Rule,
    displayName: 'FocssEngine'
  })
  .mixin({
    get sheet() {
      return this.style[compat.sheet];
    },
    get cssRules() {
      return this.sheet[compat.rules];
    }
  });

  // ES6 future-proofing
  if (typeof Symbol !== 'undefined' && Symbol.iterator) {
    Engine.prototype[Symbol.iterator] = function() {
      return {
        _keys: this.rules.slice(),
        next: function() {
          var rule;
          if (rule = this._keys.shift()) {
            return {
              value: rule,
              done: false
            };
          }
          return { done: true };
        }
      };
    };
  }

  return Engine;
});
