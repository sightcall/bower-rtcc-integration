var Rtcc = {
  connectionModes: {
    DRIVER: 'driver',
    PLUGIN: 'plugin',
    WEBRTC: 'webrtc'
  },
  pluginMode: {
    EMBEDDED: 'embedded',
    STANDALONE: 'standalone'
  }
}

var callObject = {
  callId: 'call_id',
  callPointer: jasmine.createSpy('callPointer'),
  enableFrameSizeDetection: jasmine.createSpy('enableFrameSizeDetection'),
  on: jasmine.createSpy('on'),
}

//Chrome and phantomJS might have a small color difference when rendering colors
// in canvas
var correctColor = function(colorValue, expected) {
  return Math.abs(colorValue - expected) <= 50;
}

var isColorCorrectish = function(imageData, expected) {
  return correctColor(imageData[0], expected[0]) &&
    correctColor(imageData[1], expected[1]) &&
    correctColor(imageData[2], expected[2]) &&
    correctColor(imageData[3], expected[3])
}

function hasLineDrawn(ctx, xPercent, yPercent, expectedData) {
  var x = Math.round(xPercent * $('.rtccint-annotations').width() / 100)
  var y = Math.round(yPercent * $('.rtccint-annotations').height() / 100)
  var data = ctx.getImageData(x, y, 1, 1).data;
  return isColorCorrectish(data, expectedData)
}

//mouse events
function mouseMoveEvent(x, y) {
  return $.Event('mousemove', {
    pageX: x,
    pageY: y
  });
}

function rightClickEvent(x, y) {
  return $.Event('mousedown', {
    pageX: x,
    pageY: y,
    which: 3
  });
}

function releaseRightClickEvent(x, y) {
  return $.Event("mouseup", {
    which: 3,
    pageX: x,
    pageY: y
  });
}
