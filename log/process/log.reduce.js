var _ = require('underscore');

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
    taskFinish();

});

var current = {
    'hash': null,  //当前map输出key,reduce前已排序
    'instance' : null, //实例，保存fid,page,url,static等信息
    'count': null //保存各个页面的个数
};

function taskFinish() {
    //上一个任务结束，调用finish
    if (current['hash'] && current['count']) {
        var instance = current['instance'];
        _.each( current['count'], function(total, page) {
            stdout.write(instance['fid'] + "\t" + current['hash'] + "\t"  + instance['fs'] + "\t" + total + "\t" +  page + "\t" + instance['url'] + "\t" + instance['otherStr'] +  "\n");       
        });
    }
    current['hash'] = null;
    current['count'] = null;
    current['instance'] = null;
}

//处理逻辑，根据group条件计算总数
function process_line(line) {

    var pair = line.split("\t"),
        hash = pair[0],
        val = JSON.parse(pair[1]);

    var fid = val['fid'],
        page = val['page'];

    if (current['hash'] && current['hash'] != hash ) {
        taskFinish();
    }   
    if (!current['count']) {
        current['hash'] = hash || "-";
        current['count']  =  {};
        current['instance'] = val;              
    }   
    //一个hash可能存在多个页面
    if(!current['count'][page]){
        current['count'][page] = 0;
    }

    //page 及url避免为默认值 - 
    if(page != "-" && page != current['instance']['page']){
        current['instance']['page'] = page;
    }
    if(val['url'] != "-"  && val['url'] != current['instance']['url']){
        current['instance']['url'] = val['url'];
    }
    current['count'][page] ++;
}