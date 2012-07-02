


/*
 * quest objects have:
 * 
 * _id: (identifier)
 * 
 * conversations: an object mapping 'start' and 'turnin' (and whatever
 * else) to conversations. 'start' is activated on accepting a quest
 * and should include some method of cancellation, while 'turnin' is
 * activated when the player hits the 'turn in' button, and should not
 * include some dialog options if the postcondition is not met.
 * 
 * * a conversation is a mapping of dialog identifiers (strings) to
 * * dialogs.  a dialog has `bgimg' (the name of the image to display
 * * in the background), `text' (what the person is saying to the
 * * player), and `options' (a list of things that player can say;
 * * note that if this is ever empty, the player won't be able to say
 * * anything... and be locked there forever).  each option is an
 * * object with `text' (what the player might say), `action'
 * * (optional: a function user -> undefined representing what happens
 * * after the player picks that option), and `cond' (optional: a
 * * function user -> boolean representing whether that option should
 * * show up).
 * 
 * desc: a very brief description (a title, basically)
 * mdesc: a medium sized description
 * ldesc: a long description
 * 
 * precondition: a function user -> boolean, with true indicating that
 * a user can start this quest (and false means it won't even show up
 * in the quest board).  this is optional; if not present, the only
 * thing keeping someone from doing this quest is
 * 
 * postcondition: a function user -> boolean, with true indicating
 * that the user is in a state such that ze can complete in the quest
 * (ie, test if ze has enough stuff).
 * 
 * completefun: a function user -> undefined, that should modify the
 * user if necessary to reflect the quest's completion (eg, taking
 * rewards, removing quest items from inventory).
 * 
 * cancelfun: a function user -> undefined, that should modify the
 * user if there is something to clean up when cancelling (such as
 * removing quest items or such).
 * 
 ******************************
 * 
 * quests may use the user.questflags object to store data on the user
 * (eg, to indicate zer status or what tasks have been completed when.
 * a long chain of quests might, for example, have their name map to
 * an integer indicating which quest the player has completed most
 * recently, and have preconditions that require that that integer
 * equal the index of the previous quest.
 * 
 */

var quests = {}; // map from id to the quest object

function newquest(d){
    if(typeof d !== 'object' || !d._id || quests[d._id]){
        console.log('bad quest');
    }
    quests[d._id] = d;
}



function cancel_quest(u,qid){
    if(!u.activequests[qid]){
        return false;
    }
    var q = quests[qid];
    if(q && q.cancelfun){
        q.cancelfun(u);
    }
    delete u.activequests[qid];
    return true;
}


function complete_quest(u,qid){
    var cq = u.activequests[qid];
    if(!cq){ return false; }
    var q = quests[qid];
    if(q.postcondition && !q.postcondition(u)){
        return false;
    }
    if(q.completefun){
        q.completefun(u);
    }
    delete cq.state;
    delete u.activequests[qid];
    u.finishedquests.unshift(cq);
    return true;
}


(function(){
    var neededitem = {'base':'apples','quantity':3};
    function postcondition(user){
        return countitem(user,neededitem) >= neededitem.quantity;
    }
    newquest({
        '_id':'testquest',
        'desc':'short description',
        'mdesc':'medium description',
        'ldesc':'a very long description',
        'precondition':function(u){ return true; },
        'postcondition':postcondition,
        'completefun':function(u){
            delitem(u,neededitem);
        },
        'conversations':{
            'start':{
                'start':{
                    'bgimg':'quest_bg_0',
                    'text':('Will you acquire 3 apples for me?'),
                    'options':[{'text':'Yay~','next':'accept'},
                               {'text':'Neigh','next':'cancel'}]
                },
                'accept':{
                    'bgimg':'quest_bg_0',
                    'text':('Wonderful! I look forward to receiving them.'),
                    'options':[{'text':'[End Dialog]'}]
                },
                'cancel':{
                    'bgimg':'quest_bg_0',
                    'text':('Unfortunate. I shall have to look elsewhere.'),
                    'options':[{'text':'[End Dialog]',
                                'action':function(u){
                                    cancel_quest(u,'testquest');
                                }}]
                }
            },
            'turnin':{
                'start':{
                    'bgimg':'quest_bg_0',
                    'text':('Have you brought them?'),
                    'options':[{'text':'Yes, here you go.',
                                'next':'turnin',
                                'cond':postcondition},
                               {'text':'Nope'}]
                },
                'turnin':{
                    'bgimg':'quest_bg_0',
                    'text':('Thank you very much!'),
                    'options':[{'text':'[End Dialog]',
                                'action':function(u){
                                    complete_quest(u,'testquest');
                                }}]
                }
            }
        }
    });
}());

