# Use 

## Install with bower

Install `bower install rtcc-integration --save`

The files are now in your `bower_components/rtcc-integration/dist` folder.

Dont forget to include the dependancies, which were automatically installed next to the previous folder.

## Draw on video

You can draw on the video with the plugin or webrtc.

```
rtcc.on('plugin.load', function() {
  use_draw = true;
});
rtcc.on('webrtc.connect', function() {
  use_draw = true;
});
rtcc.on('driver.connect', function() {
  use_draw = false;
  draw = false;
});


rtcc.onCallHandler = function(call, infoObj) {
  if (infoObj.status === "active" && use_draw) {
    drawObject = new RtccInt.Draw(rtcc, call);
  }
};
```

Then, choose a drawning mode:

```
this.draw.setMode('Rtcc.annotationMode.<yourMode>');
```


# Work on this project

install Grunt, then

`npm install`

`bower install`

`grunt watch`

The result is in `dist`

## Setup git

Install git hook with

`grunt githooks`


Before commit

`grunt prepare`

## Generate the doc

`grunt jsdoc`

The result is in the `doc` folder
