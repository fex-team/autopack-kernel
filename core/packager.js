
var File        = require("./file.js"),
    util        = require("../lib/util.js");

var benefitMap = {},
    loaded = [];


/**
 * 计算自动打包配置
 * @param resources
 * @param options
 * @returns {*}
 */
module.exports.calPackage = function(resources,options){
    var autoResult  = {};
        RTT         = options.rtt,
        SPEED       = options.speed;

    if(!RTT || !SPEED){
        throw new Error('rtt and speed must > 0 ！');
    }

    //根据手工配置筛选出资源
    var manualResult = mergeDefaultPackage(resources, options.defaultPack);

    //删除pv为0的资源
    options.removeUnuse && removeUnuseRes(resources,options.baseResources);

    //将资源根据类型分组
    var newResources = partAndFilterResources(resources,options.staticType,
                        options.partKeys,options.modules),
    
    //根据pv倒序排列资源，方便计算和获取最高pv     
    newResources = sortByPv(newResources);

    //将基础包pv设为最高，使基础包优先加载
    fixBasePV(newResources,options.baseResources);

    //计算打包配置
    util.map(newResources, function(packageKey, partResource){
        var packageResult = [];
        if(partResource.length >= 2){
            autoResult[packageKey] = mergePackage(partResource.shift(), partResource, packageResult);
        }else{
            autoResult[packageKey] = [partResource.pop()];
        }
    });
   
    //打包结果按pv大小排序，避免使用次数多的资源排在末位导致名称经常变动
    autoResult = sortByPv(autoResult);

    //将自动计算配置与人工配置合并
    util.merge(sortByPv(autoResult), manualResult);

    //生成配置结果
    return  createPackConf(autoResult,resources,options.baseResources,options.defaultPack);
}




//基础文件pv可能统计不到，需要修正到最高PV
//最终删除pv为0的资源(废弃资源)
function fixBasePV(newResources,baseResources,removeUnuse){
    var unuses = [];
    util.map(newResources, function(key, resources){
        util.map(resources,function(index,res){
            var subpath = res['id'].toLowerCase();
            var fileName = subpath.split("/").pop();
            if(baseResources.indexOf(fileName) > -1 || baseResources.indexOf(subpath) > -1){
                res.set("pv", resources[0].get("pv"));
                res.set("pages", resources[0].get("pages"));
            }else if(removeUnuse && res && res.get('pv') == 0){
                unuses.push(res['id']);
            }
        })
    });
}

//删除pv为0的资源
function removeUnuseRes(resources,baseResources){
    util.map(resources,function(id,res){
        var subpath = res['id'].toLowerCase();
        var fileName = subpath.split("/").pop();
        if(baseResources.indexOf(fileName) < 0 && baseResources.indexOf(subpath) < 0 
            && res.get('pv') == 0){
            delete resources[id];
        }
    })
}


/**
 * 判断文件是否命中规则
 * @param resource
 * @param defaultPackages
 * @returns {*}
 */
function hit(resource, defaultPackages){
    var type = resource.get("type"),
        subpath = resource.get("subpath"),
        module = resource.get("module");
    if(type == "js" || type == "css"){
        for(var key in defaultPackages){
            var conf = defaultPackages[key];
            for(var i = 0, len = conf.length; i < len; i++){
                var reg = conf[i];
                if(reg && util.filter(subpath, reg)){
                    return key;
                }
            }
        }
    }
    return false;
};


/**
 * 根据合并后的资源生成打包配置
 * @param resources
 */