function clientquest(q){
    var cq = {};
    cq._id = q._id;
    cq.desc = q.desc;
    cq.mdesc = q.mdesc;
    cq.ldesc = q.ldesc;
    cq.started = time_s();
    cq.state = 'start';
    return cq;
}

function set_dialog(u,qid,cstate,d){
    var i;
    if(!d){
        u.dialog = null;
        u.dialogquest = null;
        u.convstate = null;
        return;
    }
    d = copy(d);
    u.dialogquest = qid;
    u.convstate = cstate;
    var options = [];
    for(i in d.options){
        var opt = d.options[i];
        if(opt.cond && !opt.cond(u)){
            opt.text = null;
        }
        options.push(opt.text);
    }
    d.options = options;
    u.dialog = d;
}

function dialog_pick_fun(args){
    var choice = parseInt(args.choice,10);
    console.log(choice);
    return function(u,cbk){
        if(!u.dialog || !u.dialogquest || !u.convstate ||
           isNaN(choice) || !quests[u.dialogquest] ||
           !u.activequests[u.dialogquest]){
            return cbk('bad dialog choice...');
        }
        var q = quests[u.dialogquest];
        var cq = u.activequests[u.dialogquest];
        var d = q.conversations[cq.state][u.convstate];
        var o = d.options[choice];
        console.log(o);
        if(o.cond && !o.cond(u)){
            return cbk('dialog choice does not meet condition');
        }
        if(o.action){
            var ract = o.action(u);
        }
        if(o.next){
            var d2 = q.conversations[cq.state][o.next];
            set_dialog(u,u.dialogquest,o.next,d2);
        }else{
            set_dialog(u,null,null,null);
        }
        return cbk(null,u);
    };
}

function add_quest_fun(args,qd){
    var qid = args.qid;
    if(!quests[qid]){
        return function(u,c){
            c('bad quest id');
        };
    }
    var q = quests[qid];
    var cq = clientquest(q);
    qd.q = cq;
    return function(u,cbk){
        if(q.precondition && !q.precondition(u)){
            return cbk('you do not meet the preconditions');
        }
        if(u.activequests[qid]){
            return cbk('you have already taken that quest');
        }
        u.activequests[qid] = cq;
        if(q.conversations && q.conversations[cq.state]){
            set_dialog(u,qid,'start',q.conversations[cq.state].start);
        }
        return cbk(null,u);
    };
}

function del_quest_fun(args){
    var qid = args.qid;
    return function(u,cbk){
        cancel_quest(u,qid);
        return cbk(null,u);
    };
}
function turnin_quest_fun(args){
    var qid = args.qid;
    var q = quests[qid];
    return function(u,cbk){
        if(u.activequests[qid]){
            var cq = u.activequests[qid];
            cq.state = 'turnin';
            if(q.conversations && q.conversations[cq.state]){
                set_dialog(u,qid,'start',q.conversations[cq.state].start);
            }
        }else{
            return cbk('turnin_quest_fun: no such quest');
        }
        return cbk(null,u);
    };
}

//in the future, maybe have quests include a list of client flags that must be true, and then index quests by those flags, so that this is quicker to compute (though this is also pretty quick if there just aren't that many quests).
function get_quests_fun(u){
    var qid;
    var ql = [];
    for(qid in quests){
        var q = quests[qid];
        if(u.activequests[qid] ||
           (q.precondition && !q.precondition(u))){
            continue;
        }
        ql.push(clientquest(q));
    }
    return ql;
}





