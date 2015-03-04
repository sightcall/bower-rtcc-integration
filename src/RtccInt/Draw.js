RtccInt.Draw = function(rtccObject) {
  'use strict'
  var videobox = $('.rtcc-videobox').first();
  this.allModes = {
    POINTER: 1,
    DROP: 2,
    DRAW: 3
  }
  var currentMode = this.allModes.POINTER;
  var canvas;

  this.setMode = function(mode) {
    currentMode = mode;
  }

  this.getMode = function() {
    return currentMode;
  }



  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';
    canvas = $('<canvas />');
    /*videobox.append(canvas);

    canvas.on('mousemove', function(){
      
    })

    rtccObject.on('inband.message', function(){

    })*/
  }

  init();
}
