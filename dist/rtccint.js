var RtccInt, RtccIntegration;
RtccInt = RtccIntegration = {};
;;RtccInt.Box = function(content) {
  'use strict'
  var htmlContent;
  this.setContent = function(newContent) {
    if (newContent) htmlContent = newContent;
  }

  this.getContent = function() {
    return htmlContent;
  }

  this.html = function() {
    return $('<div class="rtccint-box">').html(htmlContent);
  }

  this.setContent(content)
}
;/**
 * @param {Rtcc} rtccObject - The Rtcc object handling connexion
 * @param {String} uid - The SightCall user ID to chat with
 * @param {object={}} userCallbacks
 * @param {function} [userCallbacks.buildChatBox=defaultChatBox] -
 *     Must return a jQuery object of the chatbox with :
 *     - an attribute rtcc-messages where the messages will be append
 *     - an attribute rtcc-send for the send message button(s)
 *     - an attribute rtcc-input where the text to send will be extracted
 * @param {function} [userCallbacks.buildChatBox=defaultChatBox] -
 *
 *
 *
 * @desc A modular chat
 */


RtccInt.Chat = function(rtccObject, uid, userCallbacks, settings) {
  'use strict'

  //DEFAULT ARGS
  if (!rtccObject) throw new Error('First argument must be an object Rtcc.')
  if (!uid) throw new Error('UID ' + uid + ' is incorrect.')
  settings = settings || {};
  settings.displayName = settings.displayName || uid;
  settings.isTypingMode = settings.isTypingMode || RtccInt.Chat.isTypingModes.NORMAL;

  userCallbacks = userCallbacks || {};
  var defaultCallbacks = {

    buildChatBox: function() {
      var html = $('<div class="rtccint-chat"><div class="rtccint-uid">' + settings.displayName +
        '</div><div rtcc-messages class="rtccint-messages"></div></div></div>');
      html.append('<div class="rtccint-chat-controls"><button rtcc-send>Send</button><textarea rtcc-input></textarea></div>')
      return html
    },

    formatMessage: (function(message, from) {
      var toAppend = $('<div class="rtccint-message ' + from + '"></div>')
      var time = '<span class="rtccint-time">' + (new Date()).toLocaleTimeString() + '</span>';
      toAppend.append('<span class="rtccint-bubble">' + message + '<br /></span>' + time + '')
      messageContainer.append(toAppend);
      this.scrollBottom();
      toAppend.hide().fadeIn()
    }).bind(this),

    showTyping: (function(text) {
      callbacks.hideTyping();
      text = text ? ': ' + text : '...';
      messageContainer.append($('<div class="rtccint-typing">' + settings.displayName + ' is typing' + text + '</div>'))
      this.scrollBottom();
    }).bind(this),

    hideTyping: function() {
      chatBox.find('.rtccint-typing').remove();
    }

  }

  var callbacks = {};
  $.each(defaultCallbacks, function(k, v) {
    callbacks[k] = userCallbacks[k] || v;
  })


  //PRIVATE VARS
  var chatBox;
  var messageContainer;
  var sendButton;
  var textInput;
  var that = this;
  var typingSent = false;


  //PRIVATE FUNCTIONS
  function escapeMessage(m) {
    return RtccInt.Utils.htmlEscape(m).replace(new RegExp('\n', 'g'), '<br />');
  }

  function getInputText() {
    return textInput.val().replace(new RegExp('\r?\n$'), '');
  }

  function addMessage(message, from) {
    callbacks.formatMessage(escapeMessage(message), from)
  }

  function onMessage(messageId, dest, message) {
    if (dest === uid) that.receive(message)
  }

  function onMessageAck(messageId, dest, message) {
    if (dest === uid) that.acknowledge(messageId)
  }

  function onPressEnter(e) {
    if (e.which === 13 && !e.shiftKey) { //13 = enter
      e.preventDefault();
      sendButton.click();
    }
  }

  function onTyping() {
    var text = getInputText();
    if (settings.isTypingMode !== RtccInt.Chat.isTypingModes.NONE &&
      (settings.isTypingMode === RtccInt.Chat.isTypingModes.PREVIEW || text.length === 0 || !typingSent)
    ) {
      typingSent = that.sendTyping(text);
    }
  }

  function onClickButton() {
    that.send(getInputText());
    textInput.val('')
    typingSent = that.sendTyping('');
  }

  function bindEvents() {
    //html
    sendButton.on('click', onClickButton);
    textInput.on('input', onTyping);
    textInput.on('keyup', onPressEnter)

    //rtcc
    rtccObject.on('message', onMessage)
    rtccObject.on('message.acknowledge', onMessageAck)
  }


  //PUBLIC FUNCTIONS
  this.send = function(message) {
    if (message === '') return;
    addMessage(message, RtccInt.Chat.from.ME);
    var json = JSON.stringify({
      message: message
    })
    rtccObject.sendMessage('', uid, json)
  }

  this.receive = function(json) {
    var data = JSON.parse(json);
    if (data.message)
      addMessage(data.message, RtccInt.Chat.from.REMOTE);
    else if (data.typing)
      callbacks.showTyping(typeof data.value === "string" ? escapeMessage(data.value) : data.value);
    else if (data.typing === false)
      callbacks.hideTyping();
  }

  this.sendTyping = function(text) {
    var status = text.length !== 0;
    var textToSend = (settings.isTypingMode === RtccInt.Chat.isTypingModes.PREVIEW) ? text : false;
    rtccObject.sendMessage('', uid, JSON.stringify({
      typing: status,
      value: textToSend
    }))
    return status;
  }

  this.scrollBottom = function() {
    messageContainer.scrollTop(messageContainer.prop("scrollHeight"))
  }

  this.getBox = function() {
    return chatBox;
  }

  this.destroy = function() {
    chatBox.remove();
    rtccObject.off('message', onMessage);
    rtccObject.off('message.acknowledge', onMessageAck)
  }


  chatBox = callbacks.buildChatBox();
  messageContainer = chatBox.find('[rtcc-messages]')
  sendButton = chatBox.find('[rtcc-send]')
  textInput = chatBox.find('[rtcc-input]')
  bindEvents();
}


