


function curried (fn) {
    var slice = Array.prototype.slice;
    var args = slice.apply(arguments, [1]);
    return function () {
        return fn.apply(null, args.concat(slice.apply(arguments)));
    };
}


function capitalize(s){
    var l = s.split(/\s/);
    var i;
    for(i in l){
        var w = l[i];
        var shouldcap = i === 0;
        switch(w){
        case 'a':
        case 'an':
        case 'and':
        case 'of':
            break;
        default: shouldcap = true; break;
        }
        if(shouldcap){
            l[i] = w.substr(0,1).toUpperCase() + w.substr(1);
        }
    }
    return l.join(' ');
}

//returns a value in [mi,ma], preferring x.
function between(x,mi,ma){
	if(x < mi){
		x = mi;
	}else if(x > ma){
		x = ma;
	}
	return x;
}
function C_clone(){}
function clone(o){
    C_clone.prototype = o;
    return new C_clone();
}

function assert(expr,mesg) {
    if(!expr){
	if(mesg===undefined){
	    mesg = 'assertion error: ' + assert.caller.toString();
	}
	console.log(mesg);
    }
}

function time_ms(){
    return (new Date()).getTime();
}
function time_s(){
    return time_ms()/1000.0;
}

function isArray(obj){
    return (typeof obj === 'object' &&
            obj instanceof Array &&
            typeof value.length === 'number' &&
            !(value.propertyIsEnumerable('length')) &&
            typeof value.splice === 'function' &&
	    (obj.constructor.toString().indexOf("Array") !== -1)
           );
}
if(Array.isArray){
    isArray = Array.isArray;
}

function map(f,o){
    var k;
    var r;
    if(isArray(o)){
        r = [];
    }else{
        r = {};
    }
    for(k in o){
        r[k] = f(o[k],k);
    }
    return r;
}

function filter(f,o){
    var k;
    var r;
    var arr = false;
    if(isArray(o)){
        arr = true;
        r = [];
    }else{
        r = {};
    }
    for(k in o){
        if(f(o[k],k)){
            if(arr){
                r.push(o[k]);
            }else{
                r[k] = o[k];
            }
        }
    }
    return r;
}

function fold(f,l,initial){
    if(l.length < 1){
        return initial;
    }
    var i;
    var r;
    if(initial === undefined){
        r = l[0];
    }else{
        r = f(initial,l[0]);
    }
    for(i=1;i<l.length;i++){
        r = f(r,l[i]);
    }
    return r;
}

/*
 *
 * maxdepth is needed in case of loops; set it to a negative number if
 * you want to be able to go to arbitrary depths, or don't set it for
 * a sensible 200.
 *
 */
function copy(o,maxdepth){
    if(typeof o !== 'object'){
        return o;
    }
    if(o === null){
        return null;
    }
    if(maxdepth === undefined){
        maxdepth = 200;
    }else if(maxdepth === 0){
        return undefined;
    }
    var c = (isArray(o))?[]:{};
    var i;
    var d = maxdepth - 1;
    for(i in o){
        c[i] = copy(o[i],d);
    }
    return c;
}

function copyarr(a){
    return copy(a);
}
function copyobj(a){
    return copy(a);
}
function strcmp ( str1, str2 ) {
    // http://kevin.vanzonneveld.net
    // +   original by: Waldo Malqui Silva
    // +      input by: Steve Hilder
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: gorthaur
    // *     example 1: strcmp( 'waldo', 'owald' );
    // *     returns 1: 1
    // *     example 2: strcmp( 'owald', 'waldo' );
    // *     returns 2: -1

    return ( ( str1 === str2 ) ? 0 : ( ( str1 > str2 ) ? 1 : -1 ) );
}
var cmp;
function objcmpx(a,b,x){
    var d = {};
    var k;
    for(k in a){if(!x[k]){d[k] = true;}}
    for(k in b){if(!x[k]){d[k] = true;}}
    for(k in d){
        var tmp = cmp(a[k],b[k]);
        if(tmp !== 0){
            return tmp;
        }
    }
    return 0;
}
function objcmp(a,b){
    var d = {};
    var l = [];
    var k, i;
    for(k in a){d[k] = true;}
    for(k in b){d[k] = true;}
    for(k in d){
        l.push(k);
    }
    l.sort();
    for(i in l){
        k = l[i];
        var tmp = cmp(a[k],b[k]);
        if(tmp !== 0){
            return tmp;
        }
    }
    return 0;
}
function arrcmp(a,b){
    if(a.length !== b.length){
        return a.length - b.length;
    }
    var i, tmp;
    var l = [];
    for(i in a){
        l.push(i);
    }
    for(i in b){
        l.push(i);
    }
    l.sort(cmp);
    var prev = null;
    for(i in l){
        if(prev === i){
            continue;
        }
        tmp = cmp(a[i],b[i]);
        if(tmp !== 0){
            return tmp;
        }
        prev = i;
    }
    return 0;
}

