RtccInt.Chat = function(rtccObject, htmlContainer, uid, settings) {
  'use strict'
  var html;
  var that = this;
  var sentTyping = false;
  var from = {
    ME: 'rtccint-me',
    REMOTE: 'rtccint-remote',
  }

  if (!rtccObject) throw new Error('First argument must be an object Rtcc.')
  if (!(htmlContainer instanceof jQuery)) htmlContainer = $(htmlContainer)

  settings = settings || {};
  settings.lang = settings.lang || {};
  settings.useBox = settings.useBox || false;
  settings.displayName = settings.displayName || uid;

  function formatMessage(m) {
    return RtccInt.Utils.htmlEscape(m).replace(new RegExp('\n', 'g'), '<br />');
  }


  function buildHtml() {
    html = $('<div class="rtccint-chat"><div class="rtccint-uid">' + settings.displayName + '</div><div class="rtccint-messages"></div></div></div>');
    html.append('<div class="rtccint-chat-controls"><button>Send</button><textarea></textarea></div>')

    if (settings.useBox)
      return (new RtccInt.Box(html)).html();
    else
      return html
  }

  function addMessage(message, cssClass) {
    var container = html.find('.rtccint-messages')
    var toAppend = $('<div class="rtccint-message ' + cssClass + '"></div>')
    var time = '<span class="rtccint-time">' + (new Date()).toLocaleTimeString() + '</span>';
    toAppend.append('<span class="rtccint-bubble">' + formatMessage(message) + '<br /></span>' + time + '')
    container.append(toAppend);
    container.scrollTop(container.prop("scrollHeight"));
    toAppend.hide().fadeIn()
  }

  function showTyping() {
    var container = html.find('.rtccint-messages')
    container.append($('<div class="rtccint-typing">' + settings.displayName + ' is typing...</div>'))
    container.scrollTop(container.prop("scrollHeight"));
  }

  function hideTyping() {
    html.find('.rtccint-typing').remove();
  }


  this.send = function(message) {
    if (message === '') return;
    addMessage(message, from.ME);
    var json = JSON.stringify({
      message: message
    })
    rtccObject.sendMessage('', uid, json)
  }
  this.sendTyping = function(status) {
    status = status === undefined ? true : false;
    rtccObject.sendMessage('', uid, JSON.stringify({
      typing: status
    }))
  }

  this.receive = function(json) {
    var data = JSON.parse(json);
    if (data.message)
      addMessage(data.message, from.REMOTE);
    else if (data.typing)
      showTyping();
    else if (data.typing === false)
      hideTyping();

  }

  this.destroy = function() {
    htmlContainer.remove(html);
    rtccObject.off('message', onMessage);
    rtccObject.off('message.acknowledge', onMessageAck)
  }


  function onMessage(messageId, dest, message) {
    if (dest === uid) that.receive(message)
  }

  function onMessageAck(messageId, dest, message) {
    if (dest === uid) that.acknowledge(messageId)
  }

  function bindEvents() {
    //html
    var button = html.find('.rtccint-chat-controls button');
    var textarea = html.find('.rtccint-chat-controls textarea');
    var isShiftPressed = false;
    button.on('click', function() {
      that.send(textarea.val());
      textarea.val('')
      that.sendTyping(false);
      sentTyping = false;
    });

    textarea.on('keyup', function(e) {
      if (e.which === 13 && !e.shiftKey) { //13 = enter
        e.preventDefault();
        button.click();
      }
      if (textarea.val().length > 0 && !sentTyping) {
        that.sendTyping();
        sentTyping = true;
      } else if (textarea.val().length === 0) {
        that.sendTyping(false);
        sentTyping = false;
      }
    })


    //rtcc
    rtccObject.on('message', onMessage)
    rtccObject.on('message.acknowledge', onMessageAck)
  }

  htmlContainer.html(buildHtml());
  bindEvents();


}
