





var itemkinds = {
    'apples':true,
    'wood':true,
    'pies':true,
    'butter':true,
    'milk':true,
    'flour':true,
    'wheat':true,
    'hay':true,
    'eggs':true,
    'frosting':true,
    'cake':true,
    'sugar':true
};


function cardinfo(card){
    card.plural = card.base + 's';
    card.singular = card.base;
    return card;
}




function iteminfo(thing){
    var base;
    var o = {'original':{}};
    if(typeof thing === 'string'){
        base = thing;
        o.base = base;
    }else{
        o = copy(thing);
        o.original = thing;
        base = o.base;
    }
    if(o.type === 'card'){
        o = cardinfo(o);
    }else{
        if(!itemkinds[base]){
            console.log('iteminfo: base not in itemkinds');
            console.log(base);
            return null;
        }
        o.plural =
            {'apples':'apples',
             'wood':'wood?',
             'pies':'apple pies',
             'butter':'sticks of butter',
             'milk':'cups of milk',
             'flour':'cups of flour',
             'frosting':'cups of frosting',
             'cake':'cakes',
             'wheat':'wheat?',
             'hay':'hay?',
             'eggs':'eggs',
             'sugar':'cups of sugar'
            }[base];
        o.singular =
            {'apples':'apple',
             'wood':'wood?',
             'pies':'apple pie',
             'butter':'stick of butter',
             'milk':'cup of milk',
             'flour':'cup of flour',
             'frosting':'cup of frosting',
             'cake':'cake',
             'wheat':'wheat?',
             'hay':'hay?',
             'eggs':'egg',
             'sugar':'cup of sugar'
            }[base];
    }
    o.desc = (o.quantity === 1) ? o.singular : o.plural;
    o.qdesc = o.desc;
    if(o.quality){
        o.qdesc = {1:'good',
                   2:'exceptional',
                   3:'legendary'}[o.quality]+' '+o.desc;
    }
    o.Base     = capitalize(o.base);
    o.Plural   = capitalize(o.plural);
    o.Singular = capitalize(o.singular);
    o.Desc     = capitalize(o.desc);
    o.QDesc    = capitalize(o.qdesc);
    return o;
}



/*
 * tree node :: [name :: str, children :: [node]]
 * leaf node :: {name :: str, exampleitem :: {...}, marketid}
 */
function Trading_hierarchy_ns_fun(){
    function tree(name){
        var children = [];
        var i;
        for(i=1; i < arguments.length; i++){
            children.push(arguments[i]);
        }
        return {'type':'tree',
                'isleaf':false,
                'istree':true,
                'name':capitalize(name),
                'children':children};
    }
    this.tree = tree;
    function leaf(name,marketid,exampleitem){
        return {'type':'leaf',
                'isleaf':true,
                'istree':false,
                'name':capitalize(name),
                'marketid':marketid,
                'exampleitem':exampleitem};
    }
    this.leaf = leaf;
    function bleaf(base, name){
        var ii = iteminfo(base);
        if(!name){
            name = capitalize(base);
        }
        return tree(
            name,
            leaf(ii.plural,
                 base,
                 {'base':base}),
            leaf('good '+ii.plural,
                 'good '+base,
                 {'base':base,'quality':1}),
            leaf('exceptional '+ii.plural,
                 'exceptional '+base,
                 {'base':base,'quality':2}),
            leaf('legendary '+ii.plural,
                 'legendary '+base,
                 {'base':base,'quality':3})
        );
    }
    function eachleaf(f, node){
        var i;
        if(isArray(node)){
            for(i in node){
                eachleaf(f,node[i]);
            }
        }else if(node.istree){
            for(i in node.children){
                eachleaf(f,node.children[i]);
            }
        }else{
            f(node);
        }
    }
    this.eachleaf = eachleaf;
    function tree2html(node){
        var cls = 'hierarchy';
        var fun = "$(this).parent().toggleClass('hidethechildren')";
        if(node.isleaf){
            fun = "tradingchoose('"+node.marketid+"')";
        }
        var typeclass = cls;
        if(node.istree){typeclass += 'tree';}
        if(node.isleaf){typeclass += 'leaf';}
        var begin = '<div class="'+cls+' '+typeclass+' hidethechildren">';
        var end = '</div>';
        var inside = '<button class="" onclick="'+fun+'">'+node.name+'</button>';
        if(node.istree){
            var i;
            for(i in node.children){
                inside += tree2html(node.children[i]);
            }
        }
        return begin + inside + end;
    }
    this.tree2html = tree2html;
    this.hierarchy = [
        tree('Engineering',
             tree('Materials',
                  bleaf('wood')
                 )
            ),
        tree('Food',
             tree('Ingredients',
                  bleaf('apples'),
                  bleaf('butter'),
                  bleaf('eggs'),
                  bleaf('flour'),
                  bleaf('frosting'),
                  bleaf('hay'),
                  bleaf('milk'),
                  bleaf('sugar'),
                  bleaf('wheat')
                 ),
             tree('Baked Goods',
                  bleaf('cake'),
                  bleaf('pies')
                 )
            )
    ];
    this.html = [];
    var i;
    for(i in this.hierarchy){
        this.html.push(tree2html(this.hierarchy[i]));
    }
    
}
var trading_hierarchy_ns = new Trading_hierarchy_ns_fun();
var trading_hierarchy = trading_hierarchy_ns.hierarchy;
var trading_hierarchy_html = trading_hierarchy_ns.html;



function expected_value(orders,quantity,delorders){
    var n = quantity;
    var b = 0;
    var resultlist = [];
    var i;
    for(i in orders){
        var o = orders[i];
        if(o.quantity === null || o.quantity >= n){
            b += n*o.bitseach;
            if(delorders){
                resultlist.push({'userid':o.userid,
                                 'quantity':n,
                                 'bits': n*o.bitseach,
                                 'bitseach':o.bitseach});
            }
            n = 0;
        }else{
            b += o.bitseach*o.quantity;
            n -= o.quantity;
            if(delorders){
                resultlist.push({'userid':o.userid,
                                 'quantity':o.quantity,
                                 'bits': o.quantity*o.bitseach,
                                 'bitseach':o.bitseach});
            }
        }
        if(n <= 0){
            break;
        }
    }
    if(n > 0){
        b = null;
    }
    if(delorders){
        return [b,resultlist];
    }
    return b;
}



function econcommon_init(){}

