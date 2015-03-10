describe('draw module', function() {
  'use strict'
  var draw;
  var rtcc;
  var ctxPtr

  beforeEach(function() {
    $('body').append('<div class="rtcc-videobox" style="position:absolute; width: 50px; height : 50px; background:black;"></div>')
    rtcc = {
      on: jasmine.createSpy('on')
    }
    ctxPtr = {
      drawImage: jasmine.createSpy('drawImage'),
      clearRect: jasmine.createSpy('clearRect')
    }

    draw = new RtccInt.Draw(rtcc, callObject);
    draw.setMode(Rtcc.annotationMode.POINTER);
    draw.ctxPtr = ctxPtr;
  });

  afterEach(function() {
    $('.rtcc-videobox').remove();
    rtcc = null;
  })


  it('set mode', function() {
    draw.setMode(Rtcc.annotationMode.DRAW)
    expect(draw.getMode()).toBe(Rtcc.annotationMode.DRAW)
  });

  it('has pointer as default mode', function() {
    expect(draw.getMode()).toBe(Rtcc.annotationMode.POINTER)
  });

  xit('send pointer position', function() {
    draw.setMode(draw.allModes.POINTER);
  });

  it('receive inband message', function() {
    var handleInbandMessage = rtcc.on.calls.mostRecent().args[1]
    handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
    expect(ctxPtr.drawImage).toHaveBeenCalledWith(draw.pointer, 25, 25)
  });

  it('handle out of screen pointer', function() {
    var handleInbandMessage = rtcc.on.calls.mostRecent().args[1]
    handleInbandMessage('RTCCPTRFFFFFFFF') //50% 50%
    expect(ctxPtr.drawImage).not.toHaveBeenCalled()
  });

  it('compute to hexadecimal', function() {
    expect(draw._percentToHex(0)).toBe('0000')
    expect(draw._percentToHex(50)).toBe('7FFF')
    expect(draw._percentToHex(100)).toBe('FFFE')
  })
});
