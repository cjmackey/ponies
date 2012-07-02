


var indeckbuilder = false;
var deckbuilder = null;

/*
 * deckbuilder uses copies of the user cards and inventory; basically
 * this helps since it's quite stateful and so i don't want anything
 * else messing it up.
 * 
 * this will need a sort of generic "is this a valid deck for this
 * user" function later.
 * 
 * each time you open a deck, it makes a copy, 
 */
function DeckBuilder(){
    this.origdecks = copy(user.decks);
    this.decks = copy(this.origdecks);
    this.originventory = copy(user.inventory);
    this.deckix = null;
    this.deckname = null;
    this.deckcur = null;
    
    var todel = [];
    var base, i, item;
    for(base in this.originventory){
        for(i in this.originventory[base]){
            item = this.originventory[base][i];
            if(item.type !== 'card'){
                todel.push(item);
            }
        }
    }
    for(i in todel){
        item = todel[i];
        delitem(this.originventory,item);
    }
}

function opendeckbuilder(){
    if(indeckbuilder){
        templ.update();
        return;
    }
    indeckbuilder = true;
    deckbuilder = new DeckBuilder();
    deckbuilder.update();
}
function closedeckbuilder(){
    indeckbuilder = false;
    deckbuilder = null;
    templ.update();
}

DeckBuilder.prototype.update = function(){
    var i, ii, base, card;
    this.decklist = [];
    this.deckcardlist = [];
    this.invlist = [];
    this.inventory = copy(this.originventory);
    
    if(this.deckcur){
        for(base in this.deckcur){
            for(i in this.deckcur[base]){
                card = this.deckcur[base][i];
                delitem(this.inventory,card);
                this.deckcardlist.push(iteminfo(card));
            }
        }
        this.deckcardlist.sort(cmp);
        for(base in this.inventory){
            for(i in this.inventory[base]){
                card = this.inventory[base][i];
                this.invlist.push(iteminfo(card));
            }
        }
        this.invlist.sort(cmp);
    }else{
        for(base in this.decks){ this.decklist.push(base); }
        this.decklist.sort();
        for(i in this.decklist){
            this.decklist[i] = {'name':this.decklist[i],
                                'deck':this.decks[this.decklist[i]]};
        }
    }
    
    var db = this;
    
    templ.update(function(){
        $('.deckpickbutton').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                db.viewdeck(i);
            });
        });
        $('.deckaddbutton').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                db.deckadd(i);
            });
        });
        $('.deckremovebutton').each(function(i,e){
            $(this).unbind();
            $(this).click(function(){
                db.deckremove(i);
            });
        });
        $('.deckcard').each(function(i,e){
            //todo: make this deal with things in terms of item
            //'base's, not like this.
            /*
            if(this.deckcardlist[i].quantity > 4){
                $(this).css('color','red');
            }else{
                $(this).css('color','black');
            }
            */
        });
    });
};

DeckBuilder.prototype.newdeck = function(name){
    if(typeof name !== 'string' ||
       name.length < 1 ||
       name.length > 30 ||
       this.decks[name]){
        return console.log('bad name: '+name);
    }
    var deck = {};
    this.decks[name] = deck;
    this.deckname = name;
    this.deckcur = deck;
    this.update();
};

DeckBuilder.prototype.newdeckform = function(){
    this.newdeck($('#newdeckname').val());
    return false;
};

DeckBuilder.prototype.deckadd = function(ix){
    var item = copy(this.invlist[ix].original);
    item.quantity = 1;
    additem(this.deckcur,item);
    this.update();
};

DeckBuilder.prototype.deckremove = function(ix){
    var item = copy(this.deckcardlist[ix].original);
    item.quantity = 1;
    delitem(this.deckcur,item);
    this.update();
};

/**
 * given a deck index, changes to that deck.
 *
 */
DeckBuilder.prototype.viewdeck = function(ix){
    if(!this.decklist[ix]){
        console.log('viewdeck: bad ix');
        return;
    }
    this.deckname = this.decklist[ix].name;
    this.deckcur  = copy(this.decklist[ix].deck);
    this.update();
};
DeckBuilder.prototype.cancelchanges = function(){
    this.deckcur = null;
    this.update();
};
DeckBuilder.prototype.savechanges = function(){
    //rpc, then restart deckbuilder. (and maybe it should go back to
    //this deck again?)
    do_rpc('set_deck',{'deckname':this.deckname,'deck':this.deckcur},
           function(err,u){
               if(err){ return console.log(err); }
               set_user(u);
               closedeckbuilder();
               opendeckbuilder();
           });
};








function deckclient_init(){}


