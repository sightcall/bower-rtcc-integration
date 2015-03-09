var RtccInt, RtccIntegration;
RtccInt = RtccIntegration = {};

/**
 * @typedef {object} jQueryObject
 * @typedef {object} Rtcc
 */
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
;/**
 * A widget to show the connection status.
 * @class
 * @param {Rtcc} rtccObject - The connection you want to track
 * @param {jQueryObject} htmlContainer - The html object where the connection status will be displayed
 * @param {object} [settings={}]
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
;RtccInt.scriptpath = $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/') + '/';

RtccInt.Draw = function(rtccObject, callObject, settings) {
  'use strict'

  settings = settings || {};
  settings.pointerUrl = settings.pointerUrl || RtccInt.scriptpath + 'img/pointer.png';

  var that = this;
  var allCanvas = {
    pointer: $('<canvas class="rtccint-pointer" />'),
    annotations: $('<canvas class="rtccint-annotations" />')
  }
  var videobox = $('.rtcc-videobox').first();
  var currentMode;
  var hexHundredPercent = parseInt('FFFE', 16);
  var ctx;

  this.ctxPtr = allCanvas.pointer[0].getContext('2d');
  this.pointer = new Image();
  this.pointer.src = settings.pointerUrl;

  this.setMode = function(mode) {
    currentMode = mode;
    callObject.callPointer(mode)
    updateModeListener();
  }

  this.getMode = function() {
    return currentMode;
  }

  this._percentToHex = function(percent) {
    var hex = Math.round(percent / 100 * parseInt('FFFE', 16)).toString(16).toUpperCase();
    while (hex.length < 4) {
      hex = '0' + hex;
    }
    return hex
  }

  function mouseCoordToHex(x, y) {
    var xOffset = x - videobox[0].getBoundingClientRect().top;
    var yOffset = y - videobox[0].getBoundingClientRect().left;
    return that._percentToHex(xOffset / videobox.width() * 100) + that._percentToHex(yOffset / videobox.height() * 100)
  }

  //this also erase all the canvas content...
  function updateCanvasSize() {
    $.each(allCanvas, function(k, canvas) {
      canvas[0].width = videobox.width()
      canvas[0].height = videobox.height()
    })
    that.ctxPtr = allCanvas.pointer[0].getContext("2d")
  }

  var modeListeners = {};
  modeListeners[Rtcc.annotationMode.POINTER] = function(event) {
    rtccObject.sendInbandMessage('RTCCPTR' + mouseCoordToHex(event.pageX, event.pageY));
  }

  function updateModeListener() {
    removeModeListeners();
    videobox.on('mousemove', modeListeners[currentMode]);
  }

  function removeModeListeners() {
    $.each(modeListeners, function(k, listener) {
      videobox.off('mousemove', listener)
    })
  }


  function init() {
    if (!videobox) throw 'RtccInt.Draw needs a videobox to draw.';

    $.each(allCanvas, function(k, v) {
      videobox.append(v);
    })

    that.setMode(Rtcc.annotationMode.POINTER); //pointer is the default mode

    rtccObject.on('inband.message', function(message) {
      if (message.search('RTCCPTR') === 0) {
        that.ctxPtr.clearRect(0, 0, allCanvas.pointer.width(), allCanvas.pointer.height());
        if (message.substring(7, 17) !== 'FFFFFFFF') {
          var x = Math.round(parseInt(message.substring(7, 11), 16) / hexHundredPercent * allCanvas.pointer.width());
          var y = Math.round(parseInt(message.substring(11, 15), 16) / hexHundredPercent * allCanvas.pointer.height());
          that.ctxPtr.drawImage(that.pointer, x - that.pointer.width / 2, y - that.pointer.height / 2)
        }
      }
    });

    if (typeof ResizeSensor !== 'function')
      throw 'Missing css-element-queries dependency. You can find it in the bower_components folder.'

    new ResizeSensor(videobox, updateCanvasSize);
    if (videobox.attr('style').indexOf('position: relative') !== -1) {
      videobox.css('position', 'fixed')
    }

    updateCanvasSize();
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
