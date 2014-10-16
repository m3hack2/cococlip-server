/* var */

var fs = require('fs')
var mime = require('mime')
var mktemp = require('mktemp')
var multiparty = require('multiparty')
var mongoose = require('mongoose')
var imageMagic = require('easyimage')

var imagePath = '/api/1/img'

/* init */

mongoose.connect(process.env.MONGOHQ_URL)
var Clip = mongoose.model('Clip', new mongoose.Schema({
    title: String,
    body: String,
    loc: {lon: Number, lat: Number},
    image1: {data: Buffer, mime: String},
    low_image1_url: String,
    high_image1_url: String,
    image2: {data: Buffer, mime: String},
    low_image2_url: String,
    high_image2_url: String
}))

/* test data */

var yamanote = {
    '大崎': {body: ['大崎で\r\nモテる'], lon: ['139.728439'], lat: ['35.619772']},
    '五反田': {body: ['五反田で\r\nモテる'], lon: ['139.723822'], lat: ['35.625974']},
    '目黒': {body: ['目黒で\r\nモテる'], lon: ['139.715775'], lat: ['35.633923']},
    '恵比寿': {body: ['恵比寿で\r\nモテる'], lon: ['139.71007'], lat: ['35.646685']},
    '渋谷': {body: ['渋谷で\r\nモテる'], lon: ['139.701238'], lat: ['35.658871']},
    '原宿': {body: ['原宿で\r\nモテる'], lon: ['139.702592'], lat: ['35.670646']},
    '代々木': {body: ['代々木で\r\nモテる'], lon: ['139.702042'], lat: ['35.683061']},
    '新宿': {body: ['新宿で\r\nモテる'], lon: ['139.700464'], lat: ['35.689729']},
    '新大久保': {body: ['新大久保で\r\nモテる'], lon: ['139.700261'], lat: ['35.700875']},
    '高田馬場': {body: ['高田馬場で\r\nモテる'], lon: ['139.703715'], lat: ['35.712677']},
    '目白': {body: ['目白で\r\nモテる'], lon: ['139.706228'], lat: ['35.720476']},
    '池袋': {body: ['池袋で\r\nモテる'], lon: ['139.711086'], lat: ['35.730256']},
    '大塚': {body: ['大塚で\r\nモテる'], lon: ['139.728584'], lat: ['35.731412']},
    '巣鴨': {body: ['巣鴨で\r\nモテる'], lon: ['139.739303'], lat: ['35.733445']},
    '駒込': {body: ['駒込で\r\nモテる'], lon: ['139.748053'], lat: ['35.736825']},
    '田端': {body: ['田端で\r\nモテる'], lon: ['139.761229'], lat: ['35.737781']},
    '西日暮里': {body: ['西日暮里で\r\nモテる'], lon: ['139.766857'], lat: ['35.731954']},
    '日暮里': {body: ['日暮里で\r\nモテる'], lon: ['139.771287'], lat: ['35.727908']},
    '鴬谷': {body: ['鴬谷で\r\nモテる'], lon: ['139.778015'], lat: ['35.721484']},
    '上野': {body: ['上野で\r\nモテる'], lon: ['139.777043'], lat: ['35.71379']},
    '御徒町': {body: ['御徒町で\r\nモテる'], lon: ['139.774727'], lat: ['35.707282']},
    '秋葉原': {body: ['秋葉原で\r\nモテる'], lon: ['139.773288'], lat: ['35.698619']},
    '神田': {body: ['神田で\r\nモテる'], lon: ['139.770641'], lat: ['35.691173']},
    '東京': {body: ['東京で\r\nモテる'], lon: ['139.766103'], lat: ['35.681391']},
    '有楽町': {body: ['有楽町で\r\nモテる'], lon: ['139.763806'], lat: ['35.675441']},
    '新橋': {body: ['新橋で\r\nモテる'], lon: ['139.758587'], lat: ['35.666195']},
    '浜松町': {body: ['浜松町で\r\nモテる'], lon: ['139.757135'], lat: ['35.655391']},
    '田町': {body: ['田町で\r\nモテる'], lon: ['139.747575'], lat: ['35.645736']},
    '品川': {body: ['品川で\r\nモテる'], lon: ['139.738999'], lat: ['35.62876']}
}

/* route func */

exports.index = function (req, res) {
    res.status(200).send('Hello, cococlip World!')
}

