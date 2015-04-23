var Rtcc = {
  connectionModes: {
    DRIVER: 'driver',
    PLUGIN: 'plugin',
    WEBRTC: 'webrtc'
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
