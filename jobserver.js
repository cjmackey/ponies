

function job_each_output(num,sq,u,item){
    num = num * item.quantity;
    var xp = 0;
    var quants = [0,0,0,0];
    var randbuf = rbytes.randomBytes(3*num);
    var i;
    for(i=0;i<num;i++){
        var qual = 0;
        if(randbuf[i*3+0] < sq[0]){
            qual += 1;
            if(randbuf[i*3+1] < sq[1]){
                qual += 1;
                if(randbuf[i*3+2] < sq[2]){
                    qual += 1;
                }
            }
        }
        quants[qual] += 1;
    }
    for(i=0; i<quants.length; i++){
        if(quants[i] > 0){
            var d = {base:item.base,
                     quantity:quants[i]};
            if(i>0){
                d.quality = i;
            }
            additem(u,d);
            xp += (1 + i*i)*quants[i];
        }
    }
    return Math.round(xp/item.quantity);
}

function job_complete(u,j){
    var xp = 0;
    var i;
    var item;
    var ji = jobinfo(u,j.kind);
    if(j.outputs){
        //console.log(j.outputs);
        var olist = mapinv(j.outputs);
        //console.log(olist);
        for(i in olist){
            item = copy(olist[i]);
            //console.log(item);
            //console.log('............');
            var k;
            // put stolen goods into inputs of thief jobs.
            for(k in u.jobs){
                if(cmp(u.jobs[k],j) === 0){ continue; }
                if(!u.jobs[k].inputs){continue;}
                var iinv = u.jobs[k].inputs;
                var item2 = copy(item);
                item2.stolenfromjob = true;
                var icount = countitem(iinv,item2);
                if(icount === 0){ continue; }
                if(icount > item.quantity){
                    icount = item.quantity;
                }
                item2.quantity = icount; //add no more than they need
                //console.log(iinv);
                //console.log(item2);
                delitem(iinv,item2);
                //console.log(iinv);
                //console.log(item2);
                delete item2.stolenfromjob;
                additem(iinv,item2);
                //console.log(iinv);
                //console.log(item2);
                item.quantity -= icount;
                if(item.quantity <= 0){
                    break;
                }
            }
            if(item.quantity > 0){ //anything that wasn't stolen
                additem(u,item);
            }
        }
        //todo: figure out xp;
        xp += ji.invcapacity(j.inputs);
    }else{
        var num = Math.floor(j.duration/ji.time);
        var sq = skill2randqual(ji.skill);
        for(i in ji.outputs){
            xp += Math.round(
                (job_each_output(num,sq,u,ji.outputs[i]) /
                 ji.outputs.length));
        }
    }
    if(ji.skill !== undefined){
        u.stats[ji.skillname+'_xp'] += xp;
    }
}



