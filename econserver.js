








var inventory_types = ['apples','wood','bits','pies'];

/*
 * this maps an inventory type to the selling and buying prices of
 * items.
 *
 * in the future this should be refactored into ... something.
 */
var going_prices = {
    'apples'  :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'wood'    :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'pies'    :[[100,200],[200,800],[1000,8000],[10000,null]],
    'butter'  :[[  7, 15],[ 14, 60],[  70, 600],[  700,null]],
    'milk'    :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'flour'   :[[  7, 15],[ 14, 60],[  70, 600],[  700,null]],
    'wheat'   :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'hay'     :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'eggs'    :[[  5, 10],[ 10, 40],[  50, 400],[  500,null]],
    'cake'    :[[120,240],[240,960],[1200,9600],[12000,null]],
    'frosting':[[ 20, 40],[ 40,160],[ 200,1600],[ 2000,null]],
    'sugar'   :[[  7, 15],[ 14, 60],[  70, 600],[  700,null]]
};





/*
 * markets!
 *
 * a market is essentially a collection of buy and sell orders for one
 * kind of item (eg, apples)
 * 
 * one market has:
 *   _id: (the item base, or base_quality, probably)
 *   buyorders:  a list of buyorders  (sorted from highest to lowest)
 *   sellorders: a list of sellorders (sorted from lowset to highest)
 *   exampleitem: a template for an item of this type (sans quantity)
 * 
 * orders of the same bitseach are sorted oldest-first.
 * 
 * one buy or sell order has (for the moment):
 *   bitseach (the number of bits to exchange for each thing)
 *   quantity (the size of the buy or sell order
 *   origquantity (the original quantity)
 *   userid (the username of the buyer or seller) (null means npc)
 *   created (the time it was created)
 * 
 * 
 */
function new_market(marketid,item){
    var m = {};
    m._id = marketid;
    m.exampleitem = copy(item);
    m.buyorders = [];
    m.sellorders = [];
    m.atomicversion = 0;
    var qual = 0;
    if(item.quality){
        qual = item.quality;
    }
    //make default buy and sell
    if(going_prices[item.base] && going_prices[item.base][qual]){
        if(going_prices[item.base][qual][0]){
            m.buyorders.push({ 'bitseach':
                               going_prices[item.base][qual][0],
                               'quantity':null,
                               'origquantity':null,
                               'userid':null,
                               'created':time_s()});
        }
        if(going_prices[item.base][qual][1]){
            m.sellorders.push({'bitseach':
                               going_prices[item.base][qual][1],
                               'quantity':null,
                               'origquantity':null,
                               'userid':null,
                               'created':time_s()});
        }
    }
    seq(
        function(){
            getcoll('markets',this);
        }, function(err, coll){
            if(err){
                return console.log(err);
            }
            coll.insert(m,{safe:true},this);
        }, function(err){
            if(err && !err.message.match(/duplicate key error/)){
                return console.log(err);
            }
        }
    );
}


/*
 * we want to order things with higher buyers first and lower sellers
 * first, and if there are ties, older orders go first.
 */
function buyordercmp(a,b){
    if(a.bitseach !== b.bitseach){
        return -(a.bitseach - b.bitseach);
    }
    return a.created - b.created;
}
function sellordercmp(a,b){
    if(a.bitseach !== b.bitseach){
        return a.bitseach - b.bitseach;
    }
    return a.created - b.created;
}

/*
 *
 */
function normalize_resultlist(resultlist){
    return function(m,cbk){
        while(resultlist.length > 1){
            resultlist.pop();
        }
        return cbk(null,m);
    };
}

/*
 * updatemarket; updates market, while looking for buy+sell combos
 * 
 * resultlist will have results pushed onto it (eg, if a sale is made,
 * add apples to one player and add bits to the other)
 * 
 * results are objects, with 'userid', and possibly 'bits' for the
 * number of bits gained by sales and 'item' for the stack of items to
 * be merged into the player's inventory.
 *
 */