/*
 *
 * undefined < null < NaN < boolean < function < number < array < object < string
 */
cmp = function(a,b){
    if(a === b){ return 0; }
    if(a === undefined){ return -1; }
    if(b === undefined){ return  1; }
    if(a === null){ return -1; }
    if(b === null){ return  1; }
    var ta = typeof a;
    var tb = typeof b;
    var c = ((ta===tb)?0:((ta>tb)?1:-1));
    if(c !== 0){
        return c;
    }
    switch(ta){
    case 'undefined':
        return 0;
    case 'object':
        var aa = isArray(a);
        var ab = isArray(b);
        if(aa){
            if(ab){
                return arrcmp(a,b);
            }else{
                return -1;
            }
        }else if(ab){
            return 1;
        }
        return objcmp(a,b);
    case 'number':
        if(isNaN(a)){ return -1; }
        if(isNaN(b)){ return 1; }
        return a - b;
    default:
        return ((a===b)?0:((a>b)?1:-1));
    }
};

function issorted(arr,comparator){
    if(!comparator){ comparator = cmp; }
    var i;
    for(i=1;i<arr.length;i++){
        if(comparator(arr[i-1],arr[i])>0){
            return false;
        }
    }
    return true;
}

function _bsearch(key, arr, cmp, start, end, max){
    var i, c;
    if(end-start < 8){ // linearly search
        for(i = start; i <= end; i++){
            c = cmp(key,arr[i]);
            if(c === 0){
                return [i,((i===0)?null:i-1),((i===max)?null:i+1)];
            }else if(c < 0){
                if(i === 0){
                    return [null,null,0];
                }
                return [null,i-1,i];
            }
        }
        if(end === max){
            return [null,end,null];
        }
        return [null,end,end+1];
    }
    var mid = (start + end)>>1;
    c = cmp(key, arr[mid]);
    if(c === 0){
        return [mid,mid-1,mid+1];
    }else if(c < 0){
        return _bsearch(key,arr,cmp,start,mid-1,max);
    }
    return _bsearch(key,arr,cmp,mid+1,end,max);
}
/*
 * bsearch: given a key, an array, and optionally a comparator, look
 * for the matching thing, and return an array of the index of the
 * match, the index before, and the index after.
 */
function bsearch(key,arr,comparator){
    if(arr.length <= 0){
        return [null,null,null];
    }
    var max = arr.length - 1;
    if(!comparator){ comparator = cmp;}
    return _bsearch(key,arr,comparator,0,max,max);
}

function sinsert(key,arr,comparator){
    if(!comparator){ comparator = cmp;}
    var l = bsearch(key,arr,comparator);
    if(l[2] === null){
        arr.push(key);
    }else if(l[1] === null){
        arr.unshift(key);
    }else{
        arr.splice(l[2],0,key);
    }
    return arr;
}

function sinsertreplace(key,arr,comparator){
    if(!comparator){ comparator = cmp;}
    var l = bsearch(key,arr,comparator);
    if(l[0] !== null){
        arr[l[0]] = key;
    }else if(l[2] === null){
        arr.push(key);
    }else if(l[1] === null){
        arr.unshift(key);
    }else{
        arr.splice(l[2],0,key);
    }
    return arr;
}


function arr2(w,h) {
	//apparently this is pretty fast :)
	var a = [], b, i, j;
	for(i = 0; i < w; i+=1){
		b = [];
		for(j = 0; j < h; j+=1){
			b.push([]);
		}
		a.push(b);
	}
	return a;
}



function isArray(obj) {
    return (obj.constructor.toString().indexOf('Array') !== -1);
}

