

var jobkinds = {
    'apples':true,
    'wood':true,
    'pies':true,
    'cake':true,
    'frosting':true
};


/*
mundane (q0)
good (q1)
exceptional (q2)
legendary (q3)

*/

function skillcmp(a,b){
    var tmp = cmp(a.kind,b.kind);
    if(tmp !== 0){
        return tmp;
    }
    return cmp(a,b);
}

var maxquality = 3;
var qualitycoefs = [500,500,64];
var qualitydivs = [10,100,100];
var qualityshifts = [1,1,1];
var qualitymaxs = [256,256,64];

var skill2randqual_memo = {};
function skill2randqual(sk){
    if(typeof sk !== 'number' ||
       sk < 1){
        return [0,0,0];
    }
    //var o = skill2randqual_memo[sk];
    //if(o){return o;}
    var o = [];
    var i;
    for(i=0;i<maxquality;i++){
        o.push(Math.round(between(
            (qualitycoefs[i]*
             (-1/Math.max(
                 sk/qualitydivs[i] + qualityshifts[i],
                 1)+1)),
            1,qualitymaxs[i])));
    }
    skill2randqual_memo[sk] = o;
    return o;
}

function qualprob(sk){
    var o = [];
    var l = skill2randqual(sk);
    o[3] = l[0]*l[1]*l[2]/(256*256*256);
    o[2] = l[0]*l[1]*(256-l[2])/(256*256*256);
    o[1] = l[0]*(256-l[1])/(256*256);
    o[0] = (256-l[0])/(256);
    return o;
}

/* jobinfo :: user -> jobkind ->
 *   {inputs:[item], outputs:[item], time:seconds, skill:str}
 */
function jobinfo(u,k){
    var i;
    var o = {};
    o.kind = k;
    o.inputs = [];
    o.outputs = [];
    o.time = 1;
    o.inputtime = true;
    o.verb = 'Work';
    switch(k){
    case 'apples':
        o.verb = 'Pick apples';
        o.skillname = 'farmer';
        o.outputs.push({'base':k,'quantity':1});
        break;
    case 'wood':
        o.verb = 'Chop wood';
        o.skillname = 'farmer';
        o.outputs.push({'base':k,'quantity':1});
        break;
    case 'pies':
        o.verb = 'Bake';
        o.inputtime = false;
        o.skillname = 'baker';
        o.inputs.push({'base':'apples','quantity':8}); //8 apples
        o.inputs.push({'base':'butter','quantity':2}); //2 sticks of butter
        o.inputs.push({'base':'flour','quantity':3});  //3 cups of flour
        o.inputs.push({'base':'sugar','quantity':1});  //1 cup of sugar
        o.outputs.push({'base':k,'quantity':1});
        o.time = 600;
        break;
    case 'frosting':
        o.verb = 'Mix';
        o.inputtime = false;
        o.skillname = 'baker';
        o.inputs.push({'base':'butter','quantity':1}); //1 stick of butter
        o.inputs.push({'base':'sugar' ,'quantity':1}); //1 cup of sugar
        o.outputs.push({'base':k,'quantity':1});
        o.time = 100;
        break;
    case 'cake':
        o.verb = 'Bake';
        o.inputtime = false;
        o.skillname = 'baker';
        o.inputs.push({'base':'frosting','quantity':2}); //2 cups of frosting
        o.inputs.push({'base':'eggs',    'quantity':3}); //3 eggs
        o.inputs.push({'base':'butter',  'quantity':2}); //2 sticks of butter
        o.inputs.push({'base':'flour',   'quantity':2}); //2 cups of flour
        o.inputs.push({'base':'sugar',   'quantity':2}); //2 cups of sugar
        o.inputs.push({'base':'milk',    'quantity':1}); //1 cup of milk
        o.outputs.push({'base':k,'quantity':1});
        o.time = 600;
        break;
    default:
        return null;
    }
    
    o.genqualprob = function(u,inv){
        var i,j;
        if(o.skillname){
            o.skill = u.stats[o.skillname];
            if(inv){
                var skmod = 0;
                for(i in o.inputs){
                    var imod = 0;
                    var icnt = 0;
                    var inp = o.inputs[i].base;
                    if(inv[inp]){
                        for(j in inv[inp]){
                            icnt += inv[inp][j].quantity;
                            if(inv[inp][j].quality){
                                imod += (inv[inp][j].quantity *
                                         inv[inp][j].quality);
                            }
                        }
                    }
                    if(icnt > 0){
                        skmod += imod / icnt;
                    }
                }
                skmod = skmod / o.inputs.length;
                o.skill = skmod + o.skill * (1 + skmod * skmod);
            }
            o.qualprob = qualprob(o.skill);
            o.qualpct = [];
            for(i in o.qualprob){
                o.qualpct.push(
                    Math.round(o.qualprob[i]*100).toString()+'px');
            }
            o.craftqualmax = Math.floor(o.skill/5);
        }
    };
    if(u){
        o.genqualprob(u);
    }
    
    if(o.inputs.length > 0){
        o.inputinvfilter = function(t){
            var ret = false;
            var i;
            for(i in o.inputs){
                if(t.base === o.inputs[i].base){
                    ret = true;
                }
            }
            return ret;
        };
        o.invcapacity = function(inv){
            var l = mapinv(inv);
            var ic = [];
            var i,j;
            var min = Infinity;
            for(i in o.inputs){
                var c = 0;
                for(j in l){
                    if(l[j].base === o.inputs[i].base){
                        c += l[j].quantity;
                    }
                }
                c = Math.floor(c/o.inputs[i].quantity);
                min = Math.min(min,c);
            }
            if(o.inputs.length < 1){
                min = -1;
            }
            return min;
        };
    }else{
        o.inputinvfilter = function(t){ return false; };
    }
    return o;
}





function valid_job(u,j,cbk){
    var err = null;
    if(typeof j.jobkind !== 'string' || !(j.jobkind in jobkinds)){
        err = 'bad jobkind';
    }
    //... todo
}



function accumjobinv(joblist,jobinv){
    if(!jobinv){jobinv = {};}
    map(function(j){
        if(j.outputs){
            map(function(item){
                additem(jobinv,item);
            },mapinv(j.outputs));
        }
        if(j.inputs){
            map(function(item){
                if(item.stolenfromjob){
                    var item2 = copy(item);
                    delete item2.stolenfromjob;
                    delitem(jobinv,item2);
                }
            },mapinv(j.inputs));
        }
    },joblist);
    return jobinv;
}


var skilljob = {};
var skilljoblist = [];


function jobcommon_init(){
    var k, j, i;
    for(k in jobkinds){
        j = jobinfo(null,k);
        var l = skilljob[j.skillname];
        if(!l){
            l = [];
            skilljob[j.skillname] = l;
        }
        l.push(j);
    }
    for(k in skilljob){
        skilljob[k].sort(skillcmp);
    }
    skilljoblist = map(function(p){
        return {'skillname':p[0],
                'joblist':p[1]};
    },elemlist(skilljob));
    
}

