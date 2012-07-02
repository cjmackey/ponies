



var dialog = null;
function set_dialog(d){
    if(d){
        dialog = d;
    }else{
        dialog = null;
    }
    templ.update(function(){
        if(dialog){
            $('#dialogframe').css(
                'background-image','url("'+imagedir[dialog.bgimg]+'")');
            var h = $('#dialogtext').outerHeight(true);
            var h0 = $('#dialogtext').outerHeight(false);
            if(h > 200){
                $('#dialogtext').height(140);
            }else if(h < 200){
                $('#dialogtext').css('margin-top',(200-h0).toString()+'px');
            }
        }
        $('.dialogoptiondiv').each(function(i,e){
            var o = dialog.options[i];
            if(o === null){
                $(this).addClass('superhidden');
            }else{
                $(this).removeClass('superhidden');
            }
            $(this).unbind();
            $(this).click(function(){
                console.log('dialog option button clicked');
                $('.dialogoptionbutton').attr('disabled','disabled');
                do_rpc('dialog_pick',{'choice':i},function(err,u){
                    $('.dialogoptionbutton').removeAttr('disabled');
                    if(err){return console.log(err);}
                    set_user(u);
                });
            });
        });
    });
}


function acquire_quest(id){
    if(!id){id = 'testquest';}
    do_rpc('add_quest',{'qid':id},function(err,obj){
        if(err){return console.log(err);}
        var q = obj[0];
        set_user(obj[1]);
    });
}
function cancel_quest(id){
    do_rpc('cancel_quest',{'qid':id},function(err,obj){
        if(err){return console.log(err);}
        set_user(obj);
    });
}
function preturnin_quest(id){
    conversation = user.activequests[id].conversations.turnin;
    set_dialog(conversation.start);
}
function turnin_quest(id){
    do_rpc('turnin_quest',{'qid':id},function(err,obj){
        if(err){return console.log(err);}
        set_user(obj);
    });
}











var questboard = null;

function open_questboard(){
    do_rpc('get_quests',{},function(err,obj){
        if(err){return console.log(err);}
        obj.sort(function(a,b){return cmp(a.desc,b.desc);});
        questboard = {
            'questlist':obj,
            'viewquest':null
        };
        templ.update(function(){
            $('.questlistbutton').each(function(i,e){
                $(this).unbind();
                $(this).click(function(){
                    questboard.viewquest = questboard.questlist[i];
                    templ.update(function(){
                        $('#viewquestaccept').unbind();
                        $('#viewquestaccept').click(function(){
                            acquire_quest(questboard.viewquest._id);
                            //todo: do something to the questboard to
                            //indicate that it's been picked.
                        });
                    });
                });
            });
        });
    });
}

function close_questboard(){
    questboard = null;
    templ.update();
}










function questclient_init(){
}