function len(o){
    if(isArray(o)){
	return o.length;
    }else{
	var e;
	var l = 0;
	for(e in o){
	    l += 1;
	}
	return l;
    }
}
function keylist(o){
    var k;
    var l = [];
    for(k in o){
        l.push(k);
    }
    l.sort();
    return l;
}
function vallist(o){
    var k, i;
    var l = [];
    var m = [];
    for(k in o){
        l.push(k);
    }
    l.sort();
    for(i in l){
        k = l[i];
        m.push(o[k]);
    }
    return m;
}
function elemlist(o){
    var k, i;
    var l = [];
    var m = [];
    for(k in o){
        l.push(k);
    }
    l.sort();
    for(i in l){
        k = l[i];
        m.push([k,o[k]]);
    }
    return m;
}


function newatomicversion(v){
    //the next number is modulo 2^28, which is presumably enough that race conditions will be unlikely :)
    return (v + 1) % 268435456;
}

function check_username(username){
    var o = {isvalid:true};
    try{
        if(typeof username !== 'string'){
            o.wrongtype = true;
            o.isvalid = false;
        }
        if(username.length < 1){
            o.tooshort = true;
            o.isvalid = false;
        }
        if(username.length > 30){
            o.toolong = true;
            o.isvalid = false;
        }
        if(!username.match(/[A-z0-9.\-_%+@$]*/)){
            o.badchars = true;
            o.isvalid = false;
        }
    }catch(err){
        o.causederror = true;
        o.error = err;
        o.isvalid = false;
    }
    return o;
}

function nullfun(a,b){
    if(a && b){
        return b(null,a);
    }
}
function errfun(err){
    if(!err){
        return function(o,cbk){
            return cbk('errfun');
        };
    }
    err = copy(err);
    return function(o,cbk){
        return cbk(err);
    };
}


function bind2(fa,fb){
    return function(oa, callback){
        fa(oa,
           function(err, ob){
               if(err){
                   callback(err);
               }else{
                   fb(ob,callback);
               }
           });
    };
}

function bindarr(l){
    if(l.length < 1){
        return function(obj, callback){
            return callback(null,obj);
        };
    }
    var i;
    var f = l[0];
    for(i=1; i<l.length; i++){
        f = bind2(f,l[i]);
    }
    return f;
}
function bind(){
    return bindarr(arguments);
}



/*
 * and now, for an experiment in immutable data and functional "purity"
 *
 */



function insertArr(k,v,o){
    var tmp = o.slice(0);
    tmp[k]=v;
    return tmp;
}
function insertObj(k,v,o){
    var l;
    var tmp = {};
    for(l in o){
        tmp[l] = o[l];
    }
    tmp[k] = v;
    return tmp;
}
/*
 * insert (immutable) key, value, object or array
 * inserting undefined deletes (which is 
 */
function ins(k,v,o){
    if(isArray(o)){
        return insertArr(k,v,o);
    }
    return insertObj(k,v,o);
}
function deleteArr(k,o){
    var tmp = o.slice(0);
    delete tmp[k];
    return tmp;
}
function deleteObj(k,o){
    var l;
    var tmp = {};
    for(l in o){
        tmp[l] = o[l];
    }
    delete tmp[k];
    return tmp;
}
function del(k,o){
    if(isArray(o)){
        return deleteArr(k,o);
    }
    return deleteObj(k,o);
}
/*
 * f is run on o[k] and, if f(o[k]) returns undefined, 
 */
function alt(f,k,o){
    var v = f(o[k]);
    if(v !== undefined){
        return ins(k,v,o);
    }
    return del(k,o);
}
function sins(k,a,c){
    return sinsert(k,a.slice(0),c);
}
function sinsn(kl,a,c){
    var tmp = a.slice(0);
    var i;
    for(i in kl){
        sinsert(kl[i],a,c);
    }
    return tmp;
}

// a.b.c.d = 5;
// a = ins('b',ins('c',ins('d',5,a.b.c),a.b),a);
// a = insl('b.c.d',5,a);


/*
 * ponify takes a string and returns a pony-ish version. 
 *
 * this currently uses a chain of regular expressions, but it could be replaced with anything else
 *
 */
