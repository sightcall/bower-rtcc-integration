RtccInt.Utils = {
  //exists in underscore, include it if we need another function
  htmlEscape: function(str) {
    'use strict'
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};


//jquery plugin to refresh a selector
$.fn.refresh = function() {
    return $(this.selector);
};