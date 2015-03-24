# Use 

## Compatibility

**Require the RTCC API version 6.1.7 or higher**.

## Install with bower

Install `bower install rtcc-integration --save`

Include the file `bower_components/rtcc-integration/dist/RtccInt.js` to your project.

This project depends upon `css-element-queries` which has been downloaded in a folder in `bower_components`.
Include the library `bower_components/css-element-queries/src/ResizeSensor.js` in your project.

You are now ready to go!

## Draw on video

You can draw on the video with the plugin or webrtc.

```javascript
var annotation;
call.on('active', function(){
  annotation = new RtccInt.Annotation(rtcc, call);
})
```

Then, choose an annotation mode, for example:

```javascript
annotation.setMode('Rtcc.annotationMode.DRAW');
```

# Contribute

See [here](contribute.md) how to improve this project.