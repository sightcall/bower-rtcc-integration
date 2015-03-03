RtccInt.Box = function(content) {
  'use strict'
  var htmlContent;
  this.setContent = function(newContent) {
    if (newContent) htmlContent = newContent;
  }

  this.getContent = function() {
    return htmlContent;
  }

  this.html = function() {
    return $('<div class="rtccint-box">').html(htmlContent);
  }

  this.setContent(content)
}
