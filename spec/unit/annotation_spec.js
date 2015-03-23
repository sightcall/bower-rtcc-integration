describe('draw module', function() {
  'use strict'
  var draw;
  var rtcc;
  var ctxPtr

  beforeEach(function() {
    $('body').append(
      '<div class="rtcc-videobox" style="position:absolute; width: 50px; height :\
     50px; background:black;"><div class="rtcc-active-video-container" style="position: absolute; height: 100%; width: 100%;"></div></div>'
    )
    rtcc = {
      on: jasmine.createSpy('on'),
      getConnectionMode: function() {
        return Rtcc.connectionModes.PLUGIN
      }
    }
    ctxPtr = {
      drawImage: jasmine.createSpy('drawImage'),
      clearRect: jasmine.createSpy('clearRect')
    }

    draw = new RtccInt.Draw(rtcc, callObject);
    draw.setMode(RtccInt.annotationMode.POINTER);
    draw.ctxPtr = ctxPtr;
  });

  afterEach(function() {
    $('.rtcc-videobox').remove();
    rtcc = null;
  })


  it('set mode', function() {
    draw.setMode(RtccInt.annotationMode.POINTER)
    expect(draw.getMode()).toBe(RtccInt.annotationMode.POINTER)
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
    handleInbandMessage('RTCCPTRFFFFFFFF')
    expect(ctxPtr.drawImage).not.toHaveBeenCalled()
  });

  it('compute to hexadecimal', function() {
    expect(draw._percentToHex(0)).toBe('0000')
    expect(draw._percentToHex(50)).toBe('7FFF')
    expect(draw._percentToHex(100)).toBe('FFFE')
  })
});
