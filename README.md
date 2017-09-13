# customvision-find-video-tags

Use [Microsoft Custom Vision API](customvision.ai) to pin point frames in a video with the biggest probability for each tag.

This module will;

1. download the video
2. sample an image every second (configurable)
3. check for each image what's the probability for each tag (using customvision.ai)
4. for each tag, take the image with the highest probability
5. delete local temporary files

