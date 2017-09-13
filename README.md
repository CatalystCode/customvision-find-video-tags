# customvision-find-video-tags

Use [Microsoft Custom Vision API](customvision.ai) to pin point frames in a video with the biggest probability for each tag.

This module will;

1. download the video
2. sample an image every second (configurable)
3. check for each image what's the probability for each tag (using customvision.ai)
4. for each tag, take the image with the highest probability
5. delete local temporary files

# Usage

```js

// Basic sample
let { pinTagsInVideo } = require('customvision-find-video-tags');

pinTagsInVideo(
  'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Prediction/52856430-0796-4d1b-a05b-b6a42dc14743/image',
  'f49c5905ca3148cfb5a146a0bsa3adc9',
  'http://location.com/urlpath/video.mp4',
  [ 'front', 'back', 'side' ],
  { every_n_seconds: 0.5 },
  (err, anchors) => {
    console.log('done');
  }
);

// Using ffmpeg-ensure
let { ensureFFMPEG } = require('ffmpeg-ensure');
let { pinTagsInVideo } = require('customvision-find-video-tags');

ensureFFMPEG().then(() => {
  pinTagsInVideo(
    'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Prediction/52856430-0796-4d1b-a05b-b6a42dc14743/image',
    'f49c5905ca3148cfb5a146a0bsa3adc9',
    'http://location.com/urlpath/video.mp4',
    [ 'front', 'back', 'side' ],
    { every_n_seconds: 0.5 },
    (err, anchors) => {
      console.log('done');
    }
  );
});

```