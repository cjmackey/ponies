
//minimum number of cards we'll allow in a deck
var min_cards = 30;
//maximum number of copies of the same basetype
var max_each_card = 4;



function invalid_deck(u,deck){
    var problems = [];
    var baselist = keylist(deck);
    var base, i, j, quant, tquant;
    tquant = 0;
    for(i in baselist){
        base = baselist[i];
        quant = 0;
        for(j in deck[base]){
            quant += deck[base][j].quantity;
        }
        tquant += quant;
        if(quant > max_each_card){
            //in future, use iteminfo...Desc or something
            problems.push('Too many of '+base);
        }
    }
    if(tquant < min_cards){
        problems.push('Insufficient cards: you have '+tquant.toString() +
                      ' and you need to have '+min_cards.toString());
    }
    
    if(problems.length < 1){
        return null;
    }
    return problems;
}




function deckcommon_init(){}













