RtccInt.scriptpath = $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/') + '/';

RtccInt.Draw = function(rtccObject, settings) {
  'use strict'

  settings = settings || {};
  settings.pointerUrl = settings.pointerUrl || RtccInt.scriptpath + 'img/pointer.png';

  var that = this;
  var allCanvas = {
    pointer: $('<canvas class="rtccint-pointer" />'),
    annotations: $('<canvas class="rtccint-annotations" />')
  }
  var videobox = $('.rtcc-videobox').first();
  this.allModes = {
    POINTER: 1,
    DROP: 2,
    DRAW: 3
  }
  var currentMode;
  var hexHundredPercent = parseInt('FFFE', 16);
  var ctx;

  this.ctxPtr = allCanvas.pointer[0].getContext('2d');
  this.pointer = new Image();
  this.pointer.src = settings.pointerUrl;

  this.setMode = function(mode) {
    currentMode = mode;
    updateModeListener();
  }

  this.getMode = function() {
    return currentMode;
  }

  this._percentToHex = function(percent) {
    var hex = Math.round(percent / 100 * parseInt('FFFE', 16)).toString(16).toUpperCase();
    while (hex.length !== 4) {
      hex = '0' + hex;
    }
    return hex
  }

  function mouseCoordToHex(x, y) {
    var xOffset = x - videobox.offset().top;
    var yOffset = y - videobox.offset().left;
    return that._percentToHex(x / videobox.width()) + that._percentToHex(y / videobox.height())
  }

  //this also erase all the canvas content...
  function updateCanvasSize() {
    $.each(allCanvas, function(k, canvas) {
      canvas[0].width = videobox.width()
      canvas[0].height = videobox.height()
    })
    that.ctxPtr = allCanvas.pointer[0].getContext("2d")
  }

  var modeListeners = {};
  modeListeners[this.allModes.POINTER] = function(event) {
    rtccObject.sendInbandMessage('RTCCPTR' + mouseCoordToHex(event.pageX, event.pageY));
  }

  function updateModeListener() {
    removeModeListeners();
    videobox.on('mousemove', modeListeners[currentMode]);
  }

  function removeModeListeners() {
    $.each(modeListeners, function(k, listener) {
      videobox.off('mousemove', listener)
    })
  }


  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';

    $.each(allCanvas, function(k, v) {
      videobox.append(v);
    })

    that.setMode(that.allModes.POINTER); //pointer is the default mode

    rtccObject.on('inband.message', function(message) {
      if (message.search('RTCCPTR') === 0) {
        that.ctxPtr.clearRect(0, 0, allCanvas.pointer.width(), allCanvas.pointer.height());
        if (message.substring(7, 17) !== 'FFFFFFFF') {
          var x = Math.round(parseInt(message.substring(7, 11), 16) / hexHundredPercent * allCanvas.pointer.width());
          var y = Math.round(parseInt(message.substring(11, 15), 16) / hexHundredPercent * allCanvas.pointer.height());
          that.ctxPtr.drawImage(that.pointer, x - that.pointer.width / 2, y - that.pointer.height / 2)
        }
      }
    });

    if (typeof ResizeSensor !== 'function')
      throw 'Missing css-element-queries dependency. You can find it in the bower_components folder.'

    new ResizeSensor(videobox, updateCanvasSize)

    updateCanvasSize();
  }

  init();
}