function createPackConf(mergeRes,resources,baseRes,defaultPack){
    var packResult = {};
    util.map(mergeRes, function(packageKeyPrefix, packages){
        var module  = packages[0]['module'],
            type    = packages[0]['type'];

            util.map(packages, function(index, pkgFile){
                //自定义包使用用户原生配置不再自动生成，可以保证自定义包的顺序
                if(pkgFile.get("packageType") != "manual"){
                    var files = pkgFile.get("mergedStatic"),
                        packageKey = "pkg/" + packageKeyPrefix + "_" + index + "." + type;
                    if(files.length){
                        packResult[packageKey] = [];
                        util.map(files, function(index, file){
                            packResult[packageKey].push(file);
                        });
                    }
                }
            });
    });

    //根据依赖关系排序，同时保证基础js/css在最前面
    util.map(packResult, function(packageKey, files){
        var filtered = []; //筛选出的基础资源
        var ordered = [];  //根据依赖重排序后的资源
        var packed = {};  //本包内已打包的资源
        //筛选出基础资源并保留顺序
        if( util.is(baseRes,"Array") && baseRes.length) {
            for (var i = 0; i < baseRes.length; i++) {
                for (var j = 0; j < files.length; j++) {
                    if(files[j].split("/").pop() == baseRes[i] || files[i] == baseRes[i] ){
                        filtered.push(files[j]);
                        ordered.push(files[j]);
                    }
                }
            }
        }

        //递归按依赖重排序
        while (files.length) {
            add(files.shift());
        }
        function add(file) {
            if(filtered.indexOf(file) > -1){
                return false;
            }
            var deps = resources[file].deps;
            if (deps && deps.length) {
                deps.forEach(function(fileId) {
                    var idx;
                    if(~(idx = files.indexOf(fileId))){
                        add(files.splice(idx, 1)[0]);
                    }
                })
            }
            if (!packed[file]) {
                packed[file] = true;
                ordered.push(file);
            }
        }

        //去除包名中的模块标识,注意模块名称可能包含-
        packResult[packageKey] = ordered.map(function(fileId){
            return fileId.replace(/[\w\-]+:/, "/");
        })

        //合并手动配置
        packResult = util.merge(defaultPack, packResult);

    });

    return packResult;
}




function mergeResources(resources){
    var originResource = resources.shift();
    util.map(resources, function(index, resource){
        originResource.mergeStatic(resource, 0);
    });
    return originResource;
}


function mergeDefaultPackage(resources, defaultPackages){
    var manualPackages = {},
        deleteResource = [],
        manualResult = {};
    util.map(resources, function(index, resource){
        var key = hit(resource, defaultPackages);
        if(key){
            if(!manualPackages[key]){
                manualPackages[key] = [];
            }
            manualPackages[key].push(resource);
            deleteResource.push(index);
        }
    });
    util.map(manualPackages, function(file, mergeFiles){
        var mergedFile = {};
        if(mergeFiles.length >= 2){
            mergedFile = mergeResources(mergeFiles);
        }else{
            mergedFile = mergeFiles[0];
        }
        var packageKey = file;
        mergedFile.set("id", file);
        mergedFile.set("packageType", "manual");
        manualResult[packageKey] = [];
        manualResult[packageKey].push(mergedFile);
    });
    for(var i=0; i<deleteResource.length; i++){
        delete(resources[deleteResource[i]]);
    }
    return manualResult;
}




/**
 * 对静态资源进行分类，过滤不需要打包的数据
 * @param resources
 * @param staticTypes  需要打包的静态资源 数组 如js、css
 * @returns {{}}
 */
function partAndFilterResources(resources, staticTypes,keys,modules){
    var newResources = {};
    for(var id in resources){
        var resource = resources[id];
        //排除掉非相关类型的文件
        if(resources.hasOwnProperty(id)  && util.in_array(resource.get("type"), staticTypes)){
            //加载类型默认为同步
            if(resource.get("loadType") == ""){
                resource.setLoadType("sync");
            }
            //优先级默认为1
            if(resource.get("priority") == ""){
                resource.setPriority(1);
            }
            //命名规范需模块名在前，type在后。中间的分组key根据配置keys而定，有loadType、 priority
            var partKey = [resource.get("module")] ;
            for(var i=0 ;i < keys.length; i++){
                if(resource.get(keys[i])){
                    partKey.push(resource.get(keys[i]));
                }
            }
            partKey.push(resource.get("type"));
            partKey = partKey.join("_");

            if(!newResources[partKey]){
                newResources[partKey] = [];
            }
            newResources[partKey].push(resource);
        }
    }
    return newResources;
}


function sortByPv(resources){
    for(var key in resources){
        if(resources.hasOwnProperty(key)){
            resources[key].sort(function(a, b){
                return b.get("pv") - a.get("pv");
            });
        }
    }
    return resources;
}



/**
 * 计算两个静态资源合并的收益
 *      计算收益 ：
 *          找到两个静态资源的公共page，计算节省的请求数，转化为时间
 *      计算损失 ：
 *          计算 a-b的差值 遍历计算浪费的b的字节数
 *          计算 b-a的差值 遍历计算浪费的a的字节数
 *          浪费字节数/网速 计算出浪费的时间
 * @param staticA
 * @param staticB
 */
