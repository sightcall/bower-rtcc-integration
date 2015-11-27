/**
 * Allow the user to annotate inside an HTML element. The default element is the videobox.
 * @class
 *
 * @see  RtccInt#Annotation.modes
 *
 * @param {Rtcc} rtccObject The object with the connexion to the cloud
 * @param {RtccCall} callObject The call involved in the drawing
 * @param {object} [settings]
 * @param {(DOMobject|jQueryObject)} [settings.container=videobox] The container where the drawing will take place.
 *                                                               The default right click menu will be disabled.
 * @param {string} [settings.pointerSrc=a red pointer] The relative URL to the pointer image
 * @param {boolean} [settings.isShare] If true, the annotations will take place in the shared video. The share must
 *                                     have been started already. Mandatory for plugin and driver.
 * @param {object} [settings.circles]
 * @param {string} [settings.circles.premium="orange circle"] The absolute URL to the circle of the premium user.
 * @param {string} [settings.circles.external=green circle] The absolute URL to the circle of the external user.
 * @param {object} [settings.colors]
 * @param {colorRGBA} [settings.colors.premium=[255,174,0,255](orange)] The color drawn by the premium user.
 * @param {colorRGBA} [settings.colors.external=[114,255,0,255](green)] The color drawn by the external user.
 *
 * @example
 * //draw on the videobox
 * var annotation;
 * call.on('active', function(){
 *   annotation = RtccInt.Annotation(rtcc, call);
 *   annotation.setMode(RtccInt.Annotation.modes.DRAW);
 * })
 */