function job_add_fun(args){
    var jobkind = args.jobkind;
    var jobduration = parseInt(args.jobduration,10);
    var inputs = {};
    if(isinv(args.craftinputs)){
        inputs = copy(args.craftinputs);
    }
    var quality = null;
    if(typeof args.craftquality === 'number'){
        quality = Math.round(args.craftquality);
        if(quality < 0 || quality > 3){
            return errfun('bad quality');
        }
    }
    if(isNaN(jobduration)){return function(u,c){c('bad jobduration');};}
    return function(u,cbk){
        if(u.jobs.length > 10){
            return cbk('too many jobs already enqueued');
        }
        
        var ji = jobinfo(u,jobkind);
        if(ji === null){ return cbk('invalid jobinfo'); }
        
        var jobid = u.lastjobid;
        if(!jobid){ jobid = 0; }
        
        var t;
        if(u.jobs.length > 0){
            var j0 = u.jobs[u.jobs.length - 1];
            t = j0.start + j0.duration;
        }else{
            t = time_s();
        }
        
        if(ji.skillmin && (!ji.skill || ji.skill < ji.skillmin)){
            return cbk('insufficient skill');
        }
        
        var num = Math.floor(jobduration / ji.time);
        var i, item;
        var outputs = null;
        if(ji.inputs.length > 0){
            num = ji.invcapacity(inputs);
            jobduration = num * ji.time;
            ji.genqualprob(u,inputs);
            
            //check that the `inputs' isn't fraudulent, and remove items
            var jobinv = accumjobinv(u.jobs);
            var accinv = copy(u.inventory);
            map(function(item){
                additem(accinv,item);
            },mapinv(jobinv));
            var inputl = mapinv(inputs);
            for(i in inputl){
                item = copy(inputl[i]);
                if(countitem(accinv,item) < item.quantity){
                    return cbk('insufficient inputs: '+item.base);
                }
                var k;
                for(k in u.jobs){
                    //if a job has an output matching this input, mark
                    //in `inputs' that some are to be stolen from past
                    //jobs. anything that can't be stolen is taken
                    //from the player's actual inventory.
                    if(!u.jobs[k].outputs){continue;}
                    var ocount = countitem(u.jobs[k].outputs,item);
                    if(ocount === 0){ continue; }
                    if(ocount > item.quantity){
                        ocount = item.quantity;
                    }
                    var item2 = copy(item);
                    item2.quantity = ocount;
                    delitem(inputs,item2);
                    item2.stolenfromjob = true;
                    additem(inputs,item2);
                    item.quantity -= ocount;
                    if(item.quantity <= 0){
                        break;
                    }
                }
                if(item.quantity > 0){
                    delitem(u,item);
                }
            }
            
            //make outputs
            if(quality > ji.craftqualmax){
                return cbk('quality set too high for your skill/inputs');
            }
            outputs = {};
            for(i in ji.outputs){
                item = copy(ji.outputs[i]);
                item.quantity *= num;
                if(quality > 0){
                    item.quality = quality;
                }
                additem(outputs,item);
            }
        }
        
        u.jobs.push({
            start:t,
            duration:jobduration,
            kind:jobkind,
            id:jobid,
            'inputs':inputs,
            'outputs':outputs
        });
        u.lastjobid = jobid+1;
        
        return cbk(null,u);
    };
}

function inventoryvalid(u,ix){
    if(ix >= u.jobs.length){
        return false;
    }
    if(!u.jobs[ix].inputs){
        return true;
    }
    var joblist = [];
    var i, item;
    for(i = 0; i < ix && i < u.jobs.length; i++){
        joblist.push(u.jobs[i]);
    }
    var jobinv = accumjobinv(joblist);
    var itemlist = mapinv(u.jobs[ix].inputs);
    for(i in itemlist){
        item = copy(itemlist[i]);
        if(item.stolenfromjob){
            delete item.stolenfromjob;
            if(countitem(jobinv,item) < item.quantity){
                return false;
            }
        }
    }
    return true;
}

function swapjobs_fun(i0,i1){
    return function(u,cbk){
        var i;
        if(u.jobs.length <= Math.max(i0,i1) || 0 > Math.min(i0,i1)){
            return cbk('out of job range...');
        }
        if(i0 === i1){
            return cbk(null,u);
        }
        var j0 = u.jobs[i0];
        var j1 = u.jobs[i1];
        u.jobs[i1] = j0;
        u.jobs[i0] = j1;
        for(i = Math.min(i0,i1); i <= Math.max(i0,i1); i++){
            if(!inventoryvalid(u,i)){
                return cbk('would break input/output dependencies');
            }
        }
        return cbk(null,u);
    };
}

function jobup_fun(ix){
    if(typeof ix !== 'number'){
        return function(u,cbk){cbk('jobup_fun: `i` was a bad number');};
    }
    ix = Math.round(ix);
    return swapjobs_fun(ix,ix-1);
}

function jobdown_fun(ix){
    if(typeof ix !== 'number'){
        return function(u,cbk){cbk('jobup_fun: `i` was a bad number');};
    }
    ix = Math.round(ix);
    return swapjobs_fun(ix,ix+1);
}





