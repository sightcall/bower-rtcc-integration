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
		var toAppend = $('<div class="rtccint-message ' + cssClass + '"><span class="rtccint-bubble">' + formatMessage(message) + '<br /></span></div>')
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

	function buildHtml() {
		html = $('<div class="rtccint-chat"><div class="rtccint-uid">' + uid + '</div><div class="rtccint-messages"></div></div></div>');
		html.append('<div class="rtccint-chat-controls"><button>Send</button><textarea></textarea></div>')

		if (settings.useBox)
			return (new RtccInt.Box(html)).html();
		else
			return html
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
		rtccObject.on('message', function(messageId, dest, message) {
			if (dest === uid) that.receive(message)
		})
	}

	htmlContainer.html(buildHtml());
	bindEvents();


}