RtccInt.Annotation = function(rtccObject, callObject, settings) {
  'use strict'

  //DEFAULT VALUES
  settings = settings || {};
  settings.isShare = settings.isShare || false;

  var container = settings.container;
  if (!container) {
    if (settings.isShare)
      container = $('.rtcc-ss');
    else
      container = $('.rtcc-videobox .rtcc-active-video-container').first();
  }

  settings.pointerSrc = settings.pointerSrc || RtccInt.scriptpath + 'img/pointer.png';
  var defaultCircles = {
    external: RtccInt.scriptpath + 'img/drop_green.png',
    premium: RtccInt.scriptpath + 'img/drop_orange.png'
  }
  settings.circles = settings.circles || defaultCircles;
  settings.circles.premium = settings.circles.premium || defaultCircles.premium;
  settings.circles.external = settings.circles.external || defaultCircles.external;
  var defaultColors = {
    external: [114, 255, 0, 255],
    premium: [255, 174, 0, 255]
  }
  settings.colors = settings.colors || defaultColors;
  settings.colors.premium = settings.colors.premium || defaultColors.premium;
  settings.colors.external = settings.colors.external || defaultColors.external;

  //LOCAL
  var that = this;
  var rtccPrefix = settings.isShare ? 'RTCCS' : 'RTCC';
  var allCanvas = {
    pointer: $('<canvas class="rtccint-pointer" />'),
    annotations: $('<canvas class="rtccint-annotations" />')
  }


  var currentMode;
  var framesize = {
    displayed: {
      height: container.height(),
      width: container.width(),
      scale: 1

    }
  };
  var hexHundredPercent = parseInt('FFFE', 16);
  var ctx;
  var shouldSendOff; //flag that indicates if we need to send an out of box position message
  var timeLastMessage; //last message sending time, to avoid spamming mobile devices
  setDefaultTimers();
  var previousDrawCoordinatesReceived = false;
  var previousDrawCoordinatesSent = false;
  var rightMouseDown = false;
  var isExternal = rtccObject.getRtccUserType() === 'external';
  var videoResizeTimeoutId;
  var pluginStandalone = false;

  //ATTRIBUTES
  this.ctxPtr = false;
  this.ctxDraw = false;
  this.messageDelay = 100; //in ms

  /**
   * @property {Number} [circleRatioToContainer=0.15] - Ratio of the circle size compared to the container size
   */
  this.circleRatioToContainer = 0.15;
  this.pointer = new Image();
  this.pointer.src = settings.pointerSrc;
  this.drawing = {
    local: {
      circle: new Image(),
      color: isExternal ? settings.colors.external : settings.colors.premium
    },
    remote: {
      circle: new Image(),
      color: isExternal ? settings.colors.premium : settings.colors.external
    }
  }
  this.drawing.local.circle.src = isExternal ? settings.circles.external : settings.circles.premium;
  this.drawing.remote.circle.src = isExternal ? settings.circles.premium : settings.circles.external;

  //PUBLIC
  /**
   * Choose the annotation mode
   * @param {RtccInt.Annotation.modes} mode - Change the annotation mode.
   */
  this.setMode = function(mode) {
    currentMode = mode;
    setDefaultTimers();
    if (isScreenStandalone() || (rtccObject.getConnectionMode() === Rtcc.connectionModes.PLUGIN && settings.isShare)) {
      var cmd = settings.isShare ? 'sharepointer' : 'callpointer';
      rtccObject.sendMessageToPlugin(
        '<controlcall id="' + callObject.callId + '"><' + cmd + ' mode="' + mode + '"></' + cmd + '></controlcall>')
    } else
      updateModeListener();
  }

  /**
   * @return {RtccInt.Annotation.modes} The current annotation mode.
   */
  this.getMode = function() {
    return currentMode;
  }

  /**
   * Move the pointer to the specified location
   * @param {int} x - Number of pixels from the left of the canvas
   * @param {int} y - Number of pixels from the top of the canvas
   */
  this.setPointer = function(x, y) {
    this.cleanPointer();
    //the pointy end of the mouse is in position (4, 3)
    this.ctxPtr.drawImage(that.pointer, x - 4, y - 3)
  }

  /**
   * Removes the pointer from the canvas
   */
  this.cleanPointer = function() {
    this.ctxPtr.clearRect(0, 0, allCanvas.pointer.width(), allCanvas.pointer.height());
  }

  /**
   * Draws an image centered on (x,y). The picture is resized according to {@link RtccInt.Annotation#circleRatioToContainer}
   * @param {int} x - Number of pixels from the left of the canvas
   * @param {int} y - Number of pixels from the top of the canvas
   * @param  {imageObject} circle The circle to be drawn
   */
  this.dropCircle = function(x, y, circle) {
    var ratio = allCanvas.annotations.width() * this.circleRatioToContainer / circle.width
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

  /**
   * Draw a line of the chosen color between two given points
   * @param  {object} from - Coordinates of the starting point
   * @param  {int} from.x - Number of pixels from the left of the canvas
   * @param  {int} from.y - Number of pixels from the top of the canvas
   * @param  {object} to - Coordinates of the ending point
   * @param  {int} to.x - Number of pixels from the left of the canvas
   * @param  {int} to.y - Number of pixels from the top of the canvas
   * @param  {colorRGBA} color - The color of the line
   */
  this.drawLine = function(from, to, color) {
    this.ctxDraw.beginPath();
    this.ctxDraw.moveTo(from.x, from.y);
    this.ctxDraw.lineTo(to.x, to.y);
    this.ctxDraw.lineWidth = 3;
    this.ctxDraw.strokeStyle = 'rgba(' + color.join(',') + ')';
    this.ctxDraw.stroke();
  }

  /**
   * Erase all drawings made on both sides
   */
  this.erase = function() {
    this.clean();
    rtccObject.sendInbandMessage('RTCCERASE')
  }

  /**
   * Erase local drawings
   */
  this.clean = function() {
    if (isScreenStandalone() || settings.isShare) {
      var cmd = settings.isShare ? 'sharepointer' : 'callpointer';
      rtccObject.sendMessageToPlugin(
        '<controlcall id="' + callObject.callId + '"><' + cmd + '>clear</' + cmd + '></controlcall>')
    } else {
      this.cleanPointer();
      this.ctxDraw.clearRect(0, 0, allCanvas.annotations.width(), allCanvas.annotations.height());
    }
  }

  /**
   * Removes the canvas and all callbacks previously set by this instance.
   * @returns {undefined}
   * @example
   * var annotation = new RtccInt.Annotation(rtcc, call);
   * //override the variable holding the object allows the browser to remove it from memory.
   * annotation = annotation.destroy();
   */
  this.destroy = function() {
    removeModeListeners();
    clearTimeout(videoResizeTimeoutId)
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

  function setDefaultTimers() {
    timeLastMessage = 0;
    shouldSendOff = false;
  }

  function framesizeCallback(newFramesize) {
    framesize = newFramesize
    updateCanvasSize()
  }

  function updateCanvasSize(event) {
    event = event || {}
    var width, height, widthRatio, heightRatio, ratio;
    //with a custom container, we don't care about the framesize
    if (!settings.container) {
      widthRatio = container.width() / framesize.displayed.width
      heightRatio = container.height() / framesize.displayed.height

      ratio = Math.min(heightRatio, widthRatio)
      framesize.displayed.scale = ratio;

      width = framesize.displayed.width * ratio
      height = framesize.displayed.height * ratio
    }

    $.each(allCanvas, function(k, canvas) {
      canvas.refresh();
      //this also erase all the canvas content...
      canvas[0].width = width || container.width()
      canvas[0].height = height || container.height()
    });
    //center
    //
    //
    $.each(allCanvas, function(k, canvas) {
      if (widthRatio) {
        canvas.css('left', Math.round((container.width() - canvas[0].width) / 2) + 'px')
        canvas.css('top', Math.round((container.height() - canvas[0].height) / 2) + 'px')

      }
    })
    updateContexts();
    if (!event.doNotErase) that.erase();
  }

  //Functions to ease maniputations of the hexa strings from the driver


  //str = XXXXYYYY
  function coordinatesFromHexStr(str) {
    var calculated_height = framesize.decoded.height * framesize.displayed.width * framesize.displayed.scale / framesize.decoded.width;
    var calculated_width = framesize.displayed.width * framesize.displayed.scale; //framesize.decoded.width  * framesize.displayed.height / framesize.decoded.height  ;
    var offsetHeight = (calculated_height - framesize.displayed.height) / 2;
    var offsetWidth = (calculated_width - (framesize.displayed.width * framesize.displayed.scale)) / 2;
    var ratio_x = that._hexToPercent(str.substring(0, 4)) / 100;
    var ratio_y = that._hexToPercent(str.substring(4, 8)) / 100;
    var x = (((ratio_x * calculated_width) - offsetWidth));
    var y = (((ratio_y * calculated_height) - offsetHeight));
    return {
      x: Math.round(x),
      y: Math.round(y)
    }
  }

  function isOutOfBox(hexStr) {
    return hexStr.toUpperCase() === 'FFFFFFFF';
  }

  //transform mouse coordinates in a string according to this spec:
  //https://github.com/weemo/Mobile/blob/feature-scheme/scheme.md
  //works for any videobox position
  function mouseCoordToHex(x, y) {
    x = x - allCanvas.pointer.offset().left;
    y = y - allCanvas.pointer.offset().top;
    var calculated_height = framesize.decoded.height * framesize.displayed.width * framesize.displayed.scale / framesize.decoded.width;
    var calculated_width = framesize.displayed.width * framesize.displayed.scale; //framesize.decoded.width  * framesize.displayed.height / framesize.decoded.height  ;
    var offsetHeight = (calculated_height - framesize.displayed.height) / 2;
    var offsetWidth = (calculated_width - (framesize.displayed.width * framesize.displayed.scale)) / 2;
    var ratio_x = ((x + offsetWidth)) / calculated_width;
    var ratio_y = ((y + offsetHeight)) / calculated_height;


    var hexX = that._percentToHex(ratio_x * 100);
    var hexY = that._percentToHex(ratio_y * 100);
    return hexX === 'FFFF' || hexY === 'FFFF' ? 'FFFFFFFF' : hexX + hexY;
  }

  function sendPositionMessage(messageType, hexCoords) {
    var message = rtccPrefix + messageType + hexCoords;
    if (isOutOfBox(hexCoords)) {
      if (shouldSendOff) {
        shouldSendOff = false
        rtccObject.sendInbandMessage(message);
      }
    } else {
      var currentTime = (new Date()).getTime()
        //wait a certain time between message in order not to spam mobile devices
      if (timeLastMessage + that.messageDelay < currentTime) {
        shouldSendOff = true;
        rtccObject.sendInbandMessage(message);
        timeLastMessage = currentTime
      }
    }
  }



  function pointerMouseListener(event) {
    var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
    sendPositionMessage('PTR', hexCoords)
  }

  function sendDrawCoords(event) {
    var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
    sendPositionMessage('DRAW', hexCoords)
    return hexCoords;
  }

  function stopDraw() {
    previousDrawCoordinatesSent = false
    rtccObject.sendInbandMessage(rtccPrefix + 'DRAWFFFFFFFF');
  }

  //event listeners
  var modeListeners = {};
  modeListeners[RtccInt.Annotation.modes.POINTER] = [{
    event: 'mousemove',
    target: $(document),
    listener: pointerMouseListener
  }]
  modeListeners[RtccInt.Annotation.modes.DROP] = [
    {
      event: 'mousemove',
      target: $(document),
      listener: pointerMouseListener
  },
    {
      event: 'mousedown',
      target: container,
      listener: function(event) {
        if (event.which === 3) {
          var hexCoords = mouseCoordToHex(event.pageX, event.pageY);
          rtccObject.sendInbandMessage(rtccPrefix + 'DROP' + hexCoords);
          var coords = coordinatesFromHexStr(hexCoords)
          that.dropCircle(coords.x, coords.y, that.drawing.local.circle)
        }
      }
  }]
  modeListeners[RtccInt.Annotation.modes.DRAW] = [{
    event: 'mousedown',
    target: container,
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
    target: container,
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
            that.drawLine(previousDrawCoordinatesSent, coords, that.drawing.local.color)
          previousDrawCoordinatesSent = coords
        }
      } else {
        pointerMouseListener(event);
      }
    }
  }]


  function updateModeListener() {
    removeModeListeners();
    if (modeListeners[currentMode] && modeListeners[currentMode].length)
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
    function handlePtr(hexStr) {
      if (!isOutOfBox(hexStr)) {
        var coords = coordinatesFromHexStr(hexStr)
        that.setPointer(coords.x, coords.y)
      } else {
        that.cleanPointer();
      }
    }

    function handleDrop(hexStr) {
      var coords = coordinatesFromHexStr(hexStr)
      that.dropCircle(coords.x, coords.y, that.drawing.remote.circle)
    }

    function handleDraw(hexStr) {
      if (isOutOfBox(hexStr)) {
        previousDrawCoordinatesReceived = false;
        return
      }
      var coords = coordinatesFromHexStr(hexStr)
      if (previousDrawCoordinatesReceived) {
        that.drawLine(previousDrawCoordinatesReceived, coords, that.drawing.remote.color)
      }
      previousDrawCoordinatesReceived = coords
    }

    $.each({
      RTCCPTR: handlePtr,
      RTCCDROP: handleDrop,
      RTCCERASE: that.clean.bind(that),
      RTCCDRAW: handleDraw
    }, function(key, listener) {
      if (settings.isShare && $.inArray(message.substring(0, 8), ['RTCCSDRO', 'RTCCSDRA', 'RTCCSPTR'])) {
        message = message.replace('RTCCS', 'RTCC')
      }
      if (message.search(key) === 0) {
        listener(message.replace(key, ''))
      }
    })
  }

  function startContainerResizeDetection() {
    if (!$.fn.removeResize)
      throw new Error('Missing jQuery resize plugin. You can find it in the bower_components folder.')

    container.resize(updateCanvasSize);
    $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', updateCanvasSize)
  }

  function isScreenStandalone() {
    var currentMode = rtccObject.getConnectionMode();
    return currentMode === "extension" || pluginStandalone
  }

  function init() {
    if (!isScreenStandalone() && !container)
      throw 'RtccInt.Draw needs a container to put the drawing.';

    //context menu disable right click
    container.attr('oncontextmenu', 'return false')

    $.each(allCanvas, function(k, v) {
      container.append(v);
    })

    rtccObject.on('message.inband', handleInbandMessage);
    callObject.on('terminate', function() {
      $.each(allCanvas, function(k, v) {
        v.remove();
      })
    });

    rtccObject.on('plugin.mode.standalone', function() {
      pluginStandalone = true
    })
    rtccObject.on('plugin.mode.embedded', function() {
      pluginStandalone = false
    })
    pluginStandalone = rtccObject.getConnectionMode() === Rtcc.connectionModes.PLUGIN && rtccObject.getPluginMode() === Rtcc.pluginMode.STANDALONE

    //container size change ?
    startContainerResizeDetection();

    //video size change ? (can happen when a mobile rotates)
    if (!settings.container && !settings.isShare && !isScreenStandalone()) {
      if (callObject.enableFrameSizeDetection) {
        callObject.enableFrameSizeDetection();
      }
      callObject.on('video.framesize', framesizeCallback)
    }

    updateCanvasSize({
      doNotErase: true
    });
  }

  init();
}


/**
 * Modes you can set for annotations on screenshare
 * @readonly
 * @enum {string}
 **/
RtccInt.Annotation.modes = {
  /** The mouse pointer will be displayed on the subject **/
  POINTER: "pointer",
  /** A right button mouse hold will draw at the current mouse position **/
  DRAW: "draw",
  /** A right click will draw a circle around the point selected **/
  DROP: "drop",
  /** No action will take place */
  NONE: 'none'
};
