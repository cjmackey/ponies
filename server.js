
var clientusername = {};
var usernameclient = {};


var server = http.createServer(function(req, res){
    var path = url.parse(req.url).pathname;
    
    if(req.method.toLowerCase() === 'post') {
        if(path === '/upload'){
            return fileupload(req,res);
        }
        req.setEncoding('utf8');
        var bodylist = [];
        req.on('data', function (data) {
            bodylist.push(data);
        });
        req.on('end', function () {
            var body = bodylist.join('');
            do_rpc(req, res, body, path);
        });
    }else{
        if(path === '/') { path = '/index.html'; }
        
        if(path === 'dosomethingwithregularexpressions'){
        }else{
            fileresp(req, res, path);
        }
    }
});


server.listen(port);

//ensure we make some markets
(function(){
    //var k;
    //for(k in going_prices){
    //    new_market(k);
    //}
    trading_hierarchy_ns.eachleaf(function(n){
        new_market(n.marketid,n.exampleitem);
    }, trading_hierarchy);
}());

fs.writeFile("_server.pid",process.pid.toString());
require('util').log('node.js server started with pid: ' + process.pid.toString());




