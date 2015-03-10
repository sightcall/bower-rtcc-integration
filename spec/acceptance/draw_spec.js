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
    draw.destroy();
  })

  function hasPointerDrawn(x, y) {
    var data = draw.ctxPtr.getImageData(x, y, 1, 1).data;
    return data[0] === 219 && data[1] === 219 && data[2] === 219 && data[3] === 201
  }

  function mouseMoveEvent(x, y) {
    var e = $.Event('mousemove');
    e.pageX = x;
    e.pageY = y;
    return e
  }


  describe('pointer', function() {
    beforeEach(function() {
      draw.setMode(Rtcc.annotationMode.POINTER);
    });

    describe('draw pointer', function() {
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
    });

    describe('send pointer coordinates', function() {
      it('with offset', function() {
        videobox.offset({
          left: 200,
          top: 100,
        })
        videobox.trigger(mouseMoveEvent(225, 125));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCPTRFFFFFFFF');
      });


      it('with offset and scrolling', function() {
        videobox.offset({
          left: 20000,
          top: 10000,
        })
        videobox.trigger(mouseMoveEvent(20025, 10025));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
      })

      it('send correct message when mouse out of videobox if needed', function() {
        videobox.offset({
            left: 200,
            top: 100,
          })
          //no pointer yet
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalled();

        //outside videobox with pointer
        videobox.trigger(mouseMoveEvent(225, 125));
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTRFFFFFFFF');

        //outside again
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage.calls.all().length).toBe(2);
      })
    });


  });



});
