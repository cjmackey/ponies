


function jobup(i){
    do_rpc('jobup',
           {'i':i},
           function(e,d){
               $('.job').stop();
               if(e){return console.log(e);}
               set_user(d);
           });
    //todo: maybe start animating a swap?
    templ.update(function(){
        /*
        var movup = $('#joblist_'+i.toString());
        var movdn = $('#joblist_'+(i-1).toString());
        */
    });
}
function jobdown(i){
    do_rpc('jobdown',
           {'i':i},
           function(e,d){
               $('.job').stop();
               if(e){return console.log(e);}
               set_user(d);
           });
    templ.update(function(){
    });
}
function jobcancel(i){
    do_rpc('jobcancel',
           {'i':i},
           function(e,d){
               if(e){return console.log(e);}
               set_user(d);
           });
}

function setjobleft(job,toffset){
    var left = Math.max(job.duration - job.progress + toffset,0);
    job.left = left;
    
    var h = Math.floor(left / 3600);
    var m = Math.floor(left / 60) - h*60;
    var s = Math.floor(left) - h*3600 - m*60;
    left = h.toString()+':';
    if(m < 10){ left += '0'; }
    left += m.toString()+':';
    if(s < 10){ left += '0'; }
    left += s.toString();
    job.leftstr = left;
    
    job.percentdone = Math.round(100 * job.progress / job.duration);
    job.percentdonestr = job.percentdone.toString() + '%';
}





var possiblejob = false;
var jobform_output_desc = '';
var jobform_output_seconds = 30;
function update_jobform_num_job(){
    var ji = jobinfo(user,$('#jobformdesc').val());
    var num = parseInt($('#jobformnum').val(),10);
    if(isNaN(num) || !ji){ return; }
    jobform_output_seconds = num * ji.time;
    if(num === 1){
        jobform_output_desc = possiblejob.outputs[0].singular;
    }else{
        jobform_output_desc = possiblejob.outputs[0].plural;
    }
    while(Math.floor(jobform_output_seconds / ji.time) < num){
        jobform_output_seconds += 1;
    }
    $('#jobformleft').val(jobform_output_seconds);
    templ.update();
}

var last_job_update_time = null;
function job_update(){
    var t = time_s();
    var i;
    
    update_jobform_num_job();
    
    var toffset = 0;
    for(i in user.jobs){
        var j = user.jobs[i];
	setjobleft(j, toffset);
        toffset += j.duration - j.progress;
    }
    if(user.jobs.length > 0 && last_job_update_time){
        user.jobs[0].progress += t-last_job_update_time;
    }
    
    last_job_update_time = t;
    
    templ.update(function(){
        $('.jobup').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                jobup(i);
            });
        });
        $('.jobdown').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                jobdown(i);
            });
        });
        $('.jobcancel').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                jobcancel(i);
            });
        });
    });
}




var craftbox = null;

function updatecraftbox(){
    if(!craftbox){ return console.log('no craftbox to update'); }
    craftbox.invbases = invdisp(craftbox.inventory);
    craftbox.worbases = invdisp(craftbox.workspace);
    var invl = mapinv(craftbox.inventory);
    var worl = mapinv(craftbox.workspace);
    craftbox.craftcount = craftbox.ji.invcapacity(craftbox.workspace);
    craftbox.crafttime = craftbox.craftcount * craftbox.ji.time;
    possiblejob.genqualprob(user,craftbox.workspace);
    templ.update(function(){
        $('.craftboxadd1').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                var item = copy(invl[i]);
                if(item.quantity > 1){
                    item.quantity = 1;
                }
                delitem(craftbox.inventory,item);
                additem(craftbox.workspace,item);
                updatecraftbox();
            });
        });
        $('.craftboxdel1').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                var item = copy(worl[i]);
                if(item.quantity > 1){
                    item.quantity = 1;
                }
                additem(craftbox.inventory,item);
                delitem(craftbox.workspace,item);
                updatecraftbox();
            });
        });
        var i;
        for(i=0;i<=3;i++){
            var color = (i<=possiblejob.craftqualmax)?'black':'red';
            $('#craftquality'+i.toString()).css('color',color);
        }
        
        $('#craftquality').unbind();
        $('#craftquality').change(function(){
            $('#craftquality').css(
                'color',$('#craftquality'+$('#craftquality').val()).css(
                    'color'));
        });
    });
}



function startcraftbox(){
    craftbox = null;
    if(!possiblejob){return console.log('no possiblejob for craftbox');}
    var ji = copy(possiblejob);
    if(ji.inputs.length < 1){return;}
    craftbox = {};
    craftbox.ji = ji;
    craftbox.inventory = copy(invfilter(user,ji.inputinvfilter));
    accumjobinv(user.jobs,craftbox.inventory);
    craftbox.inventory = copy(invfilter(
        craftbox.inventory,ji.inputinvfilter));
    craftbox.workspace = {};
    updatecraftbox();
}


/*
 * when job adding form is done
 *
 * this submits job to server, and does not immediately add it.
 */
function submit_job(){
    var j = {};
    
    var desc = $('#jobformdesc').val();
    if(typeof desc !== 'string' || desc.length < 1){
        console.log('bad submit_job: desc');
        return false;
    }
    j.jobkind = desc;
    
    if(craftbox){
        j.craftinputs = copy(craftbox.workspace);
        j.jobduration = craftbox.crafttime;
        j.craftquality = parseInt($('#craftquality').val(),10);
        if(j.craftquality > possiblejob.craftqualmax){
            console.log('bad quality choice');
            return false;
        }
    }else{
        j.jobduration = parseFloat($('#jobformleft').val());
    }
    if(isNaN(j.jobduration)){
        console.log('bad submit_job: left');
        return false;
    }
    
    do_rpc('add_job',
           j,
           function(e,d){
               if(e){return console.log(e);}
               else{
                   set_user(d);
               }
           });
    return false; //to not actually submit the form :)
}

function jobclient_init(){}