function jobtest(){
    var u = {};
    seq(
        function(){
            update_user_fun(u,this);
        },function(err,u1){
            u = u1;
            u.inventory = {};
            additem(u,{'base':'butter','quantity':1000});
            additem(u,{'base':'milk','quantity':1000});
            additem(u,{'base':'eggs','quantity':1000});
            additem(u,{'base':'apples','quantity':1000});
            additem(u,{'base':'flour','quantity':1000});
            additem(u,{'base':'sugar','quantity':1000});
            u.decks = {};
            job_add_fun({'jobkind':'apples','jobduration':10})(u,this);
        },function(err,u1){
            u = u1;
            job_complete(u,u.jobs[0]);
            u.jobs.shift();
            assert(countitem(u,{'base':'apples'}) === 1010);
            var inp = {};
            additem(inp,{'base':'sugar','quantity':5});
            additem(inp,{'base':'butter','quantity':5});
            job_add_fun({'jobkind':'frosting','jobduration':1,
                         'craftinputs':inp,'craftquality':0
                        })(u,this);
        },function(err,u1){
            u = u1;
            var inp = {};
            additem(inp,{'base':'sugar','quantity':4});
            additem(inp,{'base':'butter','quantity':4});
            job_add_fun({'jobkind':'frosting','jobduration':1,
                         'craftinputs':inp,'craftquality':0
                        })(u,this);
        },function(err,u1){
            u = u1;
            var inp = {};
            additem(inp,{'base':'sugar','quantity':4});
            additem(inp,{'base':'butter','quantity':4});
            additem(inp,{'base':'eggs','quantity':6});
            additem(inp,{'base':'flour','quantity':4});
            additem(inp,{'base':'milk','quantity':2});
            additem(inp,{'base':'frosting','quantity':4});
            job_add_fun({'jobkind':'cake','jobduration':1,
                         'craftinputs':inp,'craftquality':0
                        })(u,this);
        },function(err,u1){
            u = u1;
            var inp = {};
            additem(inp,{'base':'sugar','quantity':4});
            additem(inp,{'base':'butter','quantity':4});
            additem(inp,{'base':'eggs','quantity':6});
            additem(inp,{'base':'flour','quantity':4});
            additem(inp,{'base':'milk','quantity':2});
            additem(inp,{'base':'frosting','quantity':4});
            job_add_fun({'jobkind':'cake','jobduration':1,
                         'craftinputs':inp,'craftquality':0
                        })(u,this);
        },function(err,u1){
            if(err){return console.log(err);}
            u = u1;
            var i, j;
            
            swapjobs_fun(1,2)(copy(u),function(e,u1){ assert(!e); u = u1;});
            swapjobs_fun(2,3)(copy(u),function(e){ assert(e);  });
            
            job_complete(u,u.jobs[0]);
            u.jobs.shift();
            
            assert(countitem(u,{'base':'frosting'}) === 0);
            assert(countitem(u.jobs[0].inputs,{'base':'frosting'})===4);
            assert(countitem(u.jobs[0].inputs,{'base':'frosting','stolenfromjob':true})===0);
            assert(countitem(u.jobs[2].inputs,{'base':'frosting'})===1);
            assert(countitem(u.jobs[2].inputs,{'base':'frosting','stolenfromjob':true})===3);
            
            swapjobs_fun(1,2)(copy(u),function(e){ assert(e);  });
            swapjobs_fun(0,1)(copy(u),function(e){ assert(!e); });
            
            job_complete(u,u.jobs[0]);
            u.jobs.shift();
            
            assert(countitem(u,{'base':'frosting'}) === 0);
            assert(countitem(u.jobs[1].inputs,{'base':'frosting'})===1);
            assert(countitem(u.jobs[1].inputs,{'base':'frosting','stolenfromjob':true})===3);
            
            job_complete(u,u.jobs[0]);
            u.jobs.shift();
            
            assert(countitem(u,{'base':'frosting'}) === 1);
            assert(countitem(u.jobs[0].inputs,{'base':'frosting'})===4);
            assert(countitem(u.jobs[0].inputs,{'base':'frosting','stolenfromjob':true})===0);

            job_complete(u,u.jobs[0]);
            u.jobs.shift();
            
            assert(countitem(u,{'base':'frosting'}) === 1);
            assert(countitem(u,{'base':'cake'}) === 4);
            assert(countitem(u,{'base':'butter'}) === 1000-9-8);
            assert(countitem(u,{'base':'milk'}) === 1000-4);
            
        }
    );
}


jobtest();
