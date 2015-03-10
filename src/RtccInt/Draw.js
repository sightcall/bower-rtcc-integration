RtccInt.scriptpath = $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/') + '/';

RtccInt.Draw = function(rtccObject, callObject, settings) {
  'use strict'

  settings = settings || {};
  settings.pointerUrl = settings.pointerUrl || RtccInt.scriptpath + 'img/pointer.png';

  var that = this;
  var allCanvas = {
    pointer: $('<canvas class="rtccint-pointer" />'),
    annotations: $('<canvas class="rtccint-annotations" />')
  }
  var videobox = $('.rtcc-videobox').first();
  var currentMode;
  var hexHundredPercent = parseInt('FFFE', 16);
  var ctx;
  var shouldSendPointerOff = false;
  var shouldSendPointer = true;

  this.ctxPtr = allCanvas.pointer[0].getContext('2d');
  this.pointer = new Image();
  this.pointer.src = settings.pointerUrl;
  this.pointerDelay = 50; //in ms

  this.setMode = function(mode) {
    currentMode = mode;
    callObject.callPointer(mode)
    updateModeListener();
  }

  this.getMode = function() {
    return currentMode;
  }

  this._percentToHex = function(percent) {
    var hex;
    if (0 <= percent && percent <= 100) {
      hex = Math.round(percent / 100 * parseInt('FFFE', 16)).toString(16).toUpperCase();
      while (hex.length < 4) {
        hex = '0' + hex;
      }
    } else {
      hex = 'FFFF';
    }
    return hex
  }

  this._hexToPercent = function(hex) {
    return parseInt(hex, 16) / hexHundredPercent * 100;
  }

  this.setPointer = function(x, y) {
    this.cleanPointer();
    this.ctxPtr.drawImage(that.pointer, x - that.pointer.width / 2, y - that.pointer.height / 2)
  }

  this.cleanPointer = function() {
    this.ctxPtr.clearRect(0, 0, allCanvas.pointer.width(), allCanvas.pointer.height());
  }

  this.destroy = function() {
    removeModeListeners();
    $.each(allCanvas, function(k, v) {
      v.remove();
    })
  }

  function mouseCoordToHex(x, y) {
    var xOffset = x - videobox.offset().left;
    var yOffset = y - videobox.offset().top;
    var hexX = that._percentToHex(xOffset / videobox.width() * 100)
    var hexY = that._percentToHex(yOffset / videobox.height() * 100)
    return hexX === 'FFFF' || hexY === 'FFFF' ? 'FFFFFFFF' : hexX + hexY;
  }

  //this also erase all the canvas content...
  function updateCanvasSize() {
    $.each(allCanvas, function(k, canvas) {
      canvas[0].width = videobox.width()
      canvas[0].height = videobox.height()
    })
    that.ctxPtr = allCanvas.pointer[0].getContext("2d")
  }


  function pointerMouseListener(event) {
    var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
    var message = 'RTCCPTR' + hexCoords;
    if (isOutOfBox(hexCoords)) {
      if (shouldSendPointerOff) {
        shouldSendPointerOff = false
        shouldSendPointer = true;
        rtccObject.sendInbandMessage(message);
      }
    } else if (shouldSendPointer) {
      shouldSendPointerOff = true;
      rtccObject.sendInbandMessage(message);
      shouldSendPointer = false;
      setTimeout(function() {
        shouldSendPointer = true;
      }, that.pointerDelay);
    }
  }

  var modeListeners = {};
  modeListeners[Rtcc.annotationMode.POINTER] = pointerMouseListener

  function updateModeListener() {
    removeModeListeners();
    $(document).on('mousemove', modeListeners[currentMode]);
  }

  function removeModeListeners() {
    $.each(modeListeners, function(k, listener) {
      $(document).off('mousemove', listener)
    })
  }

  //str = XXXXYYYY
  function coordinatesFromHexStr(str) {
    return {
      x: Math.round(that._hexToPercent(str.substring(0, 4)) / 100 * allCanvas.pointer.width()),
      y: Math.round(that._hexToPercent(str.substring(4, 8)) / 100 * allCanvas.pointer.height())
    }
  }

  function isOutOfBox(hexStr) {
    return hexStr === 'FFFFFFFF';
  }

  function handleInbandMessage(message) {
    if (message.search('RTCCPTR') === 0) {
      var hexStr = message.substring(7, 15);
      if (!isOutOfBox(hexStr)) {
        var coords = coordinatesFromHexStr(hexStr)
        that.setPointer(coords.x, coords.y)
      } else {
        that.cleanPointer();
      }
    }
  }

  function startResizeSensor() {
    if (typeof ResizeSensor !== 'function')
      throw 'Missing css-element-queries dependency. You can find it in the bower_components folder.'

    new ResizeSensor(videobox, updateCanvasSize);
    if (videobox.attr('style').indexOf('position: relative') !== -1) {
      videobox.css('position', 'fixed')
    }
  }


  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';

    $.each(allCanvas, function(k, v) {
      videobox.append(v);
    })

    rtccObject.on('message.inband', handleInbandMessage);
    startResizeSensor();
    updateCanvasSize();
  }

  init();
}
