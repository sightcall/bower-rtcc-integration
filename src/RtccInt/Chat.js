/**
 * A widget to chat with another SightCall user
 * @class
 *
 * @param {Rtcc} rtccObject - The Rtcc object handling connexion
 * @param {String} uid - The SightCall user ID to chat with
 * @param {object} [userCallbacks={}]
 * @param {function} [userCallbacks.buildChatBox=defaultChatBox] -
 *     Must return a jQuery object of the chatbox with :
 *     - an attribute rtcc-messages where the messages will be append
 *     - an attribute rtcc-send for the send message button(s)
 *     - an attribute rtcc-input where the text to send will be extracted
 * @param {function} [userCallbacks.buildChatBox=buildChatBox] -
 * @param {function} [userCallbacks.showTyping=showTyping] -
 * @param {function} [userCallbacks.hideTyping=hideTyping] -
 *
 * @param {object} [settings={}]
 * @param {object} [settings.displayName=uid] - The name of the remote person, used by default callbacks
 * @param {object} [settings.isTypingMode] - According to this option, the chat will
 *    send some data about what the local user is typing. Use {@link RtccInt.Chat.isTypingModes} enumeration.
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

/**
 * Typing modes
 * @readonly
 * @enum {string}
 */
RtccInt.Chat.isTypingModes = {
  /** No data about typing will be sent */
  NONE: 1,
  /** Remote user will know that current user is typing */
  NORMAL: 2,
  /** Remote user will see what the current user is typing */
  PREVIEW: 3
}
