var decompress = require('decompress')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var request = require('request')

var versionSegments = require('./package').version.split('.')
var baseUrl = process.env.NPM_CONFIG_ELECTRON_MIRROR ||
  process.env.npm_config_electron_mirror ||
  process.env.ELECTRON_MIRROR ||
  process.env.electron_mirror ||
  'https://github.com/electron/electron/releases/download/v'

var proxy = process.env.NPM_CONFIG_HTTPS_PROXY ||
  process.env.npm_config_https_proxy ||
  process.env.NPM_CONFIG_PROXY ||
  process.env.npm_config_proxy

var config = {
  baseUrl: baseUrl,
  // Sync minor version of package to minor version of Electron release
  electron: versionSegments[0] + '.' + versionSegments[1] + '.0',
  outputPath: path.join(__dirname, 'bin'),
  proxy: proxy
}

function handleError (url, error) {
  if (!error) return

  var message = error.message || error
  console.error('Downloading ' + url + ' failed: ' + message)
  process.exit(1)
}

function unzip (zipped, callback) {
  decompress(zipped, config.outputPath).then(function () {
    callback()
  }).catch(function (error) {
    callback(error)
  })
}

mkdirp(config.outputPath, function (error) {
  var fileName = 'mksnapshot-v' + config.electron + '-' + process.platform + '-' + process.arch + '.zip'
  var fullUrl = config.baseUrl + config.electron + '/' + fileName

  if (error) return handleError(fullUrl, error)

  request.get({uri: fullUrl, encoding: null, proxy: config.proxy}, function (error, response, body) {
    if (error) return handleError(fullUrl, error)
    if (response.statusCode !== 200) return handleError(fullUrl, Error('Non-200 response (' + response.statusCode + ')'))
    unzip(body, function (error) {
      if (error) return handleError(fullUrl, error)
      if (process.platform !== 'win32') {
        fs.chmod(path.join(__dirname, 'bin', 'mksnapshot'), '755', function (error) {
          if (error) return handleError(fullUrl, error)
        })
      }
    })
  })
})