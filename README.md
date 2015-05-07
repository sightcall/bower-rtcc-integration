# First steps 

## Compatibility

The **RTCC API version 6.1.35** or higher is required.

## Install with bower

Install with: `bower install rtcc-integration --save`

Include the following files to your project:

 * `bower_components/rtcc-integration/dist/rtccint.js`
 * `bower_components/rtcc-integration/dist/css/main.css`

You are now ready to go!


## Annotation

With this module, you can draw on the video or another element.

**Important:**
The `Annotation` module depends upon the jQuery plugin `javascript-detect-element-resize`, which has been downloaded in a folder in `bower_components`.
If you want to use it, include the library `bower_components/javascript-detect-element-resize/jquery.resize.js` in your project.

A basic example that enables annotations on the video box:
```javascript
var annotation;
call.on('active', function(){
  annotation = new RtccInt.Annotation(rtcc, call);
  //choose an annotation mode
  annotation.setMode(RtccInt.Annotation.modes.DRAW);
})
```


This module is compatible with all connexion client types offered in RTCC: webrtc, driver, plugin.

## Chat

See the doc at `doc/Chat.js.html`

# Possible improvements

* Right click drawing: when we rightclick on a canvas and slide the mouse out of it, drawing will happen when the mouse come
back on the canvas, even if the rightclick is not held anymore.
* Tests could be improved using the Vent lib. It's possible to simulate events with the trigger function 

# Contribute

See [here](contribute.md) how to improve this project.

# Version history

* 2.3.12: Fix for mobile: pointer position, drop circle size, number of position messages. Also fix right click drawing bug when going outside of the canvas.
* 2.3.11: Fix annotations on non-16/9 videos
* 2.3.0: Fix fullscreen issue with FF, use a jQuery plugin instead of a standalone library to detect the resize
* 2.2.0: Mode can be reset to 'none'
* 2.1.0: Screenshare support
* 2.0.0: Module Draw changes name to Annotation and other non-retrocompatible changes with constants
* 1.0.0: First version