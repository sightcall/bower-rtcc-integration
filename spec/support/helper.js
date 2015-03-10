var Rtcc = {
  annotationMode: {
    POINTER: 'pointer',
    DRAW: 'draw',
    DROP: 'drop'
  }
}

var callObject = {
  callPointer: jasmine.createSpy('callPointer')
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
