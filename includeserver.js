

var http = require('http');
var url = require('url');
var fs = require('fs');
var sys = require(process.binding('natives').util ? 'util' : 'sys');
var mongodb = require('./mongodb');
var seq = require('./step');
var bcrypt = require('bcrypt');
var qs = require('querystring');
var rbytes = require('rbytes');
var exec = require('child_process').exec;
var formidable = require('formidable');


if(shouldrestart){
    process.on('uncaughtException', function (err) {
        console.log('');
        console.log('******************************');
        console.log('UNCAUGHT EXCEPTION!');
        console.log('error:');
        console.log(err);
        console.log('trace:');
        console.trace();
        console.log('******************************');
        console.log('');
        exec("./restart.sh",function(err,stdout,stderr){
            //do nothing
        });
    });
}


var _global_dbconn;

function dbconn(f){
    if(_global_dbconn){
        return f(null,_global_dbconn);
    }
    var mongoserv = new mongodb.Server('localhost',mongoport,
                                       {auto_reconnect:true, poolSize:10});
    var db = new mongodb.Db('ponies',mongoserv,{});
    seq(
        function(){ db.open(this); },
        function(err){
            if(err){
                console.log('error in dbconn:');
                console.log(err);
                return f(err);
            }
            db.authenticate(mongo_username, mongo_password, this);
        },
        function(){
            _global_dbconn = db;
            f(null,db);
        }
    );
}

var _global_colls = {};

function getcoll(collname, callback){
    if(_global_colls[collname]){
        return callback(null,_global_colls[collname]);
    }
    seq(
	function(){ dbconn(this); },
	function(err,db){
            if(err){ return callback(err); }
            db.collection(collname,this);
	}, function(err, c){
            if(err){
                console.log('error in getcoll:');
                console.log(err);
                callback(err,null);
            }else{
                _global_colls[collname] = c;
                callback(null,c);
            }
        }
    );
}

/*
 * atomic update
 *
 * collname: the name of the relevant collection
 * 
 * oldobj: must at least contain id and atomicversion
 * 
 * operation: changes to object (id and atomicversion will be overwritten
 * if present)
 *
 */
function atomicupdate(coll, oldobj, operation, callback){
    if(!operation.$set){
        operation.$set = {};
    }
    var nv = newatomicversion(oldobj.atomicversion);
    operation.$set.atomicversion = nv;
        
    seq(
	function(){
            if(typeof coll === 'string'){ getcoll(coll,this);
            }else{ this(null,coll); }
        },
	function(err,c){
            if(err){ return callback(err); }
	    coll = c;
            coll.update(oldobj,operation,{safe:true},this);
	},
        function(err,n){
            //if the error was a technical failure, shouldn't retry
            if(err){
                if(err.message === 'Failed to update document'){
                    return callback('should retry');
                }else{
                    return callback(err);
                }
            }
            return callback(null,nv);
        }
    );
}

/*
 * search :: {} // ex: {_id:'someid'}
 * 
 * operationfun :: obj, callback -> err, obj'
 * 
 */
function atomically(coll, search, operationfun, callback){
    var av;
    var search0 = search;
    search = copyobj(search);
    var oprime;
    var _id = search._id;
    seq(
        function(){
            if(typeof coll === 'string'){
                getcoll(coll,this);
            }else{
                this(null,coll);
            }
        }, function(err, coll){
            if(err){ return callback(err); }
	    coll.findOne(search,this);
        }, function(err, o){
            if(err){ return callback(err); }
            if(!o){
                console.log(search);
                return callback('atomically: no object matching search');
            }
            av = o.atomicversion;
            operationfun(o, this);
        }, function(err, o){
            if(err){ return callback(err); }
            oprime = o;
            if(!_id){ _id = o._id; }
            delete o._id;
            search.atomicversion = av;
            atomicupdate(coll,search, {$set:o}, this);
        }, function(err, nv){
            if(err === 'should retry'){
                console.log('atomically: retrying');
                //possibly with a random or increasing delay
                var delay = rbytes.randomBytes(1)[0];
                setTimeout(function(){
                    atomically(coll,search0,operationfun,callback);
                }, delay);
                return;
            }
            oprime._id = _id;
            oprime.atomicversion = nv;
            return callback(err, oprime);
        }
    );
}





