var RtccInt, RtccIntegration;
RtccInt = RtccIntegration = {};

/**
 * @typedef {object} jQueryObject
 * @typedef {object} Rtcc
 * @typedef {object} callObject
 * @typedef {object} DOMobject
 */

RtccInt.scriptpath = $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/') + '/';
