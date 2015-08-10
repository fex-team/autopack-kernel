var autoPackger = require("../index.js");
var util = require("../lib/util.js");

var files = [{
        'id' : 'common:static/fileA.js',
        'type' : 'js',
        'url' : 'http://url1',
        'deps' : ['common:static/fileB.js','common:static/fileC.js'], //同步依赖
        'pages' : {  //在各个页面pv
            'hash01' : 800,
            'hash02' : 200
        },
        'pv' : 1000, //总pv
        'size' : 10
    },
    {
        'id' : 'common:static/fileB.js',
        'type' : 'js',
        'url' : 'http://url1',
        'pages' : {  //在各个页面pv
            'hash01' : 800,
            'hash02' : 200
        },
        'pv' : 1000, //总pv
        'size' : 10

    },
    {
        'id' : 'common:static/fileC.js',
        'type' : 'js',
        'url' : 'http://url1',
        'deps' : ['common:static/fileE.js','common:static/fileF.js'], //同步依赖
        'pages' : {  //在各个页面pv
            'hash01' : 800,
            'hash02' : 200
        },
        'pv' : 1000, //总pv
        'size' : 10
    },
    {
        'id' : 'common:static/fileD.js',
        'type' : 'js',
        'url' : 'http://url1',
        'pages' : {  //在各个页面pv
            'hash04' : 800
        },
        'pv' : 1000, //总pv
        'size' : 10
    },
    {
        'id' : 'common:static/fileE.js',
        'type' : 'js',
        'url' : 'http://url1',
        'pages' : {  //在各个页面pv
            'hash01' : 800,
            'hash05' : 1000
        },
        'pv' : 1000, //总pv
        'size' : 10
    }
];

/*
var result = autoPackger.pack(files,{
    'defaultPack' : {
        'pkg/custom.js' : [
            '/static/fileB.js'
        ]
    },
    'partKeys'    : [],
    'platform' : 'mobile'
});*/

var files = util.readJSON(__dirname + "/files.json");
var result2 = autoPackger.pack(files,{
    platform : 'pc'
});

console.log(JSON.stringify(result2,null,4));