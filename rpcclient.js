
var authtoken;


function do_rpc(method,args,callback, options){
    if(typeof callback !== 'function'){
        callback = function(){};
    }
    args = copyobj(args);
    if(user && user._id && authtoken){
        args._id = user._id;
        args.authtoken = authtoken;
        args.atomicversion = user.atomicversion;
    }
    args = JSON.stringify(args);
    var opts = {
        async:true,
        type:'POST',
        dataType:'json',
        data:args,
        processData:false,
        timeout: 10000,
        success: function(data){
            callback(data[0],data[1]);
        },
        error: function(obj, textstatus, errorthrown){
            callback({textstatus:textstatus,
                      errorthrown:errorthrown},
                     data
                    );
        }
    };
    var k;
    for(k in options){
        opts[k] = options[k];
    }
    return $.ajax('./'+method,opts);
}


function do_sync(){
    do_rpc('get_update',{},function(e,d){
        if(e){console.log(e);}
        else{
            set_user(d);
            general_update();
            templ.update();
        }
    });
}

function rpctest(method,args){
    if(!args){
        args = {};
    }
    do_rpc(method,args,function(err,obj){
        if(err){
            console.log('Error:');
            console.log(err);
        }else{
            console.log('Object:');
            console.log(obj);
        }
    });
}


var sync_timeout = null;

function set_sync_timeout(seconds){
    if(sync_timeout !== null){
        clearTimeout(sync_timeout);
    }
    setTimeout(do_sync,seconds*1000 + 100);
}








function rpcclient_init(){
}




