describe('annotations module', function() {
  'use strict'
  var draw;
  var rtcc;
  var handleInbandMessage;
  var videobox

  beforeEach(function() {
    videobox = $('<div class="rtcc-videobox" style="position:absolute; width: 500px; height : 300px;"></div>')
    videobox.offset({
      left: 200,
      top: 100,
    })
    $('body').append(videobox);
    rtcc = {
      on: jasmine.createSpy('on'),
      sendInbandMessage: jasmine.createSpy('sendInbandMessage')
    };
    draw = new RtccInt.Draw(rtcc, callObject, true)
    handleInbandMessage = rtcc.on.calls.mostRecent().args[1]


  });

  afterEach(function() {
    videobox.remove();
    draw.destroy();
  })

  function hasPointerDrawn(xPercent, yPercent) {
    var x = Math.round(xPercent * videobox.width() / 100)
    var y = Math.round(yPercent * videobox.height() / 100)
    var data = draw.ctxPtr.getImageData(x, y, 1, 1).data;
    return isColorCorrectish(data, [219, 219, 219, 201])
  }

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


  describe('pointer', function() {
    describe('draw pointer', function() {
      it('draws the pointer in the correct place', function(done) {
        draw.pointer.onload = function() {
          handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
          expect(hasPointerDrawn(50, 50)).toBe(true)
          done();
        }
      });

      it('can draw after resize', function(done) {
        draw.pointer.onload = function() {
          $('body .rtcc-videobox').width(videobox.width() * 2)
          $('body .rtcc-videobox').height(videobox.height() / 2)
            //we have to wait for the resize event to be managed
          setTimeout(function() {
            handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
            expect(hasPointerDrawn(50, 50)).toBe(true)
            done();
          }, 100)
        }
      })

      it('draws only one pointer at a time', function(done) {
        draw.pointer.onload = function() {
          handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
          handleInbandMessage('RTCCPTR' + draw._percentToHex(10) + draw._percentToHex(10)) //0 0
          expect(hasPointerDrawn(50, 50)).toBe(false)
          expect(hasPointerDrawn(10, 10)).toBe(true)
          done();
        }
      });
    });

    describe('send pointer coordinates', function() {
      beforeEach(function() {
        draw.setMode(Rtcc.annotationMode.POINTER);
      });
      it('with offset', function() {

        videobox.trigger(mouseMoveEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCPTRFFFFFFFF');
      });


      it('with offset and scrolling', function() {
        videobox.offset({
          left: 20000,
          top: 10000,
        })
        videobox.trigger(mouseMoveEvent(20000 + videobox.width() * 0.5, 10000 + videobox.height() * 0.5));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
      })

      it('send correct message when mouse out of videobox if needed', function() {
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



  describe('drop', function() {
    function hasCircleDrawn(xPercent, yPercent, expectedData) {
      var x = Math.round(xPercent * videobox.width() / 100)
      var y = Math.round(yPercent * videobox.height() / 100)
      var trueHeight = videobox.height() * draw.circleRatioTovideobox;
      var data = draw.ctxDraw.getImageData(x, y - Math.round(trueHeight * 16 / 46), 1, 1).data;
      return isColorCorrectish(data, expectedData)
    }

    function hasRemoteCircleDrawn(xPercent, yPercent) {
      return hasCircleDrawn(xPercent, yPercent, [150, 254, 70, 255])
    }

    function hasLocalCircleDrawn(xPercent, yPercent) {
      return hasCircleDrawn(xPercent, yPercent, [255, 169, 60, 255])
    }


    describe('receive drop', function() {
      it('draws a circle', function(done) {
        draw.remoteCircle.onload = function() {
          handleInbandMessage('RTCCDROP7FFF7FFF') //50% 50%
          expect(hasRemoteCircleDrawn(50, 50)).toBe(true)
          done();
        }
      });

      it('can be erased', function(done) {
        draw.remoteCircle.onload = function() {
          handleInbandMessage('RTCCDROP7FFF7FFF') //50% 50%
          expect(hasRemoteCircleDrawn(50, 50)).toBe(true)
          handleInbandMessage('RTCCERASE') //50% 50%
          expect(hasRemoteCircleDrawn(50, 50)).toBe(false)
          done();
        }
      })

    });


    describe('right click', function() {
      beforeEach(function() {
        draw.setMode(Rtcc.annotationMode.DROP);
      });

      it('sends drop', function() {
        videobox.trigger(rightClickEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5))
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDROP7FFF7FFF')
      });

      it('draws a local circle', function(done) {
        draw.localCircle.onload = function() {
          videobox.trigger(rightClickEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5))
          expect(hasLocalCircleDrawn(50, 50)).toBe(true)
          done();
        }
      });
    });
  });


  describe('multiple modes', function() {
    it('switch modes', function() {
      draw.setMode(Rtcc.annotationMode.DROP);
      draw.setMode(Rtcc.annotationMode.POINTER);
      videobox.trigger(rightClickEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5))
      expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith()
    });
  });



  describe('draw', function() {
    function toHaveLine(xPercent, yPercent, expectedData) {
      var x = Math.round(xPercent * videobox.width() / 100)
      var y = Math.round(yPercent * videobox.height() / 100)
      var data = draw.ctxDraw.getImageData(x, y, 1, 1).data;
      return isColorCorrectish(data, expectedData)
    }

    describe('receive', function() {

      it('draws a line between two points', function() {
        handleInbandMessage('RTCCDRAW7FFF7FFF') //50% 50%
        handleInbandMessage('RTCCDRAWFFFE7FFF') //100% 50%
        expect(toHaveLine(75, 50, draw.color.receive)).toBe(true)
      });

      it('draws a line between three points', function() {
        handleInbandMessage('RTCCDRAW00007FFF') //00% 50%
        handleInbandMessage('RTCCDRAW7FFF7FFF') //50% 50%
        handleInbandMessage('RTCCDRAW7FFFFFFE') //50% 100%
        expect(toHaveLine(25, 50, draw.color.receive)).toBe(true)
        expect(toHaveLine(50, 75, draw.color.receive)).toBe(true)
      });

      it('draws several lines', function() {
        /**
         * ____..
         * |..   |
         * |__:__|
         *
         */
        handleInbandMessage('RTCCDRAW00007FFF') //00% 50%
        handleInbandMessage('RTCCDRAW7FFF7FFF') //50% 50%
        handleInbandMessage('RTCCDRAW7FFFFFFE') //50% 100%
        handleInbandMessage('RTCCDRAWFFFFFFFF') //stop

        handleInbandMessage('RTCCDRAW7FFF0000') //50% 0%
        handleInbandMessage('RTCCDRAWFFFE0000') //100% 0%
        expect(toHaveLine(50, 25, draw.color.receive)).toBe(false)
        expect(toHaveLine(75, 0, draw.color.receive)).toBe(true)
      })

    });


    describe('right click', function() {
      beforeEach(function() {
        draw.setMode(Rtcc.annotationMode.DRAW);
      });

      it('send coordinates', function() {
        videobox.trigger(rightClickEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5));
        videobox.trigger(mouseMoveEvent(200, 100))
        videobox.trigger(mouseMoveEvent(200 + videobox.width() * 1, 100 + videobox.height() * 1))
        videobox.trigger(releaseRightClickEvent(200 + videobox.width() * 1, 100 + videobox.height() * 1))
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAW7FFF7FFF')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAW00000000')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAWFFFEFFFE')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAWFFFFFFFF')
      });

      it('does not draw without right click', function() {
        videobox.trigger(mouseMoveEvent(200, 100))
        videobox.trigger(mouseMoveEvent(200 + videobox.width() * 1, 100 + videobox.height() * 1))
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalled()
      });

      it('draw line', function() {
        videobox.trigger(rightClickEvent(200 + videobox.width() * 0, 100 + videobox.height() * 0.5));
        videobox.trigger(mouseMoveEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 0.5));
        videobox.trigger(mouseMoveEvent(200 + videobox.width() * 0.5, 100 + videobox.height() * 1));
        videobox.trigger(releaseRightClickEvent(200 + videobox.width() * 1, 100 + videobox.height() * 1))
        expect(toHaveLine(25, 50, draw.color.send)).toBe(true)
        expect(toHaveLine(50, 75, draw.color.send)).toBe(true)
      });

    });


  });


});