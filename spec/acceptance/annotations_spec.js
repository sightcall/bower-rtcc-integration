describe('annotations module', function() {
  'use strict'
  var annotation;
  var rtcc;
  var handleInbandMessage;
  var framesizeCallback;
  var videobox
  var videoboxActive

  beforeEach(function() {
    videobox = $('<div class="rtcc-videobox" style="position:absolute; width: 500px; height : 300px;"></div>')
    videoboxActive = $('<div class="rtcc-active-video-container" style="position: absolute; height: 100%; width: 100%;"></div>')
    videobox.append(videoboxActive);
    videobox.offset({
      left: 200,
      top: 100,
    })
    $('body').append(videobox);
    rtcc = {
      on: jasmine.createSpy('on'),
      getConnectionMode: function() {
        return 'plugin';
      },
      sendInbandMessage: jasmine.createSpy('sendInbandMessage'),
      sendMessageToDriver: jasmine.createSpy('sendMessageToDriver'),
      getRtccUserType: function() {
        return 'internal'
      }
    };

    annotation = new RtccInt.Annotation(rtcc, callObject)
    handleInbandMessage = rtcc.on.calls.mostRecent().args[1]
    framesizeCallback = callObject.on.calls.mostRecent().args[1]
  });

  afterEach(function() {
    videobox.remove();
    annotation.destroy();
  })

  function hasPointerDrawn(xPercent, yPercent) {
    var x = Math.round(xPercent * $('.rtccint-pointer').width() / 100)
    var y = Math.round(yPercent * $('.rtccint-pointer').height() / 100)
    var data = annotation.ctxPtr.getImageData(x, y, 1, 1).data;
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

  describe('none', function() {
    it('should not show pointer', function() {
      annotation.setMode(RtccInt.Annotation.modes.POINTER);
      annotation.setMode(RtccInt.Annotation.modes.NONE);
      videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5));
      expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
    });
  });


  describe('pointer', function() {
    describe('draw pointer', function() {
      it('draws the pointer in the correct place', function(done) {
        annotation.pointer.onload = function() {
          handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
          expect(hasPointerDrawn(50, 50)).toBe(true)
          done();
        }
      });

      it('after resize', function(done) {
        annotation.pointer.onload = function() {
          expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCERASE')
          rtcc.sendInbandMessage.calls.reset();
          videoboxActive.width(videobox.width() * 2)
          videoboxActive.height(videobox.height() / 2)

          //we have to wait for the resize event to be managed
          setTimeout(function() {
            expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCERASE')
            handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
            expect(hasPointerDrawn(50, 50)).toBe(true)
            done();
          }, 100)
        }
      })

      it('draws only one pointer at a time', function(done) {
        annotation.pointer.onload = function() {
          handleInbandMessage('RTCCPTR7FFF7FFF') //50% 50%
          handleInbandMessage('RTCCPTR' + annotation._percentToHex(10) + annotation._percentToHex(10)) //0 0
          expect(hasPointerDrawn(50, 50)).toBe(false)
          expect(hasPointerDrawn(10, 10)).toBe(true)
          done();
        }
      });
    });

    describe('send pointer coordinates', function() {
      beforeEach(function() {
        annotation.setMode(RtccInt.Annotation.modes.POINTER);
      });

      it('with offset', function() {
        videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCPTRFFFFFFFF');
      });


      it('with offset and scrolling', function() {
        videobox.offset({
          left: 20000,
          top: 10000,
        })
        videoboxActive.trigger(mouseMoveEvent(20000 + videoboxActive.width() * 0.5, 10000 + videoboxActive.height() * 0.5));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTR7FFF7FFF');
      })

      it('send correct message when mouse out of videobox if needed', function() {
        //no pointer yet
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCPTRFFFFFFFF');

        //outside videobox with pointer
        videoboxActive.trigger(mouseMoveEvent(225, 125));
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCPTRFFFFFFFF');

        //outside again
        $(document).trigger(mouseMoveEvent(199, 150));
        expect(rtcc.sendInbandMessage.calls.all().length).toBe(3);
      })
    });


  });



  describe('drop', function() {
    function hasCircleDrawn(xPercent, yPercent, expectedData) {
      var x = Math.round(xPercent * videoboxActive.width() / 100)
      var y = Math.round(yPercent * videoboxActive.height() / 100)
      var trueHeight = videoboxActive.height() * annotation.circleRatioToContainer;
      var data = annotation.ctxDraw.getImageData(x, y - Math.round(trueHeight * 16 / 46), 1, 1).data;
      return isColorCorrectish(data, expectedData)
    }

    function hasExternalCircleDrawn(xPercent, yPercent) {
      return hasCircleDrawn(xPercent, yPercent, [150, 254, 70, 255])
    }

    function hasPremiumCircleDrawn(xPercent, yPercent) {
      return hasCircleDrawn(xPercent, yPercent, [255, 169, 60, 255])
    }


    describe('receive drop', function() {
      it('draws a circle', function(done) {
        annotation.drawing.remote.circle.onload = function() {
          handleInbandMessage('RTCCDROP7FFF7FFF') //50% 50%
          expect(hasExternalCircleDrawn(50, 50)).toBe(true)
          done();
        }
      });

      it('can be erased', function(done) {
        annotation.drawing.remote.circle.onload = function() {
          handleInbandMessage('RTCCDROP7FFF7FFF') //50% 50%
          expect(hasExternalCircleDrawn(50, 50)).toBe(true)
          handleInbandMessage('RTCCERASE') //50% 50%
          expect(hasExternalCircleDrawn(50, 50)).toBe(false)
          done();
        }
      })

    });


    describe('right click', function() {
      beforeEach(function() {
        annotation.setMode(RtccInt.Annotation.modes.DROP);
      });

      it('sends drop', function() {
        videoboxActive.trigger(rightClickEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5))
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDROP7FFF7FFF')
      });

      it('draws a local circle', function(done) {
        annotation.drawing.local.circle.onload = function() {
          videoboxActive.trigger(rightClickEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5))
          expect(hasPremiumCircleDrawn(50, 50)).toBe(true)
          done();
        }
      });
    });
  });


  describe('multiple modes', function() {
    it('switch modes', function() {
      annotation.setMode(RtccInt.Annotation.modes.DROP);
      annotation.setMode(RtccInt.Annotation.modes.POINTER);
      videoboxActive.trigger(rightClickEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5))
      expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith()
    });
  });



  describe('draw', function() {
    function toHaveLine(xPercent, yPercent, expectedData) {
      var x = Math.round(xPercent * videoboxActive.width() / 100)
      var y = Math.round(yPercent * videoboxActive.height() / 100)
      var data = annotation.ctxDraw.getImageData(x, y, 1, 1).data;
      return isColorCorrectish(data, expectedData)
    }

    describe('receive', function() {

      it('draws a line between two points', function() {
        handleInbandMessage('RTCCDRAW7FFF7FFF') //50% 50%
        handleInbandMessage('RTCCDRAWFFFE7FFF') //100% 50%
        expect(toHaveLine(75, 50, annotation.drawing.remote.color)).toBe(true)
      });

      it('draws a line between three points', function() {
        handleInbandMessage('RTCCDRAW00007FFF') //00% 50%
        handleInbandMessage('RTCCDRAW7FFF7FFF') //50% 50%
        handleInbandMessage('RTCCDRAW7FFFFFFE') //50% 100%
        expect(toHaveLine(25, 50, annotation.drawing.remote.color)).toBe(true)
        expect(toHaveLine(50, 75, annotation.drawing.remote.color)).toBe(true)
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
        expect(toHaveLine(50, 25, annotation.drawing.remote.color)).toBe(false)
        expect(toHaveLine(75, 0, annotation.drawing.remote.color)).toBe(true)
      })

    });


    describe('right click', function() {
      beforeEach(function() {
        annotation.setMode(RtccInt.Annotation.modes.DRAW);
      });

      it('send coordinates', function() {
        videoboxActive.trigger(rightClickEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5));
        videoboxActive.trigger(mouseMoveEvent(200, 100))
        videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 1, 100 + videoboxActive.height() * 1))
        videoboxActive.trigger(releaseRightClickEvent(200 + videoboxActive.width() * 1, 100 + videoboxActive.height() * 1))
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAW7FFF7FFF')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAW00000000')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAWFFFEFFFE')
        expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCDRAWFFFFFFFF')
      });

      it('does not draw without right click', function() {
        videoboxActive.trigger(mouseMoveEvent(200, 100))
        videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 1, 100 + videoboxActive.height() * 1))
        expect(rtcc.sendInbandMessage).not.toHaveBeenCalledWith('RTCCDRAWFFFEFFFE')
      });

      it('draw line', function() {
        videoboxActive.trigger(rightClickEvent(200 + videoboxActive.width() * 0, 100 + videoboxActive.height() * 0.5));
        videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 0.5));
        videoboxActive.trigger(mouseMoveEvent(200 + videoboxActive.width() * 0.5, 100 + videoboxActive.height() * 1));
        videoboxActive.trigger(releaseRightClickEvent(200 + videoboxActive.width() * 1, 100 + videoboxActive.height() * 1))
        expect(toHaveLine(25, 50, annotation.drawing.local.color)).toBe(true)
        expect(toHaveLine(50, 75, annotation.drawing.local.color)).toBe(true)
      });

    });

  });


  describe('driver mode', function() {
    beforeEach(function() {
      rtcc.getConnectionMode = function() {
        return 'driver'
      }
    });

    describe('call pointer', function() {

      beforeEach(function() {
        annotation = new RtccInt.Annotation(rtcc, callObject, {
          isShare: false
        })
      })

      it('send erase control call to the driver', function() {
        annotation.erase();
        expect(rtcc.sendMessageToDriver).toHaveBeenCalledWith(
          '<controlcall id="' + callObject.callId + '"><callpointer>clear</callpointer></controlcall>')
      });

      it('send annotation mode to the driver', function() {
        annotation.setMode(RtccInt.Annotation.modes.DRAW);
        expect(rtcc.sendMessageToDriver).toHaveBeenCalledWith(
          '<controlcall id="' + callObject.callId + '"><callpointer mode="' + RtccInt.Annotation.modes.DRAW +
          '"></callpointer></controlcall>')
      });

    });

    describe('share pointer', function() {

      beforeEach(function() {
        annotation = new RtccInt.Annotation(rtcc, callObject, {
          isShare: true
        })
      })

      it('send erase control call to the driver', function() {
        annotation.erase();
        expect(rtcc.sendMessageToDriver).toHaveBeenCalledWith(
          '<controlcall id="' + callObject.callId + '"><sharepointer>clear</sharepointer></controlcall>')
      });

      it('send annotation mode to the driver', function() {
        annotation.setMode(RtccInt.Annotation.modes.DRAW);
        expect(rtcc.sendMessageToDriver).toHaveBeenCalledWith(
          '<controlcall id="' + callObject.callId + '"><sharepointer mode="' + RtccInt.Annotation.modes.DRAW +
          '"></sharepointer></controlcall>')
      });

    });

  });


  describe('video frame size', function() {
    it('with 16/9 ratio and same zoom', function() {
      framesizeCallback({
        width: 500,
        height: 300
      })
      expect($('.rtccint-annotations').width()).toBe(500)
      expect($('.rtccint-annotations').height()).toBe(300)
    });

    it('with other ratio, zoomed', function() {
      framesizeCallback({
        width: 50,
        height: 100
      })
      expect($('.rtccint-annotations').width()).toBe(50 * 300 / 100)
      expect($('.rtccint-annotations').height()).toBe(300)
    });

    it('with other ratio zoomed and resize container', function(done) {
      framesizeCallback({
        width: 50,
        height: 100
      })
      videoboxActive.width(videobox.width() * 2)
      videoboxActive.height(videobox.height() / 2)
      setTimeout(function() {
        expect($('.rtccint-annotations').width()).toBe(75)
        expect($('.rtccint-annotations').height()).toBe(150)
          //centered ?
        expect($('.rtccint-annotations').css('left')).toBe(Math.round((videobox.width() * 2 - 75) / 2) + 'px')
        done()
      }, 100)
    });
  });


});
