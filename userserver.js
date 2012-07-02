
/*

user's mongodb schema


*/

var usertoken = {};

/*
 * this maps users to a user object that represents the last version
 * we sent to them (we think).
 */
var useruser = {};


//JSON.stringify
//JSON.parse

function validUsername(u){
    return (typeof u === 'string' && u.length < 50 && /^[a-zA-Z0-9]+$/.test(u));
}

function newtoken(username){
    var token = rbytes.randomBytes(32).toHex();
    usertoken[username] = token;
    return token;
}



function new_card(d){
    if(typeof d === 'object'){
        d = copy(d);
    }else if(typeof d === 'string'){
        d = {'base':d};
    }else{
        d = {};
    }
    d.type = 'card';
    return d;
}


/*
 * updates user to take account of finished jobs and such.
 *
 * also sets defaults for previously blank fields
 *
 */
function update_user_fun(user, callback){
    var t = time_s();
    var i, j;
    var ops = {};
    var todel;
    var deletedjobs = false;
    var soonest_update = t + 100000;
    var sd;
    
    //delete sensitive stuff (doesn't delete it in server, it just
    //doesn't go over the wire)
    if(user.authtoken){ delete user.authtoken; }
    if(user.hashpass){ delete user.hashpass; }
    
    if(!user.ponytype){user.ponytype = 'earth';}
    
    if(!user.activequests){user.activequests = {};}
    if(!user.finishedquests){user.finishedquests = [];}
    if(!user.questflags){user.questflags = {};}
    
    if(!user.stats){ user.stats = {}; }
    var skilllist = ['baker','engineer','farmer','gemcrafter','tailor'];
    var skillxplist = map(function(a){return a+'_xp';},skilllist);
    var statlist = map(function(a){return [a,0];},
                       skilllist.concat(skillxplist));
    for(i in statlist){
        if(user.stats[statlist[i][0]] === undefined){
            user.stats[statlist[i][0]] = statlist[i][1];
        }
    }
    if(user.specialty){
        if(user.stats[user.specialty] < 1){
            user.stats[user.specialty] = 1;
        }
    }
    
    if(!user.lastupdatetime){
        user.lastupdatetime = t;
    }
    
    if(typeof user.bits !== 'number'){ user.bits = 100; }
    
    if(!user.inventory){ user.inventory = {}; }
    if(user.inventory.bits){
        user.bits = user.inventory.bits;
        delete user.inventory.bits;
    }
    for(i in user.inventory){
        if(typeof user.inventory[i] === 'number'){
            user.inventory[i] = [{base:i,quantity:user.inventory[i]}];
        }
    }
    
    if(!user.decks){
        //mapping deck name to the deck (which is an inventory of cards)
        sd = {};
        var cardlist = [
            new_card({'quantity':4,'base':'lightapplekick'}),
            new_card({'quantity':4,'base':'mediumapplekick'}),
            new_card({'quantity':2,'base':'heavyapplekick'}),
            new_card({'quantity':2,'base':'stubborncharge'}),
            new_card({'quantity':2,'base':'woodencrate'}),
            new_card({'quantity':1,'base':'surprisestep'}),
            new_card({'quantity':3,'base':'supersonicapple'}),
            new_card({'quantity':2,'base':'staggeringblow'}),
            new_card({'quantity':2,'base':'ironpony'}),
            new_card({'quantity':2,'base':'doublebuck'}),
            new_card({'quantity':3,'base':'rainofblows'}),
            new_card({'quantity':3,'base':'hailofapples'})
        ];
        for(i in cardlist){
            additem(user,cardlist[i]);
            additem(sd,cardlist[i]);
        }
        additem(user,new_card('freakout'));
        additem(user,new_card('cakeapult'));
        additem(user,new_card('pillow'));
        user.decks = {};
        user.decks.starter = sd;
    }
    
    user.jobkinds = [{kind:'apples',
                      desc:'Pick Apples'},
                     {kind:'wood',
                      desc:'Chop Wood'}];
    if(user.stats.baker > 0){
        user.jobkinds.push({kind:'pies',
                            desc:'Bake Pies'});
        user.jobkinds.push({kind:'cake',
                            desc:'Bake Cakes'});
        user.jobkinds.push({kind:'frosting',
                            desc:'Mix Frosting'});
    }
    


    if(!user.jobs){
        user.jobs = [];
    }else{
        var workedtime = t - user.lastupdatetime;
        todel = {};
        for(i in user.jobs){
            j = user.jobs[i];
            if(!j.progress){
                j.progress = 0;
            }
            var workleft = j.duration - j.progress;
            if(workedtime >= workleft){
                todel[i] = true;
                deletedjobs = true;
                workedtime -= workleft + 0.0005;
            }else{
                j.progress += workedtime - 0.0005;
                workedtime = 0;
            }
        }
        if(deletedjobs){
            var newjobs = [];
            for(i in user.jobs){
                if(!todel[i]){
                    newjobs.push(user.jobs[i]);
                }else{
                    job_complete(user,user.jobs[i]);
                }
            }
            user.jobs = newjobs;
        }
        if(user.jobs.length > 0){
            j = user.jobs[0];
            soonest_update = Math.min(soonest_update,
                                      j.duration - j.progress + t);
        }
    }
    
    user.sync_delay = soonest_update - t;
    user.servertime = t;
    user.lastupdatetime = t;
    
    return callback(null,user);
}

