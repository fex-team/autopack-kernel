
var File  = require('./core/file.js');
var packager = require("./core/packager.js");
var util  = require("./lib/util.js");



var autoPackger = {
    //默认参数
    options : {
        //页面运行终端
        platform    : 'mobile', 

        //RTT时间 单位秒
        rtt         : 1, 

        //下载速率 KB/s
        speed       : 10, 

        //计算自动打包的资源类型
        staticType  : ['js','css'],

        //资源分组依据
        partKeys    : ['loadType'], 

        //自定义打包配置
        defaultPack : {}, 

        //基础JS这些js的PV应该是最高的，而且打包的时候需要放在前面
        baseResources  : ['mod.js','require.js','esl.js']

        
    },

    //初始化参数
    init : function(options){
        console.log("init options");
        for(var i in options){   
            if(this.options.hasOwnProperty(i)){
                this.options[i] = options[i];
            }  
            //对于PC端设置不一样的rtt和speed值
            if(i == "platform" && options[i] == "pc"){
                this.options['rtt'] = options['rtt'] || 0.5;
                this.options['speed'] = options['speed'] || 100;
            }       
        }
    },

    /**
     * 对外提供方法计算打包结果
     * @param  {[type]} files   [需要计算打包配置的资源数组]
     * @param  {[type]} options [打包配置]
     * @return {[type]}         [打包结果]
     */
    pack : function(files,options){
        
        options && this.init(options);
        var resources = {};
        //转为File对象方便计算
        util.map(files,function(index,file){
            var res = new File(file['id'],file['type'],file['url'],file['size'], file['deps']);
            res['pages']    = file['pages'];
            res['pv']       = file['pv'];
            res['priority'] = file['priority']; //优先级
            resources[file['id']] = res;
        })
        return packager.calPackage(resources,this.options);
    }
};



module.exports = autoPackger;

module.exports.File = File;