exports.createClip = function (req, res) {
    dumpRequest(req, 'createClip')
    if (req.is('multipart/form-data')) {
        parseMultipartRequest(req, function (fields, files) {
            setTestDataYamanote(fields)
            saveClip(fields, files, function (id) {
                res.status(201).send({id: id})
            })
            removeUploadedImageSize0(files.image1)
            removeUploadedImageSize0(files.image2)
        })
    }
}

exports.getClip = function (req, res) {
    dumpRequest(req, 'getClip')
    findClipById(req.params.cid, function (doc) {
        res.status(200).send(doc)
    })
}

exports.getClips = function (req, res) {
    dumpRequest(req, 'getClips')
    var lon = req.query.lon
    var lat = req.query.lat
    if (!lon || !lat) {
        res.status(400).end()
        return
    }
    var lon = parseFloat(lon)
    var lat = parseFloat(lat)
    findClipsByLocation(lon, lat, function (docs) {
        res.status(200).send({'results': docs})
    })
}

exports.getImage = function (req, res) {
    dumpRequest(req, 'getImage')
    findImageById(req.params.iid, function (image) {
        res.status(200).type(image.mime).send(image.data)
    })
}

/* test route func */

exports.displayGitHub = function (req, res) {
    res.redirect('https://github.com/m3hack2/cococlip/wiki')
}

exports.displayForm = function (req, res) {
    res.send(
        '<form action="/api/1/clips" enctype="multipart/form-data" method="post">'
            + '<label for="image1">image1</label>: <input id="image1" type="file" name="image1"/><br/>'
            + '<label for="image2">image2</label>: <input id="image2" type="file" name="image2"/><br/>'
            + '<label for="title">title</label>: <input id="title" type="text" name="title" value="たいとる"/><br/>'
            + '<label for="body">body</label>: <textarea id="body" name="body">ぼでぃ</textarea><br/>'
            + '<label for="lon">lon</label>: <input id="lon" type="text" name="lon" value="139.0"/><br/>'
            + '<label for="lat">lat</label>: <input id="lat" type="text" name="lat" value="35.0"/><br/>'
            + '<input type="hidden" name="test" value="1"/>'
            + '<input type="submit"/></form>'
    )
}

/* func */

var saveClip = function (fields, files, callback) {
    var clip = new Clip()
    clip.title = fields.title[0]
    clip.body = fields.body[0].replace(/\r\n?/g, '\n')
    clip.loc = {lon: Number(fields.lon[0]), lat: Number(fields.lat[0])}
    save(clip, function (doc) {
        var clipId = doc._id
        var fileInfo1 = files.image1[0]
        readUploadedImage(fileInfo1, function (data) {
            var clip = {}
            clip.image1 = {}
            clip.image1.mime = fileInfo1.headers['content-type']
            clip.image1.data = data
            clip.high_image1_url = buildImageUrl(clipId, fileInfo1)
            clip.low_image1_url = buildImageUrl(clipId, fileInfo1, 'L')
            updateClipById(clipId, clip, function () {
            })
        })
        var fileInfo2 = files.image2[0]
        readUploadedImage(fileInfo2, function (data) {
            var clip = {}
            clip.image2 = {}
            clip.image2.mime = fileInfo2.headers['content-type']
            clip.image2.data = data
            clip.high_image2_url = buildImageUrl(clipId, fileInfo2)
            clip.low_image2_url = buildImageUrl(clipId, fileInfo2, 'L')
            updateClipById(clipId, clip, function () {
            })
        })
        callback(clipId)
    })
}

var findClipById = function (id, callback) {
    var condition = {_id: id}
    var field = {__v: 0, image1: 0, image2: 0}
    findClip(condition, field, callback)
}

var findClipsByLocation = function (lon, lat, callback) {
    var condition = {loc: {$near: {type: 'Point', coordinates: [lon, lat]}}}
    var field = {__v: 0, image1: 0, image2: 0, body: 0}
    var option = {limit: 50}
    findClips(condition, field, option, callback)
}

var updateClipById = function (id, data, callback) {
    var condition = {_id: id}
    updateClip(condition, data, callback)
}

var findImageById = function (imageId, callback) {
    var clipId = extractClipIdFromImageId(imageId)
    var imageNo = extractImageNoFromImageId(imageId)
    var imageMode = extractImageModeFromImageId(imageId)
    var condition = {_id: clipId}
    var procImageModeCallback = function (storedImage) {
        callback(storedImage)
    }
    switch (imageNo) {
        case 1:
            var field = {image1: 1, _id: 0}
            findClip(condition, field, function (doc) {
                procImageMode(doc.image1, imageMode, procImageModeCallback)
            })
            break;
        case 2:
            var field = {image2: 1, _id: 0}
            findClip(condition, field, function (doc) {
                procImageMode(doc.image2, imageMode, procImageModeCallback)
            })
            break;
        default:
            console.log('unknown imageNo: ' + imageNo)
    }
}

