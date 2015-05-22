describe('share messages', function() {
  'use strict'
  var annotation;
  var rtcc;
  var handleInbandMessage;
  var screenshareContainer;

  beforeEach(function() {
    screenshareContainer = $('<div class="rtcc-ss" style="height: 200px; width: 670px; position: absolute"></div>')
      .offset({
        left: 200,
        top: 100,
      })
    $('body').append(screenshareContainer)
    rtcc = {
      on: jasmine.createSpy('on'),
      getConnectionMode: function() {
        return 'plugin';
      },
      sendInbandMessage: jasmine.createSpy('sendInbandMessage'),
      sendMessageToDriver: jasmine.createSpy('sendMessageToDriver'),
      getPluginMode: jasmine.createSpy().and.callFake(function() {
        return 'embedded'
      }),
      getRtccUserType: function() {
        return 'internal'
      }
    };
    annotation = new RtccInt.Annotation(rtcc, callObject, {
      isShare: true
    })
  })

  afterEach(function() {
    screenshareContainer.remove();
  })

  it('draws on share messages', function() {
    handleInbandMessage = rtcc.on.calls.all()[0].args[1]
    handleInbandMessage('RTCCSDRAW7FFF7FFF') //50% 50%
    handleInbandMessage('RTCCSDRAWFFFE7FFF') //100% 50%
    expect(hasLineDrawn(annotation.ctxDraw, 75, 50, annotation.drawing.remote.color)).toBe(true)
  });

  it('send draw coordinates', function(done) {
    annotation.setMode(RtccInt.Annotation.modes.DRAW);
    screenshareContainer.trigger(rightClickEvent(200 + screenshareContainer.width() * 0.5, 100 + screenshareContainer.height() *
      0.5));
    setTimeout(function() {
      screenshareContainer.trigger(mouseMoveEvent(200, 100))
      setTimeout(function() {
        screenshareContainer.trigger(mouseMoveEvent(200 + screenshareContainer.width() * 1, 100 + screenshareContainer.height() * 1))
        screenshareContainer.trigger(releaseRightClickEvent(200 + screenshareContainer.width() * 1, 100 + screenshareContainer.height() *
          1))
      }, annotation.messageDelay + 1)
    }, annotation.messageDelay + 1)

    setTimeout(function() {
      expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCSDRAW7FFF7FFF')
      expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCSDRAW00000000')
      expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCSDRAWFFFEFFFE')
      expect(rtcc.sendInbandMessage).toHaveBeenCalledWith('RTCCSDRAWFFFFFFFF')
      done()
    }, annotation.messageDelay * 3 + 10)
  });
});
