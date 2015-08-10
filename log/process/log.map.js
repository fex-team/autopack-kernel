var  _ = require('underscore');
var URL = require("url");

var stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr;

stdin.resume();

var buffer = '';

stdin.on('data', function(chunk) {
    buffer += chunk;
    buffer = buffer.replace(/\r\n/g, '\n');
    while (buffer.indexOf('\n') > -1) {
        var i = buffer.indexOf('\n') + 1,
            line = buffer.slice(0, i-1);
        process_line(line);
        buffer = buffer.slice(i);
    }
}).on('end', function(chunk) {
    if (buffer.length > 0) {
        process_line(buffer);
    }
});



//解析日志关键项
function process_line(line) {

    //过滤FIS日志，fid标识
    if(String(line).indexOf("&fid=") > 0){
        var group = /(\d+\.\d+\.\d+\.\d+) .*?\[(.*?:(\d+):(\d+):(\d+)) (.*?)\] \".*st\.gif\?(.*) .TTP\/(.*?)\" (.*?) .*?\"(.*?)\" \"(.*)\"/.exec(line); 
        if(group){
            var pageUrl = group[10];
            //如果内网IP或者存在端口，认为是测试数据，进行过滤
            try{
                var urlParams = URL.parse(pageUrl);
                if(urlParams['port'] || String(group[1]).indexOf("10.")== 0){  
                    return false;
                }
            }catch(e){
                return false;
            }

            //日志默认数据项
            var fields = {
                'fs' : '-', //首屏资源
                'otherStr' : '-', //非首屏资源
                'page' : '-' ,//页面模板
                'hash' : '-',
                'url' : pageUrl //页面url
            }; 

            //内网IP过滤 10开头
            if(String(group[1]).indexOf("10.") == 0 ){
                return false;
            }

            _.each(group[7].split("&"), function(pair, i) {
                pair = pair.split("=");
                if(pair[1]){
                    fields[pair[0]] = pair[1];
                }               
            });

            //老版本统计data字段代表静态资源，默认认为是首屏资源
            if(fields['data']){
                fields['fs'] = fields['data'];
            }
            //'fid','hash','static','count', 'tplName','url','other'))
            //输出map结果,以hash为key
            stdout.write(fields['hash'] + "\t" + JSON.stringify(fields) + "\n");
        }
    }
}