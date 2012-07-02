/*
 * inventory:
 * 
 * items have a base kind (eg "apple") and various stats, one of which
 * is quantity (defaulting to 1).  they are stored in a map from base
 * kind to a list of items, where inserting items into the inventory
 * should collapse items that are equivalent, into a larger stack of
 * the same.
 * 
 */

function itemcmp(a, b){
    var tmp;
    tmp = cmp(a.base,b.base);
    if(tmp !== 0){ return tmp; }
    tmp = objcmpx(a,b,{quality:true,quantity:true});
    if(tmp !== 0){ return tmp; }
    return objcmpx(a,b,{quantity:true});
}

function isinv(inv){
    if(!inv || typeof inv !== 'object'){ return false; }
    var k, l, i, item;
    for(k in inv){
        l = inv[k];
        if(!isArray(l)){return false;}
        for(i in l){
            item = l[i];
            if(!item || typeof item !== 'object'){ return false; }
            if(item.base !== k){ return false; }
            if(typeof item.quantity !== 'number'){ return false; }
        }
    }
    return true;
}

function additem(u, item){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    if(typeof item === 'string'){
        item = {base:item};
    }else{
        item = copy(item);
    }
    var base = item.base;
    if(typeof item.quantity !== 'number'){
        item.quantity = 1;
    }
    if(item.quality !== 'number' || item.quality < 1){
        delete item.quality;
    }
    var quantity = item.quantity;
    var l = inv[base];
    if(!l){
        inv[base] = [item];
        return inv;
    }
    var i;
    var found = false;
    for(i in l){
        if(itemcmp(l[i],item) === 0){
            l[i].quantity += item.quantity;
            found = true;
            break;
        }
    }
    if(!found){
        l.push(item);
    }
    return inv;
}

function delitem(u, item){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    var base = item.base;
    var l = inv[base];
    if(!l){
        return;
    }
    var i;
    var l2 = [];
    for(i in l){
        if(itemcmp(l[i],item) === 0){
            l[i].quantity -= item.quantity;
            if(l[i].quantity > 0){
                l2.push(l[i]);
            }
        }else{
            l2.push(l[i]);
        }
    }
    inv[base] = l2;
    return inv;
}

function countitem(u,item){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    var base = item.base;
    var l = inv[base];
    if(!l){
        return 0;
    }
    var i;
    for(i in l){
        if(itemcmp(l[i],item) === 0){
            return l[i].quantity;
        }
    }
    return 0;
}


function invbases(u){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    return keylist(inv);
}

/*
 * making an inventory for displaying
 * 
 * f is a function to be run on each item (such as for filtering if it
 * returns undefined)
 */
function invdisp(u,f){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    if(!f){
        f = function(a){return a;};
    }
    var i, j;
    var bl = invbases(inv);
    var l = [];
    for(i in bl){
        var base = bl[i];
        var il = [];
        for(j in inv[base]){
            tmp = f(iteminfo(inv[base][j]));
            if(tmp !== undefined){
                il.push(tmp);
            }
        }
        if(il.length > 0){
            il.sort(itemcmp);
            l.push(il);
        }
    }
    return l;
}

function mapinv(u,f){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    if(!f){
        f = function(a){return a;};
    }
    var i, j;
    var l = [];
    var bl = vallist(inv);
    for(i in bl){
        for(j in bl[i]){
            var tmp = f(bl[i][j]);
            if(tmp !== undefined){
                l.push(tmp);
            }
        }
    }
    l.sort(itemcmp);
    return l;
}

function invfilter(u,f){
    var inv = u;
    if(u.inventory){
        inv = u.inventory;
    }
    if(!f){
        f = function(a){return a;};
    }
    var inv2 = {};
    var b, i;
    for(b in inv){
        var l = [];
        for(i in inv[b]){
            if(f(inv[b][i])){
                l.push(inv[b][i]);
            }
        }
        if(l.length > 0){
            inv2[b] = l;
        }
    }
    return inv2;
}

function usercommon_init(){}


/*
 * relationship between levels and xp for skills
 *
 */










