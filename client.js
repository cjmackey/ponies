




var templvar = [1,2,3,4,5];
var templ;

var exampleimagesrc = imagedir['y18.gif'];

var registering = false;





/*
 * this runs every 100 ms and updates things that might need updating
 * on the screen.
 *
 *
 */
function general_update(){
    if(!user){ return; }
    
    job_update();
    
    trading_update();
    
    templ.update();
}


var general_update_interval = null;
function start_general_update(){
    general_update();
    if(general_update_interval === null){
        general_update_interval = setInterval(general_update, 100);
    }
    
    $(window).focus(function() {
        if(general_update_interval === null){
            general_update_interval = setInterval(general_update, 100);
        }
    });
    
    $(window).blur(function() {
        clearInterval(general_update_interval);
        general_update_interval = null;
    });
}


function readHash(){
    var ha = window.location.hash;
    if(ha){
        ha = ha.substr(1); //remove '#'
        var o = {};
        try{
            o = JSON.parse(ha);
            return o;
        }catch(e){
        }
        return ha;
    }
    return '';
}


function client_init(){
    var loc = top.location.hostname;
    if(top !== self){
        console.log(loc);
        templ = new Templ(template_redirtemplate);
        $('#wrap').append(templ.basehtml);
        templ.update();
        return;
    }
    templ = new Templ(template_clienttemplate);
    $('#wrap').append(templ.basehtml);
    $('#usernameinput').focus();
    
    $("#uploadform").ajaxForm({'success':
                               function(){
                                   console.log('form upload success');
                                   do_sync();
                               }
                              });
    start_general_update();
    var h = readHash();
    if(h.username && h.password){
        window.location.hash='#_';
        login(h.username,h.password);
    }
    
    
    
    templ.update(function(){
        $('.skilljobicon').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                possiblejob = null;
                templ.update();
                $('.skilljobicon').removeClass('skilljobiconchosen');
                $(this).addClass('skilljobiconchosen');
                try{
                    $('.jobicon').removeClass('jobiconchosen');
                    var el = $($('.jobpicker')[i]);
                    var disp = el.css('display');
                    disp = (disp==='none')?'block':'none';
                    $('.jobpicker').css('display','none');
                    el.css('display',disp);
                }catch(err){
                    console.log(err);
                }
            });
        });
        $('.jobpicker').each(function(i0,e){
            var sj = skilljoblist[i0];
            $(this).find('.jobicon').each(function(i1,e){
                var j = sj.joblist[i1];
                $(this).unbind();
                $(this).click(function(){
                    var i;
                    if($(this).hasClass('jobiconchosen')){
                        $('.jobicon').removeClass('jobiconchosen');
                        possiblejob = null;
                        templ.update();
                        return;
                    }
                    $('.jobicon').removeClass('jobiconchosen');
                    $(this).addClass('jobiconchosen');
                    possiblejob = jobinfo(user,j.kind);
                    if(possiblejob){
                        for(i in possiblejob.inputs){
                            possiblejob.inputs[i] =
                                iteminfo(possiblejob.inputs[i]);
                        }
                        for(i in possiblejob.outputs){
                            possiblejob.outputs[i] =
                                iteminfo(possiblejob.outputs[i]);
                        }
                    }
                    startcraftbox();
                    templ.update();
                });
            });
        });
    });
    
}

