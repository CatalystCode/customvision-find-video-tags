let http = require('http');
let fs = require('fs');
let path = require('path');
let request = require('request-promise');
let ffmpeg = require('ffmpeg');
let _ = require('lodash');
let async = require('async');

function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

/**
 * Pinpoint a frame timestamp for each tag using customvision.ai
 * @param {string} predictionUrl https://southcentralus.api.cognitive.microsoft.com/customvision/v1.0/Prediction/{Prediction-Id}/image?iterationId={Iteration-ID}'
 * @param {string} predictionKey prediction key
 * @param {string} video url to video
 * @param {Array} tags tag list to locate
 * @param {object} options A temporary location to put the video in
 * @param {string} options.rootPath A root folder for the output
 * @param {string} options.tempFolder A temporary location to put the video in
 * @param {string} options.every_n_seconds A temporary location to put the video in (default: 1)
 * @param {function} callback 
 */
function pinTagsInVideo(predictionUrl, predictionKey, video, tags, options, callback) {

  if (!predictionUrl) { throw new Error('predictionUrl url is not provided'); }
  if (!predictionKey) { throw new Error('predictionKey url is not provided'); }
  if (!video) { throw new Error('video url is not provided'); }
  if (!Array.isArray(tags) || tags.length <= 0) { throw new Error('tags should have at least one item'); }

  callback = callback || (typeof(options) === 'function' ? options : () => {});
  options = (typeof(options) === 'function' ? null : options) || {};

  let relPath = path.join('node_modules', 'customvision-find-video-tags');
  let rootPath = options.rootPath || 
    __dirname.endsWith(relPath) ?
    __dirname.substr(0, __dirname.length - relPath.length) :
    __dirname;

  let tempFolder = options.tempFolder || path.join(rootPath, 'temp');

  let tempVideoPath = path.join(tempFolder, 'video' + path.extname(video));
  let outputFolder = path.join(tempFolder, 'output');
  let every_n_seconds = options.every_n_seconds || 1; 

  // Process a video into images
  const processVideo = (localVideoPath, deleteAfterProcess) => {

    try {
      new ffmpeg(
        localVideoPath,
        (err, video) => {
        
          if (err) { return callback(err); }

          video.fnExtractFrameToJPG(outputFolder, {
            every_n_seconds: every_n_seconds, 
            keep_pixel_aspect_ratio: true,
            keep_aspect_ratio: true,
            padding_color: 'black'
          },
          (error, files) => {
            files = files || [];
            files = _.filter(files, file => !file.endsWith('.md'));
            let replies = {};

            async.eachSeries(files, (file, cb) => {

              let index = files.indexOf(file);
              request({
                headers: {
                  'Prediction-Key': predictionKey,
                  'Content-Type': 'application/octet-stream'
                },
                uri: predictionUrl,
                body: fs.readFileSync(file),
                method: 'POST'
              }, (err, resp, body) => {

                if (err) { return cb(err); }
                if (!body) { return cb(new Error('No response received')); }
                
                let data = JSON.parse(body);
                if (data.Code === 'BadRequestImageFormat') { return cb(new Error('Bad image response')); }
                if (!data.Predictions || data.Predictions.length === 0) { return cb(new Error('No predictions found')); }
                
                let predictions = _.orderBy(tags.map(tag => _.find(data.Predictions, { Tag: tag })), [ 'Probability' ], [ 'desc' ]);
                replies[index] = predictions[0];

                return cb();
              });
            }, (err) => {
              let anchorIndexes = {};
              let anchorValues = {};
              tags.forEach(tag => {
                anchorIndexes[tag] = -1;
                anchorValues[tag] = -1;
              });

              Object.keys(replies).forEach(idx => {
                let rep = replies[idx];
                if (rep.Probability < 0.01) { return; }
                if (anchorValues[rep.Tag] < rep.Probability) {
                  anchorValues[rep.Tag] = rep.Probability;
                  anchorIndexes[rep.Tag] = idx;
                } 
              });            

              // Deleting temporary files
              if (deleteAfterProcess) { fs.unlinkSync(localVideoPath); }
              files.forEach(file => fs.unlinkSync(file));

              Object.keys(anchorIndexes).forEach(tag => {
                if (anchorIndexes[tag] === -1) { return; }
                anchorIndexes[tag] = anchorIndexes[tag] * every_n_seconds * 1000
              });

              return callback(null, anchorIndexes);
            });
          });
        });

    } catch (e) {
      return callback(e);
    }
  }

  if (video.startsWith('http://') || video.startsWith('https://') || video.startsWith('tcp://')) {
    download(video, tempVideoPath, () => processVideo(tempVideoPath, true));    
  } else {
    processVideo(video);
  }
}

module.exports = {
  pinTagsInVideo
};