function matchpeople(resultlist, bo, so, m){
    //console.log(bo);
    //console.log(so);
    var n = null;
    //test on quantity because npc's are null
    if(bo.quantity && so.quantity){
        n = Math.min(bo.quantity,so.quantity);
    }else if(bo.quantity){
        n = bo.quantity;
    }else if(so.quantity){
        n = so.quantity;
    }else{
        console.log('big error!');
        return;
    }
    var bits = Math.round(n*(bo.bitseach + so.bitseach)/2);
    var item = copy(m.exampleitem);
    item.quantity = n;
    //console.log(bits);
    //console.log(item);
    // test on userid because npc's are null
    if(so.userid){
        //console.log('giving money');
        resultlist.push({'userid':so.userid,
                         'bits':bits});
    }
    if(bo.userid){
        //console.log('giving items');
        resultlist.push({'userid':bo.userid,
                         'item':item});
    }
    if(bo.quantity){
        bo.quantity -= n;
    }
    if(so.quantity){
        so.quantity -= n;
    }
}
function update_market_fun(resultlist){
    return function(m,cbk){
        var i;
        while(true){
            //console.log(m);
            while(m.buyorders.length  > 0 &&
                  m.buyorders[0].quantity !== null &&
                  m.buyorders[0].quantity  <= 0){
                m.buyorders.shift();
            }
            while(m.sellorders.length > 0 &&
                  m.sellorders[0].quantity !== null &&
                  m.sellorders[0].quantity <= 0){
                m.sellorders.shift();
            }
            if(m.buyorders.length < 1 || m.sellorders.length < 1 ||
               m.buyorders[0].bitseach < m.sellorders[0].bitseach){
                break;
            }
            var foundmatch = false;
            var bo = m.buyorders[0];
            for(i in m.sellorders){
                if(bo.bitseach === m.sellorders[i].bitseach){
                    foundmatch = true;
                    matchpeople(resultlist,bo,m.sellorders[i],m);
                    break;
                }
                //if(bo.bitseach < m.sellorders[i].bitseach){
                //    break;
                //}
            }
            if(foundmatch){ continue; }
            var so = m.sellorders[0];
            matchpeople(resultlist,bo,so,m);
        }
        return cbk(null,m);
    };
}

/*
 * addbuyorderfun : adds a buyorder to a market.
 *   (for use in marketatomically)
 * 
 * future: use binary search to find where to put the order, then split
 * and concatenate arrays.
 * 
 */
function addbuyorderfun(userid, bitseach, quantity){
    var order = {'userid':userid,
                 'bitseach':bitseach,
                 'quantity':quantity,
                 'origquantity':quantity,
                 'created':time_s()
                };
    return function(m,cbk){
        if(m.buyorders.length < 1){
            m.buyorders = [order];
        }else{
            var omin = m.buyorders[m.buyorders.length-1];
            if(omin.quantity === null &&
               omin.bitseach >= bitseach){
                return cbk('you may not buy lower than the baseline');
            }
            sinsert(order,m.buyorders,buyordercmp);
            //m.buyorders.push(order);
            //m.buyorders.sort(buyordercmp);
        }
        return cbk(null,m);
    };
}
function addsellorderfun(userid, bitseach, quantity){
    var order = {'userid':userid,
                 'bitseach':bitseach,
                 'quantity':quantity,
                 'origquantity':quantity,
                 'created':time_s()
                };
    return function(m,cbk){
        if(m.sellorders.length < 1){
            m.sellorders = [order];
        }else{
            var omax = m.sellorders[m.sellorders.length-1];
            if(omax.quantity === null &&
               omax.bitseach <= bitseach){
                return cbk('you may not sell higher than the baseline');
            }
            sinsert(order,m.sellorders,sellordercmp);
            //m.sellorders.push(order);
            //m.sellorders.sort(sellordercmp);
        }
        return cbk(null,m);
    };
}




function applyresult_fun(r){
    return function(u,cbk){
        if(r.bits){
            u.bits += r.bits;
        }
        if(r.item){
            additem(u,r.item);
        }
        return cbk(null,u);
    };
}

function quickbuy_fun(userid,quantity,maxcost,spentobj){
    return function(m,cbk){
        var l = expected_value(m.sellorders,quantity,true);
        var b = l[0];
        spentobj.spent = b;
        if(!b){
            return cbk('not enough to buy...');
        }
        if(b > maxcost){
            return cbk('insufficient maxcost');
        }
        var i;
        var resultlist = l[1];
        //console.log(resultlist);
        //for each result, put in a buyorder
        var funlist = [];
        for(i in resultlist){
            var r = resultlist[i];
            funlist.push(addbuyorderfun(userid,r.bitseach,r.quantity));
        }
        bindarr(funlist)(m,cbk);
    };
}

function quicksell_fun(userid,quantity,mincost){
    return function(m,cbk){
        var l = expected_value(m.buyorders,quantity,true);
        var b = l[0];
        if(!b){
            return cbk('not enough buyers...');
        }
        if(b < mincost){
            return cbk('prices below minimum');
        }
        var i;
        var resultlist = l[1];
        //for each result, put in a sellorder
        var funlist = [];
        for(i in resultlist){
            var r = resultlist[i];
            funlist.push(addsellorderfun(userid,r.bitseach,r.quantity));
        }
        bindarr(funlist)(m,cbk);
    };
}

function marketatomically(marketid, operationfun, callback){
    var resultlist = [];
    var market;
    seq(
        function(){
            atomically(
                'markets',
                {_id:marketid},
                bind(normalize_resultlist(resultlist),
                     update_market_fun(resultlist),
                     operationfun,
                     update_market_fun(resultlist)),
                this
            );
        }, function(err,m){
            if(err){return callback(err);}
            //console.log(resultlist);
            var i, r;
            market = m;
            setTimeout(this.parallel(),0);
            for(i in resultlist){
                r = resultlist[i];
                //console.log(r);
                if(r.userid){
                    useratomically({_id:r.userid},
                                   applyresult_fun(r),
                                   this.parallel(),
                                   true);
                }
            }
        }, function(){
            return callback(null,market);
        }
    );
}



















