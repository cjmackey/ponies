







var fight = null;

Fight.prototype.draw = function(){
    var ft = this;
    var i, j;
    if(!this._bgimg){
        this._bgimg = new Image();
        this._bgimg.onload = function(){
            ft.bgimg = ft._bgimg;
        };
        this._bgimg.src = imagedir['fbgtmp'];
    }
    if(!this.images){
        this.images = {};
        this.tmpimages = {};
        for(i in this.creatures){
            for(j in this.creatures[i]){
                (function(){
                    var k = ft.creatures[i][j].img;
                    var img = new Image();
                    ft.tmpimages[k] = img;
                    img.onload = function(){
                        ft.images[k] = ft.tmpimages[k];
                    };
                    img.src = imagedir[k];
                }());
            }
        }
    }
    templ.update(function(){
        var i, j, k;
        var width = $(window).width();
        var height = $(window).height();
        var pstatswidth = 300;
        var gameheight = height;
        var gamewidth = width - pstatswidth;
        if(gamewidth/gameheight > 4.0/3.0){
            gamewidth = Math.floor((4.0/3.0)*gameheight);
        }else if(gamewidth/gameheight < 4.0/3.0){
            gameheight = Math.floor((3.0/4.0)*gamewidth);
        }
        var gametop = Math.floor((height - gameheight)/2);
        var pstatsleft = Math.floor((width - (pstatswidth+gamewidth))/2);
        var gameleft = pstatsleft + pstatswidth;
        console.log({'width':width,
                     'height':height,
                     'gameheight':gameheight,
                     'gamewidth':gamewidth,
                     'gametop':gametop});
        if(!ft.canv){
            ft.canv = document.getElementById('fightcanv');
        }
        $('#fightbackdrop').width(width);
        $('#fightbackdrop').height(height);
        
        $('#fightcanvcontainer').width(gamewidth);
        $('#fightcanvcontainer').width(gameheight);
        $('#fightcanvcontainer').css('top',gametop+'px');
        $('#fightcanvcontainer').css('left',gameleft+'px');
        $('#fightframe').width(gamewidth);
        $('#fightframe').width(gameheight);
        $('#fightframe').css('top',gametop+'px');
        $('#fightframe').css('left',gameleft+'px');
        $('#fightplayerstats').css('left',pstatsleft+'px');
        $('#fightplayerstats').height(height);
        ft.canv.width = gamewidth;
        ft.canv.height = gameheight;
        ft.ctx = ft.canv.getContext('2d');
        if(ft.bgimg){
            ft.ctx.drawImage(ft.bgimg,0,0,gamewidth,gameheight);
        }
        //on the left side...
        var cre;
        var isize = gameheight*0.2;
        for(j in ft.creatures[0]){
            cre = ft.creatures[0][j];
            if(cre.img && ft.images[cre.img]){
                ft.ctx.drawImage(ft.images[cre.img],
                                 0,gameheight*0.5,isize,isize);
            }
        }
        ft.ctx.save();
        ft.ctx.translate(gamewidth, 0);
        ft.ctx.scale(-1,1);
        for(j in ft.creatures[1]){
            cre = ft.creatures[1][j];
            if(cre.img && ft.images[cre.img]){
                ft.ctx.drawImage(ft.images[cre.img],
                                 0,gameheight*0.5,isize,isize);
            }
        }
        ft.ctx.restore();
    });
};







var fightticker = null;
function fightloop(){
    fight.draw();
    fightticker = setTimeout(fightloop,30);
}

function startfight(){
    fight = new Fight();
    fightloop();
}

function endfight(){
    if(fightticker){
        clearTimeout(fightticker);
    }
    fight = null;
    templ.update();
}


function fightclient_init(){}


