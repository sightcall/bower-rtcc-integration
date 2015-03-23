/**
 * Modes you can set for annotations on screenshare
 * @readonly
 * @enum {string}
 **/
RtccInt.annotationMode = {
  /** The mouse pointer will be displayed on the subject **/
  POINTER: "pointer",
  /** A right button mouse hold will draw at the current mouse position **/
  DRAW: "draw",
  /**  A right click will draw a circle around the point selected **/
  DROP: "drop"
};


/**
 * @param {Rtcc} rtccObject The object with the connexion to the cloud
 * @param {callObject} callObject The call involved in the drawing
 * @param {object} settings - These settings are optionals.
 * @param {DOMobject|jQueryObject} [settings.container] The container where the drawing will take place.
 *                                                      The default right click menu will be disabled. Default is the videobox.
 * @param {string} [settings.pointerSrc] The relative URL to the pointer image
 * @param {string} [settings.remoteCircleSrc] The relative URL to the circle displayed locally when received from the callee
 * @param {string} [settings.localCircleSrc] The relative URL to the circle displayed locally when sending a circle
 *
 */
RtccInt.Draw = function(rtccObject, callObject, isExternal, settings) {
  'use strict'

  //DEFAULT VALUES
  settings = settings || {};
  settings.pointerSrc = settings.pointerSrc || RtccInt.scriptpath + 'img/pointer.png';
  settings.remoteCircleSrc = settings.remoteCircleSrc || RtccInt.scriptpath + 'img/drop_green.png';
  settings.localCircleSrc = settings.localCircleSrc || RtccInt.scriptpath + 'img/drop_orange.png';
  settings.container = settings.container ? $(settings.container) : $('.rtcc-videobox .rtcc-active-video-container').first();

  //LOCAL
  var that = this;
  var allCanvas = {
    pointer: $('<canvas class="rtccint-pointer" />'),
    annotations: $('<canvas class="rtccint-annotations" />')
  }
  var currentMode;
  var hexHundredPercent = parseInt('FFFE', 16);
  var ctx;
  var shouldSendPointerOff = false;
  var shouldSendPointer = true;
  var previousDrawCoordinatesReceived = false;
  var previousDrawCoordinatesSent = false;
  var rightMouseDown = false;

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
  this.color = {
    receive: [114, 255, 0, 255],
    send: [255, 174, 0, 255]
  }

  //PUBLIC
  this.setMode = function(mode) {
    currentMode = mode;
    if (rtccObject.getConnectionMode() === Rtcc.connectionModes.DRIVER)
      rtccObject.sendMessageToDriver(
        '<controlcall id="' + callObject.callId + '"><callpointer mode="' + mode + '"></callpointer></controlcall>')
    else
      updateModeListener();
  }

  this.getMode = function() {
    return currentMode;
  }

  this.setPointer = function(x, y) {
    this.cleanPointer();
    this.ctxPtr.drawImage(that.pointer, x - that.pointer.width / 2, y - that.pointer.height / 2)
  }

  this.cleanPointer = function() {
    this.ctxPtr.clearRect(0, 0, allCanvas.pointer.width(), allCanvas.pointer.height());
  }

  this.dropCircle = function(x, y, circle) {
    var ratio = settings.container.width() * this.circleRatioTovideobox / circle.width
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

  this.drawLine = function(from, to, color) {
    this.ctxDraw.beginPath();
    this.ctxDraw.moveTo(from.x, from.y);
    this.ctxDraw.lineTo(to.x, to.y);
    this.ctxDraw.lineWidth = 3;
    this.ctxDraw.strokeStyle = 'rgba(' + color.join(',') + ')';
    this.ctxDraw.stroke();
  }

  this.erase = function() {
    if (rtccObject.getConnectionMode() === Rtcc.connectionModes.DRIVER)
      rtccObject.sendMessageToDriver(
        '<controlcall id="' + callObject.callId + '"><callpointer>clear</callpointer></controlcall>')
    else
      this.ctxDraw.clearRect(0, 0, allCanvas.annotations.width(), allCanvas.annotations.height());
  }

  this.destroy = function() {
    removeModeListeners();
    $.each(allCanvas, function(k, v) {
      v.remove();
    })
  }


  //PROTECTED
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


  //PRIVATE
  function updateContexts() {
    that.ctxPtr = allCanvas.pointer[0].getContext('2d');
    that.ctxDraw = allCanvas.annotations[0].getContext('2d');
  }

  //this also erase all the canvas content...
  function updateCanvasSize() {
    $.each(allCanvas, function(k, canvas) {
      canvas[0].width = settings.container.width()
      canvas[0].height = settings.container.height()
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
    var xOffset = x - settings.container.offset().left;
    var yOffset = y - settings.container.offset().top;
    var hexX = that._percentToHex(xOffset / settings.container.width() * 100)
    var hexY = that._percentToHex(yOffset / settings.container.height() * 100)
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

  function sendDrawCoords(event) {
    var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
    rtccObject.sendInbandMessage('RTCCDRAW' + hexCoords);
    return hexCoords;
  }

  function stopDraw() {
    previousDrawCoordinatesSent = false
    rtccObject.sendInbandMessage('RTCCDRAWFFFFFFFF');
  }

  //event listeners
  var modeListeners = {};
  modeListeners[RtccInt.annotationMode.POINTER] = [{
    event: 'mousemove',
    target: $(document),
    listener: pointerMouseListener
  }]
  modeListeners[RtccInt.annotationMode.DROP] = [{
    event: 'mousedown',
    target: settings.container,
    listener: function(event) {
      if (event.which === 3) {
        var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
        rtccObject.sendInbandMessage('RTCCDROP' + hexCoords);
        var coords = coordinatesFromHexStr(hexCoords)
        that.dropCircle(coords.x, coords.y, that.localCircle)
      }
    }
  }]
  modeListeners[RtccInt.annotationMode.DRAW] = [{
    event: 'mousedown',
    target: settings.container,
    listener: function(event) {
      if (event.which === 3) {
        rightMouseDown = true
        var hexStr = sendDrawCoords(event);
        if (!isOutOfBox(hexStr)) {
          previousDrawCoordinatesSent = coordinatesFromHexStr(hexStr)
        }
      }
    }
  }, {
    event: 'mouseup',
    target: settings.container,
    listener: function(event) {
      if (event.which === 3) {
        rightMouseDown = false
        stopDraw();
      }
    }
  }, {
    event: 'mousemove',
    target: $(document),
    listener: function(event) {
      if (rightMouseDown) {
        var hexStr = sendDrawCoords(event);
        if (isOutOfBox(hexStr)) {
          previousDrawCoordinatesSent = false
          stopDraw();
        } else {
          var coords = coordinatesFromHexStr(hexStr)
          if (previousDrawCoordinatesSent)
            that.drawLine(previousDrawCoordinatesSent, coords, that.color.send)
          previousDrawCoordinatesSent = coords
        }
      }
    }
  }]


  function updateModeListener() {
    removeModeListeners();
    if (modeListeners[currentMode].length)
      $.each(modeListeners[currentMode], function(k, modeListener) {
        modeListener.target.on(modeListener.event, modeListener.listener);
      })
  }

  function removeModeListeners() {
    $.each(modeListeners, function(k, list) {
      $.each(list, function(i, v) {
        v.target.off(v.event, v.listener)
      })
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
      RTCCERASE: that.erase.bind(that),
      RTCCDRAW: function(hexStr) {
        if (isOutOfBox(hexStr)) {
          previousDrawCoordinatesReceived = false;
          return
        }
        var coords = coordinatesFromHexStr(hexStr)
        if (previousDrawCoordinatesReceived) {
          that.drawLine(previousDrawCoordinatesReceived, coords, that.color.receive)
        }
        previousDrawCoordinatesReceived = coords
      }
    }, function(key, listener) {
      if (message.search(key) === 0) {
        listener(message.replace(key, ''))
      }
    })
  }

  function startResizeSensor() {
    if (typeof ResizeSensor !== 'function')
      throw 'Missing css-element-queries dependency. You can find it in the bower_components folder.'

    new ResizeSensor(settings.container, updateCanvasSize);
  }


  function init() {
    if (rtccObject.getConnectionMode() !== Rtcc.connectionModes.DRIVER && !settings.container)
      throw 'RtccInt.Draw needs a container to put the drawing.';

    //context menu disable right click
    settings.container.attr('oncontextmenu', 'return false')

    $.each(allCanvas, function(k, v) {
      settings.container.append(v);
    })

    rtccObject.on('message.inband', handleInbandMessage);
    startResizeSensor();
    updateCanvasSize();
  }

  init();
}
