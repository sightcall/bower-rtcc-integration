RtccInt.scriptpath = $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/') + '/';

RtccInt.Draw = function(rtccObject, callObject, isExternal, settings) {
  'use strict'

  //DEFAULT VALUES
  settings = settings || {};
  settings.pointerSrc = settings.pointerSrc || RtccInt.scriptpath + 'img/pointer.png';
  settings.remoteCircleSrc = settings.remoteCircleSrc || RtccInt.scriptpath + 'img/drop_green.png';
  settings.localCircleSrc = settings.localCircleSrc || RtccInt.scriptpath + 'img/drop_orange.png';

  //GLOBAL
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

  //ATTRIBUTES
  this.ctxPtr = false;
  this.ctxDraw = false;
  this.pointerDelay = 50; //in ms
  this.circleRatioTovideobox = 0.15;
  this.pointer = new Image();
  this.pointer.src = settings.pointerSrc;
  this.remoteCircle = new Image()
  this.remoteCircle.src = settings.remoteCircleSrc;
  this.localCircle = new Image()
  this.localCircle.src = settings.localCircleSrc;

  //PUBLIC
  this.setMode = function(mode) {
    currentMode = mode;
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

  this.dropCircle = function(x, y, circle) {
    var ratio = videobox.width() * this.circleRatioTovideobox / circle.width
    var drawnCircleWidth = Math.round(circle.width * ratio)
    var drawnCircleHeight = Math.round(circle.height * ratio)
    this.ctxDraw.drawImage(
      circle,
      Math.round(x - drawnCircleWidth / 2),
      Math.round(y - drawnCircleHeight / 2),
      drawnCircleWidth,
      drawnCircleHeight
    )
  }

  this.erase = function() {
    this.ctxDraw.clearRect(0, 0, allCanvas.annotations.width(), allCanvas.annotations.height());
  }

  this.destroy = function() {
    removeModeListeners();
    $.each(allCanvas, function(k, v) {
      v.remove();
    })
  }


  //PRIVATE
  function updateContexts() {
    that.ctxPtr = allCanvas.pointer[0].getContext('2d');
    that.ctxDraw = allCanvas.annotations[0].getContext('2d');
  }

  //this also erase all the canvas content...
  function updateCanvasSize() {
    $.each(allCanvas, function(k, canvas) {
      canvas[0].width = videobox.width()
      canvas[0].height = videobox.height()
    })
    updateContexts();
  }

  //Functions to ease maniputations of the hexa strings from the driver

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

  //transform mouse coordinates in a string according to this spec:
  //https://github.com/weemo/Mobile/blob/feature-scheme/scheme.md
  //works for any videobox position
  function mouseCoordToHex(x, y) {
    var xOffset = x - videobox.offset().left;
    var yOffset = y - videobox.offset().top;
    var hexX = that._percentToHex(xOffset / videobox.width() * 100)
    var hexY = that._percentToHex(yOffset / videobox.height() * 100)
    return hexX === 'FFFF' || hexY === 'FFFF' ? 'FFFFFFFF' : hexX + hexY;
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

  //event listeners
  var modeListeners = {};
  modeListeners[Rtcc.annotationMode.POINTER] = {
    event: 'mousemove',
    target: $(document),
    listener: pointerMouseListener
  }
  modeListeners[Rtcc.annotationMode.DROP] = {
    event: 'mousedown',
    target: videobox,
    listener: function(event) {
      if (event.which === 3) {
        var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
        rtccObject.sendInbandMessage('RTCCDROP' + hexCoords);
        var coords = coordinatesFromHexStr(hexCoords)
        that.dropCircle(coords.x, coords.y, that.localCircle)
      }
    }
  }

  function updateModeListener() {
    removeModeListeners();
    var modeListener = modeListeners[currentMode];
    if (modeListener)
      modeListener.target.on(modeListener.event, modeListener.listener);
  }

  function removeModeListeners() {
    $.each(modeListeners, function(k, v) {
      v.target.off(v.event, v.listener)
    })
  }


  function handleInbandMessage(message) {
    $.each({
      RTCCPTR: function(hexStr) {
        if (!isOutOfBox(hexStr)) {
          var coords = coordinatesFromHexStr(hexStr)
          that.setPointer(coords.x, coords.y)
        } else {
          that.cleanPointer();
        }
      },
      RTCCDROP: function(hexStr) {
        var coords = coordinatesFromHexStr(hexStr)
        that.dropCircle(coords.x, coords.y, that.remoteCircle)
      },
      RTCCERASE: that.erase.bind(that)
    }, function(key, listener) {
      if (message.search(key) === 0) {
        listener(message.replace(key, ''))
      }
    })
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
    //context menu disable right click
    videobox.attr('oncontextmenu', 'return false')

    $.each(allCanvas, function(k, v) {
      videobox.append(v);
    })

    rtccObject.on('message.inband', handleInbandMessage);
    startResizeSensor();
    updateCanvasSize();
  }

  init();
}
