/* var */

var fs = require('fs')
var express = require('express')
var bodyParser = require('body-parser')

var routes = require(__dirname + '/routes')

/* init */

var app = express()
app.use(bodyParser.urlencoded({extended: false}))

/* route */

app.get('/', routes.index)
app.get('/api/1/clips', routes.getClips)
app.post('/api/1/clips', routes.createClip)
app.get('/api/1/clips/:cid', routes.getClip)

app.get('/api/1/img/:iid', routes.getImage)

/* test route */

app.get('/test/github', routes.displayGitHub)
app.get('/test/form', routes.displayForm)

/* server */

var server = app.listen(process.env.PORT || 5000, function () {
    var host = server.address().address
    var port = server.address().port
    console.log('cococlip app listening at http://%s:%s', host, port)
})