function set_deck_fun(args){
    var deckname = args.deckname;
    var deck = copy(args.deck);
    return function(u,cbk){
        if(typeof deckname !== 'string' ||
           deckname.length < 1 ||
           deckname.length > 30 ||
           typeof deck !== 'object'){
            return cbk('set_deck_fun: invalid args');
        }
        u.decks[deckname] = deck;
        return cbk(null,u);
    };
}

function withuser(args,cbk,superauth){
    if(!superauth &&
       (!usertoken[args._id] ||
        usertoken[args._id] !== args.authtoken)
      ){
        return callback('withuser: bad authentication');
    }
    seq(
        function(){
            getcoll('users',this);
        }, function(err, coll){
            if(err){ return callback(err); }
	    coll.findOne({'_id':args._id},this);
        }, function(err, o){
            if(err){ return callback(err); }
            if(!o){
                return callback('atomically: no object matching search');
            }
            return cbk(null,o);
        }
    );
}

function useratomically(args, operationfun, callback, superauth){
    if(!superauth &&
       (!usertoken[args._id] ||
        usertoken[args._id] !== args.authtoken)
      ){
        return callback('useratomically: bad authentication');
    }
    return atomically(
        'users',
        {_id:args._id},
        bind(update_user_fun,
             operationfun,
             update_user_fun),
        callback
    );
}
/*
 * as useratomically, but returns a diff if possible
 */
function duseratomically(args, operationfun, callback, superauth){
    var u0;
    var shoulddiff = false;
    seq(
        function(){
            useratomically(args,operationfun,this,superauth);
        },function(err,u1){
            if(err){return callback(err);}
            u0 = useruser[args._id];
            useruser[args._id] = u1;
            if(u0 && args.atomicversion &&
               u0.atomicversion === args.atomicversion){
                u1 = objdiff(u0,u1);
            }
            return callback(null,u1);
        }
    );
}
    




function auth_user(username,pass,callback){
    var db;
    var coll;
    var t = time_s();
    var u = null;
    seq(
	function(){
            getcoll('users',this);
        }, function(err,collection){
	    coll = collection;
	    coll.findOne({'_id':username},this);
	}, function(err,user){
            if(err){
                return callback(err);
            }else if(!user){
                return callback('no user');
            }
            u = user;
            bcrypt.compare(pass,u.hashpass,this);
	}, function(err,res){
            if(err){
                return callback(err);
            }else if(!res){
                return callback('bad password');
            }
            
            atomically(coll,{_id:username},update_user_fun,this);
        }, function(err, u){
            if(u){
                u.authtoken = newtoken(username);
            }
            useruser[u._id] = u;
            callback(err,u);
        }
    );
	
}
function new_user(args,callback){
    var username = args.username;
    var pass = args.pass;
    var spec = args.spec;
    var db;
    var coll;
    var hashpass;
    var t = time_s();
    var o;
    var u = check_username(username);
    var ponytype = 'earth';
    if(args.ponytype === 'pegasus'){ ponytype = 'pegasus'; }
    if(args.ponytype === 'unicorn'){ ponytype = 'unicorn'; }
    if(!u.isvalid){
        return callback(u,null);
    }
    seq(
        function(){ bcrypt.gen_salt(10, this); },
        function(err, salt){ bcrypt.encrypt(pass, salt, this); },
	function(err, hash){
            hashpass = hash;
            getcoll('users',this);
        }, function(err,collection){
            if(err){
                return callback(err);
            }
	    coll = collection;
	    coll.insert(
		{'_id':username,
                 //'username':username,
		 'hashpass':hashpass,
		 'created':t,
                 'specialty':spec,
                 'ponytype':ponytype,
                 'atomicversion':0
		},
                {safe:true},
		this);
	}, function(err, u){
            if(err){ console.log(err); return callback(err); }
            
            atomically(coll,{_id:username},update_user_fun,this);
        }, function(err, u){
            if(u){
                u.authtoken = newtoken(username);
            }
            useruser[u._id] = u;
            callback(err,u);
        }
    );
}











