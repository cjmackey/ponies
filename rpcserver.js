

function rpc_success(res,obj){
    if(obj === undefined || obj === null){
        obj = '';
    }
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
    });
    res.write(JSON.stringify([null,obj]), 'binary');
    res.end();
}
function rpc_error(res,obj){
    if(obj === undefined || obj === null){
        obj = '';
    }
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
    });
    res.write(JSON.stringify([obj]), 'binary');
    res.end();
}




var methods = {};

methods.mul = function(req, res, args, callback){
    var tmp;
    var err1 = null;
    try{
        tmp = parseFloat(args.a)*parseFloat(args.b);
        rpc_success(res,tmp);
    }catch(err){
        tmp = null;
        err1 = true;
        rpc_error(res);
    }
    if(callback){
        callback(err1,tmp);
    }
};

methods.new_user = function(req, res, args, callback){
    seq(
        function(){
            new_user(args,this);
        }, function(err, u){
            if(err){
                rpc_error(res,'login failed');
            }else{
                rpc_success(res,u);
            }
        }
    );
};

methods.auth_user = function(req, res, args, callback){
    var username, pass, user;
    try{
        username = args.username;
        pass = args.pass;
    }catch(err){
        return rpc_error(res);
    }
    
    seq(
        function(){
            auth_user(username,pass,this);
        }, function(err, u){
            if(err){
                rpc_error(res,'login failed');
            }else{
                user = u;
                rpc_success(res,user);
            }
        }
    );
};

methods.get_update = function(req, res, args, callback){
    return duseratomically(args, nullfun, callback);
};

methods.add_job = function(req,res,args,callback){
    return duseratomically(args,job_add_fun(args),callback);
};

methods.list_markets = function(req,res,args,callback){
    seq(
        function(){
            getcoll('markets',this);
        }, function(err, coll){
            if(err){ return console.log(err); }
            coll.find({},{'_id':1},{},this);
        }, function(err,cursor){
            if(err){ return console.log(err); }
            cursor.toArray(this);
        }, function(err, arr){
            if(err){ return console.log(err); }
            var i;
            for(i in arr){
                arr[i] = arr[i]._id;
            }
            return rpc_success(res,arr);
        }
    );
};

methods.read_market = function(req,res,args,callback){
    seq(
        function(){
            marketatomically(args.marketid,nullfun,this);
        }, function(err,obj){
            if(err){ return console.log(err); }
            return rpc_success(res,obj);
        }
    );
};

methods.quickbuy = function(req,res,args,callback){
    var userid = args._id;
    var authtoken = args.authtoken;
    var marketid = args.marketid;
    var maxcost = parseInt(args.maxcost,10);
    var spent = 0;
    var spentobj = {};
    var quantity = parseInt(args.quantity,10);
    if(!userid ||
       !authtoken ||
       usertoken[userid] !== authtoken ||
       !maxcost ||
       isNaN(maxcost) ||
       maxcost < 1 ||
       !quantity ||
       isNaN(quantity) ||
       quantity < 1
      ){
        console.log('bad quickbuy invocation');
        return rpc_error(res, 'bad quickbuy invocation');
    }
    seq(
        function(){
            useratomically({_id:userid},
                           function(u,cbk){
                               if(u.bits < maxcost){
                                   maxcost = u.bits;
                               }
                               u.bits -= maxcost;
                               return cbk(null,u);
                           },
                           this,
                           true);
        }, function(err){
            if(err){ return console.log(err); }
            marketatomically(marketid,
                             quickbuy_fun(userid, quantity,
                                          maxcost, spentobj),
                             this);
        }, function(err){
            if(err){
                console.log(err);
                spent = 0;
            }else{
                spent = spentobj.spent;
            }
            //refund user maxcost - spent
            //console.log('spent: '+spent.toString());
            useratomically({_id:userid},
                           function(u,cbk){
                               u.bits += maxcost - spent;
                               return cbk(null,u);
                           },
                           this,
                           true);
        }, function(){
            var output = 'purchase complete';
            if(spent <= 0){
                output = 'purchase failed';
            }
            return rpc_success(res,output);
        }
    );
};
methods.add_buyorder = function(req,res,args,callback){
    var userid = args._id;
    var authtoken = args.authtoken;
    var marketid = args.marketid;
    var bitseach = parseInt(args.bitseach,10);
    var quantity = parseInt(args.quantity,10);
    if(!userid ||
       !authtoken ||
       usertoken[userid] !== authtoken ||
       !bitseach ||
       isNaN(bitseach) ||
       bitseach < 1 ||
       !quantity ||
       isNaN(quantity) ||
       quantity < 1
      ){
        console.log('bad buyorder invocation');
        return rpc_error(res, 'bad buyorder invocation');
    }
    var resultlist = [];
    seq(
        function(){
            useratomically({_id:userid},
                           function(u,cbk){
                               if(u.bits < bitseach*quantity){
                                   return cbk('insufficient funds');
                               }
                               u.bits -= bitseach*quantity;
                               return cbk(null,u);
                           },
                           this,
                           true);
        }, function(err){
            if(err){ return console.log(err); }
            marketatomically(marketid,
                             addbuyorderfun(userid, bitseach, quantity),
                             this);
        }, function(err){
            if(err){
                //refund user
                useratomically({_id:userid},
                               function(u,cbk){
                                   u.bits += bitseach*quantity;
                                   return cbk(null,u);
                               },
                               nullfun,
                               true);
                return console.log(err);
            }
            return rpc_success(res,'placed order');
        }
    );
};

