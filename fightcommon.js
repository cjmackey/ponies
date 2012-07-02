


/*

fights are objects with a list of creatures on the left and a list of creatures on the right. if this is a player's copy of the fight object, it will contain indexing to find your creature.

each creature has a hand of cards (a list of card items) and a deck of cards (also a list of card items). player copies do not get the decks and enemy cards will be censored as basetype '_unknown'.

each creature has HP and AP.

for now, left side goes first.



*/

function Fight(){
    this.creatures = [[{'img':'photo_finish'}],
                      [{'img':'manticore'}]];
}



function fightcommon_init(){}




