RtccInt.Draw = function(rtccObject) {
  'use strict'
  var videobox = $('.rtcc-videobox').first();
  var modes = {
    POINTER: 1,
    DROP: 2,
    DRAW: 3
  }
  var currentMode = modes.POINTER;

  var setMode = function() {

  }

  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';
    videobox.append($('<canvas />'))
  }

  init();
}