function getBenefit(staticA, staticB){
    if(benefitMap[staticA.get("id") + staticB.get("id")]){
        return benefitMap[staticA.get("id") + staticB.get("id")];
    }

    //计算收益
    var commonPages = util.array_intersect_key2(staticA.get("pages"), staticB.get("pages")),
        commonPv = 0,
        benefitTime = 0;
    util.map(commonPages, function(page, pagePv){
        commonPv = commonPv + parseInt(pagePv);
    });
    benefitTime = commonPv * RTT;

    //计算损失
    var singleAPages = util.array_diff_key2(staticA.get("pages"), staticB.get("pages")),
        singleBPages = util.array_diff_key2(staticB.get("pages"), staticA.get("pages")),
        wasteStaticA = 0,
        wasteStaticB = 0,
        wasteTime = 0;

    util.map(singleAPages, function(page, pagePv){
        wasteStaticB = wasteStaticB + parseInt(pagePv) * parseFloat(staticB.get("size"));
    });

    util.map(singleBPages, function(page, pagePv){
        wasteStaticA = wasteStaticA + parseInt(pagePv) * parseFloat(staticA.get("size"));
    });

    wasteTime = (wasteStaticA + wasteStaticB) / SPEED;

    //最终收益
    var finalBenefit = benefitTime - wasteTime;
    benefitMap[staticA.get("id") + staticB.get("id")] = finalBenefit;
    return finalBenefit;
}


/**
 * 返回合并收益最大的资源以及收益 : 从上述算法中可以分析出没有没有损失的合并一定是收益最大的，所以不用单独考虑没有损失的资源合并情况
 * @param staticA
 * @param {Array} resources
 */
function getLargestBenefit(staticA, resources){
    var largestBenefit = 0,
        largestResource = null,
        resourceIndex = null;
    util.map(resources, function(index, resource){
        if(staticA.get("id") != resource.get("id")){
            var tmpBenefit = getBenefit(staticA, resource);
            if(tmpBenefit >= largestBenefit){
                largestBenefit = tmpBenefit;
                largestResource = resource;
                resourceIndex = index;
            }
        }
    });
    return {
        "benefit" : largestBenefit,
        "resource" : largestResource,
        "index" : resourceIndex
    };
}


/**
 *
 * @param originStatic
 * @param {Array} resources
 * @param mergedStatics
 */
function mergePackage(originStatic, resources, mergedStatics){
    
    var mergeResult = getLargestBenefit(originStatic, resources),
        oldMergeStatic = mergeResult["resource"],
        oldMergeBenefit = mergeResult["benefit"],
        oldStaticIndex = mergeResult["index"];

    if(oldMergeStatic == null){ //没有找到适合合并的静态资源
        mergedStatics.push(originStatic);
        if(resources.length >= 2){
            var originStatic = resources.shift();
            mergePackage(originStatic, resources, mergedStatics);
        }else if(resources.length == 1){
            mergedStatics.push(resources.pop());
        }
    }else{ //找到适合合并的静态资源
        var newMergeResult = getLargestBenefit(oldMergeStatic, resources),
            newMergeStatic = newMergeResult["resource"],
            newMergeBenefit = newMergeResult["benefit"],
            newStaticIndex = newMergeResult["index"];

        if(newMergeBenefit > oldMergeBenefit){
            //首先移除后面item,否则会导致误删除其他的item
            newStaticIndex = parseInt(newStaticIndex);
            oldStaticIndex = parseInt(oldStaticIndex);
            if(newStaticIndex > oldStaticIndex){
                resources = util.removeByIndex(resources, newStaticIndex);
                resources = util.removeByIndex(resources, oldStaticIndex);
            }else{
                resources = util.removeByIndex(resources, oldStaticIndex);
                resources = util.removeByIndex(resources, newStaticIndex);
            }
            oldMergeStatic.mergeStatic(newMergeStatic, newMergeBenefit);
            resources.push(oldMergeStatic);
            mergePackage(originStatic, resources, mergedStatics);
        }else{
            originStatic.mergeStatic(oldMergeStatic, oldMergeBenefit);
            resources = util.removeByIndex(resources, oldStaticIndex);
            mergePackage(originStatic, resources, mergedStatics);
        }
    }
    return mergedStatics;
}
