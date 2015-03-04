describe('draw module', function() {
  'use strict'
  var draw;

  beforeEach(function() {
    draw = new RtccInt.Draw({});
  });


  it('set mode', function() {
    draw.setMode(draw.allModes.DRAW)
    expect(draw.getMode()).toBe(draw.allModes.DRAW)
  });

  it('has pointer as default mode', function() {
    expect(draw.getMode()).toBe(draw.allModes.POINTER)
  });

  it('send pointer position', function() {
    draw.setMode(draw.allModes.POINTER)
  });

});
