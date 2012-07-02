"use strict"
;
/*global window */




/*

  todo: for a in l {{}}, if h {{t}}{{f}}, include url, let a = b {{}}

  {{<div> for o in l {{
  <div>{{o.size}}</div>
  }}}}




*/


var templ_ids = [];


/*
 * Templ, a templating...thing for html.
 *
 * src -> a string containing the template
 * ctx -> the object whose variables it references
 *          (if null, all references to variables return the empty string)
 *          (if undefined, this gets set to `window` (ie, globals))
 */
function Templ(src,obj,varlist,id,ctx){
    this.afterupdate = [];
    var i;
    
    if(id === undefined){
        this.id = 'templ_'+templ_ids.length.toString();
        templ_ids.push(this.id);
    }else{
        this.id = id;
    }
    this.children = [];
    this.src = src;
    if(obj === undefined){
        obj = window;
    }
    this.obj = obj;
    this.kind = 'head';
    if(ctx !== undefined){
        this.ctx = ctx;
    }else{
        this.ctx = {};
    }
    this.innerval = undefined;
    this.innervar = undefined;
    
    /*
     * varlist is for the list of variables to keep testing.
     * 
     * each is of the form ['someobjname','somearrayname',0] and
     * should refer to something which can be converted into a
     * string. if it's undefined or null, we'll use the empty string.
     */
    if(varlist === undefined){
        varlist = [];
    }
    this.varlist = varlist;
    
    var srclist = this.splitsource(src);
    
    var idregex = /id="([A-z][A-z0-9.:\-_]*)"/;
    var modregex = /mod="([A-z0-9.:_,=]+)"/;
    var styleregex = /style="([A-z0-9.:_,=\-]+)"/;
    var submodregex = /[A-z0-9\-]+[=:][A-z0-9._]+/g;
    var subsubmodregex = /([A-z0-9\-]+)[=:]([A-z0-9._]+)/;
    var htagregex = /^\s*<\s*(\w+)(\s+[\s\w.:\-=_"#;,()']+)?>/;
    var firstchildregex = /\{\{/;
    var varnameregex = /([\.A-z0-9_]+)\s*$/;
    var forregex = /^([\s\S]*)for\s+([A-z][A-z0-9]*)\s+in\s+([\.A-z0-9_]+)\s*(<[\s\S]*>)?\s*/;
    var ifregex = /if\s+(!)?([A-z][A-z0-9\._]*)\s*(<[\s\S]*>)?\s*$/;
    var letregex = /^\s*let\s+([A-z][A-z0-9]*)\s*=\s*([\.A-z0-9_]+)/;
    
    this.basehtml = '';
    
    for(i=0;i<srclist.length;i++){
        var s = srclist[i][1];
        if(srclist[i][0]){
            var m;
            var innerstr = '';
            var htag = '';
            var cs = ''; //src of child of child (ex: for)
            
            //in case of things with child templates (ie, for, if)
            var prechild = s;
            m = s.match(firstchildregex);
            if(m !== null){
                prechild = s.substring(0,m.index);
            }
            if(prechild.length !== s.length){
                //figure out kid's src
                cs = s.substring(prechild.length+2);
                cs = cs.split('');
                var prev = '';
                while(cs.length >= 0){
                    var tmp = cs.pop();
                    if(tmp === '}' && prev === '}'){
                        break;
                    }
                    prev = tmp;
                }
                cs = cs.join('');
            }
            
            //determine the id it will have
            var cid = this.id+'_'+this.children.length.toString();
            m = prechild.match(idregex);
            if(m !== null){
                cid = m[1];
            }
            
            var child;
            
            //now based on what kind of tag this is, do stuff.
            var mfor;
            if(prechild.match(ifregex)){
                m = prechild.match(ifregex);
                child = new Templ('',obj,undefined,cid,this.clonectx());
                child.kind = 'if';
                child.assignvarname(m[2]);
                child.ifinnerbegin = 'blah';
                child.ifinnerend = 'blah';
                child.ifinnerbegin = '<span';
                child.ifinnerend = '</span>'; 
                var childstag = m[3];
                if(childstag){
                    mfor = childstag.match(htagregex);
                    if(mfor){
                        child.ifinnerbegin = childstag.substring(
                            0,childstag.length-1);
                        child.ifinnerend = '</'+mfor[1]+'>';
                    }
                }
                child.invert = false;
                if(m[1]){
                    child.invert = true;
                }
                child.ifsrc = cs;
                if((child.innerval && !child.invert) ||
                   (!child.innerval && child.invert)
                  ){
                    innerstr = child.ifnewchild();
                }else{
                    innerstr = child.blankspan();
                }

            }else if(prechild.match(letregex)){
                m = prechild.match(letregex);
                var letctx = this.clonectx();
                letctx[m[1]] = this.parsevar(m[2]);
                child = new Templ(cs,obj,undefined,cid,letctx);
                child.kind = 'let';
                innerstr = child.basehtml;
            }else if(prechild.match(forregex)){
                m = prechild.match(forregex);
                child = new Templ('',obj,undefined,cid,this.clonectx());
                child.kind = 'for';
                child.forelement = m[2];
                child.forlist = this.parsevar(m[3]);
                child.forinnerbegin = '<span';
                child.forinnerend = '</span>';
                if(m[4]){
                    mfor = m[4].match(htagregex);
                    if(mfor){
                        child.forinnerbegin = m[4].substring(
                            0,m[4].length-1);
                        child.forinnerend = '</'+mfor[1]+'>';
                    }
                }
                
                child.forsrc = cs;
                
                var fl = child.derefvar(child.forlist);
                var fi;
                for(fi = 0; fl && fi < fl.length; fi++){
                    innerstr += child.fornewchild(fi);
                }
                child.forlen = fl;
            }else if(prechild.match(varnameregex) &&
                     prechild.match(/^raw/)
                    ){
                child = new Templ('',obj,undefined,cid,this.clonectx());
                child.kind = 'raw';
                m = prechild.match(varnameregex);
                child.assignvarname(m[1]);
                innerstr = child.outputformat(child.innerval);
            }else if(prechild.match(varnameregex)){
                child = new Templ('',obj,undefined,cid,this.clonectx());
                child.kind = 'node';
                m = prechild.match(varnameregex);
                child.assignvarname(m[1]);
                innerstr = child.outputformat(child.innerval);
            }else{
                child = new Templ(cs,obj,undefined,cid,this.clonectx());
                child.kind = 'parent';
                innerstr = child.basehtml;
            }
            this.children.push(child);
            
            //determine mods
            var mods = '', modlist, modi, subm;
            m = prechild.match(modregex);
            child.attrvars = {};
            if(m){
                modlist = m[1].match(submodregex);
                if(modlist){
                    for(modi=0;modi<modlist.length;modi++){
                        subm = modlist[modi].match(subsubmodregex);
                        if(subm){
                            child.assignattrvarname(subm[1], subm[2]);
                            mods += ' '+subm[1]+'="'+Templ.prototype.outputformat(child.attrvars[subm[1]].innerval)+'"';
                        }
                    }
                }
            }
            
            //determine styles
            var style = '';
            m = prechild.match(styleregex);
            child.stylevars = {};
            if(m){
                modlist = m[1].match(submodregex);
                if(modlist){
                    for(modi=0;modi<modlist.length;modi++){
                        subm = modlist[modi].match(subsubmodregex);
                        if(subm){
                            child.assignstylevarname(subm[1], subm[2]);
                            style += ' '+subm[1]+':'+Templ.prototype.outputformat(child.stylevars[subm[1]].innerval)+';';
                        }
                    }
                }
            }
            //todo: figure out how to combine existing style with this...
            
            //determine how it will look
            var injectstyle = false;
            switch(child.kind){
            case 'let':
            case 'if':
                htag = innerstr;
                break;
            default:
                injectstyle=true;
                htag = '<span id="'+cid+'"'+mods+' style="">'+innerstr+'</span>';
                m = prechild.match(htagregex);
                if(m){
                    if(m[0].match(idregex)){
                        htag = (m[0].substring(0,m[0].length-1)+mods+'>' +
                                innerstr+'</'+m[1]+'>');
                    }else{
                        htag = (m[0].substring(0,m[1].length+1) +
                                ' id="'+cid+'"' +
                                m[0].substring(m[1].length+1,m[0].length-1) +
                                mods+'>' + innerstr+'</'+m[1]+'>');
                    }
                }
                break;
            }
            
            if(injectstyle && style.length > 0){
                var hasstyle = false;
                m = htag.match(/^(\s*<[\s\w.:\-=_"#;,()']+style="[\s\w.:\-=_#;,()']*)"[\s\w.:\-=_"#;,()']*>/);
                if(!m){
                    m = htag.match(/^<\s*\w+\s*/);
                    htag = (htag.substr(0,m[0].length) +
                            ' style="'+style+'" ' +
                            htag.substr(m[0].length));
                }else{
                    htag = (htag.substr(0,m[1].length) +
                            ' '+style+' ' +
                            htag.substr(m[1].length));
                }
            }
            
            s = htag;
        }
        this.basehtml += s;
    }
    
}

Templ.prototype.blankspan = function(id){
    if(id === undefined){
        id = this.id;
    }
    return '<span id="' + id + '" style="display:none;"></span>';
};

Templ.prototype.assignvarname = function(varname){
    this.innervar = this.parsevar(varname);
    this.innerval = this.derefvar(this.innervar);
};

Templ.prototype.assignattrvarname = function(attr,varname){
    var innervar = this.parsevar(varname);
    var innerval = this.derefvar(innervar);
    
    this.attrvars[attr] = {'innervar':innervar,'innerval':innerval};
};

Templ.prototype.assignstylevarname = function(attr,varname){
    var innervar = this.parsevar(varname);
    var innerval = this.derefvar(innervar);
    
    this.stylevars[attr] = {'innervar':innervar,'innerval':innerval};
};

Templ.prototype.derefvar = function(varname){
    var cur;
    var i;
    if(this.ctx[varname[0]] !== undefined){
        var tmp0 = this.ctx[varname[0]];
        var tmp = [];
        for(i=0;i<tmp0.length;i++){
            tmp.push(tmp0[i]);
        }
        for(i=1;i<varname.length;i++){
            tmp.push(varname[i]);
        }
        return this.derefvar(tmp);
    }
    cur = this.obj;
    
    for(i=0;i<varname.length && cur !== undefined && cur !== null;i++){
        cur = cur[varname[i]];
    }
    return cur;
};

Templ.prototype.parsevar = function(varname){
    var l0 = varname.split('.');
    return l0; //not gonna change things to ints... i guess?
};

Templ.prototype.needsupdate = false;

/*
 * updates dom with any changes to variables
 * 
 * maybe idea: make this be able to update just some variables to save time
 *   (ie, template.update('somevariable')
 *   (or, template.update(['var1','var2'])
 *
 * this wrapper is used so that it is ok to call update() whenever you
 * want; the setTimeout(... , 0) is to make sure that the
 * internal_update occurs after whatever processing you're doing is
 * done.
 *
 *
 *
 *
 */
Templ.prototype.update = function(callback){
    if(typeof callback === 'function'){
        this.afterupdate.push(callback);
    }
    if(!this.needsupdate){
        var templ = this;
        this.needsupdate = true;
        setTimeout(function(){
            templ.internal_update();
        }, 0);
    }
};
Templ.prototype.internal_update = function(){
    this.needsupdate = false;
    var v, s, i, c;
    var e = document.getElementById(this.id);
    switch(this.kind){
    case 'node':
        v = this.derefvar(this.innervar);
        if(v !== this.innerval){ //todo: maybe change this?
            s = this.outputformat(v);
            if(e.innerHTML !== s){
                e.innerHTML = s;
            }
            this.innerval = v;
        }
        break;
    case 'for':
        v = this.derefvar(this.forlist);
        if(!v){v = [];}
        var toadd = '';
        while(this.children.length < v.length){
            toadd += this.fornewchild(this.children.length);
        }
        if(toadd.length > 0){
            e.innerHTML += toadd;
        }
        while(this.children.length > v.length){
            c = this.children.pop();
            c.remove();
        }
        break;
    case 'if':
        v = this.derefvar(this.innervar);
        if(v !== this.innerval){
            this.innerval = v;
            var next = e.nextSibling;
            var parent = e.parentNode;
            if(this.children.length > 0){
                c = this.children.pop();
                c.remove();
            }else{
                parent.removeChild(e);
            }
            if((this.innerval && !this.invert) ||
               (!this.innerval && this.invert)
              ){
                s = this.ifnewchild();
            }else{
                s = this.blankspan();
            }
            
            var div = document.createElement('div');
            div.innerHTML = s;
            e = div.firstChild;
            parent.insertBefore(e,next); //works even if 'next' is null
            parent = div.parentNode;
            if(parent){
                parent.removeChild(div);
            }
            
        }
        e = undefined; //so we don't apply attributes or styles
        break;
    case 'let': break;
    case 'head': break;
    default: break;
    }
    
    
    for(i in this.children){
        this.children[i].internal_update();
    }
    
    
    var attr, o;
    if(e){
        for(attr in this.attrvars){
            o = this.attrvars[attr];
            v = this.derefvar(o.innervar);
            if(v !== o.innerval){ //todo: maybe change this?
                s = this.outputformat(v);
                if(e.getAttribute(attr) !== s){
                    e.setAttribute(attr,s);
                }
                o.innerval = v;
            }
        }
        for(attr in this.stylevars){
            o = this.stylevars[attr];
            v = this.derefvar(o.innervar);
            if(v !== o.innerval){ //todo: maybe change this?
                s = this.outputformat(v);
                if(e.style[attr] !== s){
                    e.style[attr] = s;
                }
                o.innerval = v;
            }
        }
    }
    
    for(i in this.afterupdate){
        this.afterupdate[i]();
    }
    this.afterupdate = [];
};

Templ.prototype.outputformat = function(obj){
    if(obj === undefined || obj === null){
        return '';
    }
    return obj.toString();
};

Templ.prototype.clonectx = function(){
    return copy(this.ctx);
};

Templ.prototype.remove = function(){
    //todo: make this better...?
    var e = document.getElementById(this.id);
    if(e){
        e.parentNode.removeChild(e);
    }
};

Templ.prototype.forctx = function(index){
    var ctx = this.clonectx();
    var l = [];
    var i;
    for(i=0;i<this.forlist.length;i++){
        l.push(this.forlist[i]);
    }
    l.push(index);
    ctx[this.forelement] = l;
    return ctx;
};

Templ.prototype.ifnewchild = function(){
    var gchild = new Templ(this.ifsrc,this.obj,undefined,this.id,
                           this.clonectx());
    gchild.kind = 'ifinside';
    this.children.push(gchild);
    return (this.ifinnerbegin + ' id="'+gchild.id+'">' +
            gchild.basehtml + this.ifinnerend); 
};

Templ.prototype.fornewchild = function(index){
    var gchild = new Templ(this.forsrc,this.obj,undefined,
                           this.id+'_'+index.toString(),
                           this.forctx(index));
    gchild.kind = 'foriter';
    this.children.push(gchild);
    return (this.forinnerbegin + ' id="'+gchild.id+'">' +
            gchild.basehtml + this.forinnerend);
};

Templ.prototype.splitsourcecache = {};

Templ.prototype.splitsource = function(src){
    //caching, since i'd like to reduce "compile time" in cases like nested for loops
    if(src in Templ.prototype.splitsourcecache){
        return Templ.prototype.splitsourcecache[src];
    }
    
    //split things into list of [isitatag, string]
    var srclist = [];
    var i;
    var taglvl = 0;
    var curstr = [];
    for(i=0;i<src.length-1;i++){
        var c = src[i];
        var cn = src[i+1];
        var done = false;
        var dub = false;
        if(c === '{' && cn === '{'){
            done = taglvl === 0;
            dub = true;
            taglvl++;
        }
        if(c === '}' && cn === '}'){
            done = taglvl === 1;
            dub = true;
            taglvl--;
        }
        if(done){
            //[istag(boolean), string]
            srclist.push([(1-taglvl)>0,curstr.join('')]);
            curstr = [];
        }else{
            curstr.push(c);
            if(dub){
                curstr.push(cn);
            }
        }
        if(dub){
            i++;
        }
    }
    if(curstr.length > 0){
        curstr.push(src[src.length-1]);
        srclist.push([false,curstr.join('')]);
    }
    
    Templ.prototype.splitsourcecache[src] = srclist;
    
    return srclist;
};


//*

if(typeof window === 'undefined'){
    var testobj = {'asdf':'blah',
                   'l':['a','b'],
                   'd':{'k0':'v0','k1':'v1'},
                   'l2':[{'a':'l2a0','b':'l2b0'},
                         {'a':'l2a1','b':'l2b1'}],
                   'w':'25',
                   't':true,
                   'f':false
                  };
    var testtempl = 'blah blah \n {{asdf}} \n {{d.k1}} \n {{asdf id="blah"}} \n {{<div id="something"> asdf}}\n {{<div class="someclass"> id="somethingelse" l.1}} \n {{<div> l.0 {{ lalala }}}} \n {{let a = l {{hello {{a.0}} }}}} \n asdf \n {{<div class="someclass" id="for"> for thing in l2 <div class="blah">{{\nlala \n{{thing.a}} \n{{thing.b}}\n\n }} }} \n {{<img> mod="url:asdf,width=w"}} \n {{<div>{{lalala{{asdf}}}} }} \n {{if t {{t1}}}} \n {{if !t {{t2}}}} \n {{if f {{f1}}}} \n {{if !f <div class="blah">{{f2}}}} \n  \n ';
    //var testtempl = 'blah blah \n {{asdf}} \n {{d.k1}} \n {{asdf id="blah"}} \n {{<div id="something"> asdf}}\n {{<div class="someclass"> id="somethingelse" l.1}} \n {{<div> l.0 {{ lalala }}}} \n {{let a = l {{hello {{a.0}} }}}} \n asdf \n {{<div class="someclass" id="for"> for thing in l2 <div class="blah">{{\nlala \n{{thing.a}} \n{{thing.b}}\n\n }} }} \n ';
    
    var tmp = new Templ(testtempl,testobj);
    
    console.log(tmp.basehtml);

    /*
      var t0 = (new Date()).getTime()/1000.0;
      
      for(i=0;i<10000;i++){
      tmp = new Templ(testtempl,testobj);
      }
      
      var t1 = (new Date()).getTime()/1000.0;
      console.log(t1-t0);
      
    */
}




function templ_init(){
}