methods.quicksell = function(req,res,args,callback){
    var userid = args._id;
    var authtoken = args.authtoken;
    var marketid = args.marketid;
    var mincost = parseInt(args.mincost,10);
    var quantity = parseInt(args.quantity,10);
    if(!userid ||
       !authtoken ||
       usertoken[userid] !== authtoken ||
       !mincost ||
       isNaN(mincost) ||
       mincost < 1 ||
       !quantity ||
       isNaN(quantity) ||
       quantity < 1
      ){
        console.log('bad quicksell invocation');
        return rpc_error(res, 'bad quicksell invocation');
    }
    var it;
    seq(
        function(){
            marketatomically(marketid,nullfun,this);
        }, function(err, m){
            if(err){ return console.log(err); }
            it = copy(m.exampleitem);
            it.quantity = quantity;
            useratomically({_id:userid},
                           function(u,cbk){
                               if(countitem(u,m.exampleitem) < quantity){
                                   return cbk('insufficient items');
                               }
                               delitem(u,it);
                               return cbk(null,u);
                           },
                           this,
                           true);
        }, function(err){
            if(err){ return console.log(err); }
            marketatomically(marketid,
                             quicksell_fun(userid, quantity, mincost),
                             this);
        }, function(err){
            if(err){
                //refund items to user
                useratomically({_id:userid},
                               function(u,cbk){
                                   additem(u,it);
                                   return cbk(null,u);
                               },
                               nullfun,
                               true);
                return console.log(err);
            }
            return rpc_success(res,'sale complete');
        }
    );
};

methods.add_sellorder = function(req,res,args,callback){
    var userid = args._id;
    var authtoken = args.authtoken;
    var marketid = args.marketid;
    var bitseach = parseInt(args.bitseach,10);
    var quantity = parseInt(args.quantity,10);
    if(!userid ||
       !authtoken ||
       usertoken[userid] !== authtoken ||
       !bitseach ||
       isNaN(bitseach) ||
       bitseach < 1 ||
       !quantity ||
       isNaN(quantity) ||
       quantity < 1
      ){
        console.log('bad buyorder invocation');
        return rpc_error(res, 'bad sellorder invocation');
    }
    var resultlist = [];
    var it;
    seq(
        function(){
            marketatomically(marketid,nullfun,this);
        }, function(err, m){
            if(err){ return console.log(err); }
            it = copy(m.exampleitem);
            it.quantity = quantity;
            useratomically({_id:userid},
                           function(u,cbk){
                               if(countitem(u,m.exampleitem) < quantity){
                                   return cbk('insufficient items');
                               }
                               delitem(u,it);
                               return cbk(null,u);
                           },
                           this,
                           true);
        }, function(err){
            if(err){ return console.log(err); }
            marketatomically(marketid,
                             addsellorderfun(userid, bitseach, quantity),
                             this);
        }, function(err){
            if(err){
                //refund user
                useratomically({_id:userid},
                               function(u,cbk){
                                   additem(u,it);
                                   return cbk(null,u);
                               },
                               nullfun,
                               true);
                return console.log(err);
            }
            return rpc_success(res,'placed order');
        }
    );
};


methods.add_quest = function(req, res, args, callback){
    var qd = {};
    duseratomically(args,add_quest_fun(args,qd),function(err,u){
        return callback(err,[qd.q,u]);
    });
};

methods.cancel_quest = function(req, res, args, callback){
    duseratomically(args,del_quest_fun(args),callback);
};

methods.turnin_quest = function(req, res, args, callback){
    duseratomically(args,turnin_quest_fun(args),callback);
};

methods.dialog_pick = function(req, res, args, callback){
    duseratomically(args,dialog_pick_fun(args),callback);
};

methods.get_quests = function(req, res, args, callback){
    withuser(args,function(e,u){
        var ql;
        if(!e && u){
            ql = get_quests_fun(u);
        }
        return callback(e,ql);
    });
};

methods.set_deck = function(req, res, args, callback){
    duseratomically(args,set_deck_fun(args),callback);
};
methods.jobup = function(req, res, args, callback){
    duseratomically(args,jobup_fun(args.i),callback);
};
methods.jobdown = function(req, res, args, callback){
    duseratomically(args,jobdown_fun(args.i),callback);
};



function do_rpc(req, res, jsonargs, path){
    var args;
    var m = path.substring(1,path.length);
    seq(
        function(){
            if(!methods[m]){
                return this('bad rpc method');
            }
            try{
                args = JSON.parse(jsonargs);
            }catch(err){
                return this(err);
            }
            methods[m](req,res,args,this);
        }, function(err,obj){
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            res.write(JSON.stringify([err,obj]), 'binary');
            res.end();
        }
    );
}