//CONSTANTS
RtccInt.Chat.from = {
  ME: 'rtccint-me',
  REMOTE: 'rtccint-remote',
}
RtccInt.Chat.isTypingModes = {
  NONE: 1,
  NORMAL: 2,
  PREVIEW: 3
}
;/**
 * @param {Rtcc} rtccObject - The connection you want to track
 * @param {DOM object|jQuery} htmlContainer - The html object where the connection status will be displayed
 * @param {object} settings
 * @param {object} [settings.lang] - The string to display next to each status
 * @param {string} [settings.lang.client] - Can reach the client
 * @param {string} [settings.lang.cloud] - Can reach the cloud
 * @param {string} [settings.lang.authenticate] - Is authenticated
 * @param {string} [settings.lang.sip] - Can make calls
 * @param {boolean} [settings.useBox] - Use a box wrapper. Defaults to false
 */

RtccInt.ConnectionStatus = function(rtccObject, htmlContainer, settings) {
  'use strict'
  var rtcc = rtccObject;
  var html;

  var statuses = {
    'client': {
      text: 'Local network',
      eventName: 'client.connect'
    },
    'cloud': {
      text: 'Cloud',
      eventName: 'cloud.connect'
    },
    'authenticate': {
      text: 'Authenticate',
      eventName: 'cloud.authenticate.success'
    },
    'ready': {
      text: 'Ready',
      eventName: 'cloud.sip.ok'
    },
    'presence': {
      text: 'Presence',
      eventName: 'presence.ok'
    },
  }


  function manageSettings() {
    if (!rtcc) throw new Error('First argument must be an object Rtcc.')
    if (!(htmlContainer instanceof jQuery)) htmlContainer = $(htmlContainer)

    settings = settings || {};
    settings.lang = settings.lang || {};
    settings.useBox = settings.useBox || false;
    $.each(settings.lang, function(k, v) {
      statuses[k].text = v;
    });
  }

  function activateLi(key) {
    html.find('.rtccint-' + key).addClass('rtccint-connected')
  }

  function deactivateLi(keys) {
    $.each(keys, function(k, v) {
      html.find('.rtccint-' + v).removeClass('rtccint-connected')
    })
  }

  function buildHtml() {
    html = $('<ul class="rtccint-connection-status"></ul>');
    $.each(statuses, function(k, v) {
      html.append('<li class="rtccint-' + k + '">' + v.text + '</li>')
    })
    if (settings.useBox)
      return (new RtccInt.Box(html)).html();
    else
      return html
  }


  function init() {
    /*jshint validthis: true */
    manageSettings();
    $.each(statuses, function(k, v) {
      rtcc.on(v.eventName, activateLi.bind(this, k));
    })
    rtcc.on('client.disconnect', deactivateLi.bind(this, Object.keys(statuses)));
    rtcc.on('cloud.disconnect', deactivateLi.bind(this, ['cloud', 'authenticate', 'ready', 'presence']));
    rtcc.on('cloud.sip.ko', deactivateLi.bind(this, ['ready']));
    rtcc.on('presence.ko', deactivateLi.bind(this, ['presence']));
    htmlContainer.html(buildHtml());
  }

  init.call(this);
}
;RtccInt.Draw = function(rtccObject) {
  'use strict'
  var videobox = $('.rtcc-videobox').first();
  this.allModes = {
    POINTER: 1,
    DROP: 2,
    DRAW: 3
  }
  var currentMode = this.allModes.POINTER;
  var canvas;

  this.setMode = function(mode) {
    currentMode = mode;
  }

  this.getMode = function() {
    return currentMode;
  }



  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';
    canvas = $('<canvas />');
    /*videobox.append(canvas);

    canvas.on('mousemove', function(){
      
    })

    rtccObject.on('inband.message', function(){

    })*/
  }

  init();
}
;RtccInt.Utils = {
  //exists in underscore, include it if we need another function
  htmlEscape: function(str) {
    'use strict'
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