function send404(req, res){
    res.writeHead(404);
    res.write('404\n');
    res.write(url.parse(req.url).pathname);
    res.end();
}

function extct(path){
    var extension = path.split('.').pop();
    if(extension === path) { extension = ''; }
    var ct;
    switch (extension){
    case 'html':
    case 'htm':
    case 'shtml': ct = 'text/html; charset=utf-8'; break;
    case 'css':   ct = 'text/css; charset=utf-8'; break;
    case 'js':    ct = 'application/x-javascript; charset=utf-8'; break;
    case 'gif':   ct = 'image/gif'; break;
    case 'png':   ct = 'image/png'; break;
    case 'jpg':
    case 'jpeg':  ct = 'image/jpeg'; break;
    case 'ico':   ct = 'image/x-icon'; break;
    case 'mp3':   ct = 'audio/mpeg'; break;
    case 'txt':   ct = 'text/plain; charset=utf-8'; break;
    default:      ct = 'application/octet-stream';
    }
    return [extension,ct];
}

function fileresp(req, res, path){
    path = path.replace(/\.\./g,''); //don't let people .. out of things
    if(!path.match(/^[\/\.A-z0-9_\-]*$/)){
        console.log('fileresp: bad path');
        console.log(path);
        return;
    }
    var fname;
    var clientcangzip = req.headers['accept-encoding'].match(/gzip/);
    var tmp = extct(path);
    var extension = tmp[0];
    var ct = tmp[1];
    var headdict = {
        'Content-Type': ct,
        'Cache-Control': 'max-age=100000000, public',
        'Vary': 'Accept-Encoding'
    };
    require('util').log('fileresp: '+path);
    
    if(path === '/index.html'){
        headdict['Cache-Control'] = 'no-cache';
        fname = __dirname + '/output/index.html';
        if(clientcangzip){
            headdict['Content-Encoding'] = 'gzip';
            fname += '.gz';
        }
    }else if(path.match(/^\/useruploads\//)){
        fname = __dirname + path;
    }else if(imagedir[path.substr(1)]){
        //headdict['Cache-Control'] = 'max-age=85000, public';
        headdict['Cache-Control'] = 'no-cache';
        fname = __dirname + '/output/'+imagedir[path.substr(1)];
    }else{
        fname = __dirname + '/output' + path;
        if(clientcangzip && (extension === 'html' ||
                             extension === 'js' ||
                             extension === 'css')
          ){
            headdict['Content-Encoding'] = 'gzip';
            fname += '.gz';
        }
    }
    fs.readFile(fname, function(err, data){
        if(err) { return send404(req, res); }
        res.writeHead(200, headdict);
        res.write(data, 'binary');
        res.end();
    });
}

function setpicture(username){
    return function(err,stdout,stderr){
        if(err){ return; }
        var fname = stdout.split('\n')[0];
        atomically('users',{'_id':username},
                   function(u,c){
                       u.image = fname;
                       return c(null,u);
                   },
                   function(){});
    };
}

function fileupload(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(1 || fields.username && fields.authtoken &&
           usertoken[fields.username] === fields.authtoken){
            var k;
            for(k in files){
                console.log('k');
                var fname = ''+files[k].path;
                var ext = files[k].name.split('.').pop();
                console.log('fname: '+fname+' ext: '+ext);
                if(!ext.match(/^[A-z0-9]+$/)){ ext = ''; }
                exec("sh filemove.sh "+fname+" "+ext,
                     setpicture(fields.username));
            }
        }
        
        
        
        
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('received upload:\n\n');
        res.end(sys.inspect({fields: fields, files: files}));
    });
}




