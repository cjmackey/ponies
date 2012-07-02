
var intradingpost = false;
var tradingitem = null;
var marketlist = [];
var tradingordercost = null;
var tradingorderrevenue = null;
var tradingbuyvalue = null;
var tradingsellvalue = null;
// our "cache" of market info
var tradingpost_markets = {};


function _tradingchoose(s){
    if(tradingpost_markets[s]){
        tradingitem = tradingpost_markets[s];
    }else{
        tradingitem = {_id:s};
    }
    templ.update();
}
function refresh_market(s,callback){
    if(!s && tradingitem && typeof tradingitem === 'object' &&
       tradingitem._id){
        s = tradingitem._id;
    }
    if(!s){
        return;
    }
    do_rpc('read_market',{marketid:s},function(err,obj){
        obj.item = iteminfo(obj.exampleitem);
        obj.title = 'Trading '+capitalize(obj.item.qdesc);
        if(obj.buyorders.length > 0 &&
           obj.buyorders[obj.buyorders.length-1].userid === null){
            obj.bottomprice = obj.buyorders[obj.buyorders.length-1].bitseach;
        }else{
            obj.bottomprice = 0;
        }
        if(obj.sellorders.length > 0 &&
           obj.sellorders[obj.sellorders.length-1].userid === null){
            obj.topprice = obj.sellorders[obj.sellorders.length-1].bitseach;
        }else{
            obj.topprice = Infinity;
        }
        if(typeof tradingpost_markets[s] === 'object'){
            var k;
            for(k in obj){
                tradingpost_markets[s][k] = obj[k];
            }
        }else{
            tradingpost_markets[s] = obj;
        }
        if(tradingitem._id === s){
            _tradingchoose(s);
        }
        if(callback){
            callback(null,obj);
        }
    });
}
function tradingchoose(s){
    _tradingchoose(s);
    refresh_market(s);
}

function submitbuy(){
    var bq = parseInt($('#newbuyquantity').val(),10);
    do_rpc('quickbuy',
           {'marketid': tradingitem._id,
            'quantity': bq,
            'maxcost':Math.round(
                1.05 * expected_value(tradingitem.sellorders,bq))
           },
           function(err,obj){
               refresh_market();
               do_sync();
           });
}

function submitbuyorder(){
    do_rpc('add_buyorder',
           {'marketid': tradingitem._id,
            'bitseach': $('#newbuyorderbitseach').val(),
            'quantity': $('#newbuyorderquantity').val()
           },
           function(err,obj){
               refresh_market();
               do_sync();
           });
}

function submitsell(){
    var sq = parseInt($('#newsellquantity').val(),10);
    do_rpc('quicksell',
           {'marketid': tradingitem._id,
            'quantity': sq,
            'mincost':Math.round(
                0.95 * expected_value(tradingitem.buyorders,sq))
           },
           function(err,obj){
               refresh_market();
               do_sync();
           });
}

function submitsellorder(){
    do_rpc('add_sellorder',
           {'marketid': tradingitem._id,
            'bitseach': $('#newsellorderbitseach').val(),
            'quantity': $('#newsellorderquantity').val()
           },
           function(err,obj){
               refresh_market();
               do_sync();
           });
}



function trading_update(){
    if(tradingitem){
        var bq = parseInt($('#newbuyquantity').val(),10);
        if(isNaN(bq)){
            tradingbuyvalue = null;
        }else{
            tradingbuyvalue = expected_value(tradingitem.sellorders,bq);
            $('#newbuyquantity').css(
                'border-color',(tradingbuyvalue > user.bits)?'red':'white');
        }
        var boq = parseInt($('#newbuyorderquantity').val(),10);
        var bob = parseInt($('#newbuyorderbitseach').val(),10);
        if(isNaN(boq) || isNaN(bob)){
            tradingordercost = null;
        }else{
            tradingordercost = boq*bob;
            $('#newbuyorderquantity').css(
                'border-color',(tradingordercost > user.bits)?'red':'white');
            $('#newbuyorderbitseach').css(
                'border-color',(bob<=tradingitem.bottomprice ||
                                bob>=tradingitem.topprice)?'red':'white');
        }
        
        var sq = parseInt($('#newsellquantity').val(),10);
        if(isNaN(sq)){
            tradingsellvalue = null;
        }else{
            tradingsellvalue = expected_value(tradingitem.buyorders,sq);
            $('#newsellquantity').css(
                'border-color',(sq > countitem(
                    user,tradingitem.exampleitem))?'red':'white');
        }
        
        var soq = parseInt($('#newsellorderquantity').val(),10);
        var sob = parseInt($('#newsellorderbitseach').val(),10);
        if(isNaN(soq) || isNaN(sob)){
            tradingorderrevenue = null;
        }else{
            tradingorderrevenue = soq*sob;
            $('#newsellorderquantity').css(
                'border-color',(soq > countitem(
                    user,tradingitem.exampleitem))?'red':'white');
            $('#newsellorderbitseach').css(
                'border-color',(sob<=tradingitem.bottomprice ||
                                sob>=tradingitem.topprice)?'red':'white');
        }
    }
    templ.update();
}



function econclient_init(){}



