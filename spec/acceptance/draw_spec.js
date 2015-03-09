describe('draw module', function() {
  'use strict'
  var draw;
  var rtcc;
  var handleInbandMessage;
  var videobox

  beforeEach(function() {
    videobox = $('<div class="rtcc-videobox" style="position:absolute; width: 50px; height : 50px;"></div>')
    $('body').append(videobox);
    rtcc = {
      on: jasmine.createSpy('on'),
      sendInbandMessage: jasmine.createSpy('sendInbandMessage')
    };
    draw = new RtccInt.Draw(rtcc, callObject)
    handleInbandMessage = rtcc.on.calls.mostRecent().args[1]
  });

  afterEach(function() {
    videobox.remove();
  })

  function hasPointerDrawn(x, y) {
    var data = draw.ctxPtr.getImageData(x - 5, y - 2, 1, 1).data;
    return data[0] === 69 && data[1] === 69 && data[2] === 69 && data[3] === 255
  }

  it('draws the pointer in the correct place', function(done) {
    draw.pointer.onload = function() {
      handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
      expect(hasPointerDrawn(25, 25)).toBe(true)
      done();
    }
  });

  it('can draw after resize', function(done) {
    draw.pointer.onload = function() {
      $('body .rtcc-videobox').width(100)
        //we have to wait for the resize event to be managed
      setTimeout(function() {
        handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
        expect(hasPointerDrawn(50, 25)).toBe(true)
        done();
      }, 100)
    }
  })

  it('draws only one pointer at a time', function(done) {
    draw.pointer.onload = function() {
      handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
      handleInbandMessage('RTCCPTR' + draw._percentToHex(10) + draw._percentToHex(10)) //0 0
      expect(hasPointerDrawn(25, 25)).toBe(false)
      expect(hasPointerDrawn(5, 5)).toBe(true)
      done();
    }
  });

  xit('sends pointer coordinates', function() {
    videobox.offset({
      top: 100,
      left: 200
    })

    // create a jQuery event
    var e = $.Event('mousemove');

    // set coordinates
    e.pageX = 125;
    e.pageY = 225;

    // trigger event - must trigger on document
    $(document).trigger(e);
    expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
  })
});
