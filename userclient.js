
var user;



var login_form_thinking = false;


var clockskew = 0;
var newu = null;
var oldu = null;

/*
 * for setting the user after getting one updated from the server
 *
 */
function set_user(u){
    oldu = copy(user);
    newu = copy(u);
    if(isArray(u)){
        user = objpatch(u,user);
    }else{
        user = u;
    }

    if(user.authtoken){
        authtoken = user.authtoken;
    }
    set_dialog(user.dialog);

    var t = time_s();
    clockskew = t - user.servertime;
    set_sync_timeout(user.sync_delay);
    
    var i,j,k;
    
    //update job times for clockskew
    //cstart means "start time as per client clock"
    for(i in user.jobs){
        user.jobs[i].cstart = user.jobs[i].start + clockskew;
    }
    
    //flatten job kinds
    user.flatjobkinds = [];
    for(i in user.jobkinds){
        j = copy(user.jobkinds[i]);
        user.flatjobkinds.push(j);
    }
    
    //make inventory for display
    user.invbases = invdisp(user,function(t){
        return (t.type === 'card') ? undefined : t; });
    
    user.flatactivequests = vallist(user.activequests);
    user.flatactivequests.sort(function(a,b){
        return a.started - b.started;});
    
    general_update();
    
    templ.update(function(){
        $('.questturnin').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                turnin_quest(user.flatactivequests[i]._id);
            });
        });
        $('.questcancel').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                cancel_quest(user.flatactivequests[i]._id);
            });
        });
    });
}

function lock_login_form(){
    login_form_thinking = true;
    $('input').attr('disabled', 'disabled');
}
function unlock_login_form(){
    login_form_thinking = false;
    $('input').removeAttr('disabled');
}

function login(u,p,cbk){
    if(!u){
        u = $('#usernameinput').val();
    }
    if(!p){
        p = $('#passwordinput').val();
    }
    console.log('login ' + u);
    lock_login_form();
    do_rpc(
        'auth_user',
        {username:u, pass:p},
        function(err,obj){
            unlock_login_form();
            if(err){return console.log(err);}
            set_user(obj);
            $('#jobformdesc').focus();
            if(cbk){ cbk(); }
        });
}
function register(){
    if($('#passwordinput').val() !== $('#passwordinput2').val()){
        alert("passwords don't match!");
        return;
    }
    lock_login_form();
    do_rpc(
        'new_user',
        {username:$('#usernameinput').val(),
         pass:$('#passwordinput').val(),
         spec:$('#specialtyform').val(),
         ponytype:$('#ponytypeform').val()
        },
        function(err,obj){
            unlock_login_form();
            if(err){return console.log(err);}
            set_user(obj);
            $('#jobformdesc').focus();
        });
}

function userclient_init(){
}
