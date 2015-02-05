/**
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
		$('.rtccint-connection-status .rtccint-' + key).addClass('rtccint-connected')
	}

	function deactivateLi(keys) {
		$.each(keys, function(k, v) {
			$('.rtccint-connection-status .rtccint-' + v).removeClass('rtccint-connected')
		})
	}

	function buildHtml() {
		var html = $('<ul class="rtccint-connection-status"></ul>');
		$.each(statuses, function(k, v) {
			html.append('<li class="rtccint-' + k + '">' + v.text + '</li>')
		})
		if (settings.useBox) {
			html = (new RtccInt.Box(html)).html();
		}
		return html
	}


	function init() {
		manageSettings();
		$.each(statuses, function(k, v) {
			rtcc.on(v.eventName, activateLi.bind(this, k));
		})
		rtcc.on('client.disconnect', deactivateLi.bind(this, ['client', 'cloud', 'authenticate', 'ready']));
		rtcc.on('cloud.disconnect', deactivateLi.bind(this, ['cloud', 'authenticate', 'ready']));
		rtcc.on('cloud.sip.ko', deactivateLi.bind(this, ['ready']));
		htmlContainer.html(buildHtml());
	}

	init();
}