var readUploadedImage = function (fileInfo, callback) {
    if (fileInfo.size <= 0) {
        return
    }
    fs.readFile(fileInfo.path, function (err, data) {
        if (dumpError(err)) {
            return
        }
        callback(data)
    })
}

var removeUploadedImageSize0 = function (files) {
    var fileInfo = files[0]
    if (0 === fileInfo.size) {
        fs.unlink(fileInfo.path, dumpError)
    }
}

var procImageMode = function (storedImage, mode, callback) {
    switch (mode) {
        case 'L':
            resizeImage(storedImage.data, storedImage.mime, function (resizedImage) {
                storedImage.data = resizedImage
                callback(storedImage)
            })
            break;
        default:
            callback(storedImage)
            break;
    }
}

var resizeImage = function (image, mim, callback) {
    var extension = mime.extension(mim)
    var tempFilePath = mktemp.createFileSync('XXXXXXXXXX.' + extension)
    console.log(tempFilePath)
    var tempResizedFilePath = tempFilePath + '-L'
    fs.writeFileSync(tempFilePath, image)
    imageMagic.resize({src: tempFilePath, dst: tempResizedFilePath, width: 100, height: 100}).then(
        function (info) {
            callback(fs.readFileSync(tempResizedFilePath))
        }, dumpError
    )
}

/* util func */

var buildUpdatedImageId = function (clipId, fileInfo, mode) {
    var extension = mime.extension(fileInfo.headers['content-type'])
    return clipId + '-' + fileInfo.fieldName.substr(-1) + (mode ? mode : '') + (extension ? '.' + extension : '');
}

var buildImageUrl = function (clipId, fileInfo, mode) {
    return process.env.COCOCLIP_URL + imagePath + '/' + buildUpdatedImageId(clipId, fileInfo, mode)
}

var extractClipIdFromImageId = function (iid) {
    var idx = iid.indexOf('-')
    if (-1 == idx) {
        return
    }
    return iid.substr(0, idx)
}

var extractImageNoFromImageId = function (iid) {
    var idx = iid.indexOf('-')
    if (-1 == idx) {
        return
    }
    return parseInt(iid.substr(idx + 1, 1))
}

var extractImageModeFromImageId = function (iid) {
    var idx = iid.indexOf('-')
    if (-1 == idx) {
        return
    }
    return iid.substring(idx + 2, iid.lastIndexOf('.'))
}

/* request func */

var parseMultipartRequest = function (req, callback) {
    var form = new multiparty.Form()
    form.parse(req, function (err, fields, files) {
        dumpParsedMultipartRequest(fields, files)
        if (dumpError(err)) {
            return
        }
        callback(fields, files)
    })
}

/* db access func */

var save = function (model, callback) {
    model.save(function (err, doc, numberAffected) {
        if (dumpError(err)) {
            return
        }
        callback(doc, numberAffected)
    })
}

var findClip = function (condition, field, callback) {
    Clip.findOne(condition, field, function (err, doc) {
        if (dumpError(err)) {
            return
        }
        callback(doc)
    })
}

var findClips = function (condition, field, option, callback) {
    Clip.find(condition, field, option, function (err, docs) {
        if (dumpError(err)) {
            return
        }
        callback(docs)
    })
}

var updateClip = function (condition, data, callback) {
    Clip.update(condition, data, function (err, numberAffected, doc) {
        if (dumpError(err)) {
            return
        }
        callback(doc, numberAffected)
    })
}

/* dump func */

var dumpRequest = function (req, title) {
    console.log(title ? title + ': ' : '', req.query, req.body, req.params)
}

var dumpParsedMultipartRequest = function (fields, files, title) {
    console.log(title ? title + ': ' : '', fields, files)
}

var dumpError = function (err) {
    if (err) {
        console.log(err)
        return true
    }
    return false
}

/* test data func */

var setTestDataYamanote = function (fields) {
    if (fields.test && '1' === fields.test[0]) {
        var data = yamanote[fields.title[0]]
        if (data) {
            fields.body = data.body
            fields.lon = data.lon
            fields.lat = data.lat
        }
    }
}