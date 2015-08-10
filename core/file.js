
var util = require("./../lib/util.js");

/**
 *
 * @param id
 * @param type 文件类型
 * @param hash
 * @param url
 * @param size
 * @param deps
 * @constructor
 */
var File = function(id, type, url, size, deps){
    this.id         = id;
    this.module     = 'global'; //默认模块全局
    this.subpath    = id;
    this.type       = type;
    this.url        = url;
    this.deps       = deps; //同步依赖，数组
    this.size       = size; //文件大小,单位KB
    this.pages      = {};
    this.loadType   = "";
    this.priority   = "";//资源优先级，首屏为1，非首屏为2
    this.pv         = 0; //pv 表示为资源理论应该被被下载的次数

    //细分各个维度的pv，例如不同优先级对应的pv,首屏非首屏对应的pv。根据各部分pv大小来判断资源分类
    this.sub_pv     = {};

    var result      = parseId(id);
    if(result){
        this.module     = result["module"];
        this.subpath    = result["subpath"];
    }

    this.mergedStatic   = [id];
    this.benefit        = 0;

    //packageType 有两种类型 ： 手动和自动，手动的为产品线自定义的不需要产出管理， 默认为auto
    this.packageType    = "auto";
};

function parseId(id){
    var modulePreg = /([\w\-]+):([^:]*)/, //模块名称可能带-
        matchResult = id.match(modulePreg);
    if(matchResult){
        return {
            module : matchResult[1],
            subpath : "/" + matchResult[2]
        };
    }
    return null;
}


File.prototype.addPage = function(hash, pv){
    //会出现hash相同的情况，所以pv需要累加
    if(this.pages[hash]){
        this.pages[hash] += pv;
    }else{
        this.pages[hash] = pv;
    }
}

File.prototype.addPv = function(value,type){
    this.pv += parseInt(value);
    //区分同步异步的pv占比，来确定资源加载方式
    if(type){
        if(!this.sub_pv[type]){
            this.sub_pv[type] = 0;
        }
        this.sub_pv[type]  += parseInt(value);
    }
};

File.prototype.addSubPv = function(type,value){
    if(!this.sub_pv[type]){
        this.sub_pv[type] = 0;
    }
    this.sub_pv[type]  += parseInt(value);
};

// loadType : sync和async
File.prototype.setLoadType = function(loadType){
    //默认为同步，如果某种类型加载pv超过总数的60%,则设为当前模式
    var lt = "sync";
    var sub_pv = this.sub_pv[loadType];
    if(sub_pv > 0 && sub_pv >= this.pv*0.6 ){
        lt = loadType;      
    }
    this.loadType = lt;
}

//设置优先级，用来支持是否首屏，根据PV来判断是否是首屏资源
File.prototype.setPriority = function(priority){
    var priority = 1; //默认优先级为最高优先级1
    
    //对于各个优先级对应的pv如果占总pv 60%以上，就设定资源为此优先级
    for (var p in  this.sub_pv) {
        if(p.indexOf("priority")==0 && this.sub_pv[p] && this.sub_pv[p] >= this.pv*0.6){
            priority = p.split("_").pop();
        }
    };   
    this.priority = "pri" + priority;    
}

/**
 * 合并静态资源 ：
 *   id ：
 *   size ： 相加
 *   pages ： 取并集
 *   pv ： pages并集的累加
 *   benefit ： 各自benefit + 合并benefit
 *   mergedStatic ： 数组合并排重
 *   loadType : 合并前已经按照loadType进行了分组，所以loadType都是相同不需要处理
 *   deps ： 不影响打包暂时不考虑
 * @param fileB
 * @param benefit
 */
File.prototype.mergeStatic = function(fileB, benefit){
    this.size = this.size + fileB.get("size");
    this.pages = util.merge(this.pages, fileB.get("pages"));
    this.pv = 0;
    util.map(this.pages, function(page, pv){
        this.pv = parseInt(this.pv) + parseInt(pv);
    }.bind(this));
    this.benefit += fileB.get("benefit") + benefit;
    this.mergedStatic = util.array_unique(this.mergedStatic.concat(fileB.get("mergedStatic")));
    var idTokens = fileB.get("id").split("/"),
        name = idTokens.pop();
    this.id = this.id + "_" + name;
}

File.prototype.get = function(key){
    return this[key];
}

File.prototype.set = function(key, value){
    this[key] = value;
}

module.exports = File;
