var RtccInt, RtccIntegration;
RtccInt = RtccIntegration = {};;;RtccInt.Box = function(content) {
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
;RtccInt.Chat = function(rtccObject, htmlContainer, uid, settings) {
	var html;
	var that = this;
	var from = {
		ME: 'rtccint-me',
		REMOTE: 'rtccint-remote',
	}

	if (!rtccObject) throw new Error('First argument must be an object Rtcc.')
	if (!(htmlContainer instanceof jQuery)) htmlContainer = $(htmlContainer)

	settings = settings || {};
	settings.lang = settings.lang || {};
	settings.useBox = settings.useBox || false;

	function formatMessage(m) {
		return RtccInt.Utils.htmlEscape(m).replace(new RegExp('\n', 'g'), '<br />');
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

	this.send = function(message) {
		if (message === '') return;
		addMessage(message, from.ME);
		rtccObject.sendMessage('', uid, message)
	}

	this.receive = function(message) {
		addMessage(message, from.REMOTE)
	}

	this.destroy = function(){
		htmlContainer.remove(html);
		rtccObject.off('message', onMessage);
		rtccObject.off('message.acknowledge', onMessageAck)
	}

	function buildHtml() {
		html = $('<div class="rtccint-chat"><div class="rtccint-uid">' + uid + '</div><div class="rtccint-messages"></div></div></div>');
		html.append('<div class="rtccint-chat-controls"><button>Send</button><textarea></textarea></div>')

		if (settings.useBox)
			return (new RtccInt.Box(html)).html();
		else
			return html
	}

	function onMessage(messageId, dest, message){
			if (dest === uid) that.receive(message)
	}
	function onMessageAck(messageId, dest, message){
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
		});

		textarea.on('keypress', function(e) {
			if (e.which == 13 && !e.shiftKey) { //13 = enter
				e.preventDefault();
				button.click();
			}
		})


		//rtcc
		rtccObject.on('message', onMessage)
		rtccObject.on('message.acknowledge', onMessageAck)
	}

	htmlContainer.html(buildHtml());
	bindEvents();


};/**
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

	init();
};RtccInt.Utils = {
	//exists in underscore, include it if we need another function
	htmlEscape: function(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}
};