function ponify(s){
    return s.replace(/fuck/g,'buck')
        .replace(/Fuck/g,'Buck')
        .replace(/shit/g,'horse apples')
        .replace(/Shit/g,'Horse apples')
        .replace(/aysayers/g,'eighsayers')
        .replace(/omebody/g , 'omepony')
        .replace(/omeone/g  , 'omepony')
        .replace(/nybody/g  ,  'nypony')
        .replace(/nyone/g   ,  'nypony')
        .replace(/verybody/g,'verypony')
        .replace(/veryone/g ,'verypony');
}




/*
 * javascript object diff objdiff(a,b)
 * 
 * produces an array of operations to perform on the old object to
 * make the old object (a) be equivalent to the new object (b).
 *
 * operations are arrays of [op,field,maybe action]
 *
 * op === 0 removes the field (delete o[field])
 * op === 1 applies what's in [action] to the field (o[field]=action)
 * op === 2 expects action to be an operation, and applies it to the field (thus allowing recursion)
 *
 * note: this does not work quite right for undefined values; if
 * something is undefined, it assumes it's not there so will add a
 * delete operation.
 * 
 * note: this should work just fine on arrays.
 * 
 */
function objdiff(a,b){
    var k, c, ta, tb, va, vb, shouldcopy, tmp;
    var ops = [];
    for(k in b){
        va = a[k];
        vb = b[k];
        /*
        if(vb === undefined){
            vb = null;
        }
        */
        ta = typeof va;
        tb = typeof vb;
        shouldcopy = false;
        if(ta !== tb || isArray(va) ^ isArray(vb)){
            shouldcopy = true;
        }else{
            c = cmp(a[k],b[k]);
            if(c !== 0){
                if(ta === 'object' && va && vb){
                    tmp = objdiff(va,vb);
                    if(JSON.stringify(tmp).length <
                       JSON.stringify(vb).length){
                        ops.push([2,k,tmp]);
                    }else{
                        shouldcopy = true;
                    }
                }else{
                    shouldcopy = true;
                }
            }
        }
        if(shouldcopy){
            ops.push([1,k,vb]);
        }
    }
    for(k in a){
        if(b[k] === undefined){
            ops.push([0,k]);
        }
    }
    return ops;
}

function objpatch(p,o){
    var i;
    o = copy(o);
    for(i in p){
        var op = p[i];
        switch(op[0]){
        case 0:
            delete o[op[1]];
            break;
        case 1:
            o[op[1]] = op[2];
            break;
        case 2:
            o[op[1]] = objpatch(op[2],o[op[1]]);
            break;
        default:
            console.log('bad patch object!');
            break;
        }
    }
    return o;
}

function objdiffpatch(a,b){
    return objpatch(objdiff(a,b),a);
}

function objdiffpatchtest(a,b){
    return cmp(objdiffpatch(a,b),b) === 0;
}






function util_init() {
    var d = {}, a = [], x = 0, l = [], i;
    for(i in a){
	x+=1;
	l.push(i);
    }
    assert(x===0,'empty array isn\'t actually empty! '+l.toString());
    
    x = 0;
    l = [];
    for(i in d){
	x+=1;
	l.push(i);
    }
    assert(x===0,'empty object isn\'t actually empty! '+l.toString());
    
}

function util_test(){
    var d = {};
    var l = [];
    
    assert(cmp(d,l)!==0);
    assert(cmp(0,1)!==0);
    assert(cmp('s','')!==0);
    
    var l1 = [];
    assert(cmp(l,l1)===0);
    l1.push(5);
    assert(cmp(l,l1)!==0);
    l.push(3);
    assert(cmp(l,l1)!==0);
    
    assert(objdiffpatchtest({'blah':'something',
                             'a':4,
                             'l':[1,2,3,4,5,6,7,null,9,10,11,12,13,'a',15,
                                  16,'hasejfmawejfklmjsdkljfmalskdjfmljask',
                                  'gmljaskldfjalsjndfkljnasdnjfkajsdnlfjak',
                                  'lsdkfnashdkjfsdkj']},
                            {'hello':undefined,
                             'b':5,
                             'blah':45,
                             'l':[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
                                  16,'hasejfmawejfklmjsdkljfmalskdjfmljask',
                                  'gmljaskldfjalsjndfkljnasdnjfkajsdnlfjak',
                                  'lsdkfnashdkjfsdkj']}));

    
}


