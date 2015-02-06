RtccInt.Chat = function(rtccObject, htmlContainer, uid, settings) {
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


}