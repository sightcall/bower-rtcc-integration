# First steps 

## Compatibility

The **RTCC API version 6.1.7** or higher is required.

## Install with bower

Install with: `bower install rtcc-integration --save`

Include the file `bower_components/rtcc-integration/dist/RtccInt.js` to your project.

You are now ready to go!


## Generate the doc

`grunt jsdoc`

The result is in the `doc` folder


## Annotation

With this module, you can draw on the video or another element.

The `Annotation` module depends upon the jQuery plugin `javascript-detect-element-resize`, which has been downloaded in a folder in `bower_components`.
If you want to use it, include the library `bower_components/javascript-detect-element-resize/jquery.resize.js` in your project.

A basic example that enables annotations on the video box:
```javascript
var annotation;
call.on('active', function(){
  annotation = new RtccInt.Annotation(rtcc, call);
})
```

Then, choose an annotation mode, for example:

```javascript
annotation.setMode('Rtcc.Annotation.modes.DRAW');
```

This module is compatible with all connexion client types offered in RTCC: webrtc, driver, plugin.

## Chat

TODO


# Contribute

See [here](contribute.md) how to improve this project.

# Version history

* 2.3.0: Fix fullscreen issue with FF, use a jQuery plugin instead of a standalone library to detect the resize
* 2.2.0: Mode can be reset to 'none'
* 2.1.0: Screenshare support
* 2.0.0: Module Draw changes name to Annotation and other non-retrocompatible changes with constants
* 1.0.0: First version